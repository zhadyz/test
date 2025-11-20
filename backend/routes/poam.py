"""
FastAPI routes for POA&M (Plan of Action and Milestones) management
"""
from fastapi import APIRouter, HTTPException, Query, Response
from typing import Optional, List
import logging
import csv
import json
from datetime import datetime, date
from io import StringIO

from models.poam import (
    POAMRequest, POAMResponse, POAMListResponse, POAMStatsResponse,
    POAMUpdateRequest, POAMExportRequest, POAMStatus, POAMPriority, POAMSeverity
)
from services.poam_store import poam_store
from services.ai_adapter import ai_adapter
from services.poam_pdf_exporter import poam_pdf_exporter

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/poam", tags=["poam"])


@router.post("", response_model=POAMResponse)
async def create_poam(request: POAMRequest):
    """
    Create a new POA&M entry
    
    - **control_id**: NIST control ID (e.g., "AC-2")
    - **description**: Description of the issue/finding
    - **remediation_action**: Recommended remediation action
    - **estimated_completion_date**: Estimated completion date
    - **assigned_owner**: Person responsible for remediation
    - **priority**: Priority level (Critical, High, Medium, Low)
    - **severity**: Severity classification (CAT I, CAT II, CAT III)
    """
    try:
        # Validate that control_id follows expected format
        if not request.control_id or len(request.control_id) < 2:
            raise HTTPException(
                status_code=422,
                detail="control_id must be a valid NIST control ID (e.g., 'AC-2')"
            )
        
        # Create the POA&M record
        record = poam_store.create_record(
            control_id=request.control_id,
            control_title=request.control_title,
            description=request.description,
            root_cause=request.root_cause,
            remediation_action=request.remediation_action,
            estimated_completion_date=request.estimated_completion_date,
            assigned_owner=request.assigned_owner,
            priority=request.priority,
            severity=request.severity,
            resources_required=request.resources_required,
            milestones=request.milestones,
            cost_estimate=request.cost_estimate,
            business_impact=request.business_impact
        )
        
        logger.info(f"✅ Created POA&M {record.id} for control {request.control_id}")
        
        return POAMResponse(
            success=True,
            message=f"Successfully created POA&M for {request.control_id}",
            data=record
        )
        
    except Exception as e:
        logger.error(f"❌ Error creating POA&M: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create POA&M: {str(e)}"
        )


@router.get("", response_model=POAMListResponse)
async def get_all_poams(
    status: Optional[POAMStatus] = Query(None, description="Filter by status"),
    priority: Optional[POAMPriority] = Query(None, description="Filter by priority"),
    control_id: Optional[str] = Query(None, description="Filter by control ID"),
    owner: Optional[str] = Query(None, description="Filter by owner name"),
    overdue_only: bool = Query(False, description="Show only overdue items")
):
    """
    Get all POA&M records with optional filtering
    
    - **status**: Optional filter by status
    - **priority**: Optional filter by priority
    - **control_id**: Optional filter by control ID
    - **owner**: Optional filter by owner name
    - **overdue_only**: Show only overdue items
    """
    try:
        # Get records based on filters
        if status:
            records = poam_store.get_records_by_status(status)
        elif priority:
            records = poam_store.get_records_by_priority(priority)
        elif control_id:
            records = poam_store.get_records_by_control(control_id)
        elif owner:
            records = poam_store.get_records_by_owner(owner)
        else:
            records = poam_store.get_all_records()
        
        # Apply overdue filter if requested
        if overdue_only:
            today = date.today()
            records = [r for r in records 
                      if r.status not in [POAMStatus.COMPLETED, POAMStatus.CANCELLED] 
                      and r.estimated_completion_date < today]
        
        # Sort by priority (Critical -> High -> Medium -> Low) then by due date
        priority_order = {
            POAMPriority.CRITICAL: 0,
            POAMPriority.HIGH: 1,
            POAMPriority.MEDIUM: 2,
            POAMPriority.LOW: 3
        }
        
        records.sort(key=lambda x: (
            priority_order.get(x.priority, 99),
            x.estimated_completion_date,
            x.created_at
        ))
        
        logger.info(f"📋 Retrieved {len(records)} POA&M records")
        
        return POAMListResponse(
            success=True,
            total_count=len(records),
            data=records
        )
        
    except Exception as e:
        logger.error(f"❌ Error retrieving POA&M records: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve POA&M data: {str(e)}"
        )


@router.get("/{poam_id}", response_model=POAMResponse)
async def get_poam(poam_id: str):
    """
    Get a specific POA&M record by ID
    
    - **poam_id**: POA&M unique identifier
    """
    try:
        record = poam_store.get_record(poam_id)
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"POA&M {poam_id} not found"
            )
        
        logger.info(f"📋 Retrieved POA&M {poam_id}")
        
        return POAMResponse(
            success=True,
            message=f"Found POA&M {poam_id}",
            data=record
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving POA&M: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve POA&M: {str(e)}"
        )


@router.put("/{poam_id}", response_model=POAMResponse)
async def update_poam(poam_id: str, request: POAMUpdateRequest):
    """
    Update a POA&M record
    
    - **poam_id**: POA&M unique identifier
    - **request**: Update data (only provided fields will be updated)
    """
    try:
        # Convert request to dict, excluding None values
        updates = {k: v for k, v in request.model_dump().items() if v is not None}
        
        if not updates:
            raise HTTPException(
                status_code=422,
                detail="No update data provided"
            )
        
        record = poam_store.update_record(poam_id, **updates)
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"POA&M {poam_id} not found"
            )
        
        logger.info(f"✅ Updated POA&M {poam_id}")
        
        return POAMResponse(
            success=True,
            message=f"Successfully updated POA&M {poam_id}",
            data=record
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating POA&M: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update POA&M: {str(e)}"
        )


@router.delete("/{poam_id}")
async def delete_poam(poam_id: str):
    """
    Delete a POA&M record
    
    - **poam_id**: POA&M unique identifier
    """
    try:
        success = poam_store.delete_record(poam_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"POA&M {poam_id} not found"
            )
        
        logger.info(f"🗑️ Deleted POA&M {poam_id}")
        
        return {
            "success": True,
            "message": f"Successfully deleted POA&M {poam_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting POA&M: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete POA&M: {str(e)}"
        )


@router.get("/stats/summary", response_model=POAMStatsResponse)
async def get_poam_statistics():
    """
    Get POA&M summary statistics
    """
    try:
        stats = poam_store.get_statistics()
        
        logger.info(f"📊 Generated POA&M statistics for {stats['total_poams']} records")
        
        return POAMStatsResponse(
            success=True,
            data=stats
        )
        
    except Exception as e:
        logger.error(f"❌ Error generating POA&M statistics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate statistics: {str(e)}"
        )


@router.post("/export")
async def export_poams(request: POAMExportRequest):
    """
    Export POA&M data to CSV or JSON format
    
    - **format**: Export format (csv or json)
    - **status_filter**: Optional status filter
    - **priority_filter**: Optional priority filter
    - **control_family_filter**: Optional control family filter
    - **include_completed**: Include completed POA&Ms
    """
    try:
        # Get all records
        all_records = poam_store.get_all_records()
        
        # Apply filters
        filtered_records = all_records
        
        if request.status_filter:
            filtered_records = [r for r in filtered_records if r.status == request.status_filter]
        
        if request.priority_filter:
            filtered_records = [r for r in filtered_records if r.priority == request.priority_filter]
        
        if request.control_family_filter:
            filtered_records = [r for r in filtered_records 
                              if r.control_id.startswith(request.control_family_filter)]
        
        if not request.include_completed:
            filtered_records = [r for r in filtered_records 
                              if r.status not in [POAMStatus.COMPLETED, POAMStatus.CANCELLED]]
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"poam_export_{timestamp}"
        
        if request.format.lower() == "csv":
            # Generate CSV
            output = StringIO()
            writer = csv.writer(output)
            
            # Write headers
            headers = [
                "ID", "Control ID", "Control Title", "Status", "Priority", "Severity",
                "Description", "Root Cause", "Remediation Action", "Assigned Owner",
                "Estimated Completion", "Actual Completion", "Resources Required",
                "Cost Estimate", "Business Impact", "Created At", "Last Updated"
            ]
            writer.writerow(headers)
            
            # Write data
            for record in filtered_records:
                writer.writerow([
                    record.id,
                    record.control_id,
                    record.control_title or "",
                    record.status.value,
                    record.priority.value,
                    record.severity.value if record.severity else "",
                    record.description,
                    record.root_cause or "",
                    record.remediation_action,
                    record.assigned_owner or "",
                    record.estimated_completion_date.isoformat(),
                    record.actual_completion_date.isoformat() if record.actual_completion_date else "",
                    record.resources_required or "",
                    record.cost_estimate or "",
                    record.business_impact or "",
                    record.created_at.isoformat(),
                    record.last_updated.isoformat()
                ])
            
            content = output.getvalue()
            media_type = "text/csv"
            filename += ".csv"
            
        elif request.format.lower() == "json":
            # Generate JSON
            export_data = []
            for record in filtered_records:
                record_dict = record.model_dump()
                # Convert dates to ISO strings for JSON
                record_dict['estimated_completion_date'] = record.estimated_completion_date.isoformat()
                if record.actual_completion_date:
                    record_dict['actual_completion_date'] = record.actual_completion_date.isoformat()
                record_dict['created_at'] = record.created_at.isoformat()
                record_dict['last_updated'] = record.last_updated.isoformat()
                export_data.append(record_dict)
            
            content = json.dumps({
                "export_info": {
                    "generated_at": datetime.now().isoformat(),
                    "total_records": len(export_data),
                    "filters_applied": {
                        "status": request.status_filter.value if request.status_filter else None,
                        "priority": request.priority_filter.value if request.priority_filter else None,
                        "control_family": request.control_family_filter,
                        "include_completed": request.include_completed
                    }
                },
                "poams": export_data
            }, indent=2)
            media_type = "application/json"
            filename += ".json"
            
        else:
            raise HTTPException(
                status_code=422,
                detail="Format must be 'csv' or 'json'"
            )
        
        logger.info(f"📤 Exported {len(filtered_records)} POA&M records as {request.format.upper()}")
        
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error exporting POA&M data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export POA&M data: {str(e)}"
        )


@router.post("/generate-suggestions/{control_id}")
async def generate_remediation_suggestions(control_id: str):
    """
    Generate AI-powered remediation suggestions for a control
    
    - **control_id**: NIST control ID to generate suggestions for
    """
    try:
        # This would integrate with the existing AI adapter
        # For now, return a placeholder response
        suggestions = {
            "remediation_actions": [
                f"Implement automated monitoring for {control_id} compliance",
                f"Establish regular review process for {control_id} controls",
                f"Create documentation and training materials for {control_id}",
                f"Deploy technical controls to enforce {control_id} requirements"
            ],
            "estimated_effort": "2-4 weeks",
            "recommended_priority": "High",
            "resources_needed": [
                "Security team involvement",
                "System administrator access",
                "Compliance documentation review"
            ]
        }
        
        logger.info(f"🤖 Generated remediation suggestions for {control_id}")
        
        return {
            "success": True,
            "control_id": control_id,
            "suggestions": suggestions
        }
        
    except Exception as e:
        logger.error(f"❌ Error generating suggestions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate suggestions: {str(e)}"
        )


@router.post("/export/pdf")
async def export_poam_pdf(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    control_id: Optional[str] = None,
    owner: Optional[str] = None,
    overdue: Optional[bool] = None,
    include_summary: bool = True,
    include_details: bool = True
):
    """
    Export POA&M data to a professional PDF report
    
    - **status**: Filter by status (open, in_progress, completed, deferred, cancelled)
    - **priority**: Filter by priority (critical, high, medium, low)
    - **control_id**: Filter by specific control ID
    - **owner**: Filter by assigned owner
    - **overdue**: Filter for overdue items only
    - **include_summary**: Include executive summary (default: true)
    - **include_details**: Include detailed POA&M table (default: true)
    
    Returns a PDF file download
    """
    try:
        logger.info(f"🎯 Generating POA&M PDF report with filters: status={status}, priority={priority}, control_id={control_id}, owner={owner}, overdue={overdue}")
        
        # Get filtered POA&M records
        poam_records = poam_store.get_records(
            status=status,
            priority=priority,
            control_id=control_id,
            owner=owner,
            overdue=overdue
        )
        
        # Prepare filters for context
        filters = {}
        if status:
            filters['status'] = status
        if priority:
            filters['priority'] = priority
        if control_id:
            filters['control_id'] = control_id
        if owner:
            filters['owner'] = owner
        if overdue:
            filters['overdue'] = overdue
        
        # Generate PDF
        pdf_bytes = poam_pdf_exporter.generate_poam_report(
            poam_records=poam_records,
            filters=filters,
            include_summary=include_summary,
            include_details=include_details
        )
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"poam_report_{timestamp}.pdf"
        
        logger.info(f"✅ Generated POA&M PDF report: {len(poam_records)} records, {len(pdf_bytes)} bytes")
        
        # Return PDF as download
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Error generating POA&M PDF report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {e}")


@router.get("/export/pdf-preview")
async def preview_poam_pdf(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    control_id: Optional[str] = None,
    owner: Optional[str] = None,
    overdue: Optional[bool] = None
):
    """
    Preview POA&M PDF report statistics without generating the full PDF
    
    Returns metadata about what would be included in the PDF report
    """
    try:
        logger.info(f"👀 Previewing POA&M PDF report with filters")
        
        # Get filtered POA&M records
        poam_records = poam_store.get_records(
            status=status,
            priority=priority,
            control_id=control_id,
            owner=owner,
            overdue=overdue
        )
        
        # Calculate statistics
        total = len(poam_records)
        status_counts = {}
        priority_counts = {}
        overdue_count = 0
        
        today = date.today()
        
        for poam in poam_records:
            # Count by status
            status_key = poam.status.value
            status_counts[status_key] = status_counts.get(status_key, 0) + 1
            
            # Count by priority
            priority_key = poam.priority.value
            priority_counts[priority_key] = priority_counts.get(priority_key, 0) + 1
            
            # Count overdue
            if (poam.estimated_completion_date and 
                poam.estimated_completion_date < today and 
                poam.status != POAMStatus.COMPLETED):
                overdue_count += 1
        
        preview_data = {
            "total_records": total,
            "status_breakdown": status_counts,
            "priority_breakdown": priority_counts,
            "overdue_items": overdue_count,
            "estimated_pdf_size": f"{max(1, total // 10)} pages",
            "applied_filters": {
                "status": status,
                "priority": priority,
                "control_id": control_id,
                "owner": owner,
                "overdue": overdue
            },
            "sample_records": [
                {
                    "control_id": poam.control_id,
                    "description": poam.description[:100] + "..." if len(poam.description) > 100 else poam.description,
                    "status": poam.status.value,
                    "priority": poam.priority.value
                }
                for poam in poam_records[:3]  # Show first 3 as preview
            ]
        }
        
        logger.info(f"✅ POA&M PDF preview generated: {total} records")
        return preview_data
        
    except Exception as e:
        logger.error(f"❌ Error generating POA&M PDF preview: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF preview: {e}") 