"""
POA&M PDF Export Service
Generates professional PDF reports for Plan of Action and Milestones data
with company branding and comprehensive formatting.
"""

import os
import io
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, Frame, PageTemplate, BaseDocTemplate
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from models.poam import POAMResponse, POAMStatus, POAMPriority, POAMSeverity
from services.poam_store import poam_store


class POAMPDFExporter:
    """Professional PDF export service for POA&M reports"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the report"""
        
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1e3a8a')  # Dark blue
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Normal'],
            fontSize=16,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#374151')  # Gray
        ))
        
        # Header style
        self.styles.add(ParagraphStyle(
            name='CustomHeader',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceBefore=20,
            spaceAfter=12,
            textColor=colors.HexColor('#1e3a8a')
        ))
        
        # Subheader style
        self.styles.add(ParagraphStyle(
            name='CustomSubheader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=8,
            textColor=colors.HexColor('#374151')
        ))
        
        # Summary box style
        self.styles.add(ParagraphStyle(
            name='SummaryBox',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceBefore=10,
            spaceAfter=10,
            leftIndent=20,
            rightIndent=20,
            borderWidth=1,
            borderColor=colors.HexColor('#e5e7eb'),
            backColor=colors.HexColor('#f9fafb')
        ))
        
        # Footer style
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#6b7280')
        ))

    def generate_poam_report(
        self,
        poam_records: List[POAMResponse],
        filters: Optional[Dict[str, Any]] = None,
        include_summary: bool = True,
        include_details: bool = True,
        include_charts: bool = False
    ) -> bytes:
        """
        Generate a comprehensive POA&M PDF report
        
        Args:
            poam_records: List of POA&M records to include
            filters: Applied filters for context
            include_summary: Whether to include executive summary
            include_details: Whether to include detailed POA&M table
            include_charts: Whether to include visual charts (future enhancement)
            
        Returns:
            bytes: PDF content as bytes
        """
        
        # Create PDF buffer
        buffer = io.BytesIO()
        
        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
            title="POA&M Security Report"
        )
        
        # Build document content
        story = []
        
        # Add header with logo and title
        story.extend(self._build_header())
        
        # Add executive summary if requested
        if include_summary:
            story.extend(self._build_executive_summary(poam_records, filters))
        
        # Add detailed POA&M table if requested
        if include_details:
            story.extend(self._build_detailed_table(poam_records))
        
        # Add appendices
        story.extend(self._build_appendices(poam_records))
        
        # Add footer
        story.extend(self._build_footer())
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes

    def _build_header(self) -> List[Any]:
        """Build report header with logo and title"""
        elements = []
        
        # Try to add logo if available
        logo_path = Path("../frontend/public/unified-logo.png")
        if logo_path.exists():
            try:
                logo = Image(str(logo_path), width=2*inch, height=1*inch)
                logo.hAlign = 'CENTER'
                elements.append(logo)
                elements.append(Spacer(1, 20))
            except Exception:
                pass  # Skip logo if there's an issue
        
        # Add title
        title = Paragraph("Plan of Action and Milestones (POA&M)", self.styles['CustomTitle'])
        elements.append(title)
        
        # Add subtitle with generation date
        subtitle = Paragraph(
            f"Security Compliance Report - Generated {datetime.now().strftime('%B %d, %Y')}",
            self.styles['CustomSubtitle']
        )
        elements.append(subtitle)
        
        elements.append(Spacer(1, 30))
        
        return elements

    def _build_executive_summary(self, poam_records: List[POAMResponse], filters: Optional[Dict[str, Any]]) -> List[Any]:
        """Build executive summary section"""
        elements = []
        
        # Section header
        elements.append(Paragraph("Executive Summary", self.styles['CustomHeader']))
        
        # Calculate statistics
        stats = self._calculate_statistics(poam_records)
        
        # Summary paragraph
        summary_text = f"""
        This report contains {stats['total']} Plan of Action and Milestones (POA&M) items 
        representing security control deficiencies that require remediation. Of these items, 
        {stats['open']} are currently open, {stats['in_progress']} are in progress, 
        and {stats['completed']} have been completed.
        """
        
        if stats['overdue'] > 0:
            summary_text += f" <b>Note:</b> {stats['overdue']} items are past their estimated completion date and require immediate attention."
        
        elements.append(Paragraph(summary_text, self.styles['Normal']))
        elements.append(Spacer(1, 15))
        
        # Statistics table
        stats_data = [
            ['Metric', 'Count', 'Percentage'],
            ['Total POA&M Items', str(stats['total']), '100%'],
            ['Open Items', str(stats['open']), f"{stats['open_pct']:.1f}%"],
            ['In Progress', str(stats['in_progress']), f"{stats['in_progress_pct']:.1f}%"],
            ['Completed', str(stats['completed']), f"{stats['completed_pct']:.1f}%"],
            ['Overdue Items', str(stats['overdue']), f"{stats['overdue_pct']:.1f}%"]
        ]
        
        stats_table = Table(stats_data, colWidths=[2.5*inch, 1*inch, 1*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        
        elements.append(stats_table)
        elements.append(Spacer(1, 20))
        
        # Priority breakdown
        priority_stats = self._calculate_priority_stats(poam_records)
        if priority_stats:
            elements.append(Paragraph("Priority Breakdown", self.styles['CustomSubheader']))
            
            priority_data = [['Priority Level', 'Count', 'Percentage']]
            for priority, count in priority_stats.items():
                pct = (count / stats['total'] * 100) if stats['total'] > 0 else 0
                priority_data.append([priority, str(count), f"{pct:.1f}%"])
            
            priority_table = Table(priority_data, colWidths=[2*inch, 1*inch, 1*inch])
            priority_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
            ]))
            
            elements.append(priority_table)
            elements.append(Spacer(1, 20))
        
        # Add filters information if provided
        if filters:
            elements.append(Paragraph("Report Filters Applied", self.styles['CustomSubheader']))
            filter_text = self._format_filters(filters)
            elements.append(Paragraph(filter_text, self.styles['Normal']))
            elements.append(Spacer(1, 15))
        
        elements.append(PageBreak())
        
        return elements

    def _build_detailed_table(self, poam_records: List[POAMResponse]) -> List[Any]:
        """Build detailed POA&M items table"""
        elements = []
        
        # Section header
        elements.append(Paragraph("Detailed POA&M Items", self.styles['CustomHeader']))
        elements.append(Spacer(1, 15))
        
        if not poam_records:
            elements.append(Paragraph("No POA&M items found matching the specified criteria.", self.styles['Normal']))
            return elements
        
        # Build table data
        table_data = [
            ['Control ID', 'Description', 'Status', 'Priority', 'Owner', 'Due Date']
        ]
        
        for poam in poam_records:
            # Truncate description if too long
            description = poam.description
            if len(description) > 80:
                description = description[:77] + "..."
            
            # Format due date
            due_date = poam.estimated_completion_date.strftime('%m/%d/%Y') if poam.estimated_completion_date else "Not Set"
            
            # Check if overdue
            is_overdue = (
                poam.estimated_completion_date and 
                poam.estimated_completion_date < date.today() and 
                poam.status != POAMStatus.COMPLETED
            )
            
            if is_overdue:
                due_date += " (OVERDUE)"
            
            table_data.append([
                poam.control_id or "N/A",
                description,
                poam.status.value.title(),
                poam.priority.value.title(),
                poam.assigned_owner or "Unassigned",
                due_date
            ])
        
        # Create table with appropriate column widths
        col_widths = [0.8*inch, 2.8*inch, 0.8*inch, 0.8*inch, 1.2*inch, 1*inch]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # Style the table
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 20))
        
        return elements

    def _build_appendices(self, poam_records: List[POAMResponse]) -> List[Any]:
        """Build appendices with additional information"""
        elements = []
        
        elements.append(PageBreak())
        elements.append(Paragraph("Appendices", self.styles['CustomHeader']))
        
        # Appendix A: Detailed POA&M Descriptions
        elements.append(Paragraph("Appendix A: Detailed POA&M Descriptions", self.styles['CustomSubheader']))
        elements.append(Spacer(1, 10))
        
        for i, poam in enumerate(poam_records[:10], 1):  # Limit to first 10 for space
            elements.append(Paragraph(f"<b>{i}. {poam.control_id or 'N/A'}</b>", self.styles['Normal']))
            elements.append(Paragraph(f"<b>Description:</b> {poam.description}", self.styles['Normal']))
            
            if poam.root_cause:
                elements.append(Paragraph(f"<b>Root Cause:</b> {poam.root_cause}", self.styles['Normal']))
            
            if poam.remediation_action:
                elements.append(Paragraph(f"<b>Remediation Action:</b> {poam.remediation_action}", self.styles['Normal']))
            
            elements.append(Spacer(1, 10))
        
        if len(poam_records) > 10:
            elements.append(Paragraph(f"<i>Note: Only first 10 items shown. Total items: {len(poam_records)}</i>", self.styles['Normal']))
        
        # Appendix B: Acronyms and Definitions
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Appendix B: Acronyms and Definitions", self.styles['CustomSubheader']))
        
        definitions = [
            ("POA&M", "Plan of Action and Milestones - A document that identifies tasks needing to be accomplished to correct deficiencies"),
            ("NIST", "National Institute of Standards and Technology"),
            ("STIG", "Security Technical Implementation Guide"),
            ("CAT I", "Category I - High severity security vulnerability"),
            ("CAT II", "Category II - Medium severity security vulnerability"),
            ("CAT III", "Category III - Low severity security vulnerability")
        ]
        
        for acronym, definition in definitions:
            elements.append(Paragraph(f"<b>{acronym}:</b> {definition}", self.styles['Normal']))
            elements.append(Spacer(1, 5))
        
        return elements

    def _build_footer(self) -> List[Any]:
        """Build report footer"""
        elements = []
        
        elements.append(Spacer(1, 30))
        footer_text = f"""
        <i>This report was generated automatically by Spud - NIST Compliance Application<br/>
        Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
        For questions about this report, contact your system administrator.</i>
        """
        elements.append(Paragraph(footer_text, self.styles['Footer']))
        
        return elements

    def _calculate_statistics(self, poam_records: List[POAMResponse]) -> Dict[str, Any]:
        """Calculate POA&M statistics"""
        total = len(poam_records)
        if total == 0:
            return {
                'total': 0, 'open': 0, 'in_progress': 0, 'completed': 0, 'overdue': 0,
                'open_pct': 0, 'in_progress_pct': 0, 'completed_pct': 0, 'overdue_pct': 0
            }
        
        open_count = len([p for p in poam_records if p.status == POAMStatus.OPEN])
        in_progress_count = len([p for p in poam_records if p.status == POAMStatus.IN_PROGRESS])
        completed_count = len([p for p in poam_records if p.status == POAMStatus.COMPLETED])
        
        # Count overdue items
        today = date.today()
        overdue_count = len([
            p for p in poam_records 
            if p.estimated_completion_date and p.estimated_completion_date < today and p.status != POAMStatus.COMPLETED
        ])
        
        return {
            'total': total,
            'open': open_count,
            'in_progress': in_progress_count,
            'completed': completed_count,
            'overdue': overdue_count,
            'open_pct': (open_count / total) * 100,
            'in_progress_pct': (in_progress_count / total) * 100,
            'completed_pct': (completed_count / total) * 100,
            'overdue_pct': (overdue_count / total) * 100
        }

    def _calculate_priority_stats(self, poam_records: List[POAMResponse]) -> Dict[str, int]:
        """Calculate priority distribution statistics"""
        priority_counts = {}
        for poam in poam_records:
            priority = poam.priority.value.title()
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        return priority_counts

    def _format_filters(self, filters: Dict[str, Any]) -> str:
        """Format applied filters for display"""
        filter_parts = []
        
        if filters.get('status'):
            filter_parts.append(f"Status: {filters['status']}")
        if filters.get('priority'):
            filter_parts.append(f"Priority: {filters['priority']}")
        if filters.get('control_id'):
            filter_parts.append(f"Control ID: {filters['control_id']}")
        if filters.get('owner'):
            filter_parts.append(f"Owner: {filters['owner']}")
        if filters.get('overdue'):
            filter_parts.append("Overdue items only")
        
        return "; ".join(filter_parts) if filter_parts else "No filters applied"


# Global instance
poam_pdf_exporter = POAMPDFExporter() 