"""
Control Routes Module

This module defines FastAPI routes for NIST 800-53 control operations.
It provides endpoints for retrieving individual controls and searching across controls.
"""

from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, Request, Body
from fastapi.responses import JSONResponse
import json
from pathlib import Path
from data.controls import Control, get_control_by_id, search_controls, get_all_controls
from pydantic import BaseModel
import os
from openai import OpenAI
from services.gpt_cache import get_or_generate_gpt_response, gpt_cache
from services.script_generator import ScriptGenerator

# Create router instance for control-related endpoints
# This will be included in the main FastAPI application
router = APIRouter(
    prefix="/api",
    tags=["controls"],
    responses={404: {"description": "Not found"}},
)

# Mock mapping of resources to NIST controls
RESOURCE_CONTROL_MAP = {
    "aws_s3": [
        {"id": "SC-12", "title": "Cryptographic Key Establishment and Management"},
        {"id": "AC-3", "title": "Access Enforcement"}
    ],
    "aws_iam": [
        {"id": "AC-2", "title": "Account Management"},
        {"id": "IA-2", "title": "Identification and Authentication (Organizational Users)"}
    ],
    "linux_server": [
        {"id": "CM-6", "title": "Configuration Settings"},
        {"id": "SI-2", "title": "Flaw Remediation"}
    ],
    "aws_ec2": [
        {"id": "SC-7", "title": "Boundary Protection"},
        {"id": "AU-2", "title": "Audit Events"}
    ]
}

# Mock AI-generated explanations
CONTROL_EXPLANATIONS = {
    "SC-12": "S3 buckets often store sensitive data, so cryptographic key management is essential to protect data at rest.",
    "AC-3": "Access enforcement ensures only authorized users can access S3 bucket contents.",
    "AC-2": "IAM manages user accounts and permissions, aligning with account management requirements.",
    "IA-2": "IAM enforces identification and authentication for users accessing AWS resources.",
    "CM-6": "Linux servers require secure configuration settings to reduce vulnerabilities.",
    "SI-2": "Flaw remediation ensures Linux servers are patched and protected against known threats.",
    "SC-7": "EC2 instances need boundary protection to control network traffic and prevent unauthorized access.",
    "AU-2": "Audit events must be logged for EC2 instances to support incident detection and response."
}

class InventoryRequest(BaseModel):
    resources: List[str]

class AdaptControlRequest(BaseModel):
    control_id: str
    resource: str
    tools: List[str]
    environment: Dict[str, str]

# Load full controls dataset
def load_full_controls():
    """Load the complete NIST 800-53 controls dataset from modular family files."""
    base_dir = Path(__file__).resolve().parents[1] / "data"
    controls_dir = base_dir / "controls"

    # Try modular approach first (preferred)
    if controls_dir.exists() and (controls_dir / "_index.json").exists():
        try:
            print(f"Loading controls from modular directory: {controls_dir}")
            all_controls = []

            # Load index to get list of family files
            with open(controls_dir / "_index.json", 'r', encoding='utf-8') as f:
                index = json.load(f)

            # Load each family file
            for family_file in index.get("files", []):
                family_path = controls_dir / family_file
                if family_path.exists():
                    with open(family_path, 'r', encoding='utf-8') as f:
                        family_controls = json.load(f)
                        all_controls.extend(family_controls)
                        print(f"  Loaded {len(family_controls)} controls from {family_file}")

            print(f"Total controls loaded: {len(all_controls)}")
            return all_controls

        except Exception as e:
            print(f"Failed to load modular controls: {e}")
            print("Falling back to monolithic catalog...")

    # Fallback to monolithic files
    candidates = [
        base_dir / "controls_catalog.json",
        base_dir / "all_controls_with_scripts_ansible_rhel8_clean.json",
        base_dir / "transformed_controls.json",
        base_dir / "all_controls_enriched.json",
        base_dir / "all_controls.json",
    ]

    for candidate in candidates:
        if candidate.exists():
            try:
                with open(candidate, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # If dict keyed by control_id, convert to list
                if isinstance(data, dict):
                    return list(data.values())
                return data
            except Exception as e:
                print(f"Failed to load {candidate.name}: {e}")
                continue

    return []

# Cache the loaded controls
_FULL_CONTROLS_CACHE = None

def get_full_controls_cached():
    """Get full controls with caching."""
    global _FULL_CONTROLS_CACHE
    if _FULL_CONTROLS_CACHE is None:
        _FULL_CONTROLS_CACHE = load_full_controls()
    return _FULL_CONTROLS_CACHE

def invalidate_controls_cache():
    """Invalidate the controls cache to force reload."""
    global _FULL_CONTROLS_CACHE
    _FULL_CONTROLS_CACHE = None

@router.get("/controls")
async def get_all_controls_endpoint():
    """
    Retrieve all available NIST 800-53 controls.

    This endpoint returns the complete list of all available controls from the full dataset.
    Useful for populating dropdown lists, search interfaces, and dashboards.

    Returns:
        JSONResponse: List of all available NIST 800-53 controls (1,194 controls from comprehensive dataset)

    Example:
        GET /api/controls
        Returns all available controls from the comprehensive dataset

    Note: This endpoint is now DEPRECATED in favor of /api/controls/paginated
    which provides better performance for large datasets.
    """
    # Use cached version for better performance
    controls = get_full_controls_cached()
    return JSONResponse(content=controls)


@router.get("/controls/paginated")
async def get_controls_paginated(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page (max 200)"),
    family: Optional[str] = Query(None, description="Filter by control family"),
    baseline: Optional[str] = Query(None, description="Filter by baseline (Low, Moderate, High)"),
    search: Optional[str] = Query(None, description="Search in control_id, control_name, or description")
):
    """
    Retrieve paginated NIST 800-53 controls with filtering.

    This endpoint provides efficient pagination for the 800+ controls dataset,
    preventing the 850KB response issue.

    Args:
        page: Page number (1-based, default: 1)
        page_size: Number of items per page (default: 50, max: 200)
        family: Optional filter by control family (e.g., "Access Control")
        baseline: Optional filter by baseline (Low, Moderate, High)
        search: Optional search keyword

    Returns:
        JSON response with paginated controls and metadata

    Example:
        GET /api/controls/paginated?page=1&page_size=50&family=Access%20Control
    """
    controls = get_full_controls_cached()

    # Apply filters
    filtered_controls = controls

    if family:
        family_lower = family.lower()
        filtered_controls = [c for c in filtered_controls if c.get("family", "").lower() == family_lower]

    if baseline:
        baseline_lower = baseline.lower()
        # Support both old format (list) and new format (dict)
        temp_filtered = []
        for c in filtered_controls:
            baselines = c.get("baselines", [])
            # New format: {"low": true, "moderate": true, "high": true}
            if isinstance(baselines, dict):
                if baselines.get(baseline_lower, False):
                    temp_filtered.append(c)
            # Old format: ["Low", "Moderate", "High"]
            elif isinstance(baselines, list):
                if baseline_lower in [b.lower() for b in baselines]:
                    temp_filtered.append(c)
        filtered_controls = temp_filtered

    if search:
        search_lower = search.lower()
        filtered_controls = [
            c for c in filtered_controls
            if (search_lower in c.get("control_id", "").lower() or
                search_lower in c.get("control_name", "").lower() or
                search_lower in c.get("plain_english_explanation", "").lower())
        ]

    # Calculate pagination
    total_controls = len(filtered_controls)
    total_pages = (total_controls + page_size - 1) // page_size

    # Validate page number
    if page > total_pages and total_pages > 0:
        raise HTTPException(status_code=404, detail=f"Page {page} does not exist. Total pages: {total_pages}")

    # Extract page
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_controls = filtered_controls[start_idx:end_idx]

    return JSONResponse(content={
        "controls": page_controls,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total_controls,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        },
        "filters": {
            "family": family,
            "baseline": baseline,
            "search": search
        }
    })


@router.get("/controls/families")
async def get_control_families():
    """
    Get list of all control families in the dataset.

    Returns:
        List of unique control families for filter dropdown
    """
    controls = get_full_controls_cached()
    families = set()
    for control in controls:
        if "family" in control and control["family"]:
            families.add(control["family"])

    return JSONResponse(content={
        "families": sorted(list(families))
    })


@router.get("/baselines/{baseline}/summary")
async def get_baseline_summary(baseline: str):
    """
    Get summary statistics for a specific baseline (Low, Moderate, or High).

    Args:
        baseline: One of "low", "moderate", or "high" (case-insensitive)

    Returns:
        JSON with total controls in this baseline
    """
    baseline_lower = baseline.lower()
    if baseline_lower not in ["low", "moderate", "high"]:
        raise HTTPException(status_code=400, detail=f"Invalid baseline: {baseline}. Must be 'low', 'moderate', or 'high'")

    controls = get_full_controls_cached()

    # Count controls in this baseline
    count = 0
    for control in controls:
        baselines = control.get("baselines", {})
        # New format: {"low": true, "moderate": true, "high": true}
        if isinstance(baselines, dict):
            if baselines.get(baseline_lower, False):
                count += 1
        # Old format: ["Low", "Moderate", "High"]
        elif isinstance(baselines, list):
            if baseline_lower in [b.lower() for b in baselines]:
                count += 1

    return JSONResponse(content={
        "baseline": baseline_lower,
        "total_controls": count
    })


@router.get("/controls/full")
async def get_full_controls():
    """
    Return the frontend-ready transformed controls as an array.
    Reads backend/data/transformed_controls.json if present; otherwise falls back to all_controls_enriched.json or all_controls.json.
    """
    base_dir = Path(__file__).resolve().parents[1] / "data"
    candidates = [
        base_dir / "transformed_controls.json",
        base_dir / "all_controls_enriched.json",
        base_dir / "all_controls.json",
    ]

    for candidate in candidates:
        if candidate.exists():
            try:
                with open(candidate, 'r') as f:
                    data = json.load(f)
                # If dict keyed by control_id, convert to list
                if isinstance(data, dict):
                    data = list(data.values())
                return JSONResponse(content=data)
            except Exception as e:
                return JSONResponse(status_code=500, content={"error": f"Failed to read {candidate.name}: {e}"})

    return JSONResponse(status_code=404, content={"error": "No control dataset found"})


@router.get("/control/{control_id}")
async def get_control(control_id: str):
    """
    Retrieve a specific NIST 800-53 control by its ID.

    This endpoint returns the complete control information including official text,
    plain English explanation, intent, implementation examples, and common misinterpretations.

    Args:
        control_id (str): The NIST control ID (e.g., "AC-2", "AU-2")

    Returns:
        Control: Complete control information

    Raises:
        HTTPException: 404 if control not found

    Example:
        GET /api/control/AC-2
        Returns full AC-2 (Account Management) control details
    """
    # FIX SPU-61: Get controls from cached full dataset (1,196 controls from controls_catalog.json)
    controls = get_full_controls_cached()

    # Normalize control_id for comparison (case-insensitive)
    control_id_lower = control_id.lower()

    # Search for the control in the full dataset
    control = next(
        (c for c in controls if c.get("control_id", "").lower() == control_id_lower),
        None
    )

    if not control:
        raise HTTPException(
            status_code=404,
            detail=f"Control '{control_id}' not found"
        )

    return JSONResponse(content=control)


@router.get("/search", response_model=List[Control])
async def search_controls_endpoint(
    q: str = Query(..., description="Search keyword to find in control ID, name, or official text")
) -> List[Control]:
    """
    Search for NIST 800-53 controls matching a keyword.

    This endpoint searches across control IDs, control names, and official text
    to find relevant controls. The search is case-insensitive.

    Args:
        q (str): Search keyword or phrase

    Returns:
        List[Control]: List of matching controls (empty list if no matches)

    Example:
        GET /api/search?q=account
        Returns controls containing "account" in ID, name, or text

        GET /api/search?q=monitoring
        Returns controls related to monitoring
    """
    if not q.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query parameter 'q' cannot be empty"
        )

    # Perform the search using the data module function
    results = search_controls(q.strip())

    # Return results (empty list if no matches found)
    return results


@router.get("/health")
async def health_check():
    """
    Health check endpoint for the controls API.

    This endpoint can be used for monitoring and ensuring the API is responsive.

    Returns:
        dict: Simple health status message
    """
    return {"status": "healthy", "message": "NIST 800-53 Controls API is running"}


@router.post("/inventory/map-controls")
async def map_controls(request: InventoryRequest):
    result = []
    for resource in request.resources:
        controls = RESOURCE_CONTROL_MAP.get(resource, [])
        mapped = []
        for control in controls:
            explanation = CONTROL_EXPLANATIONS.get(control["id"], "No explanation available.")
            mapped.append({
                "id": control["id"],
                "title": control["title"],
                "explanation": explanation
            })
        result.append({
            "resource": resource,
            "controls": mapped
        })
    return JSONResponse(content={"mappings": result})


@router.post("/controls/adapt")
async def adapt_control(
    request: AdaptControlRequest = Body(...),
    force_refresh: bool = Query(False, description="Skip cache and force new GPT response")
):
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key or openai_api_key.startswith("dummy"):
        return JSONResponse(status_code=500, content={"error": "OpenAI API key not set in environment variable OPENAI_API_KEY."})

    client = OpenAI(api_key=openai_api_key)

    # Enhanced prompt with tool-specific guidance
    tools_context = ""
    if "terraform" in [tool.lower() for tool in request.tools]:
        tools_context += "Include specific Terraform resource configurations and code snippets. "
    if "linux" in [tool.lower() for tool in request.tools]:
        tools_context += "Include Linux command examples and configuration file paths. "
    if "ansible" in [tool.lower() for tool in request.tools]:
        tools_context += "Include Ansible playbook tasks and modules. "
    if "kubernetes" in [tool.lower() for tool in request.tools]:
        tools_context += "Include Kubernetes manifests and kubectl commands. "

    prompt = (
        f"You are a NIST 800-53 compliance expert providing implementation guidance for control {request.control_id}.\n\n"
        f"Context:\n"
        f"- Resource: {request.resource}\n"
        f"- Environment: {', '.join(f'{k}: {v}' for k, v in request.environment.items())}\n"
        f"- Available Tools: {', '.join(request.tools)}\n\n"
        f"Requirements:\n"
        f"1. Provide 3-4 sentences of actionable implementation steps\n"
        f"2. {tools_context}"
        f"3. Include specific configuration examples or commands where possible\n"
        f"4. Focus on practical steps a DevOps engineer can immediately implement\n"
        f"5. Reference the specific tools mentioned: {', '.join(request.tools)}\n\n"
        f"Generate concrete, tool-specific implementation guidance:"
    )

    try:
        # Use cached response system
        explanation = await get_or_generate_gpt_response(
            client=client,
            control_id=request.control_id,
            cloud=request.environment.get("cloud", "unknown"),
            os=request.environment.get("os", "unknown"),
            tools=request.tools,
            prompt=prompt,
            force_refresh=force_refresh
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

    return {
        "control_id": request.control_id,
        "resource": request.resource,
        "explanation": explanation,
        "cached": not force_refresh  # Indicate if this could be from cache
    }


@router.get("/controls/cache/stats")
async def get_cache_stats():
    """
    Get GPT response cache statistics.

    Returns information about cache usage, including total entries,
    valid entries, expired entries, and cache configuration.
    """
    stats = gpt_cache.get_cache_stats()
    return JSONResponse(content=stats)


@router.delete("/controls/cache")
async def clear_cache():
    """
    Clear all cached GPT responses.

    This endpoint removes all cached responses and forces fresh
    GPT API calls for subsequent requests.
    """
    cleared_count = gpt_cache.clear_cache()
    return JSONResponse(content={
        "message": f"Cache cleared successfully",
        "cleared_entries": cleared_count
    })


@router.post("/controls/reload")
async def reload_controls_catalog():
    """
    Reload the controls catalog from disk.

    This endpoint invalidates the in-memory cache and forces a fresh
    load of the controls_catalog.json file. Use after updating the catalog.
    """
    invalidate_controls_cache()
    controls = get_full_controls_cached()
    return JSONResponse(content={
        "message": "Controls catalog reloaded successfully",
        "total_controls": len(controls)
    })


# REMOVED: Duplicate route /controls/{control_id}/implementation
# This endpoint has been moved to routes/implementation.py which serves
# pre-generated scripts from controls_catalog.json (430+ implementations).
# The old template-based generation approach has been superseded by the
# modern implementation_router which uses `os` parameter instead of `platform`
# and serves from the comprehensive JSON catalog.
#
# If you need template-based generation, use routes/script_generation.py instead.

