"""
NIST 800-53 Control Data Module

This module contains sample NIST 800-53 security controls with all required fields.
In a production system, this would likely be replaced with a database connection.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel


class SystemSetting(BaseModel):
    """Model for system settings affected by controls"""
    type: str  # 'registry', 'file', 'service', 'policy', 'network'
    path: str  # Registry key, file path, service name, etc.
    value: Optional[str] = None  # Expected value
    description: str


class Control(BaseModel):
    """
    Pydantic model for NIST 800-53 control data structure.
    
    This model ensures type safety and provides automatic validation
    for all control data fields.
    """
    control_id: str
    control_name: str
    official_text: str
    plain_english_explanation: str
    intent: str
    example_implementation: str
    common_misinterpretations: str
    # New fields for conflict detection and impact visualization
    affects: List[SystemSetting] = []  # System settings, files, registry keys affected
    conflicts_with: List[str] = []  # Control IDs that this control conflicts with
    overrides: List[str] = []  # Control IDs or settings that this control overrides
    prerequisites: List[str] = []  # Control IDs that must be implemented first


# Sample NIST 800-53 controls data
# In production, this would be loaded from a database
CONTROLS_DATA: Dict[str, Dict] = {
    "AC-2": {
        "control_id": "AC-2",
        "control_name": "Account Management",
        "official_text": "The organization manages information system accounts, including establishing, activating, modifying, reviewing, disabling, and removing accounts.",
        "plain_english_explanation": "Manage user accounts, remove old ones, and review access regularly.",
        "intent": "Ensure only authorized users have access.",
        "example_implementation": "Use Active Directory for account management.",
        "common_misinterpretations": "Forgetting to remove old accounts.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "AC-3": {
        "control_id": "AC-3",
        "control_name": "Access Enforcement",
        "official_text": "The information system enforces approved authorizations for logical access to information and system resources in accordance with applicable access control policies.",
        "plain_english_explanation": "Systems must enforce permissions you set up.",
        "intent": "Prevent unauthorized access.",
        "example_implementation": "Set file and folder permissions.",
        "common_misinterpretations": "Assuming permissions are enforced without testing.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "AC-17": {
        "control_id": "AC-17",
        "control_name": "Remote Access",
        "official_text": "The organization authorizes, monitors, and controls all methods of remote access to the information system.",
        "plain_english_explanation": "Set rules for remote access and require approval.",
        "intent": "Control and secure remote access.",
        "example_implementation": "Require VPN and MFA for remote access.",
        "common_misinterpretations": "Ignoring mobile or cloud access.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "AU-2": {
        "control_id": "AU-2",
        "control_name": "Audit Events",
        "official_text": "The organization determines that the information system is capable of auditing the following events: [Assignment: organization-defined auditable events]; and coordinates the security audit function with other organizational entities requiring audit-related information to enhance mutual support and to help guide the selection of auditable events.",
        "plain_english_explanation": "Decide what to log and make sure your systems can log it.",
        "intent": "Support incident investigation.",
        "example_implementation": "Enable Windows Event Logs.",
        "common_misinterpretations": "Logging too much or too little.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "AU-3": {
        "control_id": "AU-3",
        "control_name": "Content of Audit Records",
        "official_text": "The information system generates audit records containing information that establishes what type of event occurred, when the event occurred, where the event occurred, the source of the event, the outcome of the event, and the identity of any individuals or subjects associated with the event.",
        "plain_english_explanation": "Logs must include what, when, where, who, and outcome.",
        "intent": "Support security monitoring.",
        "example_implementation": "Configure logs to include user, time, and action.",
        "common_misinterpretations": "Missing context in logs.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "CM-2": {
        "control_id": "CM-2",
        "control_name": "Baseline Configuration",
        "official_text": "The organization develops, documents, and maintains under configuration control, a current baseline configuration of the information system.",
        "plain_english_explanation": "Create and maintain a gold standard configuration for systems.",
        "intent": "Ensure all systems start from a secure baseline.",
        "example_implementation": "Use Ansible to deploy standard images.",
        "common_misinterpretations": "Not updating baselines after changes.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "CM-6": {
        "control_id": "CM-6",
        "control_name": "Configuration Settings",
        "official_text": "The organization establishes and documents configuration settings for information technology products employed within the information system using [Assignment: organization-defined security configuration checklists] that reflect the most restrictive mode consistent with operational requirements; implements the configuration settings; and identifies, documents, and approves exceptions from the configuration settings for individual components within the information system based on explicit operational requirements.",
        "plain_english_explanation": "Set and document secure settings for all IT equipment.",
        "intent": "Ensure secure and consistent configurations.",
        "example_implementation": "Use CIS Benchmarks.",
        "common_misinterpretations": "Not maintaining settings over time.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "IA-2": {
        "control_id": "IA-2",
        "control_name": "Identification and Authentication (Organizational Users)",
        "official_text": "The information system uniquely identifies and authenticates organizational users (or processes acting on behalf of organizational users).",
        "plain_english_explanation": "Each user must have a unique account and verify their identity.",
        "intent": "Only authorized individuals can access systems.",
        "example_implementation": "Require strong passwords and MFA.",
        "common_misinterpretations": "Ignoring service accounts or MFA.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "IA-5": {
        "control_id": "IA-5",
        "control_name": "Authenticator Management",
        "official_text": "The organization manages information system authenticators by: (a) verifying, as part of the initial authenticator distribution, the identity of the individual, group, role, or device receiving the authenticator; (b) establishing initial authenticator content for authenticators defined by the organization; (c) ensuring that authenticators have sufficient strength of mechanism for their intended use; (d) establishing and implementing administrative procedures for initial authenticator distribution, for lost/compromised, or damaged authenticators, and for revoking authenticators; (e) changing default authenticators upon information system installation; and (f) establishing minimum and maximum lifetime restrictions and reuse conditions for authenticators.",
        "plain_english_explanation": "Manage passwords, tokens, and certificates securely.",
        "intent": "Protect authentication credentials.",
        "example_implementation": "Rotate passwords and use a PAM system.",
        "common_misinterpretations": "Ignoring non-password authenticators.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "SC-7": {
        "control_id": "SC-7",
        "control_name": "Boundary Protection",
        "official_text": "The organization monitors and controls communications at the external boundary of the information system and at key internal boundaries within the system.",
        "plain_english_explanation": "Monitor and control network traffic at system boundaries.",
        "intent": "Protect internal networks from external threats.",
        "example_implementation": "Use firewalls and segmentation.",
        "common_misinterpretations": "Focusing only on perimeter.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "SC-8": {
        "control_id": "SC-8",
        "control_name": "Transmission Confidentiality and Integrity",
        "official_text": "The information system protects the confidentiality and integrity of transmitted information.",
        "plain_english_explanation": "Protect data when it is being transmitted.",
        "intent": "Prevent unauthorized access in transit.",
        "example_implementation": "Use TLS/SSL for all network communications.",
        "common_misinterpretations": "Not encrypting all traffic.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "SC-12": {"control_id": "SC-12", "control_name": "Cryptographic Key Establishment and Management", "official_text": "Manage cryptographic keys.", "plain_english_explanation": "Manage cryptographic keys securely.", "intent": "Protect data at rest and in transit.", "example_implementation": "Use a key management system.", "common_misinterpretations": "Not rotating or protecting keys.", "affects": [], "conflicts_with": [], "overrides": [], "prerequisites": []},
    "SC-13": {"control_id": "SC-13", "control_name": "Cryptographic Protection", "official_text": "Implement cryptographic protection.", "plain_english_explanation": "Use cryptography to protect sensitive data.", "intent": "Prevent unauthorized disclosure.", "example_implementation": "Encrypt files, databases, and backups.", "common_misinterpretations": "Not managing encryption keys securely.", "affects": [], "conflicts_with": [], "overrides": [], "prerequisites": []},
    "SI-2": {
        "control_id": "SI-2",
        "control_name": "Flaw Remediation",
        "official_text": "The organization identifies, reports, and corrects information system flaws in a timely manner.",
        "plain_english_explanation": "Find and fix security flaws in your systems.",
        "intent": "Reduce exposure to threats.",
        "example_implementation": "Automate patch management and test updates.",
        "common_misinterpretations": "Missing application or firmware updates.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "SI-4": {
        "control_id": "SI-4",
        "control_name": "Information System Monitoring",
        "official_text": "The organization monitors the information system to detect attacks and indicators of potential attacks.",
        "plain_english_explanation": "Monitor systems to detect attacks and unauthorized access.",
        "intent": "Provide ongoing awareness of system security status.",
        "example_implementation": "Deploy SIEM and intrusion detection systems.",
        "common_misinterpretations": "Collecting data but not analyzing it.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "PE-3": {
        "control_id": "PE-3",
        "control_name": "Physical Access Control",
        "official_text": "The organization controls physical access to the information system, equipment, and the respective operating environments to authorized individuals.",
        "plain_english_explanation": "Control who can physically enter facilities.",
        "intent": "Prevent unauthorized physical access.",
        "example_implementation": "Use badge readers and visitor logs.",
        "common_misinterpretations": "Ignoring internal access or not updating permissions.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "RA-5": {
        "control_id": "RA-5",
        "control_name": "Vulnerability Scanning",
        "official_text": "The organization scans for vulnerabilities in the information system and hosted applications and remediates vulnerabilities in accordance with an organizational assessment of risk.",
        "plain_english_explanation": "Regularly scan systems for security vulnerabilities.",
        "intent": "Identify and fix vulnerabilities before attackers do.",
        "example_implementation": "Use Nessus or OpenVAS for weekly scans.",
        "common_misinterpretations": "Not remediating findings in a timely manner.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "IR-4": {
        "control_id": "IR-4",
        "control_name": "Incident Handling",
        "official_text": "The organization implements an incident handling capability for security incidents that includes preparation, detection and analysis, containment, eradication, and recovery.",
        "plain_english_explanation": "Have a process for handling security incidents.",
        "intent": "Respond to and recover from incidents effectively.",
        "example_implementation": "Create an incident response team and playbooks.",
        "common_misinterpretations": "Not practicing or updating the plan.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "MP-6": {
        "control_id": "MP-6",
        "control_name": "Media Sanitization",
        "official_text": "The organization sanitizes information system media prior to disposal, release out of organizational control, or release for reuse.",
        "plain_english_explanation": "Wipe or destroy storage media before disposal.",
        "intent": "Prevent data recovery from disposed media.",
        "example_implementation": "Use data wiping software or physical destruction.",
        "common_misinterpretations": "Thinking deleting files is enough.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "PS-3": {
        "control_id": "PS-3",
        "control_name": "Personnel Screening",
        "official_text": "The organization screens individuals prior to authorizing access to the information system.",
        "plain_english_explanation": "Conduct background checks before giving access.",
        "intent": "Ensure trustworthy personnel.",
        "example_implementation": "Perform background checks and rescreening.",
        "common_misinterpretations": "Never rescreening employees.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "CP-4": {
        "control_id": "CP-4",
        "control_name": "Contingency Plan Testing",
        "official_text": "The organization tests the contingency plan for the information system to determine the plan’s effectiveness and the organization’s readiness to execute the plan.",
        "plain_english_explanation": "Test disaster recovery and business continuity plans.",
        "intent": "Ensure plans work in emergencies.",
        "example_implementation": "Conduct annual disaster recovery exercises.",
        "common_misinterpretations": "Never testing or updating plans.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "PL-2": {
        "control_id": "PL-2",
        "control_name": "System Security Plan",
        "official_text": "The organization develops, documents, and implements a system security plan for the information system that describes the security requirements and the security controls in place or planned for meeting those requirements.",
        "plain_english_explanation": "Document how your system meets security requirements.",
        "intent": "Provide a roadmap for system security.",
        "example_implementation": "Write and update a system security plan.",
        "common_misinterpretations": "Letting the plan get outdated.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "CA-2": {
        "control_id": "CA-2",
        "control_name": "Security Assessments",
        "official_text": "The organization assesses the security controls in the information system to determine the extent to which the controls are implemented correctly, operating as intended, and producing the desired outcome with respect to meeting the security requirements for the system.",
        "plain_english_explanation": "Regularly assess your security controls.",
        "intent": "Ensure controls are effective.",
        "example_implementation": "Schedule annual security assessments.",
        "common_misinterpretations": "Not following up on assessment findings.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "SA-11": {
        "control_id": "SA-11",
        "control_name": "Developer Security Testing and Evaluation",
        "official_text": "The organization requires the developer of the information system, system component, or information system service to create a security test and evaluation plan, implement the plan, and document the results.",
        "plain_english_explanation": "Test software for security before deployment.",
        "intent": "Prevent vulnerabilities in new software.",
        "example_implementation": "Perform code reviews and security testing.",
        "common_misinterpretations": "Skipping security testing for small changes.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    },
    "AT-2": {
        "control_id": "AT-2",
        "control_name": "Security Awareness Training",
        "official_text": "The organization provides basic security awareness training to information system users (including managers, senior executives, and contractors) as part of initial training, when required by information system changes, and [Assignment: organization-defined frequency] thereafter.",
        "plain_english_explanation": "Train users on security best practices.",
        "intent": "Reduce human risk.",
        "example_implementation": "Conduct annual security training.",
        "common_misinterpretations": "Not updating training content.",
        "affects": [],
        "conflicts_with": [],
        "overrides": [],
        "prerequisites": []
    }
}


def get_all_controls() -> List[Control]:
    """
    Returns all available controls as a list of Control objects.
    
    Returns:
        List[Control]: List of all available NIST 800-53 controls
    """
    return [Control(**control_data) for control_data in CONTROLS_DATA.values()]


def get_control_by_id(control_id: str) -> Control | None:
    """
    Retrieves a specific control by its ID.
    
    Args:
        control_id (str): The control ID to search for (e.g., "AC-2")
        
    Returns:
        Control | None: The control if found, None otherwise
    """
    control_data = CONTROLS_DATA.get(control_id.upper())
    if control_data:
        return Control(**control_data)
    return None


def search_controls(keyword: str) -> List[Control]:
    """
    Searches for controls that match the given keyword in control_id, 
    control_name, or official_text fields.
    
    Args:
        keyword (str): The keyword to search for
        
    Returns:
        List[Control]: List of matching controls
    """
    keyword_lower = keyword.lower()
    matching_controls = []
    
    for control_data in CONTROLS_DATA.values():
        # Search in control_id, control_name, and official_text
        if (keyword_lower in control_data["control_id"].lower() or
            keyword_lower in control_data["control_name"].lower() or
            keyword_lower in control_data["official_text"].lower()):
            matching_controls.append(Control(**control_data))
    
    return matching_controls 