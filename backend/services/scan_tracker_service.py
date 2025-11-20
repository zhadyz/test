"""
Scan-based Tracker Service for automatically updating control implementation status
based on SCAP scan results. This service bridges scan findings with tracker records.
"""
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum

from models.tracker import ImplementationStatus
from services.tracker_store import tracker_store
from services.scap_parser import SCAPFinding, ScanResultStatus, SCAPScanSummary

# Configure logging
logger = logging.getLogger(__name__)


class ScanBasedStatus(Enum):
    """Status mapping from scan results to implementation status"""
    IMPLEMENTED = "Implemented"
    NOT_IMPLEMENTED = "Not Implemented"
    PARTIALLY_IMPLEMENTED = "Partially Implemented"
    NEEDS_REVIEW = "Needs Review"


class ScanTrackerService:
    """Service for automatically updating tracker based on scan results"""
    
    def __init__(self):
        self.scan_owner = "Automated Scan System"
        
    def update_tracker_from_scan(
        self, 
        findings: List[SCAPFinding], 
        scan_summary: SCAPScanSummary,
        system_id: str = "default",
        override_manual_changes: bool = False
    ) -> Dict[str, any]:
        """
        Update tracker records based on scan findings
        
        Args:
            findings: List of SCAP findings from scan
            scan_summary: Summary of scan results
            system_id: System identifier for the scan
            override_manual_changes: Whether to override manual status changes
            
        Returns:
            Dictionary with update statistics and details
        """
        logger.info(f"🔍 Processing {len(findings)} scan findings for tracker updates")
        
        # Group findings by control ID
        control_findings = self._group_findings_by_control(findings)
        
        # Track update statistics
        stats = {
            "total_controls_scanned": len(control_findings),
            "controls_updated": 0,
            "controls_implemented": 0,
            "controls_not_implemented": 0,
            "controls_partially_implemented": 0,
            "controls_needs_review": 0,
            "manual_overrides_skipped": 0,
            "new_controls_added": 0,
            "scan_date": (scan_summary.scan_date or datetime.now()).isoformat(),
            "scanner": scan_summary.scanner,
            "target_system": scan_summary.target_system,
            "updated_controls": []
        }
        
        # Process each control
        for control_id, control_findings_list in control_findings.items():
            try:
                update_result = self._update_control_status(
                    control_id, 
                    control_findings_list, 
                    system_id,
                    override_manual_changes
                )
                
                if update_result:
                    stats["controls_updated"] += 1
                    stats["updated_controls"].append(update_result)
                    
                    # Count by status
                    status = update_result["new_status"]
                    if status == "Implemented":
                        stats["controls_implemented"] += 1
                    elif status == "Not Implemented":
                        stats["controls_not_implemented"] += 1
                    elif status == "Partially Implemented":
                        stats["controls_partially_implemented"] += 1
                    elif status == "Needs Review":
                        stats["controls_needs_review"] += 1
                        
                    if update_result["was_new_control"]:
                        stats["new_controls_added"] += 1
                else:
                    stats["manual_overrides_skipped"] += 1
                    
            except Exception as e:
                logger.error(f"❌ Error updating control {control_id}: {e}")
                continue
        
        logger.info(f"✅ Scan-based tracker update complete: {stats['controls_updated']} controls updated")
        return stats
    
    def _group_findings_by_control(self, findings: List[SCAPFinding]) -> Dict[str, List[SCAPFinding]]:
        """Group findings by control ID"""
        control_findings = {}
        
        for finding in findings:
            if finding.control_id:
                if finding.control_id not in control_findings:
                    control_findings[finding.control_id] = []
                control_findings[finding.control_id].append(finding)
        
        return control_findings
    
    def _update_control_status(
        self, 
        control_id: str, 
        findings: List[SCAPFinding], 
        system_id: str,
        override_manual_changes: bool
    ) -> Optional[Dict[str, any]]:
        """
        Update a single control's implementation status based on scan findings
        
        Returns:
            Dictionary with update details if update was made, None if skipped
        """
        # Get existing tracker record
        existing_record = tracker_store.get_record(control_id)
        
        # Check if we should skip manual changes
        if existing_record and not override_manual_changes:
            # Skip if the record was manually updated recently (within last 24 hours)
            # and the owner is not the automated system
            if (existing_record.owner != self.scan_owner and 
                (datetime.now() - existing_record.last_updated).days < 1):
                logger.info(f"⏭️ Skipping {control_id} - recently updated manually")
                return None
        
        # Determine new status based on scan findings
        new_status, confidence, notes = self._determine_status_from_findings(findings)
        
        # Generate scan-based notes
        scan_notes = self._generate_scan_notes(findings, system_id)
        
        # Combine with existing notes if preserving manual changes
        final_notes = scan_notes
        if existing_record and existing_record.notes and not override_manual_changes:
            final_notes = f"{existing_record.notes}\n\n--- SCAN UPDATE ---\n{scan_notes}"
        
        # Save the updated record
        updated_record = tracker_store.save_record(
            control_id=control_id,
            status=ImplementationStatus(new_status),
            owner=self.scan_owner,
            notes=final_notes,
            adapted_guidance=existing_record.adapted_guidance if existing_record else None
        )
        
        logger.info(f"📝 Updated {control_id}: {new_status} (confidence: {confidence}%)")
        
        return {
            "control_id": control_id,
            "old_status": existing_record.status.value if existing_record else "Not Started",
            "new_status": new_status,
            "confidence": confidence,
            "findings_count": len(findings),
            "was_new_control": existing_record is None,
            "update_timestamp": updated_record.last_updated.isoformat().isoformat()
        }
    
    def _determine_status_from_findings(self, findings: List[SCAPFinding]) -> Tuple[str, int, str]:
        """
        Determine implementation status based on scan findings
        
        Returns:
            Tuple of (status, confidence_percentage, reasoning_notes)
        """
        if not findings:
            return "Needs Review", 50, "No scan findings available for this control"
        
        # Count findings by status
        passed_count = len([f for f in findings if f.status == ScanResultStatus.PASS])
        failed_count = len([f for f in findings if f.status == ScanResultStatus.FAIL])
        error_count = len([f for f in findings if f.status == ScanResultStatus.ERROR])
        not_applicable_count = len([f for f in findings if f.status == ScanResultStatus.NOT_APPLICABLE])
        not_checked_count = len([f for f in findings if f.status == ScanResultStatus.NOT_CHECKED])
        
        total_checked = passed_count + failed_count + error_count
        total_findings = len(findings)
        
        # Calculate implementation percentage
        if total_checked == 0:
            # No actual test results
            return "Needs Review", 30, f"No testable findings for this control ({total_findings} findings total)"
        
        implementation_percentage = (passed_count / total_checked) * 100
        
        # Determine status based on implementation percentage
        if implementation_percentage >= 95:
            status = "Implemented"
            confidence = 90
            reasoning = f"Scan shows {passed_count}/{total_checked} rules passing ({implementation_percentage:.1f}%)"
        elif implementation_percentage >= 70:
            status = "Partially Implemented"
            confidence = 80
            reasoning = f"Scan shows {passed_count}/{total_checked} rules passing ({implementation_percentage:.1f}%) - needs attention"
        elif implementation_percentage >= 30:
            status = "Partially Implemented"
            confidence = 85
            reasoning = f"Scan shows {passed_count}/{total_checked} rules passing ({implementation_percentage:.1f}%) - significant gaps"
        else:
            status = "Not Implemented"
            confidence = 90
            reasoning = f"Scan shows {passed_count}/{total_checked} rules passing ({implementation_percentage:.1f}%) - major deficiencies"
        
        # Adjust confidence based on error rate
        if error_count > 0:
            error_percentage = (error_count / total_findings) * 100
            confidence = max(50, confidence - int(error_percentage))
            reasoning += f" (Note: {error_count} scan errors may affect accuracy)"
        
        return status, confidence, reasoning
    
    def _generate_scan_notes(self, findings: List[SCAPFinding], system_id: str) -> str:
        """Generate descriptive notes based on scan findings"""
        notes = []
        
        # Add scan summary
        notes.append(f"📊 AUTOMATED SCAN UPDATE - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        notes.append(f"System: {system_id}")
        notes.append(f"Total findings: {len(findings)}")
        
        # Count by status
        status_counts = {}
        for finding in findings:
            status = finding.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        for status, count in status_counts.items():
            notes.append(f"- {status.title()}: {count}")
        
        # Add details for failed findings
        failed_findings = [f for f in findings if f.status == ScanResultStatus.FAIL]
        if failed_findings:
            notes.append("\n🚨 FAILED REQUIREMENTS:")
            for finding in failed_findings[:5]:  # Limit to first 5
                notes.append(f"- {finding.rule_title}")
                if finding.remediation:
                    notes.append(f"  Remediation: {finding.remediation[:100]}...")
            
            if len(failed_findings) > 5:
                notes.append(f"... and {len(failed_findings) - 5} more failed requirements")
        
        # Add high-severity findings
        high_severity = [f for f in findings if f.severity.lower() in ['critical', 'high']]
        if high_severity:
            notes.append(f"\n⚠️ HIGH PRIORITY: {len(high_severity)} critical/high severity findings require immediate attention")
        
        return "\n".join(notes)
    
    def get_scan_based_controls(self) -> List[str]:
        """Get list of control IDs that are managed by scan-based updates"""
        scan_managed_controls = []
        
        for control_id, record in tracker_store.data.items():
            if record.owner == self.scan_owner:
                scan_managed_controls.append(control_id)
        
        return scan_managed_controls
    
    def reset_control_to_manual(self, control_id: str, new_owner: str) -> bool:
        """Reset a scan-managed control back to manual management"""
        record = tracker_store.get_record(control_id)
        
        if not record:
            return False
        
        # Update to manual management
        tracker_store.save_record(
            control_id=control_id,
            status=record.status,
            owner=new_owner,
            notes=f"{record.notes}\n\n--- SWITCHED TO MANUAL MANAGEMENT ---\nSwitched from automated scan updates to manual management by {new_owner}",
            adapted_guidance=record.adapted_guidance
        )
        
        logger.info(f"🔄 Control {control_id} switched from scan-based to manual management")
        return True


# Create global instance
scan_tracker_service = ScanTrackerService() 