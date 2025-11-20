"""
Admin Routes - Internal administration endpoints

Provides endpoints for managing application state and services.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from services.baseline_service import reset_baseline_service, get_baseline_service

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"]
)


@router.post(
    "/reload-catalog",
    summary="Reload controls catalog",
    description="Force reload of controls_catalog.json by resetting the BaselineService singleton"
)
async def reload_catalog():
    """
    Force reload the controls catalog from JSON.

    This endpoint resets the BaselineService singleton, causing it to reload
    controls_catalog.json on the next request. Useful after manual catalog updates
    or migrations.

    **Returns:**
    ```json
    {
      "success": true,
      "message": "Catalog reloaded successfully",
      "controls_count": 1206,
      "families_count": 20
    }
    ```
    """
    try:
        # Reset the singleton
        reset_baseline_service()

        # Trigger reload by accessing the service
        service = get_baseline_service()

        # Get stats
        controls_count = len(service.controls)
        families_count = len(service.families)

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Catalog reloaded successfully",
                "controls_count": controls_count,
                "families_count": families_count,
                "baselines": {
                    "low": sum(len(controls) for controls in service.baseline_indexes['low'].values()),
                    "moderate": sum(len(controls) for controls in service.baseline_indexes['moderate'].values()),
                    "high": sum(len(controls) for controls in service.baseline_indexes['high'].values())
                }
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Failed to reload catalog: {str(e)}"
            }
        )


@router.get(
    "/service-stats",
    summary="Get service statistics",
    description="Retrieve current BaselineService statistics"
)
async def get_service_stats():
    """
    Get statistics about the current BaselineService state.

    **Returns:**
    ```json
    {
      "controls_count": 1206,
      "families_count": 20,
      "baselines": {...}
    }
    ```
    """
    service = get_baseline_service()

    return JSONResponse(content={
        "controls_count": len(service.controls),
        "families_count": len(service.families),
        "families": service.get_all_families(),
        "baselines": {
            "low": sum(len(controls) for controls in service.baseline_indexes['low'].values()),
            "moderate": sum(len(controls) for controls in service.baseline_indexes['moderate'].values()),
            "high": sum(len(controls) for controls in service.baseline_indexes['high'].values())
        }
    })
