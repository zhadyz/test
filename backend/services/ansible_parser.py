"""
Ansible output parser service for generating POA&M entries from security scan results.
Supports parsing Ansible JSON output, YAML playbook results, and standard output formats.
"""

import json
import re
import yaml
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from models.poam import POAMRequest, POAMPriority, POAMSeverity, POAMStatus
from services.poam_store import poam_store


class AnsibleTaskStatus(Enum):
    """Ansible task execution status"""
    OK = "ok"
    CHANGED = "changed"
    FAILED = "failed"
    SKIPPED = "skipped"
    UNREACHABLE = "unreachable"


@dataclass
class AnsibleTaskResult:
    """Parsed Ansible task result"""
    task_name: str
    control_id: Optional[str]
    status: AnsibleTaskStatus
    host: str
    error_message: Optional[str]
    module: str
    tags: List[str]
    timestamp: datetime
    reason: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None


class AnsibleParser:
    """Service for parsing Ansible output and generating POA&M entries"""
    
    def __init__(self):
        self.control_patterns = [
            r'(AC-\d+(?:\.\d+)?)',
            r'(AU-\d+(?:\.\d+)?)',
            r'(SC-\d+(?:\.\d+)?)',
            r'(CM-\d+(?:\.\d+)?)',
            r'(SI-\d+(?:\.\d+)?)',
            r'(IA-\d+(?:\.\d+)?)',
            r'(NIST[\s-]*(AC|AU|SC|CM|SI|IA)-\d+(?:\.\d+)?)',
            r'(STIG[\s-]*[A-Z]+-\d+-\d+)',
        ]
        
        # Common failure reasons and their remediation suggestions
        self.remediation_mapping = {
            'permission_denied': 'Review and adjust file/directory permissions. Ensure the automation user has appropriate sudo privileges.',
            'package_not_found': 'Verify package name and repository availability. Check if package exists in configured repositories.',
            'service_not_found': 'Confirm service name and availability. Install required packages if service is missing.',
            'file_not_found': 'Verify file paths and create missing configuration files. Check if required packages are installed.',
            'connection_failed': 'Verify network connectivity and SSH access. Check firewall rules and authentication.',
            'timeout': 'Increase task timeout values or investigate system performance issues.',
            'dependency_failed': 'Review task dependencies and execution order. Ensure prerequisite tasks complete successfully.',
            'selinux_denied': 'Review SELinux policies and contexts. Consider temporary permissive mode for testing.',
            'syntax_error': 'Review configuration file syntax and validate against expected format.',
            'insufficient_privileges': 'Ensure automation user has required privileges. Review sudo configuration.',
        }

    def parse_ansible_json_output(self, json_output: str) -> List[AnsibleTaskResult]:
        """
        Parse Ansible JSON output format (ansible-playbook -vvv or callback plugins)
        """
        results = []
        
        try:
            # Handle both single JSON object and line-delimited JSON
            if json_output.strip().startswith('['):
                # Array of results
                data = json.loads(json_output)
                for item in data:
                    results.extend(self._parse_json_play_recap(item))
            else:
                # Line-delimited JSON or single object
                for line in json_output.strip().split('\n'):
                    if line.strip():
                        try:
                            data = json.loads(line)
                            results.extend(self._parse_json_play_recap(data))
                        except json.JSONDecodeError:
                            continue
                            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")
            
        return results

    def parse_ansible_stdout(self, stdout_output: str) -> List[AnsibleTaskResult]:
        """
        Parse standard Ansible output format
        """
        results = []
        lines = stdout_output.split('\n')
        
        current_task = None
        current_host = None
        current_status = None
        current_error = None
        
        for line in lines:
            line = line.strip()
            
            # Parse task headers
            task_match = re.match(r'TASK \[(.*?)\]', line)
            if task_match:
                current_task = task_match.group(1)
                continue
            
            # Parse task results
            result_patterns = [
                (r'ok: \[(.*?)\]', AnsibleTaskStatus.OK),
                (r'changed: \[(.*?)\]', AnsibleTaskStatus.CHANGED),
                (r'failed: \[(.*?)\]', AnsibleTaskStatus.FAILED),
                (r'skipping: \[(.*?)\]', AnsibleTaskStatus.SKIPPED),
                (r'fatal: \[(.*?)\]', AnsibleTaskStatus.UNREACHABLE),
            ]
            
            for pattern, status in result_patterns:
                match = re.match(pattern, line)
                if match:
                    host = match.group(1)
                    
                    # Extract error message for failed tasks
                    error_msg = None
                    if status in [AnsibleTaskStatus.FAILED, AnsibleTaskStatus.UNREACHABLE]:
                        error_match = re.search(r'=> (.+)', line)
                        if error_match:
                            error_msg = error_match.group(1)
                    
                    # Extract control ID from task name
                    control_id = self._extract_control_id(current_task or "")
                    
                    result = AnsibleTaskResult(
                        task_name=current_task or "Unknown Task",
                        control_id=control_id,
                        status=status,
                        host=host,
                        error_message=error_msg,
                        module="unknown",
                        tags=[],
                        timestamp=datetime.now()
                    )
                    
                    results.append(result)
                    break
        
        return results

    def parse_ansible_yaml_results(self, yaml_output: str) -> List[AnsibleTaskResult]:
        """
        Parse Ansible YAML output format
        """
        results = []
        
        try:
            data = yaml.safe_load(yaml_output)
            
            if isinstance(data, list):
                for play in data:
                    results.extend(self._parse_yaml_play(play))
            elif isinstance(data, dict):
                results.extend(self._parse_yaml_play(data))
                
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML format: {e}")
            
        return results

    def _parse_json_play_recap(self, data: Dict[str, Any]) -> List[AnsibleTaskResult]:
        """Parse JSON play recap data"""
        results = []
        
        # Handle different JSON output formats
        if 'plays' in data:
            for play in data['plays']:
                for task in play.get('tasks', []):
                    for host, result in task.get('hosts', {}).items():
                        results.append(self._create_task_result_from_json(task, host, result))
        
        elif 'tasks' in data:
            for task in data['tasks']:
                for host, result in task.get('hosts', {}).items():
                    results.append(self._create_task_result_from_json(task, host, result))
        
        return results

    def _parse_yaml_play(self, play_data: Dict[str, Any]) -> List[AnsibleTaskResult]:
        """Parse YAML play data"""
        results = []
        
        for task in play_data.get('tasks', []):
            for host, result in task.get('hosts', {}).items():
                results.append(self._create_task_result_from_yaml(task, host, result))
        
        return results

    def _create_task_result_from_json(self, task: Dict, host: str, result: Dict) -> AnsibleTaskResult:
        """Create AnsibleTaskResult from JSON data"""
        
        # Determine status
        status = AnsibleTaskStatus.OK
        if result.get('failed', False):
            status = AnsibleTaskStatus.FAILED
        elif result.get('changed', False):
            status = AnsibleTaskStatus.CHANGED
        elif result.get('skipped', False):
            status = AnsibleTaskStatus.SKIPPED
        elif result.get('unreachable', False):
            status = AnsibleTaskStatus.UNREACHABLE

        # Extract error information
        error_msg = None
        if status in [AnsibleTaskStatus.FAILED, AnsibleTaskStatus.UNREACHABLE]:
            error_msg = result.get('msg', result.get('stderr', str(result.get('exception', ''))))

        return AnsibleTaskResult(
            task_name=task.get('task', {}).get('name', 'Unknown Task'),
            control_id=self._extract_control_id(task.get('task', {}).get('name', '')),
            status=status,
            host=host,
            error_message=error_msg,
            module=task.get('task', {}).get('action', 'unknown'),
            tags=task.get('task', {}).get('tags', []),
            timestamp=datetime.now(),
            stdout=result.get('stdout', ''),
            stderr=result.get('stderr', ''),
            reason=result.get('reason', '')
        )

    def _create_task_result_from_yaml(self, task: Dict, host: str, result: Dict) -> AnsibleTaskResult:
        """Create AnsibleTaskResult from YAML data"""
        return self._create_task_result_from_json(task, host, result)

    def _extract_control_id(self, text: str) -> Optional[str]:
        """Extract NIST control ID from text using regex patterns"""
        if not text:
            return None
            
        for pattern in self.control_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                control_id = match.group(1).upper()
                # Clean up the control ID
                control_id = re.sub(r'^(NIST|STIG)[\s-]*', '', control_id)
                return control_id
        
        return None

    def _categorize_failure_reason(self, error_message: str, module: str) -> str:
        """Categorize failure reason based on error message and module"""
        if not error_message:
            return 'unknown'
            
        error_lower = error_message.lower()
        
        if 'permission denied' in error_lower or 'access denied' in error_lower:
            return 'permission_denied'
        elif 'no such file' in error_lower or 'file not found' in error_lower:
            return 'file_not_found'
        elif 'package not found' in error_lower or 'no package' in error_lower:
            return 'package_not_found'
        elif 'service not found' in error_lower or 'unit not found' in error_lower:
            return 'service_not_found'
        elif 'connection' in error_lower and ('refused' in error_lower or 'timeout' in error_lower):
            return 'connection_failed'
        elif 'timeout' in error_lower:
            return 'timeout'
        elif 'selinux' in error_lower and 'denied' in error_lower:
            return 'selinux_denied'
        elif 'syntax' in error_lower or 'invalid' in error_lower:
            return 'syntax_error'
        elif 'sudo' in error_lower or 'privilege' in error_lower:
            return 'insufficient_privileges'
        else:
            return 'unknown'

    def _generate_remediation_action(self, task_result: AnsibleTaskResult) -> str:
        """Generate remediation action based on task result"""
        
        # Get base remediation from failure reason
        failure_reason = self._categorize_failure_reason(
            task_result.error_message or "", 
            task_result.module
        )
        base_remediation = self.remediation_mapping.get(failure_reason, 
            "Review task execution logs and address the underlying issue.")
        
        # Add control-specific guidance
        control_guidance = ""
        if task_result.control_id:
            if task_result.control_id.startswith('AC-'):
                control_guidance = " Ensure access control policies are properly configured and enforced."
            elif task_result.control_id.startswith('AU-'):
                control_guidance = " Verify audit logging configuration and log file permissions."
            elif task_result.control_id.startswith('SC-'):
                control_guidance = " Review system and communications protection settings."
            elif task_result.control_id.startswith('CM-'):
                control_guidance = " Check configuration management and baseline settings."
            elif task_result.control_id.startswith('SI-'):
                control_guidance = " Validate system and information integrity controls."
            elif task_result.control_id.startswith('IA-'):
                control_guidance = " Review identification and authentication mechanisms."
        
        return base_remediation + control_guidance

    def generate_poam_entries(self, task_results: List[AnsibleTaskResult]) -> List[POAMRequest]:
        """
        Generate POA&M entries from failed/skipped Ansible tasks
        """
        poam_entries = []
        
        # Group tasks by control ID to avoid duplicates
        control_failures = {}
        
        for result in task_results:
            if result.status in [AnsibleTaskStatus.FAILED, AnsibleTaskStatus.SKIPPED]:
                control_id = result.control_id or "UNKNOWN"
                
                if control_id not in control_failures:
                    control_failures[control_id] = []
                control_failures[control_id].append(result)
        
        # Create POA&M entries for each control with failures
        for control_id, failures in control_failures.items():
            
            # Aggregate error information
            error_messages = [f.error_message for f in failures if f.error_message]
            affected_hosts = list(set([f.host for f in failures]))
            failed_tasks = [f.task_name for f in failures]
            
            # Determine priority based on control type and number of failures
            priority = self._determine_priority(control_id, len(failures))
            severity = self._determine_severity(control_id, failures)
            
            # Create description
            description = f"Ansible automation failed for control {control_id}. "
            description += f"Failed tasks: {', '.join(failed_tasks[:3])}"
            if len(failed_tasks) > 3:
                description += f" and {len(failed_tasks) - 3} more"
            description += f". Affected hosts: {', '.join(affected_hosts[:5])}"
            if len(affected_hosts) > 5:
                description += f" and {len(affected_hosts) - 5} more"
            
            # Create root cause analysis
            root_cause = "Automated compliance check failed during Ansible playbook execution. "
            if error_messages:
                common_errors = list(set(error_messages[:3]))
                root_cause += f"Common errors: {'; '.join(common_errors)}"
            
            # Generate remediation action
            remediation_action = self._generate_remediation_action(failures[0])
            
            # Create POA&M entry
            poam_entry = POAMRequest(
                control_id=control_id,
                description=description,
                root_cause=root_cause,
                remediation_action=remediation_action,
                estimated_completion_date=(datetime.now() + timedelta(days=30)).date(),
                priority=priority,
                severity=severity,
                assigned_owner="Security Team",
                business_impact="Compliance gap identified through automated scanning",
                resources_required="Technical review and system configuration updates"
            )
            
            poam_entries.append(poam_entry)
        
        return poam_entries

    def _determine_priority(self, control_id: str, failure_count: int) -> POAMPriority:
        """Determine POA&M priority based on control type and failure count"""
        
        # Critical controls get higher priority
        critical_controls = ['AC-2', 'AC-3', 'SC-28', 'AU-2', 'IA-2', 'SI-4']
        
        if any(control_id.startswith(cc) for cc in critical_controls):
            return POAMPriority.HIGH if failure_count > 2 else POAMPriority.MEDIUM
        
        if failure_count > 5:
            return POAMPriority.HIGH
        elif failure_count > 2:
            return POAMPriority.MEDIUM
        else:
            return POAMPriority.LOW

    def _determine_severity(self, control_id: str, failures: List[AnsibleTaskResult]) -> POAMSeverity:
        """Determine POA&M severity based on control type and failure characteristics"""
        
        # Check for security-critical controls
        cat1_controls = ['AC-2', 'AC-3', 'IA-2', 'SC-28']
        cat2_controls = ['AU-2', 'AU-3', 'CM-2', 'SI-4']
        
        if any(control_id.startswith(cc) for cc in cat1_controls):
            return POAMSeverity.CAT_I
        elif any(control_id.startswith(cc) for cc in cat2_controls):
            return POAMSeverity.CAT_II
        else:
            return POAMSeverity.CAT_III

    def process_ansible_output(self, output: str, output_format: str = "auto") -> Tuple[List[AnsibleTaskResult], List[POAMRequest]]:
        """
        Process Ansible output and generate both parsed results and POA&M entries
        
        Args:
            output: Ansible output string
            output_format: Format type ("json", "yaml", "stdout", or "auto")
            
        Returns:
            Tuple of (parsed_results, poam_entries)
        """
        
        # Auto-detect format if not specified
        if output_format == "auto":
            output_format = self._detect_output_format(output)
        
        # Parse based on format
        if output_format == "json":
            task_results = self.parse_ansible_json_output(output)
        elif output_format == "yaml":
            task_results = self.parse_ansible_yaml_results(output)
        elif output_format == "stdout":
            task_results = self.parse_ansible_stdout(output)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")
        
        # Generate POA&M entries for failures
        poam_entries = self.generate_poam_entries(task_results)
        
        return task_results, poam_entries

    def _detect_output_format(self, output: str) -> str:
        """Auto-detect Ansible output format"""
        output_stripped = output.strip()
        
        if output_stripped.startswith('{') or output_stripped.startswith('['):
            return "json"
        elif output_stripped.startswith('---') or 'plays:' in output:
            return "yaml"
        else:
            return "stdout"


# Global instance
ansible_parser = AnsibleParser() 