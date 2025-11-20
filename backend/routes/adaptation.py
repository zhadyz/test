"""
FastAPI routes for NIST control adaptation feature with Hybrid AI approach
"""
import logging
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any

# Import our models and services
from models.adaptation import AdaptationRequest, AdaptationResponse
from services.hybrid_ai_service import hybrid_ai_service
from data.controls import CONTROLS_DATA

logger = logging.getLogger(__name__)

# Create router for adaptation endpoints
router = APIRouter(prefix="/api", tags=["adaptation"])


@router.post("/adapt", response_model=AdaptationResponse)
async def adapt_control_to_environment(request: AdaptationRequest) -> AdaptationResponse:
    """
    Generate environment-specific implementation guidance using hybrid AI approach
    
    Hybrid approach:
    1. Try local knowledge base first (instant response)
    2. Fall back to AI API if local knowledge insufficient
    3. Provide fallback guidance if both fail
    """
    try:
        # Validate control ID
        if request.control_id not in CONTROLS_DATA:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Control {request.control_id} not found"
            )
        
        control_data = CONTROLS_DATA[request.control_id]
        logger.info(f"Hybrid guidance for {request.control_id}")
        
        # Generate hybrid guidance
        guidance_dict, source_type = await hybrid_ai_service.generate_hybrid_guidance(
            control_id=request.control_id,
            control_data=control_data,
            environment_description=request.environment_description
        )
        
        success = source_type != "fallback"
        
        return AdaptationResponse(
            control_id=request.control_id,
            environment_description=request.environment_description,
            implementation_guidance=guidance_dict["implementation_guidance"],
            risks_and_gaps=guidance_dict["risks_and_gaps"], 
            automation_tips=guidance_dict["automation_tips"],
            success=success,
            error_message=None if success else "Using fallback guidance"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Adaptation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Request processing failed"
        )


@router.get("/adapt/health")
async def adaptation_health_check() -> Dict[str, str]:
    """Health check for hybrid adaptation service"""
    local_controls = len(hybrid_ai_service.local_knowledge)
    
    from services.ai_adapter import ai_adapter
    ai_status = "available" if (ai_adapter.anthropic_client or ai_adapter.openai_client) else "unavailable"
    
    return {
        "status": "healthy",
        "local_knowledge_controls": str(local_controls),
        "ai_service": ai_status,
        "hybrid_approach": "enabled"
    }


@router.get("/adapt/knowledge-stats", response_model=None)
async def get_knowledge_stats():
    """Get statistics about the local knowledge base"""
    
    stats = {
        "total_controls": len(hybrid_ai_service.local_knowledge),
        "supported_environments": list(hybrid_ai_service.environment_patterns.keys()),
        "controls_by_environment": {},
        "environment_keywords": {}
    }
    
    # Count controls per environment
    for control_id, environments in hybrid_ai_service.local_knowledge.items():
        for env_type in environments.keys():
            if env_type not in stats["controls_by_environment"]:
                stats["controls_by_environment"][env_type] = 0
            stats["controls_by_environment"][env_type] += 1
    
    # Include environment detection keywords
    stats["environment_keywords"] = hybrid_ai_service.environment_patterns
    
    return stats