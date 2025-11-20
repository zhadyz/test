// Frontend data structure for controls (previously hardcoded, now from AI-generated data)
// This file is auto-generated from backend/data/controls.py for frontend use

// Import full controls data from JSON (1,194 controls)
// Updated catalog with AC-1 and AC-2 rationale
import allControlsWithScripts from './controls_catalog.json';

// Fallback dataset for testing (23 controls) - not used anymore
const allControlsFallback = [
  {
    "control_id": "AC-2",
    "control_name": "Account Management",
    "official_text": "The organization manages information system accounts, including establishing, activating, modifying, reviewing, disabling, and removing accounts.",
    "plain_english_explanation": "Manage user accounts, remove old ones, and review access regularly.",
    "intent": "Ensure only authorized users have access.",
    "family": "Access Control",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["AC-3", "IA-2"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=AC-2"
  },
  {
    "control_id": "AC-3",
    "control_name": "Access Enforcement",
    "official_text": "The information system enforces approved authorizations for logical access to information and system resources.",
    "plain_english_explanation": "Systems must enforce permissions you set up.",
    "intent": "Prevent unauthorized access.",
    "family": "Access Control",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["AC-2", "SC-7"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=AC-3"
  },
  {
    "control_id": "AC-4",
    "control_name": "Information Flow Enforcement",
    "official_text": "The system enforces information flow control policies based on organization-defined requirements.",
    "plain_english_explanation": "Control where data can move inside your systems (e.g., block secret → public).",
    "intent": "Prevent data leakage across trust boundaries.",
    "family": "Access Control",
    "impact": "High",
    "baselines": ["Moderate", "High"],
    "related_controls": ["SC-7", "SC-13"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=AC-4"
  },
  {
    "control_id": "AC-6",
    "control_name": "Least Privilege",
    "official_text": "Employ the principle of least privilege, allowing only authorized accesses necessary to accomplish assigned tasks.",
    "plain_english_explanation": "Give users and services only the access they need—no more.",
    "intent": "Reduce blast radius from compromised accounts.",
    "family": "Access Control",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["AC-2", "IA-2"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=AC-6"
  },
  {
    "control_id": "AC-7",
    "control_name": "Unsuccessful Logon Attempts",
    "official_text": "Enforce a limit of consecutive invalid logon attempts and take action on exceedance.",
    "plain_english_explanation": "Lock accounts or add delays after too many bad passwords.",
    "intent": "Thwart brute-force attempts.",
    "family": "Access Control",
    "impact": "Low",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["IA-5"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=AC-7"
  },
  {
    "control_id": "AU-2",
    "control_name": "Event Logging",
    "official_text": "Determine and document events that the system is to log.",
    "plain_english_explanation": "Decide what to log (auth, admin, errors) and keep those logs.",
    "intent": "Provide evidence for investigations and monitoring.",
    "family": "Audit and Accountability",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["AU-6", "SI-4"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=AU-2"
  },
  {
    "control_id": "AU-6",
    "control_name": "Audit Record Review, Analysis, and Reporting",
    "official_text": "Review and analyze information system audit records for indications of inappropriate or unusual activity.",
    "plain_english_explanation": "Regularly review logs and alert on suspicious events.",
    "intent": "Detect and respond to incidents quickly.",
    "family": "Audit and Accountability",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["AU-2", "IR-4"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=AU-6"
  },
  {
    "control_id": "CM-2",
    "control_name": "Baseline Configuration",
    "official_text": "Develop, document, and maintain under configuration control a current baseline configuration.",
    "plain_english_explanation": "Define standard, hardened build settings and keep them under version control.",
    "intent": "Ensure consistent, secure configurations.",
    "family": "Configuration Management",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["CM-6", "SI-2"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=CM-2"
  },
  {
    "control_id": "CM-6",
    "control_name": "Configuration Settings",
    "official_text": "Establish and document configuration settings for information technology products.",
    "plain_english_explanation": "Apply CIS/STIG-like secure settings and monitor drift.",
    "intent": "Reduce vulnerabilities from insecure defaults.",
    "family": "Configuration Management",
    "impact": "High",
    "baselines": ["Moderate", "High"],
    "related_controls": ["CM-2", "SI-2"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=CM-6"
  },
  {
    "control_id": "CP-9",
    "control_name": "System Backup",
    "official_text": "Conduct backups of user-level and system-level information and protect the confidentiality, integrity, and availability of backup information.",
    "plain_english_explanation": "Back up data regularly and protect the backups.",
    "intent": "Enable recovery after incidents.",
    "family": "Contingency Planning",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["CP-10", "SI-12"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=CP-9"
  },
  {
    "control_id": "IA-2",
    "control_name": "Identification and Authentication (Organizational Users)",
    "official_text": "Uniquely identify and authenticate organizational users and processes.",
    "plain_english_explanation": "Use unique IDs, strong auth (MFA where appropriate).",
    "intent": "Ensure users are who they claim to be.",
    "family": "Identification and Authentication",
    "impact": "High",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["IA-5", "AC-2"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=IA-2"
  },
  {
    "control_id": "IA-5",
    "control_name": "Authenticator Management",
    "official_text": "Manage information system authenticators (e.g., passwords, tokens, keys).",
    "plain_english_explanation": "Set password rules, rotate keys, and protect secrets.",
    "intent": "Prevent weak or compromised authenticators.",
    "family": "Identification and Authentication",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["IA-2", "SC-12"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=IA-5"
  },
  {
    "control_id": "IR-4",
    "control_name": "Incident Handling",
    "official_text": "Implement an incident handling capability for incidents that includes preparation, detection, analysis, containment, recovery, and user response activities.",
    "plain_english_explanation": "Have a playbook and team to manage security incidents.",
    "intent": "Limit damage and restore operations quickly.",
    "family": "Incident Response",
    "impact": "High",
    "baselines": ["Moderate", "High"],
    "related_controls": ["IR-6", "AU-6"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=IR-4"
  },
  {
    "control_id": "IR-6",
    "control_name": "Incident Reporting",
    "official_text": "Report security incidents to organizational officials and authorities.",
    "plain_english_explanation": "Report incidents promptly to the right contacts.",
    "intent": "Enable coordinated response.",
    "family": "Incident Response",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["IR-4", "AU-6"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=IR-6"
  },
  {
    "control_id": "MP-5",
    "control_name": "Media Transport",
    "official_text": "Protect and control system media during transport outside of controlled areas.",
    "plain_english_explanation": "Encrypt and track drives and backups when moving them.",
    "intent": "Prevent data disclosure in transit.",
    "family": "Media Protection",
    "impact": "Low",
    "baselines": ["Low", "Moderate"],
    "related_controls": ["MP-6"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=MP-5"
  },
  {
    "control_id": "PE-3",
    "control_name": "Physical Access Control",
    "official_text": "Control physical access to organizational systems, equipment, and the respective operating environments.",
    "plain_english_explanation": "Badges, locks, and visitor logs at server rooms or offices.",
    "intent": "Prevent unauthorized physical access.",
    "family": "Physical and Environmental Protection",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["PE-6"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=PE-3"
  },
  {
    "control_id": "PL-2",
    "control_name": "System Security and Privacy Plans",
    "official_text": "Develop, document, and maintain under configuration control system security and privacy plans.",
    "plain_english_explanation": "Write and maintain an SSP that matches reality.",
    "intent": "Provide traceability for security responsibilities.",
    "family": "Planning",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["RA-5", "CA-2"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=PL-2"
  },
  {
    "control_id": "RA-5",
    "control_name": "Vulnerability Monitoring and Scanning",
    "official_text": "Scan for vulnerabilities in the system and hosted applications; remediate identified flaws.",
    "plain_english_explanation": "Run routine vuln scans and fix findings.",
    "intent": "Reduce exposure to known issues.",
    "family": "Risk Assessment",
    "impact": "High",
    "baselines": ["Moderate", "High"],
    "related_controls": ["SI-2", "CM-6"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=RA-5"
  },
  {
    "control_id": "SA-11",
    "control_name": "Developer Testing and Evaluation",
    "official_text": "Require developers to create and implement a security assessment plan and perform tests/evaluations.",
    "plain_english_explanation": "Do meaningful security testing during development.",
    "intent": "Catch defects early in the lifecycle.",
    "family": "System and Services Acquisition",
    "impact": "Moderate",
    "baselines": ["Moderate", "High"],
    "related_controls": ["RA-5", "SI-10"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=SA-11"
  },
  {
    "control_id": "SC-7",
    "control_name": "Boundary Protection",
    "official_text": "Monitor and control communications at external boundaries and key internal boundaries.",
    "plain_english_explanation": "Use firewalls, segmentation, and egress filtering.",
    "intent": "Limit attack paths into and out of the environment.",
    "family": "System and Communications Protection",
    "impact": "High",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["AC-4", "SC-13"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=SC-7"
  },
  {
    "control_id": "SC-13",
    "control_name": "Cryptographic Protection",
    "official_text": "Employ FIPS-validated cryptography for protecting the confidentiality and integrity of information.",
    "plain_english_explanation": "Use approved crypto libraries and manage keys securely.",
    "intent": "Protect data at rest and in transit.",
    "family": "System and Communications Protection",
    "impact": "High",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["SC-12", "IA-5"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=SC-13"
  },
  {
    "control_id": "SI-2",
    "control_name": "Flaw Remediation",
    "official_text": "Identify, report, and correct information system flaws in a timely manner.",
    "plain_english_explanation": "Patch systems promptly with a defined process.",
    "intent": "Lower risk from known vulnerabilities.",
    "family": "System and Information Integrity",
    "impact": "Moderate",
    "baselines": ["Low", "Moderate", "High"],
    "related_controls": ["RA-5", "CM-6"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=SI-2"
  },
  {
    "control_id": "SI-4",
    "control_name": "System Monitoring",
    "official_text": "Monitor the information system to detect attacks and indicators of potential attacks.",
    "plain_english_explanation": "Use security monitoring (SIEM/IDS) and alert on anomalies.",
    "intent": "Detect threats quickly and respond.",
    "family": "System and Information Integrity",
    "impact": "High",
    "baselines": ["Moderate", "High"],
    "related_controls": ["AU-6", "IR-4"],
    "nist_link": "https://csrc.nist.gov/projects/risk-management/sp800-53-controls/release-search#!/control?version=5.1&number=SI-4"
  }
];

// Export the full control set from JSON (1,194 controls)
export const allControls = allControlsWithScripts;

// Separate base controls from enhancements
// Enhancement controls have dots after the main number (e.g., "ac-2.1", "ac-2.2")
// Base controls have just family-number format (e.g., "ac-2", "au-3")
export const baseControls = allControlsWithScripts.filter(control => {
  const parts = control.control_id.split('-');
  if (parts.length < 2) return true;
  const numberPart = parts[1];
  return !numberPart.includes('.');
});
export const enhancementControls = allControlsWithScripts.filter(control => {
  const parts = control.control_id.split('-');
  if (parts.length < 2) return false;
  const numberPart = parts[1];
  return numberPart.includes('.');
});

// Create enhancements mapping: { "ac-2": [enhancement objects], ... }
export const enhancementsMap = {};
enhancementControls.forEach(enhancement => {
  // Extract parent control ID (e.g., "ac-2" from "ac-2.1")
  const parts = enhancement.control_id.split('.');
  const parentId = parts[0]; // "ac-2" from "ac-2.1"
  if (!enhancementsMap[parentId]) {
    enhancementsMap[parentId] = [];
  }
  enhancementsMap[parentId].push(enhancement);
});

// Sort enhancements by their number (e.g., ac-2.1, ac-2.2, ac-2.10)
Object.keys(enhancementsMap).forEach(parentId => {
  enhancementsMap[parentId].sort((a, b) => {
    const numA = parseInt(a.control_id.split('.')[1] || '0');
    const numB = parseInt(b.control_id.split('.')[1] || '0');
    return numA - numB;
  });
});

// Legacy exports for backward compatibility
export const CONTROL_DESCRIPTIONS = {};
export const ENHANCED_CONTROLS = {};

// Build legacy objects from the new data for backward compatibility
allControls.forEach(control => {
  CONTROL_DESCRIPTIONS[control.control_id] = {
    control_id: control.control_id,
    control_name: control.control_name,
    plain_english_explanation: control.plain_english_explanation
  };

  ENHANCED_CONTROLS[control.control_id] = control;
});

// Demo controls for fallback (keeping for backward compatibility)
export const demoControls = allControls.slice(0, 20); // First 20 controls 