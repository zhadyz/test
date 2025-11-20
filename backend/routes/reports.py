"""
FastAPI routes for compliance report generation
"""
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from typing import Optional
import logging
from datetime import datetime
from io import BytesIO

from models.tracker import ImplementationStatus
from services.tracker_store import tracker_store
from services.report_generator import report_generator

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/report", tags=["reports"])


@router.get("/export")
async def export_compliance_report(
    format: str = Query("markdown", description="Export format: 'pdf' or 'markdown'"),
    status: Optional[str] = Query(None, description="Filter by implementation status"),
    filename: Optional[str] = Query(None, description="Custom filename (without extension)")
):
    """
    Export compliance report in PDF or Markdown format
    
    - **format**: Export format - "pdf" or "markdown" (default: markdown)
    - **status**: Optional filter by implementation status
    - **filename**: Optional custom filename (extension will be added automatically)
    
    Returns the report file as a download
    """
    try:
        # Validate format parameter
        if format.lower() not in ["pdf", "markdown"]:
            raise HTTPException(
                status_code=422,
                detail="Format must be 'pdf' or 'markdown'"
            )
        
        # Validate status parameter if provided
        if status:
            try:
                # Check if status is valid
                valid_statuses = [s.value for s in ImplementationStatus]
                if status not in valid_statuses:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Status must be one of: {', '.join(valid_statuses)}"
                    )
            except Exception:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid status value: {status}"
                )
        
        # Get tracker records
        all_records = tracker_store.get_all_records()
        
        if not all_records:
            raise HTTPException(
                status_code=404,
                detail="No tracker records found. Please create some implementation tracking data first."
            )
        
        # Generate report
        report_content = report_generator.generate_report(
            tracker_records=all_records,
            format_type=format.lower(),
            status_filter=status
        )
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if filename:
            # Use custom filename but sanitize it
            safe_filename = "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_')).rstrip()
            base_filename = safe_filename or f"compliance_report_{timestamp}"
        else:
            filter_suffix = f"_{status.lower().replace(' ', '_')}" if status else ""
            base_filename = f"nist_compliance_report{filter_suffix}_{timestamp}"
        
        # Set up response based on format
        if format.lower() == "pdf":
            media_type = "application/pdf"
            file_extension = "pdf"
            content = BytesIO(report_content)
        else:  # markdown
            media_type = "text/markdown"
            file_extension = "md"
            content = BytesIO(report_content.encode('utf-8'))
        
        final_filename = f"{base_filename}.{file_extension}"
        
        logger.info(f"📊 Generated {format.upper()} compliance report: {final_filename}")
        
        # Return file as download
        return StreamingResponse(
            content,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={final_filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating compliance report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate compliance report: {str(e)}"
        )


@router.get("/preview")
async def preview_compliance_report(
    format: str = Query("markdown", description="Preview format: 'pdf' or 'markdown'"),
    status: Optional[str] = Query(None, description="Filter by implementation status"),
):
    """
    Preview compliance report content without downloading
    
    - **format**: Preview format - "pdf" or "markdown" (default: markdown)
    - **status**: Optional filter by implementation status
    
    Returns report metadata and sample content for preview
    """
    try:
        # Validate format parameter
        if format.lower() not in ["pdf", "markdown"]:
            raise HTTPException(
                status_code=422,
                detail="Format must be 'pdf' or 'markdown'"
            )
        
        # Validate status parameter if provided
        if status:
            try:
                valid_statuses = [s.value for s in ImplementationStatus]
                if status not in valid_statuses:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Status must be one of: {', '.join(valid_statuses)}"
                    )
            except Exception:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid status value: {status}"
                )
        
        # Get tracker records
        all_records = tracker_store.get_all_records()
        
        if not all_records:
            return {
                "success": False,
                "message": "No tracker records found",
                "total_controls": 0,
                "filtered_controls": 0,
                "preview": "No data available for report generation"
            }
        
        # Filter records if status provided
        filtered_records = all_records
        if status:
            filtered_records = [
                record for record in all_records 
                if record.status.value == status
            ]
        
        # Generate preview (only first few lines for markdown, or metadata for PDF)
        if format.lower() == "markdown":
            full_report = report_generator.generate_markdown_report(all_records, status)
            # Return first 500 characters as preview
            preview_content = full_report[:500] + "..." if len(full_report) > 500 else full_report
        else:
            # For PDF, just return metadata since we can't easily preview binary content
            preview_content = f"PDF report will contain {len(filtered_records)} controls with detailed formatting, tables, and styling."
        
        logger.info(f"📋 Generated report preview for {len(filtered_records)} controls")
        
        return {
            "success": True,
            "message": "Report preview generated successfully",
            "format": format.lower(),
            "total_controls": len(all_records),
            "filtered_controls": len(filtered_records),
            "status_filter": status,
            "preview": preview_content,
            "estimated_size_kb": len(preview_content) // 1024 + 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating report preview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report preview: {str(e)}"
        ) 