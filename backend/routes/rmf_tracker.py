"""
FastAPI routes for RMF Tracker functionality

This module provides API endpoints for tracking progress through the 7 RMF stages,
managing checklists, and handling artifact uploads.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
import logging
import os
import json
import uuid
from datetime import datetime
from pathlib import Path

from data.rmf_stages import (
    get_all_rmf_stages, get_rmf_stage, get_rmf_stage_checklist,
    get_rmf_progress_summary, update_task_status,
    RMF_TASK_STATUSES, RMF_TASK_PRIORITIES, RMF_ARTIFACT_TYPES
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/rmf-tracker", tags=["RMF Tracker"])

# Storage directory for uploaded artifacts
ARTIFACTS_DIR = Path("rmf_artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)

# In-memory storage for RMF tracker state (in production, use database)
rmf_tracker_state = {}

@router.get("/stages")
async def get_rmf_stages():
    """Get all RMF stages with their checklists and current status"""
    try:
        stages = get_all_rmf_stages()
        
        # Merge with any saved state
        for stage_id, stage_data in stages.items():
            if stage_id in rmf_tracker_state:
                # Update checklist items with saved state
                saved_stage = rmf_tracker_state[stage_id]
                for i, task in enumerate(stage_data['checklist']):
                    task_id = task['id']
                    if task_id in saved_stage.get('tasks', {}):
                        saved_task = saved_stage['tasks'][task_id]
                        task.update(saved_task)
        
        return {
            "success": True,
            "message": "RMF stages retrieved successfully",
            "data": stages
        }
        
    except Exception as e:
        logger.error(f"Failed to get RMF stages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get RMF stages: {str(e)}")

@router.get("/stages/{stage_id}")
async def get_rmf_stage_details(stage_id: str):
    """Get details for a specific RMF stage"""
    try:
        stage = get_rmf_stage(stage_id)
        if not stage:
            raise HTTPException(status_code=404, detail=f"RMF stage '{stage_id}' not found")
        
        # Merge with saved state if available
        if stage_id in rmf_tracker_state:
            saved_stage = rmf_tracker_state[stage_id]
            for task in stage['checklist']:
                task_id = task['id']
                if task_id in saved_stage.get('tasks', {}):
                    saved_task = saved_stage['tasks'][task_id]
                    task.update(saved_task)
        
        return {
            "success": True,
            "message": f"RMF stage '{stage_id}' retrieved successfully",
            "data": stage
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get RMF stage {stage_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get RMF stage: {str(e)}")

@router.get("/progress")
async def get_rmf_progress():
    """Get overall RMF progress summary"""
    try:
        # Calculate progress based on current state
        progress = get_rmf_progress_summary()
        
        # Add detailed stage progress from saved state
        stages_detail = {}
        all_stages = get_all_rmf_stages()
        
        for stage_id, stage_data in all_stages.items():
            total_tasks = len(stage_data['checklist'])
            completed_tasks = 0
            in_progress_tasks = 0
            
            if stage_id in rmf_tracker_state:
                saved_stage = rmf_tracker_state[stage_id]
                for task in stage_data['checklist']:
                    task_id = task['id']
                    if task_id in saved_stage.get('tasks', {}):
                        status = saved_stage['tasks'][task_id].get('status', 'not_started')
                        if status == 'completed':
                            completed_tasks += 1
                        elif status == 'in_progress':
                            in_progress_tasks += 1
            
            completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            
            stages_detail[stage_id] = {
                'name': stage_data['name'],
                'order': stage_data['order'],
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'completion_percentage': round(completion_percentage, 1),
                'status': 'completed' if completed_tasks == total_tasks else 'in_progress' if completed_tasks > 0 or in_progress_tasks > 0 else 'not_started'
            }
        
        # Calculate overall progress
        total_tasks_all = sum(stage['total_tasks'] for stage in stages_detail.values())
        completed_tasks_all = sum(stage['completed_tasks'] for stage in stages_detail.values())
        overall_completion = (completed_tasks_all / total_tasks_all * 100) if total_tasks_all > 0 else 0
        
        return {
            "success": True,
            "message": "RMF progress retrieved successfully",
            "data": {
                "overall_completion_percentage": round(overall_completion, 1),
                "total_stages": len(all_stages),
                "total_tasks": total_tasks_all,
                "completed_tasks": completed_tasks_all,
                "stages": stages_detail,
                "ready_for_authorization": overall_completion >= 100
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get RMF progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get RMF progress: {str(e)}")

@router.post("/stages/{stage_id}/tasks/{task_id}/update")
async def update_task_status_endpoint(
    stage_id: str,
    task_id: str,
    status: str = Form(...),
    notes: str = Form(""),
    assigned_to: str = Form(""),
    due_date: Optional[str] = Form(None)
):
    """Update the status of a specific RMF task"""
    try:
        # Validate status
        if status not in RMF_TASK_STATUSES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {', '.join(RMF_TASK_STATUSES)}"
            )
        
        # Get stage to validate task exists
        stage = get_rmf_stage(stage_id)
        if not stage:
            raise HTTPException(status_code=404, detail=f"RMF stage '{stage_id}' not found")
        
        # Find task in stage
        task_exists = any(task['id'] == task_id for task in stage['checklist'])
        if not task_exists:
            raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found in stage '{stage_id}'")
        
        # Initialize stage state if not exists
        if stage_id not in rmf_tracker_state:
            rmf_tracker_state[stage_id] = {'tasks': {}}
        
        if 'tasks' not in rmf_tracker_state[stage_id]:
            rmf_tracker_state[stage_id]['tasks'] = {}
        
        # Update task state
        rmf_tracker_state[stage_id]['tasks'][task_id] = {
            'status': status,
            'notes': notes,
            'assigned_to': assigned_to,
            'due_date': due_date,
            'last_updated': datetime.now().isoformat(),
            'updated_by': 'current_user'  # In production, get from auth context
        }
        
        logger.info(f"Updated task {task_id} in stage {stage_id} to status {status}")
        
        return {
            "success": True,
            "message": f"Task status updated successfully",
            "data": {
                "stage_id": stage_id,
                "task_id": task_id,
                "status": status,
                "last_updated": rmf_tracker_state[stage_id]['tasks'][task_id]['last_updated']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update task status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update task status: {str(e)}")

@router.post("/stages/{stage_id}/tasks/{task_id}/upload")
async def upload_task_artifact(
    stage_id: str,
    task_id: str,
    file: UploadFile = File(...),
    description: str = Form("")
):
    """Upload an artifact for a specific RMF task"""
    try:
        # Validate stage and task exist
        stage = get_rmf_stage(stage_id)
        if not stage:
            raise HTTPException(status_code=404, detail=f"RMF stage '{stage_id}' not found")
        
        task_exists = any(task['id'] == task_id for task in stage['checklist'])
        if not task_exists:
            raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found in stage '{stage_id}'")
        
        # Create unique filename
        file_extension = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{stage_id}_{task_id}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = ARTIFACTS_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Initialize state if needed
        if stage_id not in rmf_tracker_state:
            rmf_tracker_state[stage_id] = {'tasks': {}}
        if task_id not in rmf_tracker_state[stage_id]['tasks']:
            rmf_tracker_state[stage_id]['tasks'][task_id] = {}
        
        # Store artifact info
        if 'artifacts' not in rmf_tracker_state[stage_id]['tasks'][task_id]:
            rmf_tracker_state[stage_id]['tasks'][task_id]['artifacts'] = []
        
        artifact_info = {
            'id': str(uuid.uuid4()),
            'original_filename': file.filename,
            'stored_filename': unique_filename,
            'file_path': str(file_path),
            'file_size': len(content),
            'content_type': file.content_type,
            'description': description,
            'uploaded_at': datetime.now().isoformat(),
            'uploaded_by': 'current_user'  # In production, get from auth context
        }
        
        rmf_tracker_state[stage_id]['tasks'][task_id]['artifacts'].append(artifact_info)
        
        # Auto-update task status if artifact was required
        if rmf_tracker_state[stage_id]['tasks'][task_id].get('status', 'not_started') == 'not_started':
            rmf_tracker_state[stage_id]['tasks'][task_id]['status'] = 'in_progress'
        
        logger.info(f"Uploaded artifact for task {task_id} in stage {stage_id}: {file.filename}")
        
        return {
            "success": True,
            "message": "Artifact uploaded successfully",
            "data": {
                "artifact_id": artifact_info['id'],
                "filename": file.filename,
                "file_size": len(content),
                "uploaded_at": artifact_info['uploaded_at']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload artifact: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload artifact: {str(e)}")

@router.get("/stages/{stage_id}/tasks/{task_id}/artifacts")
async def get_task_artifacts(stage_id: str, task_id: str):
    """Get all artifacts for a specific task"""
    try:
        if (stage_id not in rmf_tracker_state or 
            task_id not in rmf_tracker_state[stage_id].get('tasks', {}) or
            'artifacts' not in rmf_tracker_state[stage_id]['tasks'][task_id]):
            return {
                "success": True,
                "message": "No artifacts found for this task",
                "data": []
            }
        
        artifacts = rmf_tracker_state[stage_id]['tasks'][task_id]['artifacts']
        
        return {
            "success": True,
            "message": f"Found {len(artifacts)} artifact(s) for task",
            "data": artifacts
        }
        
    except Exception as e:
        logger.error(f"Failed to get task artifacts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get task artifacts: {str(e)}")

@router.get("/artifacts/{artifact_id}/download")
async def download_artifact(artifact_id: str):
    """Download a specific artifact"""
    try:
        # Find artifact across all stages and tasks
        for stage_id, stage_state in rmf_tracker_state.items():
            for task_id, task_state in stage_state.get('tasks', {}).items():
                for artifact in task_state.get('artifacts', []):
                    if artifact['id'] == artifact_id:
                        file_path = Path(artifact['file_path'])
                        if file_path.exists():
                            return FileResponse(
                                path=str(file_path),
                                filename=artifact['original_filename'],
                                media_type=artifact.get('content_type', 'application/octet-stream')
                            )
                        else:
                            raise HTTPException(status_code=404, detail="Artifact file not found on disk")
        
        raise HTTPException(status_code=404, detail="Artifact not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download artifact: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download artifact: {str(e)}")

@router.delete("/artifacts/{artifact_id}")
async def delete_artifact(artifact_id: str):
    """Delete a specific artifact"""
    try:
        # Find and remove artifact
        for stage_id, stage_state in rmf_tracker_state.items():
            for task_id, task_state in stage_state.get('tasks', {}).items():
                artifacts = task_state.get('artifacts', [])
                for i, artifact in enumerate(artifacts):
                    if artifact['id'] == artifact_id:
                        # Remove file from disk
                        file_path = Path(artifact['file_path'])
                        if file_path.exists():
                            file_path.unlink()
                        
                        # Remove from state
                        artifacts.pop(i)
                        
                        logger.info(f"Deleted artifact {artifact_id}")
                        
                        return {
                            "success": True,
                            "message": "Artifact deleted successfully"
                        }
        
        raise HTTPException(status_code=404, detail="Artifact not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete artifact: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete artifact: {str(e)}")

@router.get("/statistics")
async def get_rmf_tracker_statistics():
    """Get comprehensive RMF tracker statistics"""
    try:
        all_stages = get_all_rmf_stages()
        
        # Calculate detailed statistics
        stats = {
            'total_stages': len(all_stages),
            'total_tasks': sum(len(stage['checklist']) for stage in all_stages.values()),
            'completed_tasks': 0,
            'in_progress_tasks': 0,
            'blocked_tasks': 0,
            'total_artifacts': 0,
            'tasks_by_priority': {'high': 0, 'medium': 0, 'low': 0, 'critical': 0},
            'estimated_hours_total': 0,
            'estimated_hours_remaining': 0,
            'stage_completion': {}
        }
        
        for stage_id, stage_data in all_stages.items():
            stage_stats = {
                'total_tasks': len(stage_data['checklist']),
                'completed_tasks': 0,
                'in_progress_tasks': 0,
                'artifacts_count': 0
            }
            
            for task in stage_data['checklist']:
                # Count by priority
                priority = task.get('priority', 'medium')
                stats['tasks_by_priority'][priority] += 1
                
                # Add estimated hours
                estimated_hours = task.get('estimated_hours', 0)
                stats['estimated_hours_total'] += estimated_hours
                
                # Check saved state for actual status
                task_status = 'not_started'
                if (stage_id in rmf_tracker_state and 
                    task['id'] in rmf_tracker_state[stage_id].get('tasks', {})):
                    task_state = rmf_tracker_state[stage_id]['tasks'][task['id']]
                    task_status = task_state.get('status', 'not_started')
                    
                    # Count artifacts
                    artifacts_count = len(task_state.get('artifacts', []))
                    stats['total_artifacts'] += artifacts_count
                    stage_stats['artifacts_count'] += artifacts_count
                
                # Count by status
                if task_status == 'completed':
                    stats['completed_tasks'] += 1
                    stage_stats['completed_tasks'] += 1
                elif task_status == 'in_progress':
                    stats['in_progress_tasks'] += 1
                    stage_stats['in_progress_tasks'] += 1
                elif task_status == 'blocked':
                    stats['blocked_tasks'] += 1
                else:
                    # Task not started, add to remaining hours
                    stats['estimated_hours_remaining'] += estimated_hours
            
            # Calculate stage completion percentage
            completion_pct = (stage_stats['completed_tasks'] / stage_stats['total_tasks'] * 100) if stage_stats['total_tasks'] > 0 else 0
            stage_stats['completion_percentage'] = round(completion_pct, 1)
            stats['stage_completion'][stage_id] = stage_stats
        
        # Calculate overall completion percentage
        overall_completion = (stats['completed_tasks'] / stats['total_tasks'] * 100) if stats['total_tasks'] > 0 else 0
        stats['overall_completion_percentage'] = round(overall_completion, 1)
        
        # Determine readiness for authorization
        stats['ready_for_authorization'] = overall_completion >= 100
        stats['authorization_readiness_percentage'] = min(overall_completion, 100)
        
        return {
            "success": True,
            "message": "RMF tracker statistics retrieved successfully",
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get RMF tracker statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get RMF tracker statistics: {str(e)}")

@router.get("/export")
async def export_rmf_tracker_data():
    """Export all RMF tracker data as JSON"""
    try:
        export_data = {
            'export_timestamp': datetime.now().isoformat(),
            'stages_definition': get_all_rmf_stages(),
            'tracker_state': rmf_tracker_state,
            'progress_summary': get_rmf_progress_summary()
        }
        
        return {
            "success": True,
            "message": "RMF tracker data exported successfully",
            "data": export_data
        }
        
    except Exception as e:
        logger.error(f"Failed to export RMF tracker data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export RMF tracker data: {str(e)}")

@router.post("/import")
async def import_rmf_tracker_data(data: Dict[str, Any]):
    """Import RMF tracker data from JSON"""
    try:
        if 'tracker_state' in data:
            # Validate and import tracker state
            global rmf_tracker_state
            rmf_tracker_state = data['tracker_state']
            
            logger.info("RMF tracker data imported successfully")
            
            return {
                "success": True,
                "message": "RMF tracker data imported successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid import data format")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to import RMF tracker data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to import RMF tracker data: {str(e)}")

@router.get("/reference/statuses")
async def get_available_statuses():
    """Get available task statuses"""
    return {
        "success": True,
        "data": {
            "statuses": RMF_TASK_STATUSES,
            "priorities": RMF_TASK_PRIORITIES,
            "artifact_types": RMF_ARTIFACT_TYPES
        }
    } 