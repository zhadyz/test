"""
System Management Models for Multi-System Support

This module defines the data models for managing multiple systems
within the NIST compliance application.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SystemStatus(str, Enum):
    """Status options for system management"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    DRAFT = "draft"


class SystemEnvironment(str, Enum):
    """Environment types for system classification"""
    PRODUCTION = "production"
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"


class SystemRequest(BaseModel):
    """Request model for creating/updating systems"""
    name: str = Field(..., min_length=1, max_length=100, description="System name")
    description: str = Field(..., min_length=10, max_length=1000, description="System description")
    tags: List[str] = Field(default_factory=list, description="System tags (e.g., prod, linux, web)")
    environment: SystemEnvironment = Field(SystemEnvironment.PRODUCTION, description="System environment")
    owner: Optional[str] = Field(None, max_length=100, description="System owner/primary contact")
    business_unit: Optional[str] = Field(None, max_length=100, description="Business unit responsible")
    criticality: Optional[str] = Field(None, description="System criticality level")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional system metadata")


class SystemRecord(BaseModel):
    """Complete system record with metadata"""
    system_id: str = Field(..., description="Unique system identifier")
    name: str
    description: str
    tags: List[str] = Field(default_factory=list)
    environment: SystemEnvironment
    owner: Optional[str] = None
    business_unit: Optional[str] = None
    criticality: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    status: SystemStatus = SystemStatus.ACTIVE
    created_at: datetime
    last_updated: datetime
    created_by: Optional[str] = None
    
    # Statistics (computed fields)
    control_count: int = Field(0, description="Number of controls tracked")
    poam_count: int = Field(0, description="Number of POA&Ms")
    rmf_progress: float = Field(0.0, description="RMF completion percentage")


class SystemResponse(BaseModel):
    """Response model for system operations"""
    success: bool
    message: str
    data: Optional[SystemRecord] = None


class SystemListResponse(BaseModel):
    """Response model for listing systems"""
    success: bool
    message: str
    data: List[SystemRecord] = Field(default_factory=list)
    total: int = 0


class SystemSummary(BaseModel):
    """Summary statistics for a system"""
    system_id: str
    name: str
    control_count: int = 0
    poam_count: int = 0
    rmf_progress: float = 0.0
    last_activity: Optional[datetime] = None


class SystemStatsResponse(BaseModel):
    """Response model for system statistics"""
    success: bool
    message: str
    data: Dict[str, Any] = Field(default_factory=dict) 