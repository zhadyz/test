"""
Report generation service for NIST 800-53 compliance tracking.
Supports PDF and Markdown export formats.
"""

from typing import Dict, List, Optional
from datetime import datetime
from io import BytesIO
import tempfile
import os

from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

from models.tracker import TrackerRecord, ImplementationStatus
from data.controls import get_control_by_id


class ReportGenerator:
    """Service for generating compliance reports in various formats"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for PDF generation"""
        # Title style
        self.styles.add(ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Title'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            'SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.darkblue,
            borderWidth=1,
            borderColor=colors.lightgrey,
            borderPadding=5
        ))
        
        # Status style for badges
        self.styles.add(ParagraphStyle(
            'StatusBadge',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            borderWidth=1,
            borderPadding=3
        ))
    
    def generate_markdown_report(
        self, 
        tracker_records: List[TrackerRecord], 
        status_filter: Optional[str] = None
    ) -> str:
        """Generate a markdown format compliance report"""
        
        # Filter records if status filter provided
        if status_filter:
            tracker_records = [
                record for record in tracker_records 
                if record.status.value == status_filter
            ]
        
        # Build markdown content
        lines = []
        
        # Header
        lines.append("# NIST 800-53 Compliance Report")
        lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"**Total Controls:** {len(tracker_records)}")
        
        if status_filter:
            lines.append(f"**Filtered by Status:** {status_filter}")
        
        lines.append("\n---\n")
        
        # Summary statistics
        lines.append("## Implementation Summary")
        stats = self._calculate_stats(tracker_records)
        
        lines.append(f"- **Not Started:** {stats['Not Started']} controls")
        lines.append(f"- **In Progress:** {stats['In Progress']} controls")
        lines.append(f"- **Implemented:** {stats['Implemented']} controls")
        lines.append(f"- **Needs Review:** {stats['Needs Review']} controls")
        lines.append(f"- **Deferred:** {stats['Deferred']} controls")
        
        completion_rate = (stats['Implemented'] / len(tracker_records) * 100) if tracker_records else 0
        lines.append(f"- **Completion Rate:** {completion_rate:.1f}%")
        
        lines.append("\n---\n")
        
        # Individual control details
        lines.append("## Control Implementation Details")
        
        for record in sorted(tracker_records, key=lambda x: x.control_id):
            control = get_control_by_id(record.control_id)
            
            lines.append(f"### {record.control_id}: {control.control_name if control else 'Unknown Control'}")
            lines.append(f"**Status:** {record.status.value}")
            lines.append(f"**Owner:** {record.owner}")
            lines.append(f"**Last Updated:** {record.last_updated.strftime('%Y-%m-%d %H:%M:%S')}")
            
            if record.notes:
                lines.append(f"**Implementation Notes:**")
                lines.append(f"{record.notes}")
            
            if record.adapted_guidance:
                lines.append(f"**Adapted Guidance:**")
                lines.append(f"{record.adapted_guidance}")
            
            if control:
                lines.append(f"**Control Description:**")
                lines.append(f"{control.plain_english_explanation}")
            
            lines.append("\n---\n")
        
        return "\n".join(lines)
    
    def generate_pdf_report(
        self, 
        tracker_records: List[TrackerRecord], 
        status_filter: Optional[str] = None
    ) -> bytes:
        """Generate a PDF format compliance report"""
        
        # Filter records if status filter provided
        if status_filter:
            tracker_records = [
                record for record in tracker_records 
                if record.status.value == status_filter
            ]
        
        # Create PDF document
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Build PDF content
        story = []
        
        # Title
        title = Paragraph("NIST 800-53 Compliance Report", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Header info
        header_data = [
            ["Report Generated:", datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ["Total Controls:", str(len(tracker_records))],
        ]
        
        if status_filter:
            header_data.append(["Filtered by Status:", status_filter])
        
        header_table = Table(header_data)
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(header_table)
        story.append(Spacer(1, 20))
        
        # Summary statistics
        stats_title = Paragraph("Implementation Summary", self.styles['SectionHeader'])
        story.append(stats_title)
        
        stats = self._calculate_stats(tracker_records)
        stats_data = [
            ["Status", "Count", "Percentage"],
            ["Not Started", str(stats['Not Started']), f"{stats['Not Started']/len(tracker_records)*100:.1f}%" if tracker_records else "0%"],
            ["In Progress", str(stats['In Progress']), f"{stats['In Progress']/len(tracker_records)*100:.1f}%" if tracker_records else "0%"],
            ["Implemented", str(stats['Implemented']), f"{stats['Implemented']/len(tracker_records)*100:.1f}%" if tracker_records else "0%"],
            ["Needs Review", str(stats['Needs Review']), f"{stats['Needs Review']/len(tracker_records)*100:.1f}%" if tracker_records else "0%"],
            ["Deferred", str(stats['Deferred']), f"{stats['Deferred']/len(tracker_records)*100:.1f}%" if tracker_records else "0%"],
        ]
        
        completion_rate = (stats['Implemented'] / len(tracker_records) * 100) if tracker_records else 0
        stats_data.append(["TOTAL COMPLETION", str(stats['Implemented']), f"{completion_rate:.1f}%"])
        
        stats_table = Table(stats_data)
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (-1, -1), (-1, -1), colors.lightblue),
            ('FONTNAME', (-1, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 30))
        
        # Individual control details
        details_title = Paragraph("Control Implementation Details", self.styles['SectionHeader'])
        story.append(details_title)
        story.append(Spacer(1, 12))
        
        for record in sorted(tracker_records, key=lambda x: x.control_id):
            control = get_control_by_id(record.control_id)
            
            # Control header
            control_title = f"{record.control_id}: {control.control_name if control else 'Unknown Control'}"
            story.append(Paragraph(control_title, self.styles['Heading3']))
            
            # Control details table
            control_data = [
                ["Status", record.status.value],
                ["Owner", record.owner],
                ["Last Updated", record.last_updated.strftime('%Y-%m-%d %H:%M:%S')],
            ]
            
            control_table = Table(control_data, colWidths=[1.5*inch, 4*inch])
            control_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(control_table)
            story.append(Spacer(1, 8))
            
            # Implementation notes
            if record.notes:
                story.append(Paragraph("<b>Implementation Notes:</b>", self.styles['Normal']))
                story.append(Paragraph(record.notes, self.styles['Normal']))
                story.append(Spacer(1, 8))
            
            # Adapted guidance
            if record.adapted_guidance:
                story.append(Paragraph("<b>Adapted Guidance:</b>", self.styles['Normal']))
                story.append(Paragraph(record.adapted_guidance, self.styles['Normal']))
                story.append(Spacer(1, 8))
            
            # Control description
            if control:
                story.append(Paragraph("<b>Control Description:</b>", self.styles['Normal']))
                story.append(Paragraph(control.plain_english_explanation, self.styles['Normal']))
            
            story.append(Spacer(1, 20))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        buffer.seek(0)
        return buffer.getvalue()
    
    def _calculate_stats(self, records: List[TrackerRecord]) -> Dict[str, int]:
        """Calculate implementation statistics"""
        stats = {
            "Not Started": 0,
            "In Progress": 0,
            "Implemented": 0,
            "Needs Review": 0,
            "Deferred": 0,
        }
        
        for record in records:
            stats[record.status.value] += 1
        
        return stats
    
    def generate_report(
        self, 
        tracker_records: List[TrackerRecord], 
        format_type: str = "markdown",
        status_filter: Optional[str] = None
    ) -> bytes | str:
        """
        Generate a compliance report in the specified format
        
        Args:
            tracker_records: List of tracker records to include
            format_type: "pdf" or "markdown"
            status_filter: Optional status to filter by
            
        Returns:
            bytes for PDF, str for markdown
        """
        if format_type.lower() == "pdf":
            return self.generate_pdf_report(tracker_records, status_filter)
        elif format_type.lower() == "markdown":
            return self.generate_markdown_report(tracker_records, status_filter)
        else:
            raise ValueError(f"Unsupported format: {format_type}")


# Global instance
report_generator = ReportGenerator() 