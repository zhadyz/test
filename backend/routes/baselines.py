"""
Baselines Routes Module

This module provides FastAPI endpoints for NIST 800-53 baseline filtering
with pre-computed indexes for optimal performance.

Endpoints:
- GET /api/baselines/{baseline}/controls - Get controls for a baseline
- GET /api/baselines/{baseline}/summary - Get baseline statistics
- GET /api/baselines - List all baselines
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.baseline_service import get_baseline_service


# Response models
class PaginationMetadata(BaseModel):
    """Pagination metadata."""
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


class BaselineControlsResponse(BaseModel):
    """Response model for baseline controls listing."""
    baseline: str
    total_controls: int
    filtered_count: int
    controls: List[Dict[str, Any]]
    pagination: PaginationMetadata
    filters: Dict[str, Optional[str]]


class BaselineSummaryResponse(BaseModel):
    """Response model for baseline summary."""
    baseline: str
    total_controls: int
    controls_with_scripts: int
    controls_without_scripts: int
    families: Dict[str, Dict[str, int]]


# Create router
router = APIRouter(
    prefix="/api",
    tags=["baselines"],
    responses={404: {"description": "Not found"}}
)


@router.get(
    "/baselines/{baseline}/controls",
    response_model=BaselineControlsResponse,
    summary="Get baseline controls",
    description="Retrieve controls for a specific NIST 800-53 baseline with filtering and pagination"
)
async def get_baseline_controls(
    baseline: str = Path(
        ...,
        description="Baseline name (low, moderate, high)",
        pattern="^(low|moderate|high)$"
    ),
    family: Optional[str] = Query(
        None,
        description="Filter by control family (e.g., 'Access Control')"
    ),
    search: Optional[str] = Query(
        None,
        description="Search in control ID, name, or description"
    ),
    page: int = Query(
        1,
        ge=1,
        description="Page number (1-based)"
    ),
    page_size: int = Query(
        50,
        ge=1,
        le=200,
        description="Items per page (max 200)"
    )
):
    """
    Get controls for a NIST 800-53 baseline with optional filtering.

    This endpoint uses pre-computed indexes for O(1) baseline filtering,
    providing fast responses even for large control sets.

    **Path Parameters:**
    - `baseline`: Baseline name (case-insensitive: low, moderate, high)

    **Query Parameters:**
    - `family`: Optional filter by control family
    - `search`: Optional search term (searches ID, name, description)
    - `page`: Page number (default: 1)
    - `page_size`: Items per page (default: 50, max: 200)

    **Returns:**
    Paginated list of controls with metadata

    **Example Baseline Counts (NIST SP 800-53 Rev 5):**
    - LOW: 125 controls
    - MODERATE: 325 controls
    - HIGH: 370 controls

    **Examples:**
    ```
    GET /api/baselines/high/controls?page=1&page_size=20
    GET /api/baselines/moderate/controls?family=Access%20Control
    GET /api/baselines/low/controls?search=authentication&page=1
    ```
    """
    # Get baseline service
    service = get_baseline_service()

    # Validate baseline (will raise ValueError if invalid)
    try:
        controls = service.get_baseline_controls(
            baseline=baseline,
            family=family,
            search=search
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Calculate pagination
    total_controls = len(controls)
    total_pages = (total_controls + page_size - 1) // page_size if total_controls > 0 else 1

    # Validate page number
    if page > total_pages and total_controls > 0:
        raise HTTPException(
            status_code=404,
            detail=f"Page {page} does not exist. Total pages: {total_pages}"
        )

    # Extract page
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_controls = controls[start_idx:end_idx]

    # Build response
    return JSONResponse(content={
        "baseline": baseline,
        "total_controls": total_controls,
        "filtered_count": total_controls,
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
            "search": search
        }
    })


@router.get(
    "/baselines/{baseline}/summary",
    response_model=BaselineSummaryResponse,
    summary="Get baseline summary",
    description="Retrieve summary statistics for a NIST 800-53 baseline"
)
async def get_baseline_summary(
    baseline: str = Path(
        ...,
        description="Baseline name (low, moderate, high)",
        pattern="^(low|moderate|high)$"
    )
):
    """
    Get summary statistics for a NIST 800-53 baseline.

    This endpoint provides an overview of control counts, script availability,
    and breakdown by family for a specific baseline.

    **Path Parameters:**
    - `baseline`: Baseline name (case-insensitive: low, moderate, high)

    **Returns:**
    Summary statistics including:
    - Total control count
    - Controls with implementation scripts
    - Controls without implementation scripts
    - Breakdown by family

    **Example Response:**
    ```json
    {
      "baseline": "high",
      "total_controls": 370,
      "controls_with_scripts": 245,
      "controls_without_scripts": 125,
      "families": {
        "Access Control": {
          "total": 25,
          "with_scripts": 18,
          "without_scripts": 7
        },
        ...
      }
    }
    ```
    """
    service = get_baseline_service()

    try:
        summary = service.get_baseline_summary(baseline)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return JSONResponse(content=summary)


@router.get(
    "/baselines",
    summary="List all baselines",
    description="Get list of all available NIST 800-53 baselines"
)
async def list_baselines():
    """
    List all available NIST 800-53 baselines.

    **Returns:**
    List of baseline names with descriptions

    **Example Response:**
    ```json
    {
      "baselines": [
        {
          "name": "low",
          "display_name": "Low Impact",
          "description": "Minimum baseline for low-impact systems"
        },
        {
          "name": "moderate",
          "display_name": "Moderate Impact",
          "description": "Baseline for moderate-impact systems"
        },
        {
          "name": "high",
          "display_name": "High Impact",
          "description": "Maximum baseline for high-impact systems"
        }
      ]
    }
    ```
    """
    service = get_baseline_service()
    baselines_list = service.get_all_baselines()

    # Add descriptions
    baseline_info = {
        'low': {
            'name': 'low',
            'display_name': 'Low Impact',
            'description': 'Minimum baseline for low-impact systems (FIPS 199)'
        },
        'moderate': {
            'name': 'moderate',
            'display_name': 'Moderate Impact',
            'description': 'Baseline for moderate-impact systems (FIPS 199)'
        },
        'high': {
            'name': 'high',
            'display_name': 'High Impact',
            'description': 'Maximum baseline for high-impact systems (FIPS 199)'
        }
    }

    return JSONResponse(content={
        "baselines": [baseline_info[b] for b in baselines_list]
    })


@router.get(
    "/baselines/families",
    summary="List all control families",
    description="Get list of all NIST 800-53 control families"
)
async def list_families():
    """
    List all control families in NIST 800-53.

    **Returns:**
    Sorted list of family names

    **Example Response:**
    ```json
    {
      "families": [
        "Access Control",
        "Audit and Accountability",
        "Configuration Management",
        ...
      ]
    }
    ```
    """
    service = get_baseline_service()
    families = service.get_all_families()

    return JSONResponse(content={
        "families": families
    })
