"""
FastAPI routes for RMF (Risk Management Framework) document generation
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile, Body
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
import logging
import os
from pathlib import Path
from datetime import datetime, date

from models.rmf import (
    RMFGenerationRequest, RMFGenerationResponse, RMFDocumentType, 
    RMFDocumentFormat, SystemInformation, DocumentMetadata,
    RMFDocumentHistory, ControlBaseline, RMFStatsResponse
)
from services.rmf_generator import rmf_generator

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/rmf", tags=["RMF Documents"])


@router.post("/generate", response_model=RMFGenerationResponse)
async def generate_rmf_document(request: RMFGenerationRequest):
    """
    Generate an RMF document based on the provided request.
    
    Supports generation of:
    - System Security Plans (SSP)
    - Security Assessment Reports (SAR)
    - Plan of Action and Milestones (POA&M)
    - Executive Summaries
    
    Output formats: DOCX, PDF, JSON, XML
    """
    try:
        logger.info(f"🏛️ Received RMF document generation request: {request.document_type}")
        
        # Generate the document
        response = await rmf_generator.generate_document(request)
        
        if response.success:
            logger.info(f"✅ Successfully generated {request.document_type} document")
        else:
            logger.error(f"❌ Failed to generate {request.document_type} document: {response.message}")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Error in RMF document generation endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during document generation: {str(e)}"
        )


@router.get("/baselines", response_model=List[ControlBaseline])
async def get_control_baselines():
    """
    Get available NIST 800-53 control baselines for document generation.
    
    Returns predefined baselines for Low, Moderate, and High impact levels.
    """
    try:
        baselines = rmf_generator.get_available_baselines()
        logger.info(f"📋 Retrieved {len(baselines)} control baselines")
        return baselines
        
    except Exception as e:
        logger.error(f"❌ Error retrieving control baselines: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve control baselines: {str(e)}"
        )


@router.get("/templates")
async def get_document_templates():
    """
    Get available document templates for RMF generation.
    
    Returns information about available templates for each document type.
    """
    try:
        # Return built-in templates
        templates = [
            {
                "template_id": "default_ssp",
                "template_name": "Default System Security Plan",
                "document_type": "ssp",
                "description": "Standard SSP template with all required sections",
                "supported_formats": ["docx", "pdf", "json"]
            },
            {
                "template_id": "default_sar",
                "template_name": "Default Security Assessment Report",
                "document_type": "sar",
                "description": "Standard SAR template for assessment results",
                "supported_formats": ["docx", "pdf", "json"]
            },
            {
                "template_id": "default_poam",
                "template_name": "Default POA&M Report",
                "document_type": "poam",
                "description": "Standard POA&M template with summary and details",
                "supported_formats": ["docx", "pdf", "json"]
            },
            {
                "template_id": "default_executive",
                "template_name": "Default Executive Summary",
                "document_type": "executive_summary",
                "description": "Executive-level summary template",
                "supported_formats": ["docx", "pdf", "json"]
            }
        ]
        
        logger.info(f"📄 Retrieved {len(templates)} document templates")
        return {"success": True, "templates": templates}
        
    except Exception as e:
        logger.error(f"❌ Error retrieving document templates: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve document templates: {str(e)}"
        )


@router.get("/history", response_model=List[RMFDocumentHistory])
async def get_document_history():
    """
    Get the history of generated RMF documents.
    
    Returns a list of all previously generated documents with metadata.
    """
    try:
        history = rmf_generator.get_document_history()
        logger.info(f"📚 Retrieved document history: {len(history)} documents")
        return history
        
    except Exception as e:
        logger.error(f"❌ Error retrieving document history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve document history: {str(e)}"
        )


@router.get("/stats", response_model=RMFStatsResponse)
async def get_generation_stats():
    """
    Get statistics about RMF document generation.
    
    Returns metrics about generated documents, available features, etc.
    """
    try:
        stats = rmf_generator.get_generation_stats()
        logger.info("📊 Retrieved RMF generation statistics")
        return RMFStatsResponse(success=True, data=stats)
        
    except Exception as e:
        logger.error(f"❌ Error retrieving generation stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve generation statistics: {str(e)}"
        )


@router.get("/download/{document_id}")
async def download_document(document_id: str):
    """
    Download a previously generated RMF document by its ID.
    
    Returns the document file for download.
    """
    try:
        # Find the document in history
        history = rmf_generator.get_document_history()
        document = None
        
        for doc in history:
            if doc.document_id == document_id:
                document = doc
                break
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail=f"Document with ID {document_id} not found"
            )
        
        # Check if file exists
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Document file not found: {file_path}"
            )
        
        # Determine media type based on file extension
        if file_path.suffix.lower() == '.docx':
            media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif file_path.suffix.lower() == '.pdf':
            media_type = 'application/pdf'
        elif file_path.suffix.lower() == '.json':
            media_type = 'application/json'
        elif file_path.suffix.lower() == '.xml':
            media_type = 'application/xml'
        else:
            media_type = 'application/octet-stream'
        
        logger.info(f"📥 Serving document download: {document_id}")
        
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            filename=file_path.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error downloading document {document_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download document: {str(e)}"
        )


@router.delete("/history/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a generated RMF document and its file.
    
    Removes both the history record and the physical file.
    """
    try:
        # Find and remove from history
        history = rmf_generator.get_document_history()
        document = None
        
        for i, doc in enumerate(history):
            if doc.document_id == document_id:
                document = history.pop(i)
                break
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail=f"Document with ID {document_id} not found"
            )
        
        # Delete the physical file if it exists
        file_path = Path(document.file_path)
        if file_path.exists():
            file_path.unlink()
            logger.info(f"🗑️ Deleted document file: {file_path}")
        
        logger.info(f"🗑️ Deleted document: {document_id}")
        
        return {
            "success": True,
            "message": f"Document {document_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting document {document_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )


@router.post("/validate")
async def validate_generation_request(request: RMFGenerationRequest):
    """
    Validate an RMF generation request without actually generating the document.
    
    Useful for form validation in the frontend.
    """
    try:
        # Use the generator's validation method
        validation_errors = rmf_generator._validate_request(request)
        
        if validation_errors:
            return {
                "success": False,
                "valid": False,
                "errors": validation_errors,
                "message": f"Validation failed with {len(validation_errors)} error(s)"
            }
        else:
            return {
                "success": True,
                "valid": True,
                "errors": [],
                "message": "Request is valid and ready for generation"
            }
        
    except Exception as e:
        logger.error(f"❌ Error validating generation request: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate request: {str(e)}"
        )


@router.get("/document-types")
async def get_supported_document_types():
    """
    Get the list of supported RMF document types.
    
    Returns information about each supported document type.
    """
    try:
        document_types = [
            {
                "type": "ssp",
                "name": "System Security Plan",
                "description": "Comprehensive security plan documenting system controls and implementation",
                "typical_sections": [
                    "Executive Summary",
                    "System Overview", 
                    "Security Controls Implementation",
                    "Risk Assessment",
                    "Appendices"
                ]
            },
            {
                "type": "sar",
                "name": "Security Assessment Report",
                "description": "Report documenting security control assessment results",
                "typical_sections": [
                    "Assessment Overview",
                    "Assessment Results",
                    "Findings and Recommendations",
                    "Control Assessment Details"
                ]
            },
            {
                "type": "poam",
                "name": "Plan of Action and Milestones",
                "description": "Document tracking security findings and remediation plans",
                "typical_sections": [
                    "POA&M Summary",
                    "Individual POA&M Items",
                    "Status Tracking",
                    "Resource Requirements"
                ]
            },
            {
                "type": "executive_summary",
                "name": "Executive Summary",
                "description": "High-level summary for executive leadership",
                "typical_sections": [
                    "System Overview",
                    "Security Posture",
                    "Key Metrics",
                    "Recommendations"
                ]
            }
        ]
        
        return {
            "success": True,
            "document_types": document_types,
            "total_types": len(document_types)
        }
        
    except Exception as e:
        logger.error(f"❌ Error retrieving document types: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve document types: {str(e)}"
        )


@router.get("/output-formats")
async def get_supported_output_formats():
    """
    Get the list of supported output formats for RMF documents.
    """
    try:
        formats = [
            {
                "format": "docx",
                "name": "Microsoft Word Document",
                "description": "Editable Word document format",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "extension": ".docx",
                "features": ["Editable", "Professional formatting", "Table support"]
            },
            {
                "format": "pdf",
                "name": "Portable Document Format",
                "description": "Read-only PDF format for sharing",
                "mime_type": "application/pdf",
                "extension": ".pdf",
                "features": ["Read-only", "Universal compatibility", "Print-ready"]
            },
            {
                "format": "json",
                "name": "JSON Data Format",
                "description": "Structured data format for integration",
                "mime_type": "application/json",
                "extension": ".json",
                "features": ["Machine readable", "API integration", "Structured data"]
            },
            {
                "format": "xml",
                "name": "XML Data Format",
                "description": "XML format for eMASS integration",
                "mime_type": "application/xml",
                "extension": ".xml",
                "features": ["eMASS compatible", "Structured data", "Standards compliant"]
            }
        ]
        
        return {
            "success": True,
            "output_formats": formats,
            "total_formats": len(formats)
        }
        
    except Exception as e:
        logger.error(f"❌ Error retrieving output formats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve output formats: {str(e)}"
        )


@router.post("/preview")
async def preview_document_content(request: RMFGenerationRequest):
    """
    Generate a preview of document content without creating the actual file.
    
    Useful for allowing users to review content before final generation.
    """
    try:
        logger.info(f"👁️ Generating preview for {request.document_type}")
        
        # Validate request first
        validation_errors = rmf_generator._validate_request(request)
        if validation_errors:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid request: {', '.join(validation_errors)}"
            )
        
        # Gather data (same as normal generation)
        document_data = await rmf_generator._gather_document_data(request)
        
        # Generate content based on type (but don't create file)
        if request.document_type == RMFDocumentType.SSP:
            content = await rmf_generator._generate_ssp_content(request, document_data)
        elif request.document_type == RMFDocumentType.SAR:
            content = await rmf_generator._generate_sar_content(request, document_data)
        elif request.document_type == RMFDocumentType.POAM:
            content = await rmf_generator._generate_poam_content(request, document_data)
        elif request.document_type == RMFDocumentType.EXECUTIVE_SUMMARY:
            content = await rmf_generator._generate_executive_summary_content(request, document_data)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported document type: {request.document_type}"
            )
        
        # Return preview data
        preview = {
            "success": True,
            "document_type": request.document_type,
            "system_name": request.system_info.system_name,
            "preview_sections": {
                "metadata": content.get('metadata', {}),
                "system_info": content.get('system_info', {}),
                "summary": content.get('sections', {}).get('executive_summary', '') or content.get('summary', ''),
                "controls_count": len(content.get('controls', [])),
                "poams_count": len(content.get('poams', [])),
                "key_metrics": content.get('key_metrics', {})
            },
            "estimated_pages": max(5, len(content.get('controls', [])) // 3),  # Rough estimate
            "content_summary": f"Document will include {len(content.get('controls', []))} controls, {len(content.get('poams', []))} POA&Ms, and {len(content.get('risks', []))} risk assessments."
        }
        
        logger.info(f"✅ Generated preview for {request.document_type}")
        return preview
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating document preview: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate preview: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for RMF document generation service"""
    try:
        # Check if the generator is properly initialized
        baselines_count = len(rmf_generator.get_available_baselines())
        history_count = len(rmf_generator.get_document_history())
        
        return {
            "success": True,
            "status": "healthy",
            "service": "RMF Document Generator",
            "available_baselines": baselines_count,
            "documents_generated": history_count,
            "supported_formats": ["DOCX", "PDF", "JSON", "XML"],
            "supported_document_types": ["SSP", "SAR", "POA&M", "Executive Summary"]
        }
        
    except Exception as e:
        logger.error(f"❌ RMF service health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Service unhealthy: {str(e)}"
        )


@router.post("/auto-populate-system")
async def auto_populate_system_info(
    partial_info: Optional[Dict[str, Any]] = Body(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Auto-populate system information from existing data sources
    
    Uses inventory data, tracker records, and POA&M data to automatically
    fill in system information fields where possible.
    """
    try:
        # Convert dict to SystemInformation if provided and has required fields
        system_info = None
        if partial_info:
            # Check if we have minimum required fields
            required_fields = {'system_name', 'system_description', 'system_owner'}
            provided_fields = set(partial_info.keys())
            
            if required_fields.issubset(provided_fields):
                # All required fields provided, create SystemInformation object
                system_info = SystemInformation(**partial_info)
            else:
                # Missing required fields, pass the dict directly to auto_populate_system_info
                # which will handle creating a proper SystemInformation object with defaults
                pass
        
        # Auto-populate from data sources (handles both None and partial SystemInformation)
        populated_info = await rmf_generator.auto_populate_system_info(system_info)
        
        # If we had partial_info but couldn't create SystemInformation, merge the partial data
        if partial_info and system_info is None:
            # Update the populated info with any provided partial data
            populated_dict = populated_info.model_dump()
            for key, value in partial_info.items():
                if hasattr(populated_info, key) and value:
                    setattr(populated_info, key, value)
        
        return {
            "success": True,
            "message": "System information auto-populated successfully",
            "system_info": populated_info.model_dump(),
            "auto_populated_fields": _identify_auto_populated_fields(partial_info, populated_info),
            "data_sources_used": rmf_generator.auto_system_info
        }
        
    except Exception as e:
        logger.error(f"Auto-population failed: {e}")
        raise HTTPException(status_code=500, detail=f"Auto-population failed: {str(e)}")

def _identify_auto_populated_fields(original: Optional[Dict], populated: SystemInformation) -> List[str]:
    """Identify which fields were auto-populated"""
    auto_populated = []
    
    if not original:
        original = {}
    
    populated_dict = populated.model_dump()
    
    for field, value in populated_dict.items():
        if field not in original or not original.get(field):
            if value and value != "":
                auto_populated.append(field)
    
    return auto_populated

@router.get("/system-metadata")
async def get_system_metadata():
    """
    Get system metadata extracted from existing data sources
    
    Returns metadata about the system environment based on inventory,
    POA&M data, tracker records, and SCAP results.
    """
    try:
        # Get comprehensive system metadata
        metadata = {
            "auto_system_info": rmf_generator.auto_system_info,
            "data_source_stats": await _get_data_source_statistics(),
            "implementation_status": await _get_implementation_status_summary(),
            "risk_summary": await _get_risk_summary(),
            "last_updated": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "message": "System metadata retrieved successfully",
            "metadata": metadata
        }
        
    except Exception as e:
        logger.error(f"Failed to get system metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system metadata: {str(e)}")

async def _get_data_source_statistics() -> Dict[str, Any]:
    """Get statistics from all data sources"""
    from data.sample_stubs import get_sample_inventory, get_sample_scap_results
    from services.poam_store import poam_store
    from services.tracker_store import tracker_store
    
    stats = {}
    
    # Inventory stats
    try:
        inventory = get_sample_inventory()
        stats['inventory'] = {
            'total_assets': len(inventory),
            'compliance_scope': len([a for a in inventory if a.get('compliance_scope')]),
            'critical_assets': len([a for a in inventory if a.get('criticality') == 'Critical']),
            'os_types': len(set([a.get('operating_system') for a in inventory if a.get('operating_system')]))
        }
    except Exception:
        stats['inventory'] = {'error': 'Unable to load inventory data'}
    
    # SCAP stats
    try:
        scap_results = get_sample_scap_results()
        stats['scap'] = {
            'total_findings': len(scap_results),
            'critical_findings': len([r for r in scap_results if r.get('severity', '').lower() == 'critical']),
            'high_findings': len([r for r in scap_results if r.get('severity', '').lower() == 'high'])
        }
    except Exception:
        stats['scap'] = {'error': 'Unable to load SCAP data'}
    
    # POA&M stats
    try:
        poams = poam_store.get_all_records()
        stats['poams'] = {
            'total': len(poams),
            'open': len([p for p in poams if p.status.value == 'Open']),
            'in_progress': len([p for p in poams if p.status.value == 'In Progress']),
            'completed': len([p for p in poams if p.status.value == 'Completed'])
        }
    except Exception:
        stats['poams'] = {'error': 'Unable to load POA&M data'}
    
    # Tracker stats
    try:
        tracker_records = tracker_store.get_all_records()
        stats['tracker'] = {
            'total_controls': len(tracker_records),
            'implemented': len([r for r in tracker_records if r.status.value == 'Implemented']),
            'in_progress': len([r for r in tracker_records if r.status.value == 'In Progress']),
            'not_started': len([r for r in tracker_records if r.status.value == 'Not Started'])
        }
    except Exception:
        stats['tracker'] = {'error': 'Unable to load tracker data'}
    
    return stats

async def _get_implementation_status_summary() -> Dict[str, Any]:
    """Get implementation status summary across all controls"""
    from services.tracker_store import tracker_store
    
    try:
        tracker_records = tracker_store.get_all_records()
        
        if not tracker_records:
            return {'message': 'No implementation tracking data available'}
        
        # Calculate implementation percentage
        total_controls = len(tracker_records)
        implemented = len([r for r in tracker_records if r.status.value == 'Implemented'])
        in_progress = len([r for r in tracker_records if r.status.value == 'In Progress'])
        
        implementation_percentage = (implemented / total_controls * 100) if total_controls > 0 else 0
        
        # Get most active implementers
        owners = [r.owner for r in tracker_records if r.owner]
        owner_counts = {}
        for owner in owners:
            owner_counts[owner] = owner_counts.get(owner, 0) + 1
        
        most_active = sorted(owner_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return {
            'total_controls_tracked': total_controls,
            'implementation_percentage': round(implementation_percentage, 1),
            'controls_implemented': implemented,
            'controls_in_progress': in_progress,
            'most_active_implementers': most_active,
            'control_families': _get_control_family_breakdown(tracker_records)
        }
        
    except Exception as e:
        return {'error': f'Unable to calculate implementation status: {str(e)}'}

def _get_control_family_breakdown(tracker_records) -> Dict[str, int]:
    """Get breakdown by control family"""
    families = {}
    for record in tracker_records:
        family = record.control_id.split('-')[0] if '-' in record.control_id else 'Other'
        families[family] = families.get(family, 0) + 1
    return families

async def _get_risk_summary() -> Dict[str, Any]:
    """Get risk summary from POA&M data"""
    from services.poam_store import poam_store
    
    try:
        poams = poam_store.get_all_records()
        
        if not poams:
            return {'message': 'No risk data available'}
        
        # Calculate risk metrics
        total_risks = len(poams)
        high_priority = len([p for p in poams if p.priority.value == 'High'])
        critical_severity = len([p for p in poams if hasattr(p, 'severity') and p.severity and p.severity.value == 'CAT I'])
        
        # Calculate overdue items
        today = date.today()
        overdue = len([p for p in poams 
                      if p.estimated_completion_date < today 
                      and p.status.value not in ['Completed', 'Cancelled']])
        
        return {
            'total_risks': total_risks,
            'high_priority_risks': high_priority,
            'critical_severity_risks': critical_severity,
            'overdue_items': overdue,
            'risk_trend': 'stable'  # Could be calculated based on creation dates
        }
        
    except Exception as e:
        return {'error': f'Unable to calculate risk summary: {str(e)}'}

@router.get("/cache/stats")
async def get_cache_statistics():
    """
    Get RMF generator cache statistics
    
    Returns information about cached AI-generated content, system metadata,
    and cache performance metrics.
    """
    try:
        stats = rmf_generator.get_cache_statistics()
        
        # Add GPT cache stats if available
        from services.gpt_cache import gpt_cache
        gpt_stats = gpt_cache.get_cache_stats()
        
        return {
            "success": True,
            "message": "Cache statistics retrieved successfully",
            "rmf_cache": stats,
            "gpt_cache": gpt_stats,
            "combined_stats": {
                "total_cache_entries": stats["rmf_cache_entries"] + gpt_stats["total_entries"],
                "cache_efficiency": "High" if gpt_stats["valid_entries"] > 0 else "Low"
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get cache statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache statistics: {str(e)}")

@router.delete("/cache")
async def clear_rmf_cache():
    """
    Clear RMF generator cache
    
    Clears all cached AI-generated content for RMF documents.
    This will force fresh generation for subsequent requests.
    """
    try:
        cleared_count = rmf_generator.clear_cache()
        
        return {
            "success": True,
            "message": f"RMF cache cleared successfully",
            "cleared_entries": cleared_count
        }
        
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

@router.post("/warm-cache")
async def warm_rmf_cache(
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Warm RMF cache with common document types and system configurations
    
    Pre-generates common AI content to improve response times for
    frequently requested document types.
    """
    try:
        # Add background task to warm cache
        background_tasks.add_task(_warm_cache_background)
        
        return {
            "success": True,
            "message": "Cache warming started in background",
            "estimated_completion": "5-10 minutes"
        }
        
    except Exception as e:
        logger.error(f"Failed to start cache warming: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start cache warming: {str(e)}")

async def _warm_cache_background():
    """Background task to warm RMF cache"""
    try:
        logger.info("Starting RMF cache warming...")
        
        # Common system configurations to warm
        common_systems = [
            {
                "system_name": "Sample Web Application",
                "system_type": "Information System",
                "operating_environment": "Production",
                "confidentiality_impact": "MODERATE"
            },
            {
                "system_name": "Database Management System", 
                "system_type": "Database System",
                "operating_environment": "Production",
                "confidentiality_impact": "HIGH"
            }
        ]
        
        # Common prompts to cache
        common_prompts = [
            "Generate executive summary for moderate impact web application system",
            "Generate risk assessment for database system with high confidentiality impact",
            "Generate implementation guidance for access control in cloud environment",
            "Generate control assessment summary for audit logging requirements"
        ]
        
        # Warm cache with common content
        for i, prompt in enumerate(common_prompts):
            cache_key = f"warm_cache_{i}"
            await rmf_generator._generate_cached_ai_content(prompt, cache_key)
            
        logger.info("RMF cache warming completed successfully")
        
    except Exception as e:
        logger.error(f"Cache warming failed: {e}") 