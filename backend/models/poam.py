"""
Pydantic models for POA&M (Plan of Action and Milestones) management
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class POAMStatus(str, Enum):
    """Status options for POA&M entries"""
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    DEFERRED = "Deferred"
    CANCELLED = "Cancelled"


class POAMPriority(str, Enum):
    """Priority levels for POA&M entries"""
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class POAMSeverity(str, Enum):
    """Severity levels for POA&M entries"""
    CAT_I = "CAT I"      # Critical/High
    CAT_II = "CAT II"    # Medium
    CAT_III = "CAT III"  # Low


class POAMRequest(BaseModel):
    """Request model for creating/updating POA&M entries"""
    control_id: str = Field(..., description="NIST control ID (e.g., AC-2)")
    system_id: str = Field(..., description="System identifier this POA&M belongs to")
    control_title: Optional[str] = Field(None, description="Control title for reference")
    description: str = Field(..., min_length=10, max_length=2000, description="Description of the issue/finding")
    root_cause: Optional[str] = Field(None, max_length=1000, description="Root cause analysis")
    remediation_action: str = Field(..., min_length=10, max_length=2000, description="Recommended remediation action")
    estimated_completion_date: date = Field(..., description="Estimated completion date")
    assigned_owner: Optional[str] = Field(None, max_length=100, description="Person responsible for remediation")
    priority: POAMPriority = Field(POAMPriority.MEDIUM, description="Priority level")
    severity: Optional[POAMSeverity] = Field(None, description="Severity classification")
    resources_required: Optional[str] = Field(None, max_length=500, description="Resources needed for remediation")
    milestones: Optional[List[str]] = Field(default_factory=list, description="Key milestones for completion")
    cost_estimate: Optional[float] = Field(None, ge=0, description="Estimated cost for remediation")
    business_impact: Optional[str] = Field(None, max_length=1000, description="Business impact if not remediated")


class POAMRecord(BaseModel):
    """Complete POA&M record with metadata"""
    id: str = Field(..., description="Unique POA&M identifier")
    control_id: str
    system_id: str
    control_title: Optional[str] = None
    description: str
    root_cause: Optional[str] = None
    remediation_action: str
    estimated_completion_date: date
    actual_completion_date: Optional[date] = None
    assigned_owner: Optional[str] = None
    status: POAMStatus = POAMStatus.OPEN
    priority: POAMPriority = POAMPriority.MEDIUM
    severity: Optional[POAMSeverity] = None
    resources_required: Optional[str] = None
    milestones: List[str] = Field(default_factory=list)
    cost_estimate: Optional[float] = None
    business_impact: Optional[str] = None
    created_at: datetime
    last_updated: datetime
    created_by: Optional[str] = None
    comments: List[Dict[str, Any]] = Field(default_factory=list)  # For tracking updates/notes


class POAMUpdateRequest(BaseModel):
    """Request model for updating POA&M status and details"""
    status: Optional[POAMStatus] = None
    remediation_action: Optional[str] = None
    estimated_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    assigned_owner: Optional[str] = None
    priority: Optional[POAMPriority] = None
    severity: Optional[POAMSeverity] = None
    resources_required: Optional[str] = None
    milestones: Optional[List[str]] = None
    cost_estimate: Optional[float] = None
    business_impact: Optional[str] = None
    comment: Optional[str] = Field(None, max_length=1000, description="Update comment")


class POAMResponse(BaseModel):
    """Response model for POA&M operations"""
    success: bool
    message: str
    data: Optional[POAMRecord] = None


class POAMListResponse(BaseModel):
    """Response model for POA&M list operations"""
    success: bool
    total_count: int
    data: List[POAMRecord]


class POAMStatsResponse(BaseModel):
    """Response model for POA&M statistics"""
    success: bool
    data: Dict[str, Any]


class POAMExportRequest(BaseModel):
    """Request model for POA&M export"""
    format: str = Field("csv", description="Export format: csv or json")
    status_filter: Optional[POAMStatus] = None
    priority_filter: Optional[POAMPriority] = None
    control_family_filter: Optional[str] = None
    include_completed: bool = Field(True, description="Include completed POA&Ms") 