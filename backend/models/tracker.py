"""
Pydantic models for NIST control implementation tracking
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ImplementationStatus(str, Enum):
    """Status options for control implementation"""
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress" 
    IMPLEMENTED = "Implemented"
    NEEDS_REVIEW = "Needs Review"
    DEFERRED = "Deferred"


class TrackerRequest(BaseModel):
    """Request model for creating/updating tracker records"""
    control_id: str = Field(..., description="NIST control ID (e.g., AC-2)")
    system_id: str = Field(..., description="System identifier this control belongs to")
    status: ImplementationStatus = Field(..., description="Implementation status")
    owner: str = Field(..., min_length=1, max_length=100, description="Person responsible")
    notes: str = Field("", max_length=2000, description="Implementation notes")
    adapted_guidance: Optional[str] = Field(None, description="AI-generated guidance")


class TrackerRecord(BaseModel):
    """Complete tracker record with metadata"""
    control_id: str
    system_id: str
    status: ImplementationStatus
    owner: str
    notes: str
    adapted_guidance: Optional[str] = None
    last_updated: datetime
    created_at: datetime


class TrackerResponse(BaseModel):
    """Response model for tracker operations"""
    success: bool
    message: str
    data: Optional[TrackerRecord] = None


class TrackerListResponse(BaseModel):
    """Response model for listing tracker records"""
    success: bool
    message: str
    data: List[TrackerRecord] = Field(default_factory=list)
    total: int = 0 