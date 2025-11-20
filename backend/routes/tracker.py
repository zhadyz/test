"""
FastAPI routes for NIST control implementation tracking
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging

from models.tracker import (
    TrackerRequest, TrackerResponse, TrackerListResponse,
    TrackerRecord, ImplementationStatus
)
from services.tracker_store import tracker_store

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/tracker", tags=["tracker"])


@router.post("", response_model=TrackerResponse)
async def save_tracker_record(request: TrackerRequest):
    """
    Save or update a control implementation tracker record
    
    - **control_id**: NIST control ID (e.g., "AC-2")
    - **status**: Implementation status
    - **owner**: Person responsible for implementation
    - **notes**: Implementation notes and details
    - **adapted_guidance**: Optional AI-generated guidance
    """
    try:
        # Validate that control_id follows expected format
        if not request.control_id or len(request.control_id) < 2:
            raise HTTPException(
                status_code=422,
                detail="control_id must be a valid NIST control ID (e.g., 'AC-2')"
            )
        
        # Save the record
        record = tracker_store.save_record(
            control_id=request.control_id,
            status=request.status,
            owner=request.owner,
            notes=request.notes,
            adapted_guidance=request.adapted_guidance
        )
        
        logger.info(f"✅ Saved tracker record for {request.control_id}")
        
        return TrackerResponse(
            success=True,
            message=f"Successfully saved tracking data for {request.control_id}",
            data=record
        )
        
    except Exception as e:
        logger.error(f"❌ Error saving tracker record: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save tracking data: {str(e)}"
        )


@router.get("", response_model=TrackerListResponse)
async def get_all_tracker_records(
    status: Optional[ImplementationStatus] = Query(None, description="Filter by status"),
    owner: Optional[str] = Query(None, description="Filter by owner")
):
    """
    Get all tracker records with optional filtering
    
    - **status**: Optional filter by implementation status
    - **owner**: Optional filter by owner name
    """
    try:
        # Get records based on filters
        if status:
            records = tracker_store.get_records_by_status(status)
        elif owner:
            records = tracker_store.get_records_by_owner(owner)
        else:
            records = tracker_store.get_all_records()
        
        # Sort by last_updated descending (most recent first)
        records.sort(key=lambda x: x.last_updated, reverse=True)
        
        logger.info(f"📋 Retrieved {len(records)} tracker records")
        
        return TrackerListResponse(
            success=True,
            total_count=len(records),
            data=records
        )
        
    except Exception as e:
        logger.error(f"❌ Error retrieving tracker records: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve tracking data: {str(e)}"
        )


@router.get("/{control_id}", response_model=TrackerResponse)
async def get_tracker_record(control_id: str):
    """
    Get tracker record for a specific control
    
    - **control_id**: NIST control ID (e.g., "AC-2")
    """
    try:
        record = tracker_store.get_record(control_id)
        
        if not record:
            return TrackerResponse(
                success=False,
                message=f"No tracking data found for {control_id}",
                data=None
            )
        
        logger.info(f"📋 Retrieved tracker record for {control_id}")
        
        return TrackerResponse(
            success=True,
            message=f"Found tracking data for {control_id}",
            data=record
        )
        
    except Exception as e:
        logger.error(f"❌ Error retrieving tracker record: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve tracking data: {str(e)}"
        )


@router.delete("/{control_id}")
async def delete_tracker_record(control_id: str):
    """
    Delete tracker record for a specific control
    
    - **control_id**: NIST control ID (e.g., "AC-2")
    """
    try:
        success = tracker_store.delete_record(control_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"No tracking data found for {control_id}"
            )
        
        logger.info(f"🗑️ Deleted tracker record for {control_id}")
        
        return {
            "success": True,
            "message": f"Successfully deleted tracking data for {control_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting tracker record: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete tracking data: {str(e)}"
        )


@router.get("/stats/summary")
async def get_tracker_summary():
    """
    Get summary statistics of all tracker records
    """
    try:
        all_records = tracker_store.get_all_records()
        
        # Count by status
        status_counts = {}
        for status in ImplementationStatus:
            status_counts[status.value] = len([r for r in all_records if r.status == status])
        
        # Count by owner
        owner_counts = {}
        for record in all_records:
            owner = record.owner
            owner_counts[owner] = owner_counts.get(owner, 0) + 1
        
        summary = {
            "total_controls": len(all_records),
            "status_breakdown": status_counts,
            "owner_breakdown": owner_counts,
            "completion_rate": round(
                (status_counts.get("Implemented", 0) / len(all_records) * 100) if all_records else 0, 1
            )
        }
        
        logger.info(f"📊 Generated tracker summary for {len(all_records)} records")
        
        return {
            "success": True,
            "data": summary
        }
        
    except Exception as e:
        logger.error(f"❌ Error generating tracker summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        ) 