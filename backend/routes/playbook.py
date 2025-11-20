from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from models.playbook import (
    PlaybookRequest,
    PlaybookResponse,
    PlaybookTemplate,
    PlaybookGenerationStats,
    OperatingSystem
)
from services.playbook_generator import playbook_generator

router = APIRouter()

@router.post("/generate", response_model=PlaybookResponse)
async def generate_playbook(request: PlaybookRequest):
    """
    Generate an Ansible playbook for a NIST 800-53 control
    
    This endpoint uses a hybrid approach:
    1. First checks for static templates
    2. Falls back to GPT generation if no template exists
    3. Caches all results for future use
    """
    try:
        return playbook_generator.generate_playbook(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate playbook: {str(e)}")

@router.get("/templates", response_model=List[PlaybookTemplate])
async def list_templates():
    """List all available static playbook templates"""
    return playbook_generator.list_templates()

@router.get("/stats", response_model=PlaybookGenerationStats)
async def get_stats():
    """Get statistics about playbook generation system"""
    return playbook_generator.get_stats()

@router.get("/supported-controls/{operating_system}")
async def get_supported_controls(operating_system: OperatingSystem):
    """Get list of controls supported by static templates for a given OS"""
    try:
        controls = playbook_generator.get_supported_controls(operating_system)
        return {
            "operating_system": operating_system,
            "supported_controls": controls,
            "count": len(controls)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/operating-systems")
async def get_operating_systems():
    """Get list of supported operating systems"""
    return {
        "operating_systems": [
            {
                "value": os.value,
                "display_name": os.value.replace("_", " ").title()
            }
            for os in OperatingSystem
        ]
    }

@router.post("/validate")
async def validate_playbook(playbook_yaml: str):
    """Validate Ansible playbook YAML syntax"""
    try:
        import yaml
        yaml.safe_load(playbook_yaml)
        return {"valid": True, "message": "Playbook YAML is valid"}
    except yaml.YAMLError as e:
        return {"valid": False, "message": f"YAML syntax error: {str(e)}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.post("/demo")
async def demo_playbook_generation():
    """
    Generate demo playbooks for common control/OS combinations
    """
    demo_requests = [
        PlaybookRequest(
            control_id="AC-17",
            operating_system=OperatingSystem.UBUNTU_20_04,
            environment={"demo": "true"}
        ),
        PlaybookRequest(
            control_id="SC-28",
            operating_system=OperatingSystem.RHEL_8,
            environment={"demo": "true"}
        ),
        PlaybookRequest(
            control_id="AU-2",
            operating_system=OperatingSystem.UBUNTU_22_04,
            environment={"demo": "true"}
        )
    ]
    
    results = []
    for request in demo_requests:
        try:
            playbook = playbook_generator.generate_playbook(request)
            results.append({
                "control_id": playbook.control_id,
                "operating_system": playbook.operating_system,
                "source": playbook.source,
                "cached": playbook.cached,
                "tasks_count": len(playbook.tasks),
                "success": True
            })
        except Exception as e:
            results.append({
                "control_id": request.control_id,
                "operating_system": request.operating_system,
                "error": str(e),
                "success": False
            })
    
    return {
        "demo_results": results,
        "total_generated": len([r for r in results if r["success"]]),
        "total_failed": len([r for r in results if not r["success"]])
    }

@router.post("/generate-bulk", response_model=PlaybookResponse)
async def generate_bulk_playbook(request: dict):
    """
    Generate a combined Ansible playbook for multiple NIST 800-53 controls
    
    This endpoint accepts a list of control IDs and generates a single
    comprehensive playbook that implements all selected controls.
    """
    try:
        control_ids = request.get("control_ids", [])
        operating_system = request.get("operating_system", "ubuntu_20_04")
        playbook_name = request.get("playbook_name", "Multi-Control Compliance Playbook")
        environment = request.get("environment", {})
        
        if not control_ids:
            raise HTTPException(status_code=400, detail="No control IDs provided")
        
        if len(control_ids) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 controls allowed per playbook")
        
        # Generate combined playbook
        result = playbook_generator.generate_bulk_playbook(
            control_ids=control_ids,
            operating_system=operating_system,
            playbook_name=playbook_name,
            environment=environment
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate bulk playbook: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint for the playbook generator"""
    try:
        stats = playbook_generator.get_stats()
        return {
            "status": "healthy",
            "templates_available": stats.available_templates,
            "supported_os_count": stats.supported_os_count,
            "cache_directory_exists": playbook_generator.cache_dir.exists(),
            "templates_directory_exists": playbook_generator.templates_dir.exists()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.delete("/cache")
async def clear_cache():
    """Clear the playbook generation cache"""
    try:
        import shutil
        if playbook_generator.cache_dir.exists():
            shutil.rmtree(playbook_generator.cache_dir)
            playbook_generator.cache_dir.mkdir(exist_ok=True)
        
        # Reset stats
        playbook_generator.stats = {
            "total_requests": 0,
            "static_template_hits": 0,
            "gpt_generated": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
        
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

@router.get("/cache/analytics")
async def get_cache_analytics():
    """Get detailed cache analytics and performance metrics"""
    try:
        analytics = playbook_generator.get_cache_analytics()
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache analytics: {str(e)}")

@router.post("/cache/warm")
async def warm_cache():
    """Pre-generate and cache playbooks for common control/OS combinations"""
    try:
        results = playbook_generator.warm_cache_for_common_requests()
        return {
            "message": "Cache warming completed",
            "results": results,
            "total_combinations": len(results),
            "successful": len([r for r in results.values() if not r.startswith("Error")])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to warm cache: {str(e)}")

@router.get("/cache/status")
async def get_cache_status():
    """Get current cache status and configuration"""
    import os
    try:
        cache_files = list(playbook_generator.cache_dir.glob("*.json"))
        total_size = sum(f.stat().st_size for f in cache_files)
        
        return {
            "cache_directory": str(playbook_generator.cache_dir),
            "cache_exists": playbook_generator.cache_dir.exists(),
            "total_cached_files": len(cache_files),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "cache_ttl_days": int(os.getenv("PLAYBOOK_CACHE_TTL_DAYS", "30")),
            "stats": playbook_generator.stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache status: {str(e)}") 