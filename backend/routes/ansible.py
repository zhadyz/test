"""
FastAPI routes for Ansible integration and POA&M generation
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, List
import logging
from datetime import datetime

from models.poam import POAMResponse, POAMPriority, POAMSeverity
from services.ansible_parser import ansible_parser, AnsibleTaskResult
from services.poam_store import poam_store

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/ansible", tags=["ansible"])


@router.post("/parse-output")
async def parse_ansible_output(
    output: str = Form(..., description="Ansible output to parse"),
    output_format: str = Form("auto", description="Output format: json, yaml, stdout, or auto"),
    auto_generate_poam: bool = Form(True, description="Automatically generate POA&M entries for failures")
):
    """
    Parse Ansible output and optionally generate POA&M entries for failed tasks
    
    - **output**: Raw Ansible output (JSON, YAML, or standard output)
    - **output_format**: Format type - "json", "yaml", "stdout", or "auto" for auto-detection
    - **auto_generate_poam**: Whether to automatically create POA&M entries for failures
    
    Returns parsed task results and generated POA&M entries
    """
    try:
        logger.info(f"🔍 Parsing Ansible output (format: {output_format}, auto_poam: {auto_generate_poam})")
        
        # Parse the output
        task_results, poam_entries = ansible_parser.process_ansible_output(output, output_format)
        
        # Store POA&M entries if auto-generation is enabled
        created_poams = []
        if auto_generate_poam and poam_entries:
            for poam_entry in poam_entries:
                try:
                    created_poam = poam_store.create_record(
                        control_id=poam_entry.control_id,
                        control_title=None,
                        description=poam_entry.description,
                        remediation_action=poam_entry.remediation_action,
                        estimated_completion_date=poam_entry.estimated_completion_date.date(),
                        assigned_owner=poam_entry.assigned_owner,
                        priority=POAMPriority(poam_entry.priority.value),
                        severity=POAMSeverity(poam_entry.severity.value) if poam_entry.severity else None,
                        root_cause=poam_entry.root_cause,
                        resources_required=poam_entry.resource_requirements,
                        business_impact=poam_entry.business_impact
                    )
                    created_poams.append(created_poam)
                    logger.info(f"✅ Created POA&M entry for control {poam_entry.control_id}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to create POA&M for {poam_entry.control_id}: {e}")
        
        # Prepare response
        response_data = {
            "parsed_tasks": len(task_results),
            "failed_tasks": len([r for r in task_results if r.status.value in ["failed", "skipped"]]),
            "generated_poams": len(created_poams),
            "task_results": [
                {
                    "task_name": result.task_name,
                    "control_id": result.control_id,
                    "status": result.status.value,
                    "host": result.host,
                    "error_message": result.error_message,
                    "module": result.module,
                    "tags": result.tags,
                    "timestamp": result.timestamp.isoformat()
                }
                for result in task_results
            ],
            "created_poams": [
                {
                    "id": poam.id,
                    "control_id": poam.control_id,
                    "description": poam.description,
                    "status": poam.status.value,
                    "priority": poam.priority.value,
                    "severity": poam.severity.value if poam.severity else None
                }
                for poam in created_poams
            ]
        }
        
        logger.info(f"📊 Parsed {len(task_results)} tasks, generated {len(created_poams)} POA&M entries")
        return JSONResponse(content=response_data)
        
    except ValueError as e:
        logger.error(f"❌ Invalid Ansible output format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid output format: {e}")
    except Exception as e:
        logger.error(f"❌ Error parsing Ansible output: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse Ansible output: {e}")


@router.post("/upload-results")
async def upload_ansible_results(
    file: UploadFile = File(..., description="Ansible output file"),
    output_format: str = Form("auto", description="Output format: json, yaml, stdout, or auto"),
    auto_generate_poam: bool = Form(True, description="Automatically generate POA&M entries for failures")
):
    """
    Upload and parse Ansible results file
    
    - **file**: Ansible output file (JSON, YAML, or text format)
    - **output_format**: Format type - "json", "yaml", "stdout", or "auto" for auto-detection
    - **auto_generate_poam**: Whether to automatically create POA&M entries for failures
    
    Returns parsed task results and generated POA&M entries
    """
    try:
        logger.info(f"📁 Processing uploaded Ansible results file: {file.filename}")
        
        # Read file content
        content = await file.read()
        output = content.decode('utf-8')
        
        # Parse the output using the same logic as parse_output
        task_results, poam_entries = ansible_parser.process_ansible_output(output, output_format)
        
        # Store POA&M entries if auto-generation is enabled
        created_poams = []
        if auto_generate_poam and poam_entries:
            for poam_entry in poam_entries:
                try:
                    created_poam = poam_store.create_record(
                        control_id=poam_entry.control_id,
                        control_title=None,
                        description=poam_entry.description,
                        remediation_action=poam_entry.remediation_action,
                        estimated_completion_date=poam_entry.estimated_completion_date.date(),
                        assigned_owner=poam_entry.assigned_owner,
                        priority=POAMPriority(poam_entry.priority.value),
                        severity=POAMSeverity(poam_entry.severity.value) if poam_entry.severity else None,
                        root_cause=poam_entry.root_cause,
                        resources_required=poam_entry.resource_requirements,
                        business_impact=poam_entry.business_impact
                    )
                    created_poams.append(created_poam)
                    logger.info(f"✅ Created POA&M entry for control {poam_entry.control_id}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to create POA&M for {poam_entry.control_id}: {e}")
        
        # Prepare response
        response_data = {
            "filename": file.filename,
            "file_size": len(content),
            "parsed_tasks": len(task_results),
            "failed_tasks": len([r for r in task_results if r.status.value in ["failed", "skipped"]]),
            "generated_poams": len(created_poams),
            "task_results": [
                {
                    "task_name": result.task_name,
                    "control_id": result.control_id,
                    "status": result.status.value,
                    "host": result.host,
                    "error_message": result.error_message,
                    "module": result.module,
                    "tags": result.tags,
                    "timestamp": result.timestamp.isoformat()
                }
                for result in task_results
            ],
            "created_poams": [
                {
                    "id": poam.id,
                    "control_id": poam.control_id,
                    "description": poam.description,
                    "status": poam.status.value,
                    "priority": poam.priority.value,
                    "severity": poam.severity.value if poam.severity else None
                }
                for poam in created_poams
            ]
        }
        
        logger.info(f"📊 Processed file {file.filename}: {len(task_results)} tasks, {len(created_poams)} POA&M entries")
        return JSONResponse(content=response_data)
        
    except ValueError as e:
        logger.error(f"❌ Invalid file format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid file format: {e}")
    except Exception as e:
        logger.error(f"❌ Error processing uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {e}")


@router.get("/supported-controls")
async def get_supported_controls():
    """
    Get list of NIST controls that can be automatically detected from Ansible output
    
    Returns control IDs and their descriptions that the parser can identify
    """
    try:
        supported_controls = {
            "AC-2": "Account Management",
            "AC-3": "Access Enforcement", 
            "AC-17": "Remote Access",
            "AU-2": "Audit Events",
            "AU-3": "Content of Audit Records",
            "CM-2": "Baseline Configuration",
            "CM-6": "Configuration Settings",
            "IA-2": "Identification and Authentication",
            "SC-28": "Protection of Information at Rest",
            "SI-4": "Information System Monitoring"
        }
        
        return JSONResponse(content={
            "supported_controls": supported_controls,
            "total_controls": len(supported_controls),
            "detection_patterns": [
                "Control ID in task name (e.g., 'AC-2: Configure user accounts')",
                "NIST prefix (e.g., 'NIST AC-2 implementation')",
                "STIG references (e.g., 'STIG UBTU-20-010043')",
                "Tags containing control IDs"
            ]
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting supported controls: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get supported controls: {e}")


@router.post("/test-parser")
async def test_ansible_parser(
    sample_output: str = Form(..., description="Sample Ansible output for testing"),
    output_format: str = Form("auto", description="Output format to test")
):
    """
    Test the Ansible parser with sample output (does not create POA&M entries)
    
    - **sample_output**: Sample Ansible output to test parsing
    - **output_format**: Format type to test
    
    Returns parsed results without creating POA&M entries
    """
    try:
        logger.info(f"🧪 Testing Ansible parser with format: {output_format}")
        
        # Parse without generating POA&M entries
        task_results, poam_entries = ansible_parser.process_ansible_output(sample_output, output_format)
        
        response_data = {
            "test_results": {
                "parsed_successfully": True,
                "detected_format": ansible_parser._detect_output_format(sample_output),
                "parsed_tasks": len(task_results),
                "failed_tasks": len([r for r in task_results if r.status.value in ["failed", "skipped"]]),
                "would_generate_poams": len(poam_entries)
            },
            "sample_tasks": [
                {
                    "task_name": result.task_name,
                    "control_id": result.control_id,
                    "status": result.status.value,
                    "host": result.host,
                    "error_message": result.error_message,
                    "module": result.module
                }
                for result in task_results[:5]  # Show first 5 tasks
            ],
            "potential_poams": [
                {
                    "control_id": poam.control_id,
                    "description": poam.description[:100] + "..." if len(poam.description) > 100 else poam.description,
                    "priority": poam.priority.value,
                    "severity": poam.severity.value
                }
                for poam in poam_entries
            ]
        }
        
        logger.info(f"✅ Parser test successful: {len(task_results)} tasks parsed")
        return JSONResponse(content=response_data)
        
    except ValueError as e:
        logger.error(f"❌ Parser test failed: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "test_results": {
                    "parsed_successfully": False,
                    "error": str(e),
                    "detected_format": "unknown"
                }
            }
        )
    except Exception as e:
        logger.error(f"❌ Parser test error: {e}")
        raise HTTPException(status_code=500, detail=f"Parser test failed: {e}") 