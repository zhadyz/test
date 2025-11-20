"""
Evidence Routes Module

This module defines FastAPI routes for evidence management operations.
It provides endpoints for uploading, downloading, and managing evidence artifacts.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import mimetypes
from datetime import datetime

from models.evidence import (
    EvidenceRecord, EvidenceRequest, EvidenceUpdateRequest, EvidenceResponse,
    EvidenceListResponse, EvidenceStatsResponse, EvidenceType, ConfidenceLevel
)
from services.evidence_store import evidence_store

# Create router instance for evidence-related endpoints
router = APIRouter(
    prefix="/api/evidence",
    tags=["evidence"],
    responses={404: {"description": "Evidence not found"}},
)


class EvidenceUploadForm(BaseModel):
    """Form data for evidence upload"""
    control_id: str
    system_id: str
    title: str
    description: Optional[str] = None
    evidence_type: EvidenceType = EvidenceType.OTHER
    confidence_level: ConfidenceLevel = ConfidenceLevel.MEDIUM
    date_collected: Optional[datetime] = None
    tags: str = ""  # Comma-separated tags
    uploaded_by: Optional[str] = None


@router.post("/upload", response_model=EvidenceResponse)
async def upload_evidence(
    file: UploadFile = File(...),
    control_id: str = Form(...),
    system_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    evidence_type: EvidenceType = Form(EvidenceType.OTHER),
    confidence_level: ConfidenceLevel = Form(ConfidenceLevel.MEDIUM),
    date_collected: Optional[str] = Form(None),
    tags: str = Form(""),
    uploaded_by: Optional[str] = Form(None)
):
    """
    Upload evidence file for a specific control and system.
    
    Args:
        file: The file to upload
        control_id: NIST control ID (e.g., AC-2)
        system_id: System identifier
        title: Evidence title/name
        description: Optional evidence description
        evidence_type: Type of evidence being uploaded
        confidence_level: Confidence in evidence quality
        date_collected: When the evidence was collected (ISO format)
        tags: Comma-separated tags
        uploaded_by: User who uploaded the evidence
    
    Returns:
        EvidenceResponse with uploaded evidence record
    """
    try:
        # Validate file size (max 50MB)
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
        file_content = await file.read()
        
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File size exceeds maximum limit of 50MB"
            )
        
        # Parse optional date
        parsed_date = None
        if date_collected:
            try:
                parsed_date = datetime.fromisoformat(date_collected.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
                )
        
        # Parse tags
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        
        # Create evidence request
        evidence_request = EvidenceRequest(
            control_id=control_id,
            system_id=system_id,
            title=title,
            description=description,
            evidence_type=evidence_type,
            confidence_level=confidence_level,
            date_collected=parsed_date,
            tags=tag_list
        )
        
        # Get file type
        file_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        
        # Upload evidence
        record = evidence_store.upload_evidence(
            request=evidence_request,
            file_content=file_content,
            filename=file.filename,
            file_type=file_type,
            uploaded_by=uploaded_by
        )
        
        return EvidenceResponse(
            success=True,
            message="Evidence uploaded successfully",
            data=record
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload evidence: {str(e)}"
        )


@router.get("/control/{control_id}", response_model=EvidenceListResponse)
async def get_evidence_by_control(
    control_id: str,
    system_id: Optional[str] = Query(None, description="Filter by system ID")
):
    """
    Get all evidence for a specific control.
    
    Args:
        control_id: NIST control ID (e.g., AC-2)
        system_id: Optional system ID filter
    
    Returns:
        List of evidence records for the control
    """
    try:
        evidence_list = evidence_store.get_evidence_by_control(control_id, system_id)
        
        return EvidenceListResponse(
            success=True,
            message=f"Found {len(evidence_list)} evidence records for control {control_id}",
            data=evidence_list,
            total=len(evidence_list)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve evidence: {str(e)}"
        )


@router.get("/system/{system_id}", response_model=EvidenceListResponse)
async def get_evidence_by_system(system_id: str):
    """
    Get all evidence for a specific system.
    
    Args:
        system_id: System identifier
    
    Returns:
        List of evidence records for the system
    """
    try:
        evidence_list = evidence_store.get_evidence_by_system(system_id)
        
        return EvidenceListResponse(
            success=True,
            message=f"Found {len(evidence_list)} evidence records for system {system_id}",
            data=evidence_list,
            total=len(evidence_list)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve evidence: {str(e)}"
        )


@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(evidence_id: str):
    """
    Get evidence record by ID.
    
    Args:
        evidence_id: Evidence identifier
    
    Returns:
        Evidence record
    """
    record = evidence_store.get_evidence(evidence_id)
    
    if not record:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found"
        )
    
    return EvidenceResponse(
        success=True,
        message="Evidence retrieved successfully",
        data=record
    )


@router.get("/{evidence_id}/download")
async def download_evidence(evidence_id: str):
    """
    Download evidence file.
    
    Args:
        evidence_id: Evidence identifier
    
    Returns:
        File download stream
    """
    content, filename = evidence_store.get_evidence_file(evidence_id)
    
    if not content or not filename:
        raise HTTPException(
            status_code=404,
            detail="Evidence file not found"
        )
    
    # Determine content type
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    
    # Create file stream
    file_stream = io.BytesIO(content)
    
    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.put("/{evidence_id}", response_model=EvidenceResponse)
async def update_evidence(evidence_id: str, update_request: EvidenceUpdateRequest):
    """
    Update evidence metadata.
    
    Args:
        evidence_id: Evidence identifier
        update_request: Updated evidence metadata
    
    Returns:
        Updated evidence record
    """
    try:
        record = evidence_store.update_evidence(evidence_id, update_request)
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Evidence not found"
            )
        
        return EvidenceResponse(
            success=True,
            message="Evidence updated successfully",
            data=record
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update evidence: {str(e)}"
        )


@router.delete("/{evidence_id}", response_model=EvidenceResponse)
async def delete_evidence(evidence_id: str):
    """
    Delete evidence record and file.
    
    Args:
        evidence_id: Evidence identifier
    
    Returns:
        Success confirmation
    """
    try:
        success = evidence_store.delete_evidence(evidence_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Evidence not found"
            )
        
        return EvidenceResponse(
            success=True,
            message="Evidence deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete evidence: {str(e)}"
        )


@router.get("/summary/{control_id}/{system_id}")
async def get_evidence_summary(control_id: str, system_id: str):
    """
    Get evidence summary statistics for a control and system.
    
    Args:
        control_id: NIST control ID
        system_id: System identifier
    
    Returns:
        Evidence summary statistics
    """
    try:
        summary = evidence_store.get_evidence_summary(control_id, system_id)
        
        return {
            "success": True,
            "message": "Evidence summary retrieved successfully",
            "data": summary
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve evidence summary: {str(e)}"
        )


@router.get("/stats/storage", response_model=EvidenceStatsResponse)
async def get_storage_stats():
    """
    Get evidence storage statistics.
    
    Returns:
        Storage statistics including file counts and sizes
    """
    try:
        stats = evidence_store.get_storage_stats()
        
        return EvidenceStatsResponse(
            success=True,
            message="Storage statistics retrieved successfully",
            data=stats
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve storage statistics: {str(e)}"
        ) 