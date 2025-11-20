"""
Evidence Management Models for NIST Control Evidence Mapping

This module defines the data models for managing evidence artifacts
associated with NIST 800-53 controls.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class EvidenceType(str, Enum):
    """Types of evidence that can be uploaded"""
    DOCUMENT = "document"          # PDF, DOCX, TXT files
    SCREENSHOT = "screenshot"      # PNG, JPG, GIF images
    LOG_FILE = "log_file"         # Log files, CSV, JSON
    CONFIGURATION = "configuration" # Config files, scripts
    REPORT = "report"             # Assessment reports, audit results
    CERTIFICATE = "certificate"   # Security certificates, attestations
    OTHER = "other"               # Other file types


class ConfidenceLevel(str, Enum):
    """Confidence levels for evidence quality"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EvidenceRequest(BaseModel):
    """Request model for uploading evidence"""
    control_id: str = Field(..., description="NIST control ID (e.g., AC-2)")
    system_id: str = Field(..., description="System identifier this evidence belongs to")
    title: str = Field(..., min_length=1, max_length=200, description="Evidence title/name")
    description: Optional[str] = Field(None, max_length=1000, description="Evidence description")
    evidence_type: EvidenceType = Field(EvidenceType.OTHER, description="Type of evidence")
    confidence_level: ConfidenceLevel = Field(ConfidenceLevel.MEDIUM, description="Confidence in evidence quality")
    date_collected: Optional[datetime] = Field(None, description="When the evidence was collected")
    tags: List[str] = Field(default_factory=list, description="Evidence tags for categorization")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional evidence metadata")


class EvidenceRecord(BaseModel):
    """Complete evidence record with metadata"""
    evidence_id: str = Field(..., description="Unique evidence identifier")
    control_id: str
    system_id: str
    title: str
    description: Optional[str] = None
    evidence_type: EvidenceType
    confidence_level: ConfidenceLevel
    
    # File information
    filename: str = Field(..., description="Original filename")
    file_path: str = Field(..., description="Storage path for the file")
    file_size: int = Field(..., description="File size in bytes")
    file_type: str = Field(..., description="MIME type of the file")
    file_hash: Optional[str] = Field(None, description="SHA256 hash of the file")
    
    # Metadata
    date_collected: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Audit fields
    uploaded_by: Optional[str] = Field(None, description="User who uploaded the evidence")
    uploaded_at: datetime
    last_updated: datetime
    
    # Access tracking
    access_count: int = Field(0, description="Number of times evidence was accessed")
    last_accessed: Optional[datetime] = Field(None, description="Last time evidence was accessed")


class EvidenceResponse(BaseModel):
    """Response model for evidence operations"""
    success: bool
    message: str
    data: Optional[EvidenceRecord] = None


class EvidenceListResponse(BaseModel):
    """Response model for listing evidence"""
    success: bool
    message: str
    data: List[EvidenceRecord] = Field(default_factory=list)
    total: int = 0


class EvidenceUpdateRequest(BaseModel):
    """Request model for updating evidence metadata"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    evidence_type: Optional[EvidenceType] = None
    confidence_level: Optional[ConfidenceLevel] = None
    date_collected: Optional[datetime] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class EvidenceSummary(BaseModel):
    """Summary statistics for evidence by control"""
    control_id: str
    system_id: str
    total_evidence: int = 0
    evidence_by_type: Dict[str, int] = Field(default_factory=dict)
    evidence_by_confidence: Dict[str, int] = Field(default_factory=dict)
    last_uploaded: Optional[datetime] = None


class EvidenceStatsResponse(BaseModel):
    """Response model for evidence statistics"""
    success: bool
    message: str
    data: Dict[str, Any] = Field(default_factory=dict) 