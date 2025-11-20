from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class ResourceState(BaseModel):
    """Represents the current state of a resource"""
    resource_id: str
    resource_type: str
    properties: Dict[str, Any]
    timestamp: datetime
    environment: Dict[str, str]

class BaselineSnapshot(BaseModel):
    """Stores the baseline state when compliance was first verified"""
    id: str
    resource_id: str
    resource_type: str
    control_id: str
    compliant_state: Dict[str, Any]
    created_at: datetime
    environment: Dict[str, str]
    verified_by: Optional[str] = None

class DriftChange(BaseModel):
    """Represents a single drift detection result"""
    resource: str
    issue: str
    control_id: str
    risk_level: RiskLevel
    baseline_value: Any
    current_value: Any
    detected_at: datetime

class DriftCheckRequest(BaseModel):
    """Request payload for drift checking"""
    resources: List[ResourceState]
    environment: Dict[str, str]

class DriftCheckResponse(BaseModel):
    """Response from drift checking"""
    drift_detected: bool
    changes: List[DriftChange]
    scan_timestamp: datetime
    total_resources_checked: int
    compliant_resources: int
    non_compliant_resources: int

class BaselineCreateRequest(BaseModel):
    """Request to create a new baseline"""
    resource_id: str
    resource_type: str
    control_id: str
    compliant_state: Dict[str, Any]
    environment: Dict[str, str]
    verified_by: Optional[str] = None 