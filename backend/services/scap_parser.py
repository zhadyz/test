"""
SCAP (Security Content Automation Protocol) parser service for generating POA&M entries
from security scan results. Supports OpenSCAP XML files and Nessus exports.
"""

import defusedxml.ElementTree as ET
import re
import json
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from models.poam import POAMRequest, POAMPriority, POAMSeverity, POAMStatus


class ScanResultStatus(Enum):
    """SCAP scan result status"""
    PASS = "pass"
    FAIL = "fail"
    ERROR = "error"
    UNKNOWN = "unknown"
    NOT_APPLICABLE = "notapplicable"
    NOT_CHECKED = "notchecked"
    NOT_SELECTED = "notselected"
    INFORMATIONAL = "informational"


@dataclass
class SCAPFinding:
    """Represents a single SCAP finding"""
    rule_id: str
    rule_title: str
    description: str
    control_id: Optional[str]
    severity: str
    status: ScanResultStatus
    remediation: Optional[str] = None
    check_content: Optional[str] = None
    fix_text: Optional[str] = None
    group_title: Optional[str] = None
    vulnerability_id: Optional[str] = None
    plugin_id: Optional[str] = None
    cvss_score: Optional[float] = None
    references: List[str] = None
    affected_hosts: List[str] = None

    def __post_init__(self):
        if self.references is None:
            self.references = []
        if self.affected_hosts is None:
            self.affected_hosts = []


@dataclass
class SCAPScanSummary:
    """Summary of SCAP scan results"""
    total_rules: int
    passed: int
    failed: int
    errors: int
    not_applicable: int
    not_checked: int
    scan_date: Optional[datetime] = None
    scanner: Optional[str] = None
    target_system: Optional[str] = None
    profile: Optional[str] = None


class SCAPParser:
    """Service for parsing SCAP scan results and generating POA&M entries"""
    
    def __init__(self):
        # NIST control ID patterns
        self.control_patterns = [
            r'(?:NIST[\s-]*)?([A-Z]{2}-\d+(?:\.\d+)?(?:\(\d+\))?)',  # AC-2, SC-28, etc.
            r'(?:800-53[\s-]*)?([A-Z]{2}-\d+(?:\.\d+)?(?:\(\d+\))?)',
            r'CCI-(\d{6})',  # Control Correlation Identifier
            r'SRG-(\w+-\d+-\d+)',  # Security Requirements Guide
        ]
        
        # Severity mapping
        self.severity_mapping = {
            'critical': POAMSeverity.CAT_I,
            'high': POAMSeverity.CAT_I,
            'medium': POAMSeverity.CAT_II,
            'low': POAMSeverity.CAT_III,
            'info': POAMSeverity.CAT_III,
            'informational': POAMSeverity.CAT_III,
        }
        
        # Priority mapping based on severity and control type
        self.priority_mapping = {
            POAMSeverity.CAT_I: POAMPriority.CRITICAL,
            POAMSeverity.CAT_II: POAMPriority.HIGH,
            POAMSeverity.CAT_III: POAMPriority.MEDIUM,
        }

    def parse_openscap_xml(self, xml_content: str) -> Tuple[List[SCAPFinding], SCAPScanSummary]:
        """
        Parse OpenSCAP XML results file
        
        Args:
            xml_content: XML content as string
            
        Returns:
            Tuple of (findings_list, scan_summary)
        """
        findings = []
        
        try:
            root = ET.fromstring(xml_content)
            
            # Handle different XML namespaces
            namespaces = self._extract_namespaces(root)
            
            # Extract scan metadata
            scan_summary = self._extract_openscap_metadata(root, namespaces)
            
            # Find all rule results
            rule_results = []
            
            # Try with namespaces first
            if namespaces:
                for prefix, uri in namespaces.items():
                    if prefix == '' or prefix == 'default':
                        # Default namespace
                        ns = {prefix or 'ns': uri}
                        rule_results = root.findall('.//ns:rule-result', ns)
                        if rule_results:
                            break
                    else:
                        # Named namespace
                        ns = {prefix: uri}
                        rule_results = root.findall(f'.//{prefix}:rule-result', ns)
                        if rule_results:
                            break
            
            # Fallback to no namespace
            if not rule_results:
                rule_results = root.findall('.//rule-result')
            
            # Last resort: find any element with 'rule-result' in the tag
            if not rule_results:
                for elem in root.iter():
                    if elem.tag.endswith('}rule-result') or elem.tag == 'rule-result':
                        rule_results.append(elem)
            
            for rule_result in rule_results:
                finding = self._parse_openscap_rule_result(rule_result, root, namespaces)
                if finding:
                    findings.append(finding)
            
            # Update summary with actual counts
            scan_summary.total_rules = len(findings)
            scan_summary.passed = len([f for f in findings if f.status == ScanResultStatus.PASS])
            scan_summary.failed = len([f for f in findings if f.status == ScanResultStatus.FAIL])
            scan_summary.errors = len([f for f in findings if f.status == ScanResultStatus.ERROR])
            scan_summary.not_applicable = len([f for f in findings if f.status == ScanResultStatus.NOT_APPLICABLE])
            scan_summary.not_checked = len([f for f in findings if f.status == ScanResultStatus.NOT_CHECKED])
            
        except ET.ParseError as e:
            raise ValueError(f"Invalid XML format: {e}")
        except Exception as e:
            raise ValueError(f"Error parsing OpenSCAP XML: {e}")
            
        return findings, scan_summary

    def parse_nessus_file(self, xml_content: str) -> Tuple[List[SCAPFinding], SCAPScanSummary]:
        """
        Parse Nessus .nessus XML export file
        
        Args:
            xml_content: XML content as string
            
        Returns:
            Tuple of (findings_list, scan_summary)
        """
        findings = []
        
        try:
            root = ET.fromstring(xml_content)
            
            # Extract scan metadata
            scan_summary = self._extract_nessus_metadata(root)
            
            # Find all report items (vulnerabilities)
            report_items = root.findall('.//ReportItem')
            
            for item in report_items:
                finding = self._parse_nessus_report_item(item)
                if finding:
                    findings.append(finding)
            
            # Update summary with actual counts
            scan_summary.total_rules = len(findings)
            scan_summary.failed = len([f for f in findings if f.status == ScanResultStatus.FAIL])
            scan_summary.passed = len([f for f in findings if f.status == ScanResultStatus.PASS])
            scan_summary.errors = len([f for f in findings if f.status == ScanResultStatus.ERROR])
            scan_summary.not_applicable = len([f for f in findings if f.status == ScanResultStatus.NOT_APPLICABLE])
            
        except ET.ParseError as e:
            raise ValueError(f"Invalid Nessus XML format: {e}")
        except Exception as e:
            raise ValueError(f"Error parsing Nessus file: {e}")
            
        return findings, scan_summary

    def _extract_namespaces(self, root: ET.Element) -> Dict[str, str]:
        """Extract XML namespaces from root element"""
        namespaces = {}
        
        # Common SCAP namespaces
        if root.tag.startswith('{'):
            default_ns = root.tag.split('}')[0][1:]
            namespaces[''] = default_ns
            namespaces['default'] = default_ns
        
        # Extract from attributes
        for key, value in root.attrib.items():
            if key.startswith('xmlns'):
                if ':' in key:
                    prefix = key.split(':')[1]
                    namespaces[prefix] = value
                else:
                    namespaces[''] = value
                    
        return namespaces

    def _extract_openscap_metadata(self, root: ET.Element, namespaces: Dict[str, str]) -> SCAPScanSummary:
        """Extract metadata from OpenSCAP XML"""
        
        # Try to find target system
        target_system = None
        target_elem = root.find('.//target') or root.find('.//target-address')
        if target_elem is not None:
            target_system = target_elem.text
            
        # Try to find scan date
        scan_date = None
        date_elem = root.find('.//start-time') or root.find('.//timestamp')
        if date_elem is not None:
            try:
                scan_date = datetime.fromisoformat(date_elem.text.replace('Z', '+00:00'))
            except:
                pass
                
        # Try to find profile
        profile = None
        profile_elem = root.find('.//profile') or root.find('.//benchmark')
        if profile_elem is not None:
            profile = profile_elem.get('id') or profile_elem.text
            
        return SCAPScanSummary(
            total_rules=0,  # Will be updated later
            passed=0,
            failed=0,
            errors=0,
            not_applicable=0,
            not_checked=0,
            scan_date=scan_date,
            scanner="OpenSCAP",
            target_system=target_system,
            profile=profile
        )

    def _extract_nessus_metadata(self, root: ET.Element) -> SCAPScanSummary:
        """Extract metadata from Nessus XML"""
        
        # Extract target system
        target_system = None
        host_elem = root.find('.//ReportHost')
        if host_elem is not None:
            target_system = host_elem.get('name')
            
        # Extract scan date
        scan_date = None
        date_elem = root.find('.//timestamp')
        if date_elem is not None:
            try:
                scan_date = datetime.fromtimestamp(int(date_elem.text))
            except:
                pass
                
        return SCAPScanSummary(
            total_rules=0,  # Will be updated later
            passed=0,
            failed=0,
            errors=0,
            not_applicable=0,
            not_checked=0,
            scan_date=scan_date,
            scanner="Nessus",
            target_system=target_system,
            profile=None
        )

    def _parse_openscap_rule_result(self, rule_result: ET.Element, root: ET.Element, namespaces: Dict[str, str]) -> Optional[SCAPFinding]:
        """Parse individual OpenSCAP rule result"""
        
        # Get rule ID
        rule_id = rule_result.get('idref') or rule_result.get('id')
        if not rule_id:
            return None
            
        # Get result status
        result_elem = None
        
        # Try with namespace first
        if namespaces:
            for prefix, uri in namespaces.items():
                if prefix == '' or prefix == 'default':
                    ns = {prefix or 'ns': uri}
                    result_elem = rule_result.find('ns:result', ns)
                    if result_elem is not None:
                        break
                else:
                    ns = {prefix: uri}
                    result_elem = rule_result.find(f'{prefix}:result', ns)
                    if result_elem is not None:
                        break
        
        # Fallback to no namespace
        if result_elem is None:
            result_elem = rule_result.find('result') or rule_result.find('.//result')
            
        if result_elem is None:
            return None
            
        status_text = result_elem.text.lower()
        status = self._map_openscap_status(status_text)
        
        # Find rule definition in the benchmark (simplified approach since we don't have the full benchmark)
        # For now, we'll extract information from the rule-result itself
        rule_def = None  # We don't have the benchmark in this XML
        
        rule_title = rule_id  # Use rule ID as title initially
        description = ""
        severity = "medium"
        remediation = None
        check_content = None
        fix_text = None
        group_title = None
        
        # Extract information from the rule-result element itself
        # Look for message elements (try both with and without namespace)
        message_elem = rule_result.find('message')
        if message_elem is None:
            # Try to find any element with 'message' in the tag
            for elem in rule_result:
                if elem.tag.endswith('}message') or elem.tag == 'message':
                    message_elem = elem
                    break
            
        if message_elem is not None:
            description = message_elem.text or ""
            severity = message_elem.get('severity', 'medium').lower()
        
        # Look for fix elements (try both with and without namespace)
        fix_elem = rule_result.find('fix')
        if fix_elem is None:
            # Try to find any element with 'fix' in the tag
            for elem in rule_result:
                if elem.tag.endswith('}fix') or elem.tag == 'fix':
                    fix_elem = elem
                    break
            
        if fix_elem is not None:
            # Look for fixtext
            fixtext_elem = fix_elem.find('fixtext')
            if fixtext_elem is None:
                # Try to find any element with 'fixtext' in the tag
                for elem in fix_elem:
                    if elem.tag.endswith('}fixtext') or elem.tag == 'fixtext':
                        fixtext_elem = elem
                        break
            
            if fixtext_elem is not None:
                remediation = fixtext_elem.text
                fix_text = remediation
        
        # Create a more readable rule title from the rule ID
        if rule_id.startswith('xccdf_'):
            # Extract the readable part from XCCDF rule ID
            parts = rule_id.split('_')
            if len(parts) > 3:
                rule_title = parts[-1].replace('_', ' ').title()
            else:
                rule_title = rule_id
        
        # Extract control ID
        control_id = self._extract_control_id(rule_id + " " + rule_title + " " + description)
        
        return SCAPFinding(
            rule_id=rule_id,
            rule_title=rule_title,
            description=description,
            control_id=control_id,
            severity=severity,
            status=status,
            remediation=remediation,
            check_content=check_content,
            fix_text=fix_text,
            group_title=group_title
        )

    def _parse_nessus_report_item(self, item: ET.Element) -> Optional[SCAPFinding]:
        """Parse individual Nessus report item"""
        
        # Get plugin ID and name
        plugin_id = item.get('pluginID')
        rule_title = item.get('pluginName', 'Unknown Vulnerability')
        
        if not plugin_id:
            return None
            
        # Extract severity
        severity_elem = item.find('risk_factor')
        severity = 'medium'
        if severity_elem is not None:
            severity = severity_elem.text.lower()
            
        # Extract description
        description_elem = item.find('description')
        description = description_elem.text if description_elem is not None else ""
        
        # Extract solution/remediation
        solution_elem = item.find('solution')
        remediation = solution_elem.text if solution_elem is not None else None
        
        # Extract CVSS score
        cvss_score = None
        cvss_elem = item.find('cvss_base_score')
        if cvss_elem is not None:
            try:
                cvss_score = float(cvss_elem.text)
            except ValueError:
                pass
                
        # Extract references
        references = []
        for ref_elem in item.findall('.//see_also'):
            if ref_elem.text:
                references.append(ref_elem.text)
                
        # Get host information
        host_elem = item.find('../..')  # Go up to ReportHost
        affected_hosts = []
        if host_elem is not None and host_elem.tag == 'ReportHost':
            affected_hosts.append(host_elem.get('name', 'Unknown'))
        
        # Determine status based on severity and plugin output
        status = ScanResultStatus.FAIL if severity in ['critical', 'high', 'medium'] else ScanResultStatus.INFORMATIONAL
        
        # Extract control ID from various fields
        control_text = f"{rule_title} {description} {' '.join(references)}"
        control_id = self._extract_control_id(control_text)
        
        return SCAPFinding(
            rule_id=f"nessus-{plugin_id}",
            rule_title=rule_title,
            description=description,
            control_id=control_id,
            severity=severity,
            status=status,
            remediation=remediation,
            plugin_id=plugin_id,
            cvss_score=cvss_score,
            references=references,
            affected_hosts=affected_hosts
        )

    def _map_openscap_status(self, status_text: str) -> ScanResultStatus:
        """Map OpenSCAP status text to ScanResultStatus enum"""
        status_mapping = {
            'pass': ScanResultStatus.PASS,
            'fail': ScanResultStatus.FAIL,
            'error': ScanResultStatus.ERROR,
            'unknown': ScanResultStatus.UNKNOWN,
            'notapplicable': ScanResultStatus.NOT_APPLICABLE,
            'notchecked': ScanResultStatus.NOT_CHECKED,
            'notselected': ScanResultStatus.NOT_SELECTED,
            'informational': ScanResultStatus.INFORMATIONAL,
        }
        
        return status_mapping.get(status_text, ScanResultStatus.UNKNOWN)

    def _extract_control_id(self, text: str) -> Optional[str]:
        """Extract NIST control ID from text using regex patterns"""
        if not text:
            return None
            
        for pattern in self.control_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                control_id = match.group(1).upper()
                
                # Handle CCI mapping to NIST controls (simplified mapping)
                if control_id.startswith('CCI-'):
                    # This would need a comprehensive CCI to NIST mapping
                    # For now, we'll keep the CCI identifier
                    pass
                elif control_id.startswith('SRG-'):
                    # Security Requirements Guide mapping
                    pass
                    
                return control_id
        
        return None

    def generate_poam_entries(self, findings: List[SCAPFinding], system_id: str = "default") -> List[POAMRequest]:
        """
        Generate POA&M entries from SCAP findings
        
        Args:
            findings: List of SCAP findings
            system_id: System identifier for POA&M entries
            
        Returns:
            List of POA&M requests ready for creation
        """
        poam_entries = []
        
        # Group findings by control ID
        control_groups = {}
        for finding in findings:
            # Only process failed findings that have control IDs
            if finding.status == ScanResultStatus.FAIL and finding.control_id:
                if finding.control_id not in control_groups:
                    control_groups[finding.control_id] = []
                control_groups[finding.control_id].append(finding)
        
        # Create POA&M entry for each control
        for control_id, control_findings in control_groups.items():
            poam_entry = self._create_poam_from_findings(control_id, control_findings, system_id)
            poam_entries.append(poam_entry)
        
        return poam_entries

    def _create_poam_from_findings(self, control_id: str, findings: List[SCAPFinding], system_id: str) -> POAMRequest:
        """Create a POA&M entry from grouped findings for a control"""
        
        # Determine highest severity
        severities = [f.severity.lower() for f in findings if f.severity]
        severity_priority = ['critical', 'high', 'medium', 'low', 'info']
        
        highest_severity = 'medium'  # default
        for sev in severity_priority:
            if sev in severities:
                highest_severity = sev
                break
                
        poam_severity = self.severity_mapping.get(highest_severity, POAMSeverity.CAT_II)
        poam_priority = self.priority_mapping.get(poam_severity, POAMPriority.MEDIUM)
        
        # Create description
        finding_count = len(findings)
        rule_titles = [f.rule_title for f in findings[:3]]  # Show first 3
        
        description = f"SCAP scan identified {finding_count} failed rule(s) for control {control_id}. "
        description += f"Failed rules include: {', '.join(rule_titles)}"
        if finding_count > 3:
            description += f" and {finding_count - 3} more"
        
        # Add affected systems
        all_hosts = []
        for finding in findings:
            all_hosts.extend(finding.affected_hosts or [])
        unique_hosts = list(set(all_hosts))
        if unique_hosts:
            description += f". Affected systems: {', '.join(unique_hosts[:5])}"
            if len(unique_hosts) > 5:
                description += f" and {len(unique_hosts) - 5} more"
        
        # Create remediation action
        remediation_actions = []
        for finding in findings:
            if finding.remediation:
                remediation_actions.append(f"• {finding.rule_title}: {finding.remediation}")
            elif finding.fix_text:
                remediation_actions.append(f"• {finding.rule_title}: {finding.fix_text}")
        
        if not remediation_actions:
            remediation_action = f"Review and remediate the {finding_count} failed security rules for control {control_id}. "
            remediation_action += "Consult the SCAP scan results for specific remediation guidance."
        else:
            remediation_action = "Implement the following remediation actions:\n"
            remediation_action += "\n".join(remediation_actions[:5])  # Limit to 5 actions
            if len(remediation_actions) > 5:
                remediation_action += f"\n... and {len(remediation_actions) - 5} more actions (see detailed scan results)"
        
        # Create root cause
        root_cause = f"Security compliance scan detected {finding_count} rule violations for {control_id}. "
        root_cause += "This indicates that the required security controls are not properly implemented or configured."
        
        # Determine completion date based on severity
        days_to_complete = {
            POAMSeverity.CAT_I: 15,    # Critical - 15 days
            POAMSeverity.CAT_II: 30,   # High - 30 days  
            POAMSeverity.CAT_III: 60,  # Medium/Low - 60 days
        }
        
        completion_days = days_to_complete.get(poam_severity, 30)
        estimated_completion = datetime.now() + timedelta(days=completion_days)
        
        # Create business impact
        business_impact = f"Non-compliance with {control_id} requirements increases security risk "
        business_impact += f"and may result in audit findings. {finding_count} failed rules indicate "
        business_impact += "potential vulnerabilities that could be exploited by threat actors."
        
        return POAMRequest(
            control_id=control_id,
            system_id=system_id,
            control_title=None,  # Will be populated by the service
            description=description,
            root_cause=root_cause,
            remediation_action=remediation_action,
            estimated_completion_date=estimated_completion.date(),
            assigned_owner="Security Team",
            priority=poam_priority,
            severity=poam_severity,
            resources_required="Security analyst time for review and system administrator time for remediation",
            business_impact=business_impact
        )

    def detect_file_format(self, content: str, filename: str = "") -> str:
        """
        Detect SCAP file format based on content and filename
        
        Args:
            content: File content as string
            filename: Original filename for additional hints
            
        Returns:
            Detected format: 'openscap', 'nessus', or 'unknown'
        """
        
        # Check filename extension
        if filename.lower().endswith('.nessus'):
            return 'nessus'
        
        # Check XML content for format indicators
        try:
            root = ET.fromstring(content)
            
            # Check for Nessus indicators
            if root.tag == 'NessusClientData_v2' or 'nessus' in root.tag.lower():
                return 'nessus'
            
            # Check for OpenSCAP indicators
            if any(keyword in content.lower() for keyword in ['openscap', 'oval', 'xccdf', 'scap']):
                return 'openscap'
            
            # Check for common SCAP XML elements
            if root.find('.//rule-result') is not None or root.find('.//TestResult') is not None:
                return 'openscap'
                
            # Check for Nessus XML elements
            if root.find('.//ReportItem') is not None or root.find('.//ReportHost') is not None:
                return 'nessus'
                
        except ET.ParseError:
            pass
            
        return 'unknown'

    def process_scap_file(self, content: str, filename: str = "", system_id: str = "default") -> Tuple[List[SCAPFinding], SCAPScanSummary, List[POAMRequest]]:
        """
        Process SCAP file and generate findings, summary, and POA&M entries
        
        Args:
            content: File content as string
            filename: Original filename
            system_id: System identifier for POA&M entries
            
        Returns:
            Tuple of (findings, summary, poam_entries)
        """
        
        # Detect file format
        file_format = self.detect_file_format(content, filename)
        
        if file_format == 'unknown':
            raise ValueError("Unsupported file format. Please upload a valid OpenSCAP XML or Nessus .nessus file.")
        
        # Parse based on format
        if file_format == 'openscap':
            findings, summary = self.parse_openscap_xml(content)
        elif file_format == 'nessus':
            findings, summary = self.parse_nessus_file(content)
        else:
            raise ValueError(f"Unsupported format: {file_format}")
        
        # Generate POA&M entries
        poam_entries = self.generate_poam_entries(findings, system_id)
        
        return findings, summary, poam_entries


# Create global instance
scap_parser = SCAPParser() 