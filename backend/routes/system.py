"""
FastAPI routes for system management
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging

from models.system import (
    SystemRequest, SystemResponse, SystemListResponse, 
    SystemRecord, SystemStatus, SystemStatsResponse
)
from services.system_store import system_store

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/systems", tags=["systems"])


@router.post("", response_model=SystemResponse)
async def create_system(request: SystemRequest):
    """
    Create a new system
    
    - **name**: System name
    - **description**: System description
    - **tags**: Optional tags for categorization
    - **environment**: System environment (production, development, etc.)
    - **owner**: System owner/primary contact
    - **business_unit**: Business unit responsible
    - **criticality**: System criticality level
    """
    try:
        # Validate that name is unique
        existing_systems = system_store.get_all_systems()
        for system in existing_systems:
            if system.name.lower() == request.name.lower() and system.status != SystemStatus.ARCHIVED:
                raise HTTPException(
                    status_code=422,
                    detail=f"System with name '{request.name}' already exists"
                )
        
        # Create the system record
        record = system_store.create_system(
            name=request.name,
            description=request.description,
            tags=request.tags,
            environment=request.environment,
            owner=request.owner,
            business_unit=request.business_unit,
            criticality=request.criticality,
            metadata=request.metadata
        )
        
        logger.info(f"✅ Created system {record.system_id}: {request.name}")
        
        return SystemResponse(
            success=True,
            message=f"Successfully created system '{request.name}'",
            data=record
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating system: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create system: {str(e)}"
        )


@router.get("", response_model=SystemListResponse)
async def list_systems(
    status: Optional[SystemStatus] = Query(None, description="Filter by system status"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    owner: Optional[str] = Query(None, description="Filter by owner")
):
    """
    List all systems with optional filtering
    
    - **status**: Filter by system status (active, inactive, archived, draft)
    - **environment**: Filter by environment type
    - **owner**: Filter by system owner
    """
    try:
        systems = system_store.get_all_systems()
        
        # Apply filters
        if status:
            systems = [s for s in systems if s.status == status]
        
        if environment:
            systems = [s for s in systems if s.environment.value.lower() == environment.lower()]
        
        if owner:
            systems = [s for s in systems if s.owner and s.owner.lower() == owner.lower()]
        
        logger.info(f"📋 Listed {len(systems)} systems")
        
        return SystemListResponse(
            success=True,
            message=f"Found {len(systems)} systems",
            data=systems,
            total=len(systems)
        )
        
    except Exception as e:
        logger.error(f"❌ Error listing systems: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list systems: {str(e)}"
        )


@router.get("/{system_id}", response_model=SystemResponse)
async def get_system(system_id: str):
    """
    Get a specific system by ID
    
    - **system_id**: Unique system identifier
    """
    try:
        system = system_store.get_system(system_id)
        
        if not system:
            raise HTTPException(
                status_code=404,
                detail=f"System with ID '{system_id}' not found"
            )
        
        logger.info(f"📋 Retrieved system {system_id}")
        
        return SystemResponse(
            success=True,
            message=f"Found system '{system.name}'",
            data=system
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving system: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve system: {str(e)}"
        )


@router.put("/{system_id}", response_model=SystemResponse)
async def update_system(system_id: str, request: SystemRequest):
    """
    Update an existing system
    
    - **system_id**: Unique system identifier
    - **request**: Updated system data
    """
    try:
        # Check if system exists
        existing_system = system_store.get_system(system_id)
        if not existing_system:
            raise HTTPException(
                status_code=404,
                detail=f"System with ID '{system_id}' not found"
            )
        
        # Check for name conflicts (excluding current system)
        if request.name != existing_system.name:
            existing_systems = system_store.get_all_systems()
            for system in existing_systems:
                if (system.name.lower() == request.name.lower() and 
                    system.system_id != system_id and 
                    system.status != SystemStatus.ARCHIVED):
                    raise HTTPException(
                        status_code=422,
                        detail=f"System with name '{request.name}' already exists"
                    )
        
        # Update the system
        updated_system = system_store.update_system(
            system_id,
            name=request.name,
            description=request.description,
            tags=request.tags,
            environment=request.environment,
            owner=request.owner,
            business_unit=request.business_unit,
            criticality=request.criticality,
            metadata=request.metadata
        )
        
        logger.info(f"✅ Updated system {system_id}: {request.name}")
        
        return SystemResponse(
            success=True,
            message=f"Successfully updated system '{request.name}'",
            data=updated_system
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating system: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update system: {str(e)}"
        )


@router.delete("/{system_id}", response_model=SystemResponse)
async def delete_system(system_id: str):
    """
    Delete (archive) a system
    
    - **system_id**: Unique system identifier
    """
    try:
        # Check if system exists
        existing_system = system_store.get_system(system_id)
        if not existing_system:
            raise HTTPException(
                status_code=404,
                detail=f"System with ID '{system_id}' not found"
            )
        
        # Prevent deletion of the last active system
        active_systems = system_store.get_active_systems()
        if len(active_systems) <= 1 and existing_system.status == SystemStatus.ACTIVE:
            raise HTTPException(
                status_code=422,
                detail="Cannot delete the last active system. Create another system first."
            )
        
        # Archive the system
        success = system_store.delete_system(system_id)
        
        if success:
            logger.info(f"✅ Archived system {system_id}: {existing_system.name}")
            
            return SystemResponse(
                success=True,
                message=f"Successfully archived system '{existing_system.name}'",
                data=None
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to archive system"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting system: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete system: {str(e)}"
        )


@router.get("/{system_id}/stats", response_model=SystemStatsResponse)
async def get_system_stats(system_id: str):
    """
    Get detailed statistics for a system
    
    - **system_id**: Unique system identifier
    """
    try:
        system = system_store.get_system(system_id)
        
        if not system:
            raise HTTPException(
                status_code=404,
                detail=f"System with ID '{system_id}' not found"
            )
        
        summary = system_store.get_system_summary(system_id)
        
        stats = {
            "system_info": {
                "system_id": system.system_id,
                "name": system.name,
                "description": system.description,
                "environment": system.environment,
                "status": system.status,
                "created_at": system.created_at,
                "last_updated": system.last_updated
            },
            "compliance_stats": {
                "control_count": system.control_count,
                "poam_count": system.poam_count,
                "rmf_progress": system.rmf_progress
            },
            "metadata": {
                "tags": system.tags,
                "owner": system.owner,
                "business_unit": system.business_unit,
                "criticality": system.criticality
            }
        }
        
        logger.info(f"📊 Retrieved stats for system {system_id}")
        
        return SystemStatsResponse(
            success=True,
            message=f"Retrieved statistics for system '{system.name}'",
            data=stats
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving system stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve system statistics: {str(e)}"
        ) 