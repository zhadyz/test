"""
Conflict Detection API Routes

Provides endpoints for detecting conflicts between controls and analyzing control impacts.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from services.conflict_detector import detect_control_conflicts, get_control_impact_analysis

router = APIRouter(prefix="/api/conflicts", tags=["conflicts"])


class ConflictDetectionRequest(BaseModel):
    """Request model for conflict detection"""
    selected_controls: List[str]
    installed_software: Optional[List[str]] = None


class ConflictResponse(BaseModel):
    """Response model for conflict detection"""
    conflicts: List[Dict[str, Any]]
    total_conflicts: int
    high_severity_count: int
    medium_severity_count: int
    low_severity_count: int


class ImpactResponse(BaseModel):
    """Response model for control impact analysis"""
    control_id: str
    affected_settings: List[Dict[str, Any]]
    overridden_controls: List[str]
    prerequisite_controls: List[str]
    conflicting_controls: List[str]
    software_impacts: List[Dict[str, Any]]


@router.post("/detect", response_model=ConflictResponse)
async def detect_conflicts(request: ConflictDetectionRequest):
    """
    Detect conflicts between selected controls and installed software.
    
    This endpoint analyzes the provided controls and software to identify:
    - Direct conflicts between controls
    - Overlapping system settings with different values
    - Software that may interfere with control implementation
    
    Args:
        request: Contains selected controls and optional installed software list
        
    Returns:
        Detailed conflict analysis with severity levels and resolution suggestions
    """
    try:
        conflicts = detect_control_conflicts(
            request.selected_controls, 
            request.installed_software
        )
        
        # Calculate severity counts
        high_count = sum(1 for c in conflicts if c.get('severity') == 'high')
        medium_count = sum(1 for c in conflicts if c.get('severity') == 'medium')
        low_count = sum(1 for c in conflicts if c.get('severity') == 'low')
        
        return ConflictResponse(
            conflicts=conflicts,
            total_conflicts=len(conflicts),
            high_severity_count=high_count,
            medium_severity_count=medium_count,
            low_severity_count=low_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting conflicts: {str(e)}")


@router.get("/impact/{control_id}", response_model=ImpactResponse)
async def get_control_impact(control_id: str):
    """
    Get detailed impact analysis for a specific control.
    
    This endpoint provides comprehensive information about how a control affects:
    - System settings (registry keys, files, services, policies)
    - Other controls (prerequisites, overrides, conflicts)
    - Software tools that implement the control
    
    Args:
        control_id: The NIST control ID (e.g., "AC-2", "SC-28")
        
    Returns:
        Detailed impact analysis for the specified control
    """
    try:
        impact = get_control_impact_analysis(control_id)
        
        return ImpactResponse(
            control_id=impact['control_id'],
            affected_settings=impact['affected_settings'],
            overridden_controls=impact['overridden_controls'],
            prerequisite_controls=impact['prerequisite_controls'],
            conflicting_controls=impact['conflicting_controls'],
            software_impacts=impact['software_impacts']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing control impact: {str(e)}")


@router.get("/check/{control_id}")
async def check_single_control_conflicts(
    control_id: str,
    selected_controls: List[str] = Query(..., description="List of currently selected control IDs")
):
    """
    Check if a specific control conflicts with currently selected controls.
    
    This is a lightweight endpoint for real-time conflict checking when
    users are selecting controls in the UI.
    
    Args:
        control_id: The control ID to check for conflicts
        selected_controls: List of already selected control IDs
        
    Returns:
        Simple conflict status and basic conflict information
    """
    try:
        # Add the control being checked to the list
        all_controls = selected_controls + [control_id]
        conflicts = detect_control_conflicts(all_controls)
        
        # Filter to only conflicts involving the control being checked
        relevant_conflicts = [
            c for c in conflicts 
            if c.get('source_control') == control_id or c.get('target_control') == control_id
        ]
        
        return {
            'control_id': control_id,
            'has_conflicts': len(relevant_conflicts) > 0,
            'conflict_count': len(relevant_conflicts),
            'conflicts': relevant_conflicts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking control conflicts: {str(e)}")


@router.get("/summary")
async def get_conflict_summary(
    selected_controls: List[str] = Query(..., description="List of selected control IDs"),
    installed_software: Optional[List[str]] = Query(None, description="List of installed software IDs")
):
    """
    Get a summary of conflicts for the current selection.
    
    This endpoint provides a quick overview of conflict status without
    detailed analysis, useful for dashboard displays.
    
    Args:
        selected_controls: List of selected control IDs
        installed_software: Optional list of installed software IDs
        
    Returns:
        Summary statistics about conflicts
    """
    try:
        conflicts = detect_control_conflicts(selected_controls, installed_software)
        
        summary = {
            'total_controls': len(selected_controls),
            'total_conflicts': len(conflicts),
            'conflict_types': {},
            'severity_breakdown': {
                'high': 0,
                'medium': 0,
                'low': 0
            },
            'has_critical_conflicts': False
        }
        
        for conflict in conflicts:
            # Count by type
            conflict_type = conflict.get('type', 'unknown')
            summary['conflict_types'][conflict_type] = summary['conflict_types'].get(conflict_type, 0) + 1
            
            # Count by severity
            severity = conflict.get('severity', 'low')
            summary['severity_breakdown'][severity] += 1
            
            # Check for critical conflicts
            if severity == 'high':
                summary['has_critical_conflicts'] = True
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating conflict summary: {str(e)}") 