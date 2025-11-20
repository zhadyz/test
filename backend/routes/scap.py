"""
FastAPI routes for SCAP scan results integration and POA&M generation
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
import defusedxml.ElementTree as ET
import json
import yaml

from models.poam import POAMResponse, POAMPriority, POAMSeverity
from services.scap_parser import scap_parser, SCAPFinding, SCAPScanSummary
from services.poam_store import poam_store
from services.scan_tracker_service import scan_tracker_service
from core.security import get_current_user, require_editor

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/scap", tags=["scap"])

# Security configuration for file uploads
ALLOWED_EXTENSIONS = {'.xml', '.nessus', '.json', '.yaml', '.yml'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB (keep existing limit)


@router.post("/upload-scan")
async def upload_scap_scan(
    file: UploadFile = File(..., description="SCAP scan results file (.xml, .nessus, .json, .yaml)"),
    auto_generate_poam: bool = Form(True, description="Automatically generate POA&M entries for failed controls"),
    auto_update_tracker: bool = Form(True, description="Automatically update control implementation status based on scan results"),
    system_id: str = Form("default", description="System identifier for the scan"),
    override_manual_changes: bool = Form(False, description="Override manual tracker changes with scan results"),
    preview_only: bool = Form(False, description="Preview results without creating POA&M entries or updating tracker"),
    current_user: Dict[str, Any] = Depends(require_editor)  # SECURITY: Require authentication and editor role
):
    """
    Upload and parse SCAP scan results file (OpenSCAP XML, Nessus .nessus, JSON, or YAML)

    **AUTHENTICATION REQUIRED** - Requires editor or admin role

    - **file**: SCAP scan results file (XML, .nessus, JSON, or YAML format)
    - **auto_generate_poam**: Whether to automatically create POA&M entries for failures
    - **auto_update_tracker**: Whether to automatically update tracker status based on scan results
    - **system_id**: System identifier for tracking purposes
    - **override_manual_changes**: Whether to override recent manual tracker changes
    - **preview_only**: If true, only show preview without creating POA&M entries or updating tracker

    Returns parsed scan results, summary, generated POA&M entries, and tracker updates
    """
    try:
        logger.info(f"🔍 Processing SCAP scan file: {file.filename} (uploaded by {current_user.get('username', 'unknown')})")

        # SECURITY: Validate file type using whitelist
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        # Extract file extension
        file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''

        # SECURITY: Strict extension whitelist
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # SECURITY: Validate file size BEFORE reading content
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to start

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.0f}MB"
            )

        # Read file content
        content = await file.read()

        # SECURITY: Decode and validate content structure based on file type
        try:
            file_content = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                file_content = content.decode('latin-1')
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Unable to decode file. Please ensure it's a valid text-based file."
                )

        # SECURITY: Validate file structure based on type (prevents malformed/malicious content)
        if file_ext in {'.xml', '.nessus'}:
            try:
                # Use defusedxml to prevent XXE attacks and validate XML structure
                ET.fromstring(content)
                logger.info(f"✅ XML structure validated for {file.filename}")
            except ET.ParseError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid XML structure: {str(e)}"
                )

        elif file_ext == '.json':
            try:
                # Validate JSON structure
                json.loads(file_content)
                logger.info(f"✅ JSON structure validated for {file.filename}")
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid JSON structure: {str(e)}"
                )

        elif file_ext in {'.yaml', '.yml'}:
            try:
                # Validate YAML structure using safe_load (prevents arbitrary code execution)
                yaml.safe_load(file_content)
                logger.info(f"✅ YAML structure validated for {file.filename}")
            except yaml.YAMLError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid YAML structure: {str(e)}"
                )

        # Parse the SCAP file (uses defusedxml internally for XML files)
        findings, summary, poam_entries = scap_parser.process_scap_file(file_content, file.filename, system_id)
        
        # Update tracker based on scan results
        tracker_update_stats = None
        if auto_update_tracker and not preview_only:
            try:
                tracker_update_stats = scan_tracker_service.update_tracker_from_scan(
                    findings=findings,
                    scan_summary=summary,
                    system_id=system_id,
                    override_manual_changes=override_manual_changes
                )
                logger.info(f"📊 Tracker update: {tracker_update_stats['controls_updated']} controls updated")
            except Exception as e:
                logger.error(f"⚠️ Error updating tracker: {e}")
                tracker_update_stats = {"error": str(e)}
        
        # Create POA&M entries if requested and not preview mode
        created_poams = []
        if auto_generate_poam and not preview_only and poam_entries:
            for poam_entry in poam_entries:
                try:
                    created_poam = poam_store.create_record(
                        control_id=poam_entry.control_id,
                        system_id=poam_entry.system_id,
                        control_title=poam_entry.control_title,
                        description=poam_entry.description,
                        remediation_action=poam_entry.remediation_action,
                        estimated_completion_date=poam_entry.estimated_completion_date,
                        assigned_owner=poam_entry.assigned_owner,
                        priority=poam_entry.priority,
                        severity=poam_entry.severity,
                        root_cause=poam_entry.root_cause,
                        resources_required=poam_entry.resources_required,
                        business_impact=poam_entry.business_impact
                    )
                    created_poams.append(created_poam)
                    logger.info(f"✅ Created POA&M entry for control {poam_entry.control_id}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to create POA&M for {poam_entry.control_id}: {e}")
        
        # Prepare response data with audit information
        response_data = {
            "filename": file.filename,
            "file_size": file_size,
            "system_id": system_id,
            "uploaded_by": current_user.get('username'),  # AUDIT: Track who uploaded the file
            "uploaded_at": datetime.utcnow().isoformat(),  # AUDIT: Track when file was uploaded
            "scanner": summary.scanner,
            "scan_date": summary.scan_date.isoformat() if summary.scan_date else None,
            "target_system": summary.target_system,
            "profile": summary.profile,
            "summary": {
                "total_rules": summary.total_rules,
                "passed": summary.passed,
                "failed": summary.failed,
                "errors": summary.errors,
                "not_applicable": summary.not_applicable,
                "not_checked": summary.not_checked
            },
            "findings": [
                {
                    "rule_id": finding.rule_id,
                    "rule_title": finding.rule_title,
                    "control_id": finding.control_id,
                    "severity": finding.severity,
                    "status": finding.status.value,
                    "description": finding.description[:200] + "..." if len(finding.description) > 200 else finding.description,
                    "remediation": finding.remediation[:200] + "..." if finding.remediation and len(finding.remediation) > 200 else finding.remediation,
                    "affected_hosts": finding.affected_hosts,
                    "cvss_score": finding.cvss_score,
                    "plugin_id": finding.plugin_id
                }
                for finding in findings[:100]  # Limit to first 100 findings for performance
            ],
            "generated_poams": len(poam_entries),
            "created_poams": len(created_poams) if not preview_only else 0,
            "preview_mode": preview_only,
            "tracker_updates": tracker_update_stats,
            "poam_preview": [
                {
                    "control_id": poam.control_id,
                    "description": poam.description[:200] + "..." if len(poam.description) > 200 else poam.description,
                    "priority": poam.priority.value,
                    "severity": poam.severity.value if poam.severity else None,
                    "estimated_completion_date": poam.estimated_completion_date.isoformat()
                }
                for poam in poam_entries
            ]
        }
        
        if created_poams and not preview_only:
            response_data["created_poam_details"] = [
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
        
        logger.info(f"📊 Processed SCAP file {file.filename}: {summary.total_rules} rules, {summary.failed} failed, {len(poam_entries)} POA&M entries")
        return JSONResponse(content=response_data)
        
    except ValueError as e:
        logger.error(f"❌ Invalid file format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid file format: {e}")
    except Exception as e:
        logger.error(f"❌ Error processing SCAP file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process SCAP file: {e}")


@router.post("/validate-file")
async def validate_scap_file(
    file: UploadFile = File(..., description="SCAP scan results file to validate"),
    current_user: Dict[str, Any] = Depends(require_editor)  # SECURITY: Require authentication
):
    """
    Validate SCAP file format without processing

    **AUTHENTICATION REQUIRED** - Requires editor or admin role

    - **file**: SCAP scan results file to validate

    Returns file format detection and basic validation results
    """
    try:
        logger.info(f"🔍 Validating SCAP file: {file.filename} (by {current_user.get('username', 'unknown')})")

        # SECURITY: Validate file extension
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''

        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # SECURITY: Validate file size (1MB limit for validation)
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        validation_size_limit = 1024 * 1024  # 1MB
        if file_size > validation_size_limit:
            # Only read first 1MB for validation
            content = await file.read(validation_size_limit)
        else:
            content = await file.read()

        # Decode content
        try:
            file_content = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                file_content = content.decode('latin-1')
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Unable to decode file. Please ensure it's a valid text-based file."
                )

        # Detect file format
        detected_format = scap_parser.detect_file_format(file_content, file.filename)

        # SECURITY: Validate content structure based on file type
        is_valid = False
        validation_error = None

        if file_ext in {'.xml', '.nessus'}:
            try:
                # Use defusedxml to prevent XXE attacks
                ET.fromstring(content)
                is_valid = True
            except ET.ParseError as e:
                validation_error = str(e)

        elif file_ext == '.json':
            try:
                json.loads(file_content)
                is_valid = True
            except json.JSONDecodeError as e:
                validation_error = str(e)

        elif file_ext in {'.yaml', '.yml'}:
            try:
                yaml.safe_load(file_content)
                is_valid = True
            except yaml.YAMLError as e:
                validation_error = str(e)
        
        response_data = {
            "filename": file.filename,
            "file_size": file_size,
            "file_extension": file_ext,
            "detected_format": detected_format,
            "is_supported": detected_format in ['openscap', 'nessus'],
            "is_valid": is_valid,
            "validation_error": validation_error,
            "validation_status": "valid" if is_valid and detected_format != 'unknown' else "invalid",
            "validated_by": current_user.get('username')  # AUDIT: Track who validated the file
        }

        logger.info(f"📋 Validated file {file.filename}: format={detected_format}, valid={is_valid}")
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"❌ Error validating SCAP file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to validate file: {e}")


@router.get("/supported-formats")
async def get_supported_formats():
    """
    Get information about supported SCAP file formats
    
    Returns details about supported file types and scanners
    """
    return JSONResponse(content={
        "supported_formats": [
            {
                "format": "openscap",
                "description": "OpenSCAP XML results files",
                "file_extensions": [".xml"],
                "scanner_types": ["OpenSCAP", "SCAP Compliance Checker"],
                "features": [
                    "NIST 800-53 control mapping",
                    "STIG rule compliance",
                    "Rule-level remediation guidance",
                    "Detailed check content"
                ]
            },
            {
                "format": "nessus",
                "description": "Nessus vulnerability scan exports",
                "file_extensions": [".nessus"],
                "scanner_types": ["Nessus Professional", "Nessus Essentials"],
                "features": [
                    "CVSS scoring",
                    "Vulnerability remediation",
                    "Host-based findings",
                    "Reference links"
                ]
            }
        ],
        "file_size_limit": "50MB",
        "supported_controls": [
            "NIST 800-53 controls (AC-, AU-, SC-, CM-, SI-, IA-)",
            "Control Correlation Identifiers (CCI)",
            "Security Requirements Guide (SRG) identifiers"
        ]
    })


@router.get("/scan-managed-controls")
async def get_scan_managed_controls():
    """
    Get list of controls that are currently managed by scan-based updates
    
    Returns list of control IDs that are automatically updated based on scan results
    """
    try:
        scan_managed = scan_tracker_service.get_scan_based_controls()
        
        return JSONResponse(content={
            "success": True,
            "scan_managed_controls": scan_managed,
            "count": len(scan_managed),
            "scan_owner": scan_tracker_service.scan_owner
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting scan-managed controls: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get scan-managed controls: {e}")


@router.post("/reset-control-to-manual/{control_id}")
async def reset_control_to_manual(
    control_id: str,
    new_owner: str = Form(..., description="New owner for manual management")
):
    """
    Reset a scan-managed control back to manual management
    
    - **control_id**: NIST control ID (e.g., "AC-2")
    - **new_owner**: Person who will take over manual management
    """
    try:
        success = scan_tracker_service.reset_control_to_manual(control_id, new_owner)
        
        if success:
            return JSONResponse(content={
                "success": True,
                "message": f"Control {control_id} switched to manual management under {new_owner}",
                "control_id": control_id,
                "new_owner": new_owner
            })
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Control {control_id} not found in tracker"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error resetting control to manual: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset control: {e}")


@router.get("/stats")
async def get_scap_integration_stats():
    """
    Get SCAP integration statistics including scan-managed controls
    
    Returns statistics about SCAP file processing, POA&M generation, and tracker automation
    """
    try:
        # Get scan-managed controls
        scan_managed_controls = scan_tracker_service.get_scan_based_controls()
        
        # Enhanced stats with scan management info
        stats = {
            "total_files_processed": 0,  # Would track in database
            "total_findings_processed": 0,
            "total_poams_generated": 0,
            "scan_managed_controls": len(scan_managed_controls),
            "scan_managed_control_ids": scan_managed_controls,
            "supported_scanners": ["OpenSCAP", "Nessus"],
            "automation_features": [
                "Automatic tracker status updates",
                "POA&M generation from failed controls",
                "Manual override protection",
                "Scan-based evidence tracking"
            ],
            "common_control_families": [
                {"family": "AC", "name": "Access Control", "count": len([c for c in scan_managed_controls if c.startswith("AC-")])},
                {"family": "AU", "name": "Audit and Accountability", "count": len([c for c in scan_managed_controls if c.startswith("AU-")])},
                {"family": "SC", "name": "System and Communications Protection", "count": len([c for c in scan_managed_controls if c.startswith("SC-")])},
                {"family": "CM", "name": "Configuration Management", "count": len([c for c in scan_managed_controls if c.startswith("CM-")])},
                {"family": "SI", "name": "System and Information Integrity", "count": len([c for c in scan_managed_controls if c.startswith("SI-")])},
                {"family": "IA", "name": "Identification and Authentication", "count": len([c for c in scan_managed_controls if c.startswith("IA-")])}
            ]
        }
        
        return JSONResponse(content=stats)
        
    except Exception as e:
        logger.error(f"❌ Error getting SCAP stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {e}")


@router.post("/manual-tracker-update")
async def manual_tracker_update(
    findings_data: dict = Form(..., description="Findings data for manual tracker update")
):
    """
    Manually trigger tracker updates from provided findings data
    
    Useful for testing or applying scan results from external sources
    """
    try:
        # This would be used for testing or manual application of scan data
        # Implementation would parse the findings_data and apply updates
        
        return JSONResponse(content={
            "success": True,
            "message": "Manual tracker update endpoint - implementation pending",
            "note": "Use the main upload-scan endpoint for automatic processing"
        })
        
    except Exception as e:
        logger.error(f"❌ Error in manual tracker update: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update tracker manually: {e}") 