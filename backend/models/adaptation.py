"""
Pydantic models for NIST control adaptation feature
"""
from pydantic import BaseModel, Field
from typing import Optional


class AdaptationRequest(BaseModel):
    """Request model for adapting a NIST control to user's environment"""
    control_id: str = Field(..., description="NIST control ID (e.g., 'AC-2')")
    environment_description: str = Field(
        ..., 
        description="Description of user's technology environment",
        min_length=10,
        max_length=1000
    )


class AdaptationResponse(BaseModel):
    """Response model containing AI-generated implementation guidance"""
    control_id: str = Field(..., description="NIST control ID that was adapted")
    environment_description: str = Field(..., description="User's environment description")
    implementation_guidance: str = Field(..., description="Tailored implementation steps")
    risks_and_gaps: str = Field(..., description="Potential risks and challenges")
    automation_tips: str = Field(..., description="Automation suggestions and tools")
    success: bool = Field(default=True, description="Whether the adaptation was successful")
    error_message: Optional[str] = Field(default=None, description="Error message if adaptation failed") 