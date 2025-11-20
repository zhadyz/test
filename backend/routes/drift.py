"""
Drift Detection Routes Module

This module defines FastAPI routes for compliance drift detection.
It provides endpoints for creating baselines, checking drift, and managing baseline snapshots.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import JSONResponse
from datetime import datetime

from models.drift import (
    BaselineCreateRequest,
    BaselineSnapshot,
    DriftCheckRequest,
    DriftCheckResponse,
    ResourceState
)
from services.drift_detector import drift_detector

# Create router instance for drift detection endpoints
router = APIRouter(
    prefix="/api",
    tags=["drift"],
    responses={404: {"description": "Not found"}},
)

@router.post("/drift/baseline", response_model=BaselineSnapshot)
async def create_baseline(request: BaselineCreateRequest = Body(...)):
    """
    Create a new compliance baseline for a resource-control combination.
    
    This endpoint stores a snapshot of a resource's compliant state for a specific
    NIST control. This baseline will be used for future drift detection.
    
    Args:
        request: Baseline creation request containing resource details and compliant state
        
    Returns:
        BaselineSnapshot: The created baseline snapshot
        
    Example:
        POST /api/drift/baseline
        {
            "resource_id": "my-s3-bucket",
            "resource_type": "aws_s3",
            "control_id": "SC-28",
            "compliant_state": {
                "encryption_enabled": true,
                "kms_key_id": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
            },
            "environment": {
                "cloud": "aws",
                "region": "us-east-1"
            },
            "verified_by": "admin@example.com"
        }
    """
    try:
        baseline = drift_detector.create_baseline(
            resource_id=request.resource_id,
            resource_type=request.resource_type,
            control_id=request.control_id,
            compliant_state=request.compliant_state,
            environment=request.environment,
            verified_by=request.verified_by
        )
        return baseline
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create baseline: {str(e)}")

@router.post("/drift/check", response_model=DriftCheckResponse)
async def check_drift(request: DriftCheckRequest = Body(...)):
    """
    Check for compliance drift across multiple resources.
    
    This endpoint compares the current state of resources against their stored
    baselines and identifies any compliance drift.
    
    Args:
        request: Drift check request containing current resource states
        
    Returns:
        DriftCheckResponse: Drift detection results with identified changes
        
    Example:
        POST /api/drift/check
        {
            "resources": [
                {
                    "resource_id": "my-s3-bucket",
                    "resource_type": "aws_s3",
                    "properties": {
                        "encryption_enabled": false,
                        "public_access_blocked": true
                    },
                    "timestamp": "2024-01-01T12:00:00Z",
                    "environment": {
                        "cloud": "aws",
                        "region": "us-east-1"
                    }
                }
            ],
            "environment": {
                "cloud": "aws",
                "region": "us-east-1"
            }
        }
    """
    try:
        result = drift_detector.check_drift(request.resources, request.environment)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check drift: {str(e)}")

@router.get("/drift/baselines", response_model=List[BaselineSnapshot])
async def list_baselines():
    """
    List all stored compliance baselines.
    
    This endpoint returns all baseline snapshots that have been created for
    drift detection monitoring.
    
    Returns:
        List[BaselineSnapshot]: List of all stored baselines
        
    Example:
        GET /api/drift/baselines
        Returns all baseline snapshots with their metadata
    """
    try:
        baselines = drift_detector.list_baselines()
        return baselines
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list baselines: {str(e)}")

@router.get("/drift/baseline/{resource_type}/{resource_id}/{control_id}", response_model=BaselineSnapshot)
async def get_baseline(resource_type: str, resource_id: str, control_id: str):
    """
    Get a specific baseline snapshot.
    
    This endpoint retrieves a baseline snapshot for a specific resource-control combination.
    
    Args:
        resource_type: Type of the resource (e.g., "aws_s3", "aws_iam")
        resource_id: Unique identifier of the resource
        control_id: NIST control ID (e.g., "SC-28", "AC-2")
        
    Returns:
        BaselineSnapshot: The requested baseline snapshot
        
    Raises:
        HTTPException: 404 if baseline not found
        
    Example:
        GET /api/drift/baseline/aws_s3/my-s3-bucket/SC-28
        Returns the baseline for the specified resource-control combination
    """
    try:
        baseline = drift_detector.get_baseline(resource_id, resource_type, control_id)
        if not baseline:
            raise HTTPException(
                status_code=404, 
                detail=f"Baseline not found for {resource_type}/{resource_id}/{control_id}"
            )
        return baseline
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get baseline: {str(e)}")

@router.delete("/drift/baseline/{resource_type}/{resource_id}/{control_id}")
async def delete_baseline(resource_type: str, resource_id: str, control_id: str):
    """
    Delete a specific baseline snapshot.
    
    This endpoint removes a baseline snapshot for a specific resource-control combination.
    
    Args:
        resource_type: Type of the resource (e.g., "aws_s3", "aws_iam")
        resource_id: Unique identifier of the resource
        control_id: NIST control ID (e.g., "SC-28", "AC-2")
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: 404 if baseline not found
        
    Example:
        DELETE /api/drift/baseline/aws_s3/my-s3-bucket/SC-28
        Removes the baseline for the specified resource-control combination
    """
    try:
        # Check if baseline exists
        baseline = drift_detector.get_baseline(resource_id, resource_type, control_id)
        if not baseline:
            raise HTTPException(
                status_code=404, 
                detail=f"Baseline not found for {resource_type}/{resource_id}/{control_id}"
            )
        
        # Delete the baseline file
        baseline_id = f"{resource_type}_{resource_id}_{control_id}".replace("/", "_")
        baseline_file = drift_detector.baseline_dir / f"{baseline_id}.json"
        baseline_file.unlink(missing_ok=True)
        
        return JSONResponse(content={
            "message": f"Baseline deleted successfully for {resource_type}/{resource_id}/{control_id}"
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete baseline: {str(e)}")

@router.get("/drift/stats")
async def get_drift_stats():
    """
    Get drift detection statistics.
    
    This endpoint provides statistics about the drift detection system including
    number of baselines, resource types, and controls being monitored.
    
    Returns:
        dict: Drift detection statistics
        
    Example:
        GET /api/drift/stats
        Returns statistics about the drift detection system
    """
    try:
        baselines = drift_detector.list_baselines()
        
        # Calculate statistics
        resource_types = set(b.resource_type for b in baselines)
        control_ids = set(b.control_id for b in baselines)
        environments = {}
        
        for baseline in baselines:
            env_key = baseline.environment.get("cloud", "unknown")
            environments[env_key] = environments.get(env_key, 0) + 1
        
        stats = {
            "total_baselines": len(baselines),
            "resource_types": list(resource_types),
            "control_ids": list(control_ids),
            "environments": environments,
            "baseline_dir": str(drift_detector.baseline_dir),
            "last_updated": datetime.now().isoformat()
        }
        
        return JSONResponse(content=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get drift stats: {str(e)}")

@router.post("/drift/simulate")
async def simulate_drift():
    """
    Simulate drift detection with mock data for demonstration purposes.
    
    This endpoint creates sample baselines and then simulates drift detection
    to demonstrate the system's capabilities.
    
    Returns:
        dict: Simulation results showing drift detection in action
    """
    try:
        # Create sample baselines
        sample_baselines = [
            {
                "resource_id": "production-s3-bucket",
                "resource_type": "aws_s3",
                "control_id": "SC-28",
                "compliant_state": {
                    "encryption_enabled": True,
                    "kms_key_id": "arn:aws:kms:us-east-1:123456789012:key/sample-key"
                },
                "environment": {"cloud": "aws", "region": "us-east-1"}
            },
            {
                "resource_id": "admin-user",
                "resource_type": "aws_iam",
                "control_id": "AC-2",
                "compliant_state": {
                    "mfa_enabled": True,
                    "password_policy_enforced": True
                },
                "environment": {"cloud": "aws", "region": "us-east-1"}
            }
        ]
        
        # Create baselines
        created_baselines = []
        for baseline_data in sample_baselines:
            baseline = drift_detector.create_baseline(**baseline_data)
            created_baselines.append(baseline.id)
        
        # Simulate current state with drift
        current_resources = [
            ResourceState(
                resource_id="production-s3-bucket",
                resource_type="aws_s3",
                properties={
                    "encryption_enabled": False,  # Drift: encryption disabled
                    "kms_key_id": None
                },
                timestamp=datetime.now(),
                environment={"cloud": "aws", "region": "us-east-1"}
            ),
            ResourceState(
                resource_id="admin-user",
                resource_type="aws_iam",
                properties={
                    "mfa_enabled": False,  # Drift: MFA disabled
                    "password_policy_enforced": True
                },
                timestamp=datetime.now(),
                environment={"cloud": "aws", "region": "us-east-1"}
            )
        ]
        
        # Check for drift
        drift_result = drift_detector.check_drift(
            current_resources, 
            {"cloud": "aws", "region": "us-east-1"}
        )
        
        return JSONResponse(content={
            "simulation": "completed",
            "created_baselines": created_baselines,
            "drift_result": drift_result.dict()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to simulate drift: {str(e)}")

@router.get("/drift/health")
async def drift_health_check():
    """
    Health check endpoint for the drift detection system.
    
    This endpoint can be used for monitoring and ensuring the drift detection
    system is responsive and operational.
    
    Returns:
        dict: Health status message
    """
    return {
        "status": "healthy", 
        "message": "Drift Detection API is running",
        "baseline_dir_exists": drift_detector.baseline_dir.exists(),
        "timestamp": datetime.now().isoformat()
    } 