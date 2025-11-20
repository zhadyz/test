"""
Implementation Routes Module

This module provides FastAPI endpoints for retrieving implementation scripts
for NIST 800-53 controls organized by operating system and script format.

Endpoints:
- GET /api/controls/{control_id}/implementation - Retrieve implementation scripts
"""

from typing import Optional, Dict, Any
from enum import Enum
from fastapi import APIRouter, HTTPException, Query, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.baseline_service import get_baseline_service
from services.compliance_strategy import get_compliance_strategy
from services.coverage_analysis import get_coverage_analyzer, analyze_tier1_coverage


# Helper function to categorize controls by implementation type
def categorize_control(control: Dict[str, Any]) -> Dict[str, Any]:
    """
    Categorize a control based on its characteristics to provide helpful guidance
    when implementation scripts are unavailable.

    Returns a dict with:
    - category: str - One of 'policy-only', 'administrative', 'technical', 'documentation'
    - message: str - User-friendly explanation
    - alternative: str - Suggested alternative resource
    """
    control_id = control.get('control_id', '').upper()
    control_name = control.get('control_name', '').lower()
    family = control.get('family', '').lower()

    # Policy-only controls (typically organizational procedures)
    policy_families = ['planning', 'personnel security', 'risk assessment',
                       'program management', 'policy and procedures']
    policy_keywords = ['policy', 'procedure', 'plan', 'organizational',
                       'documentation', 'agreement', 'management']

    # Administrative controls (process-oriented)
    admin_families = ['security assessment and authorization', 'contingency planning',
                     'awareness and training']
    admin_keywords = ['review', 'assessment', 'training', 'authorization',
                     'contingency', 'awareness']

    # Documentation controls
    doc_keywords = ['document', 'record', 'report', 'inventory']

    # Check for policy-only controls
    if (any(fam in family for fam in policy_families) or
        any(kw in control_name for kw in policy_keywords) or
        control_id.startswith(('PL-', 'PS-', 'RA-', 'PM-'))):
        return {
            'category': 'policy-only',
            'message': 'This is a policy-only control requiring organizational procedures rather than technical implementation.',
            'alternative': 'policy-template',
            'guidance': 'Review NIST SP 800-53 documentation for policy template guidance.'
        }

    # Check for administrative controls
    if (any(fam in family for fam in admin_families) or
        any(kw in control_name for kw in admin_keywords) or
        control_id.startswith(('CA-', 'CP-', 'AT-'))):
        return {
            'category': 'administrative',
            'message': 'This control requires procedural and administrative implementation.',
            'alternative': 'process-documentation',
            'guidance': 'Develop organizational processes and procedures to satisfy control requirements.'
        }

    # Check for documentation controls
    if any(kw in control_name for kw in doc_keywords):
        return {
            'category': 'documentation',
            'message': 'This control focuses on documentation and record-keeping.',
            'alternative': 'documentation-template',
            'guidance': 'Create documentation templates and maintain required records.'
        }

    # Default to technical (script may be coming soon)
    return {
        'category': 'technical',
        'message': 'Implementation script not yet available for this configuration.',
        'alternative': 'manual-implementation',
        'guidance': 'Refer to NIST SP 800-53 control description for manual implementation guidance.'
    }


# Enum for OS platforms
class OSPlatform(str, Enum):
    """Supported operating system platforms."""
    linux = "linux"
    windows = "windows"
    macos = "macos"


# Enum for script formats
class ScriptFormat(str, Enum):
    """Supported script formats."""
    ansible = "ansible"
    bash = "bash"
    powershell = "powershell"


# Response models
class ImplementationScriptResponse(BaseModel):
    """Response model for implementation script retrieval."""
    control_id: str
    control_name: str
    family: str
    os: str
    format: str
    implementation_script: str
    verification_script: Optional[str] = None
    metadata: Dict[str, Any]
    available_formats: Dict[str, list]


class ErrorResponse(BaseModel):
    """Error response with available formats."""
    detail: str
    control_id: str
    available_formats: Dict[str, list]


# Create router
router = APIRouter(
    prefix="/api",
    tags=["implementation"],
    responses={404: {"description": "Control not found"}}
)


@router.get(
    "/controls/{control_id}/implementation",
    response_model=ImplementationScriptResponse,
    responses={
        200: {"description": "Implementation script retrieved successfully"},
        400: {
            "description": "Script format not available",
            "model": ErrorResponse
        },
        404: {"description": "Control not found"}
    }
)
async def get_implementation_script(
    control_id: str = Path(..., description="Control ID (e.g., 'ac-2', 'au-2')"),
    os: OSPlatform = Query(..., description="Operating system platform"),
    format: ScriptFormat = Query(..., description="Script format"),
    include_verification: bool = Query(False, description="Include verification script if available")
):
    """
    Retrieve implementation script for a NIST 800-53 control.

    This endpoint returns the implementation script for a specific control,
    operating system, and script format combination.

    **Path Parameters:**
    - `control_id`: NIST control ID (case-insensitive, e.g., "ac-2", "AU-2")

    **Query Parameters:**
    - `os`: Operating system (linux, windows, macos)
    - `format`: Script format (ansible, bash, powershell)
    - `include_verification`: Whether to include verification script (default: false)

    **Returns:**
    - Implementation script with metadata
    - Available script formats for the control

    **Errors:**
    - 404: Control not found
    - 400: Requested script format not available (returns available formats)

    **Examples:**
    ```
    GET /api/controls/ac-2/implementation?os=linux&format=ansible
    GET /api/controls/au-2/implementation?os=windows&format=powershell&include_verification=true
    ```
    """
    # Get baseline service
    service = get_baseline_service()

    # Normalize control ID
    control_id_normalized = control_id.lower()

    # Retrieve control
    control = service.get_control_by_id(control_id_normalized)

    if not control:
        raise HTTPException(
            status_code=404,
            detail=f"Control '{control_id}' not found"
        )

    # Get available formats
    available_formats = service.get_available_formats(control_id_normalized)

    # Check if requested OS exists
    implementation_scripts = control.get('implementation_scripts', {})

    # ALWAYS RETURN 200 - Handle unavailable scripts gracefully
    if os.value not in implementation_scripts:
        categorization = categorize_control(control)
        return JSONResponse(
            status_code=200,
            content={
                "control_id": control['control_id'],
                "control_name": control['control_name'],
                "family": control['family'],
                "os": os.value,
                "format": format.value,
                "available": False,
                "reason": categorization['category'],
                "message": categorization['message'],
                "alternative": categorization['alternative'],
                "guidance": categorization['guidance'],
                "available_formats": available_formats,
                "metadata": control.get('metadata', {})
            }
        )

    # Check if requested format exists for the OS
    os_scripts = implementation_scripts[os.value]

    if format.value not in os_scripts:
        categorization = categorize_control(control)
        return JSONResponse(
            status_code=200,
            content={
                "control_id": control['control_id'],
                "control_name": control['control_name'],
                "family": control['family'],
                "os": os.value,
                "format": format.value,
                "available": False,
                "reason": categorization['category'],
                "message": f"Script format '{format.value}' not available for {os.value}",
                "alternative": categorization['alternative'],
                "guidance": categorization['guidance'],
                "available_formats": available_formats,
                "metadata": control.get('metadata', {})
            }
        )

    # Get the implementation script
    implementation_script = os_scripts[format.value]

    # Check if script is "Not applicable" or empty
    if implementation_script == "Not applicable" or not implementation_script:
        categorization = categorize_control(control)
        return JSONResponse(
            status_code=200,
            content={
                "control_id": control['control_id'],
                "control_name": control['control_name'],
                "family": control['family'],
                "os": os.value,
                "format": format.value,
                "available": False,
                "reason": categorization['category'],
                "message": categorization['message'],
                "alternative": categorization['alternative'],
                "guidance": categorization['guidance'],
                "available_formats": available_formats,
                "metadata": control.get('metadata', {})
            }
        )

    # Prepare successful response (script available)
    response = {
        "control_id": control['control_id'],
        "control_name": control['control_name'],
        "family": control['family'],
        "os": os.value,
        "format": format.value,
        "available": True,
        "implementation_script": implementation_script,
        "metadata": control.get('metadata', {}),
        "available_formats": available_formats
    }

    # Add verification script if requested
    if include_verification:
        # Look for verification script in the same OS section
        verification_key = f"{format.value}_verification"
        verification_script = os_scripts.get(verification_key)

        if verification_script and verification_script != "Not applicable":
            response["verification_script"] = verification_script
        else:
            response["verification_script"] = None

    return JSONResponse(content=response)


@router.get(
    "/controls/{control_id}/formats",
    summary="Get available script formats",
    description="Retrieve available implementation script formats for a control"
)
async def get_available_formats(
    control_id: str = Path(..., description="Control ID (e.g., 'ac-2')")
):
    """
    Get available implementation script formats for a control.

    This endpoint returns which operating systems and script formats
    are available for the specified control.

    **Path Parameters:**
    - `control_id`: NIST control ID (case-insensitive)

    **Returns:**
    Dictionary mapping OS to available script formats

    **Example Response:**
    ```json
    {
      "control_id": "ac-2",
      "available_formats": {
        "linux": ["ansible", "bash"],
        "windows": ["powershell"]
      },
      "has_scripts": true
    }
    ```
    """
    service = get_baseline_service()
    control_id_normalized = control_id.lower()

    # Retrieve control
    control = service.get_control_by_id(control_id_normalized)

    if not control:
        raise HTTPException(
            status_code=404,
            detail=f"Control '{control_id}' not found"
        )

    # Get available formats
    available_formats = service.get_available_formats(control_id_normalized)

    return JSONResponse(content={
        "control_id": control['control_id'],
        "control_name": control['control_name'],
        "available_formats": available_formats,
        "has_scripts": len(available_formats) > 0
    })


@router.get(
    "/controls/{control_id}/implementation/hybrid",
    summary="Get implementation using hybrid strategy",
    description="Retrieve implementation using intelligent multi-source strategy (OpenSCAP/CaC/Custom)"
)
async def get_hybrid_implementation(
    control_id: str = Path(..., description="Control ID (e.g., 'ac-2')"),
    platform: str = Query("rhel8", description="Target platform"),
    format: str = Query("bash", description="Script format (bash, ansible)")
):
    """
    Retrieve implementation script using hybrid strategy.

    This endpoint intelligently selects the best implementation source:
    1. Custom implementation (if available)
    2. OpenSCAP Security Guide
    3. ComplianceAsCode
    4. Generated template (fallback)

    **Path Parameters:**
    - `control_id`: NIST control ID (case-insensitive)

    **Query Parameters:**
    - `platform`: Target platform (rhel8, ubuntu2004, etc.)
    - `format`: Script format (bash, ansible)

    **Returns:**
    - Implementation script with source attribution
    - Quality score and metadata
    - Strategy decision information

    **Example:**
    ```
    GET /api/controls/ac-2/implementation/hybrid?platform=rhel8&format=bash
    ```
    """
    strategy = get_compliance_strategy()

    try:
        result = strategy.generate_script_hybrid(
            control_id=control_id,
            platform=platform,
            format=format
        )

        return JSONResponse(content={
            "control_id": result.control_id,
            "platform": result.platform,
            "format": result.format,
            "implementation_script": result.script,
            "source": result.source.value,
            "strategy": result.strategy.value,
            "quality_score": result.quality_score,
            "fallback_used": result.fallback_used,
            "generation_time_ms": result.generation_time_ms,
            "metadata": result.metadata
        })

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating hybrid implementation: {str(e)}"
        )


@router.get(
    "/controls/coverage/tier1",
    summary="Analyze Tier 1 control coverage",
    description="Get comprehensive coverage analysis for 30 Tier 1 NIST controls"
)
async def get_tier1_coverage(
    platform: str = Query("rhel8", description="Target platform for analysis")
):
    """
    Analyze implementation coverage for Tier 1 controls.

    Returns comprehensive analysis of OpenSCAP, ComplianceAsCode, and custom
    implementation availability for the 30 most critical NIST 800-53 controls.

    **Query Parameters:**
    - `platform`: Target platform (rhel8, ubuntu2004, etc.)

    **Returns:**
    - Summary statistics
    - Gap analysis
    - Recommendations
    - Detailed coverage by control

    **Example:**
    ```
    GET /api/controls/coverage/tier1?platform=rhel8
    ```
    """
    try:
        analysis = analyze_tier1_coverage(platform)
        return JSONResponse(content=analysis)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing coverage: {str(e)}"
        )


@router.get(
    "/controls/coverage/custom",
    summary="Analyze custom control coverage",
    description="Get coverage analysis for specified list of controls"
)
async def get_custom_coverage(
    control_ids: str = Query(..., description="Comma-separated control IDs (e.g., 'AC-2,AU-2,IA-2')"),
    platform: str = Query("rhel8", description="Target platform")
):
    """
    Analyze implementation coverage for custom control list.

    **Query Parameters:**
    - `control_ids`: Comma-separated control IDs
    - `platform`: Target platform

    **Returns:**
    - Coverage analysis for specified controls

    **Example:**
    ```
    GET /api/controls/coverage/custom?control_ids=AC-2,AU-2,IA-2&platform=rhel8
    ```
    """
    analyzer = get_coverage_analyzer()

    try:
        # Parse control IDs
        controls = [c.strip().upper() for c in control_ids.split(',')]

        if len(controls) > 100:
            raise HTTPException(
                status_code=400,
                detail="Maximum 100 controls allowed per request"
            )

        analysis = analyzer.analyze_control_coverage(controls, platform)
        return JSONResponse(content=analysis)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing coverage: {str(e)}"
        )


@router.get(
    "/controls/strategy/analytics",
    summary="Get hybrid strategy analytics",
    description="Retrieve analytics about hybrid strategy usage and performance"
)
async def get_strategy_analytics():
    """
    Get analytics about hybrid strategy performance.

    Returns statistics about:
    - Source distribution (OpenSCAP vs CaC vs Custom)
    - Average generation times
    - Fallback usage rates

    **Example:**
    ```
    GET /api/controls/strategy/analytics
    ```
    """
    strategy = get_compliance_strategy()

    try:
        analytics = strategy.get_analytics()
        return JSONResponse(content=analytics)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving analytics: {str(e)}"
        )


# ============================================================================
# AC CONTROL CAC IMPLEMENTATIONS
# ============================================================================

@router.get(
    "/ac-controls",
    summary="List all AC controls with CAC implementations",
    description="Retrieve list of Access Control (AC) controls with CAC implementations"
)
async def list_ac_controls():
    """
    List all AC (Access Control) controls that have CAC implementations.

    Returns directory structure showing available controls with rule counts.

    **Returns:**
    ```json
    {
      "controls": [
        {
          "control_id": "AC-2",
          "rules_count": 20,
          "path": "implementations/AC/ac-2"
        }
      ]
    }
    ```
    """
    import json
    from pathlib import Path

    implementations_root = Path(__file__).parent.parent.parent / "implementations" / "AC"

    if not implementations_root.exists():
        raise HTTPException(
            status_code=404,
            detail="AC implementations directory not found"
        )

    controls = []
    for control_dir in sorted(implementations_root.iterdir()):
        if control_dir.is_dir() and not control_dir.name.startswith('.'):
            metadata_file = control_dir / "control_metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    controls.append({
                        "control_id": metadata['control_id'],
                        "rules_count": metadata['total_rules'],
                        "path": str(control_dir.relative_to(implementations_root.parent.parent))
                    })

    return JSONResponse(content={"controls": controls})


@router.get(
    "/ac-controls/{control_id}",
    summary="Get AC control metadata",
    description="Retrieve detailed metadata for a specific AC control"
)
async def get_ac_control_metadata(
    control_id: str = Path(..., description="AC control ID (e.g., 'ac-2')")
):
    """
    Get metadata for a specific AC control including all available rules.

    **Path Parameters:**
    - `control_id`: AC control ID (case-insensitive)

    **Returns:**
    ```json
    {
      "control_id": "AC-2",
      "total_rules": 20,
      "rules": ["account_disable_post_pw_expiration", ...],
      "platforms": ["linux", "rhel8", ...],
      "severity_levels": ["medium", "high"]
    }
    ```
    """
    import json
    from pathlib import Path

    implementations_root = Path(__file__).parent.parent.parent / "implementations" / "AC"
    control_dir = implementations_root / control_id.lower()

    if not control_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"AC control '{control_id}' not found"
        )

    metadata_file = control_dir / "control_metadata.json"
    if not metadata_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Metadata not found for control '{control_id}'"
        )

    with open(metadata_file, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    return JSONResponse(content=metadata)


@router.get(
    "/ac-controls/{control_id}/rules",
    summary="List rules for AC control",
    description="Retrieve all available rules for a specific AC control"
)
async def list_ac_control_rules(
    control_id: str = Path(..., description="AC control ID (e.g., 'ac-2')")
):
    """
    List all implementation rules available for an AC control.

    **Path Parameters:**
    - `control_id`: AC control ID (case-insensitive)

    **Returns:**
    ```json
    {
      "control_id": "AC-2",
      "rules": [
        {
          "rule_name": "account_disable_post_pw_expiration",
          "title": "Disable Account After Password Expiration",
          "severity": "medium",
          "platforms": ["linux", "rhel8"],
          "available_scripts": ["ansible", "bash"]
        }
      ]
    }
    ```
    """
    import json
    from pathlib import Path

    implementations_root = Path(__file__).parent.parent.parent / "implementations" / "AC"
    control_dir = implementations_root / control_id.lower()

    if not control_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"AC control '{control_id}' not found"
        )

    rules = []
    for rule_dir in sorted(control_dir.iterdir()):
        if rule_dir.is_dir() and not rule_dir.name.startswith('.'):
            metadata_file = rule_dir / "metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)

                    available_scripts = []
                    for script_type in ['ansible', 'bash', 'kubernetes']:
                        if metadata['implementations'].get(script_type):
                            available_scripts.append(script_type)

                    rules.append({
                        "rule_name": metadata['rule_name'],
                        "title": metadata['title'],
                        "severity": metadata['severity'],
                        "platforms": metadata['platforms'],
                        "available_scripts": available_scripts
                    })

    return JSONResponse(content={
        "control_id": control_id.upper(),
        "rules": rules
    })


@router.get(
    "/ac-controls/{control_id}/{rule_name}",
    summary="Get AC rule implementation scripts",
    description="Retrieve implementation scripts for a specific AC control rule"
)
async def get_ac_rule_scripts(
    control_id: str = Path(..., description="AC control ID (e.g., 'ac-2')"),
    rule_name: str = Path(..., description="Rule name"),
    script_type: Optional[str] = Query(None, description="Script type (ansible, bash, kubernetes)")
):
    """
    Get implementation scripts for a specific AC control rule.

    **Path Parameters:**
    - `control_id`: AC control ID (case-insensitive)
    - `rule_name`: Rule name from the control

    **Query Parameters:**
    - `script_type`: Optional filter for specific script type

    **Returns:**
    ```json
    {
      "control_id": "AC-2",
      "rule_name": "account_disable_post_pw_expiration",
      "metadata": {...},
      "scripts": {
        "ansible": "...",
        "bash": "..."
      }
    }
    ```
    """
    import json
    from pathlib import Path

    implementations_root = Path(__file__).parent.parent.parent / "implementations" / "AC"
    rule_dir = implementations_root / control_id.lower() / rule_name

    if not rule_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Rule '{rule_name}' not found for control '{control_id}'"
        )

    metadata_file = rule_dir / "metadata.json"
    if not metadata_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Metadata not found for rule '{rule_name}'"
        )

    with open(metadata_file, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    scripts = {}
    script_types = [script_type] if script_type else ['ansible', 'bash', 'kubernetes']

    for stype in script_types:
        script_filename = metadata['implementations'].get(stype)
        if script_filename:
            script_path = rule_dir / script_filename
            if script_path.exists():
                with open(script_path, 'r', encoding='utf-8') as f:
                    scripts[stype] = f.read()

    return JSONResponse(content={
        "control_id": control_id.upper(),
        "rule_name": rule_name,
        "metadata": metadata,
        "scripts": scripts
    })
