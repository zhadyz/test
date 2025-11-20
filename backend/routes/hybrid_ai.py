from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from services.hybrid_ai_service import HybridAIService

router = APIRouter(
    prefix="/api",
    tags=["hybrid-ai"],
    responses={404: {"description": "Not found"}},
)

class HybridAIRequest(BaseModel):
    control_id: str
    environment_description: str
    force_api: bool = False
    context: Optional[Dict[str, Any]] = None

class HybridAIResponse(BaseModel):
    implementation_guidance: str
    risks_and_gaps: str  
    automation_tips: str
    source: str
    confidence: float
    timestamp: datetime

# Initialize hybrid AI service
hybrid_ai = HybridAIService()

@router.post("/hybrid-ai/guidance", response_model=HybridAIResponse)
async def get_hybrid_guidance(request: HybridAIRequest):
    """
    Get NIST 800-53 control implementation guidance using hybrid AI approach
    Tries local knowledge base first, falls back to API if needed
    """
    try:
        # Prepare control data for the hybrid service
        control_data = request.context or {
            'control_id': request.control_id,
            'title': f'Control {request.control_id}',
            'description': 'NIST 800-53 Control'
        }
        
        # Get hybrid guidance
        guidance_result, source = await hybrid_ai.generate_hybrid_guidance(
            control_id=request.control_id,
            control_data=control_data,
            environment_description=request.environment_description,
            force_api=request.force_api
        )
        
        return HybridAIResponse(
            implementation_guidance=guidance_result.get('implementation_guidance', ''),
            risks_and_gaps=guidance_result.get('risks_and_gaps', ''),
            automation_tips=guidance_result.get('automation_tips', ''),
            source=source,
            confidence=0.9 if source == 'Local Knowledge Base' else 0.8,
            timestamp=datetime.now()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Hybrid AI service error: {str(e)}"
        )

@router.get("/hybrid-ai/environments")
async def get_supported_environments():
    """Get list of supported environment types"""
    return {
        "environments": [
            "aws_cloud",
            "azure_cloud", 
            "kubernetes",
            "docker",
            "windows_server",
            "linux",
            "database",
            "web_application"
        ]
    }

@router.get("/hybrid-ai/controls")  
async def get_supported_controls():
    """Get list of controls with local knowledge available"""
    return {
        "controls": list(hybrid_ai.local_knowledge.keys())
    } 