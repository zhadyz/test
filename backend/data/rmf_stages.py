"""
RMF Stages Data - Defines the 7 official NIST RMF steps with checklists and artifacts

This module provides the structured data for the Risk Management Framework (RMF) 
tracking system, including all 7 stages and their associated tasks and artifacts.
"""

from typing import Dict, List, Any
from datetime import datetime

# RMF Stage definitions with checklists and artifacts
RMF_STAGES = {
    "prepare": {
        "id": "prepare",
        "name": "Prepare",
        "description": "Essential activities to prepare the organization to manage security and privacy risks",
        "order": 1,
        "checklist": [
            {
                "id": "prepare_1",
                "task": "Establish organizational risk management strategy",
                "description": "Define risk management strategy and governance structure",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Risk Management Strategy Document",
                "estimated_hours": 40,
                "priority": "high"
            },
            {
                "id": "prepare_2", 
                "task": "Identify key stakeholders and roles",
                "description": "Define roles and responsibilities for RMF implementation",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "RACI Matrix / Roles Document",
                "estimated_hours": 16,
                "priority": "high"
            },
            {
                "id": "prepare_3",
                "task": "Establish organizational risk tolerance",
                "description": "Define acceptable risk levels and risk appetite",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document", 
                "artifact_name": "Risk Tolerance Statement",
                "estimated_hours": 24,
                "priority": "medium"
            },
            {
                "id": "prepare_4",
                "task": "Identify information life cycle and mission/business processes",
                "description": "Document critical business processes and information flows",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "diagram",
                "artifact_name": "Business Process Diagram",
                "estimated_hours": 32,
                "priority": "medium"
            },
            {
                "id": "prepare_5",
                "task": "Establish continuous monitoring strategy",
                "description": "Define approach for ongoing security monitoring",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Continuous Monitoring Strategy",
                "estimated_hours": 20,
                "priority": "medium"
            }
        ]
    },
    "categorize": {
        "id": "categorize",
        "name": "Categorize",
        "description": "Categorize the system and information processed based on impact analysis",
        "order": 2,
        "checklist": [
            {
                "id": "categorize_1",
                "task": "Define system boundaries",
                "description": "Clearly define what is included and excluded from the system",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "diagram",
                "artifact_name": "System Boundary Diagram",
                "estimated_hours": 16,
                "priority": "high"
            },
            {
                "id": "categorize_2",
                "task": "Identify information types",
                "description": "Catalog all types of information processed by the system",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Information Type Inventory",
                "estimated_hours": 24,
                "priority": "high"
            },
            {
                "id": "categorize_3",
                "task": "Conduct impact analysis",
                "description": "Determine potential impact of confidentiality, integrity, and availability loss",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Impact Analysis Report",
                "estimated_hours": 32,
                "priority": "high"
            },
            {
                "id": "categorize_4",
                "task": "Assign security categorization",
                "description": "Assign overall system security category (Low, Moderate, High)",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Security Categorization Document",
                "estimated_hours": 8,
                "priority": "high"
            },
            {
                "id": "categorize_5",
                "task": "Complete FIPS-199 categorization",
                "description": "Document system categorization per FIPS Publication 199",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "form",
                "artifact_name": "FIPS-199 Categorization Form",
                "estimated_hours": 12,
                "priority": "high"
            }
        ]
    },
    "select": {
        "id": "select",
        "name": "Select",
        "description": "Select appropriate security controls based on risk assessment and requirements",
        "order": 3,
        "checklist": [
            {
                "id": "select_1",
                "task": "Select security control baseline",
                "description": "Choose appropriate baseline (Low, Moderate, High) based on categorization",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Control Baseline Selection Document",
                "estimated_hours": 8,
                "priority": "high"
            },
            {
                "id": "select_2",
                "task": "Tailor security controls",
                "description": "Apply tailoring guidance to customize controls for system environment",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Control Tailoring Document",
                "estimated_hours": 40,
                "priority": "high"
            },
            {
                "id": "select_3",
                "task": "Document control allocation",
                "description": "Assign controls to system components and responsible parties",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "spreadsheet",
                "artifact_name": "Control Allocation Matrix",
                "estimated_hours": 24,
                "priority": "medium"
            },
            {
                "id": "select_4",
                "task": "Identify common controls",
                "description": "Determine which controls are inherited from organization or other systems",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Common Controls Identification",
                "estimated_hours": 16,
                "priority": "medium"
            },
            {
                "id": "select_5",
                "task": "Complete control selection documentation",
                "description": "Finalize and document all selected security controls",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Security Control Selection Document",
                "estimated_hours": 20,
                "priority": "high"
            }
        ]
    },
    "implement": {
        "id": "implement",
        "name": "Implement",
        "description": "Implement selected security controls and document implementation details",
        "order": 4,
        "checklist": [
            {
                "id": "implement_1",
                "task": "Develop implementation plan",
                "description": "Create detailed plan for implementing all selected controls",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Implementation Plan",
                "estimated_hours": 32,
                "priority": "high"
            },
            {
                "id": "implement_2",
                "task": "Implement security controls",
                "description": "Deploy and configure security controls according to specifications",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "evidence",
                "artifact_name": "Implementation Evidence Package",
                "estimated_hours": 200,
                "priority": "high"
            },
            {
                "id": "implement_3",
                "task": "Document control implementations",
                "description": "Create detailed documentation of how each control is implemented",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Control Implementation Statements",
                "estimated_hours": 80,
                "priority": "high"
            },
            {
                "id": "implement_4",
                "task": "Configure security settings",
                "description": "Apply security configurations and hardening measures",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "config",
                "artifact_name": "Security Configuration Files",
                "estimated_hours": 60,
                "priority": "medium"
            },
            {
                "id": "implement_5",
                "task": "Conduct implementation testing",
                "description": "Test implemented controls to ensure they function as intended",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "report",
                "artifact_name": "Implementation Test Results",
                "estimated_hours": 40,
                "priority": "medium"
            }
        ]
    },
    "assess": {
        "id": "assess",
        "name": "Assess",
        "description": "Assess implemented security controls to determine effectiveness",
        "order": 5,
        "checklist": [
            {
                "id": "assess_1",
                "task": "Develop assessment plan",
                "description": "Create plan for assessing all implemented security controls",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Security Assessment Plan (SAP)",
                "estimated_hours": 40,
                "priority": "high"
            },
            {
                "id": "assess_2",
                "task": "Conduct control assessment",
                "description": "Perform assessment of controls using interview, examine, and test methods",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "report",
                "artifact_name": "Security Assessment Report (SAR)",
                "estimated_hours": 120,
                "priority": "high"
            },
            {
                "id": "assess_3",
                "task": "Document assessment findings",
                "description": "Record all findings, deficiencies, and recommendations",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Assessment Findings Report",
                "estimated_hours": 32,
                "priority": "high"
            },
            {
                "id": "assess_4",
                "task": "Develop remediation plan",
                "description": "Create plan to address identified deficiencies and weaknesses",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Remediation Plan",
                "estimated_hours": 24,
                "priority": "high"
            },
            {
                "id": "assess_5",
                "task": "Update system documentation",
                "description": "Update system security plan based on assessment results",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Updated System Security Plan",
                "estimated_hours": 40,
                "priority": "medium"
            }
        ]
    },
    "authorize": {
        "id": "authorize",
        "name": "Authorize",
        "description": "Authorize system operation based on acceptable risk determination",
        "order": 6,
        "checklist": [
            {
                "id": "authorize_1",
                "task": "Prepare authorization package",
                "description": "Compile all required documentation for authorization decision",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "package",
                "artifact_name": "Authorization Package",
                "estimated_hours": 24,
                "priority": "high"
            },
            {
                "id": "authorize_2",
                "task": "Conduct risk analysis",
                "description": "Analyze residual risks and determine acceptability",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Risk Analysis Report",
                "estimated_hours": 32,
                "priority": "high"
            },
            {
                "id": "authorize_3",
                "task": "Prepare authorization decision document",
                "description": "Document authorization decision and any conditions or restrictions",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Authorization Decision Document",
                "estimated_hours": 16,
                "priority": "high"
            },
            {
                "id": "authorize_4",
                "task": "Obtain authorizing official approval",
                "description": "Secure formal approval from designated authorizing official",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "signature",
                "artifact_name": "Signed Authorization to Operate (ATO)",
                "estimated_hours": 8,
                "priority": "high"
            },
            {
                "id": "authorize_5",
                "task": "Establish authorization boundary",
                "description": "Define and document the authorization boundary",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Authorization Boundary Documentation",
                "estimated_hours": 12,
                "priority": "medium"
            }
        ]
    },
    "monitor": {
        "id": "monitor",
        "name": "Monitor",
        "description": "Monitor security controls and maintain situational awareness",
        "order": 7,
        "checklist": [
            {
                "id": "monitor_1",
                "task": "Implement continuous monitoring program",
                "description": "Establish ongoing monitoring of security controls and system changes",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Continuous Monitoring Program",
                "estimated_hours": 40,
                "priority": "high"
            },
            {
                "id": "monitor_2",
                "task": "Conduct ongoing assessments",
                "description": "Perform regular assessments of security control effectiveness",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "report",
                "artifact_name": "Ongoing Assessment Reports",
                "estimated_hours": 80,
                "priority": "high"
            },
            {
                "id": "monitor_3",
                "task": "Monitor for changes",
                "description": "Track system changes and assess security impact",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "log",
                "artifact_name": "Change Monitoring Logs",
                "estimated_hours": 20,
                "priority": "medium"
            },
            {
                "id": "monitor_4",
                "task": "Update risk assessments",
                "description": "Regularly update risk assessments based on monitoring results",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "document",
                "artifact_name": "Updated Risk Assessments",
                "estimated_hours": 32,
                "priority": "medium"
            },
            {
                "id": "monitor_5",
                "task": "Report security status",
                "description": "Provide regular security status reports to stakeholders",
                "status": "not_started",
                "artifact_required": True,
                "artifact_type": "report",
                "artifact_name": "Security Status Reports",
                "estimated_hours": 16,
                "priority": "medium"
            }
        ]
    }
}

def get_all_rmf_stages() -> Dict[str, Any]:
    """Get all RMF stages with their checklists"""
    return RMF_STAGES

def get_rmf_stage(stage_id: str) -> Dict[str, Any]:
    """Get a specific RMF stage by ID"""
    return RMF_STAGES.get(stage_id)

def get_rmf_stage_checklist(stage_id: str) -> List[Dict[str, Any]]:
    """Get checklist for a specific RMF stage"""
    stage = RMF_STAGES.get(stage_id)
    return stage.get('checklist', []) if stage else []

def get_rmf_progress_summary() -> Dict[str, Any]:
    """Calculate overall RMF progress summary"""
    total_tasks = 0
    completed_tasks = 0
    
    for stage in RMF_STAGES.values():
        stage_tasks = len(stage['checklist'])
        stage_completed = sum(1 for task in stage['checklist'] if task['status'] == 'completed')
        
        total_tasks += stage_tasks
        completed_tasks += stage_completed
    
    completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    return {
        'total_stages': len(RMF_STAGES),
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'completion_percentage': round(completion_percentage, 1),
        'stages_summary': {
            stage_id: {
                'name': stage['name'],
                'total_tasks': len(stage['checklist']),
                'completed_tasks': sum(1 for task in stage['checklist'] if task['status'] == 'completed'),
                'completion_percentage': round(
                    (sum(1 for task in stage['checklist'] if task['status'] == 'completed') / 
                     len(stage['checklist']) * 100) if stage['checklist'] else 0, 1
                )
            }
            for stage_id, stage in RMF_STAGES.items()
        }
    }

def update_task_status(stage_id: str, task_id: str, status: str, notes: str = "", artifact_info: Dict[str, Any] = None) -> bool:
    """Update the status of a specific task"""
    if stage_id not in RMF_STAGES:
        return False
    
    stage = RMF_STAGES[stage_id]
    for task in stage['checklist']:
        if task['id'] == task_id:
            task['status'] = status
            task['last_updated'] = datetime.now().isoformat()
            if notes:
                task['notes'] = notes
            if artifact_info:
                task['artifact_info'] = artifact_info
            return True
    
    return False

# Status options for RMF tasks
RMF_TASK_STATUSES = [
    'not_started',
    'in_progress', 
    'completed',
    'blocked',
    'deferred'
]

# Priority levels
RMF_TASK_PRIORITIES = [
    'low',
    'medium',
    'high',
    'critical'
]

# Artifact types
RMF_ARTIFACT_TYPES = [
    'document',
    'spreadsheet',
    'diagram',
    'form',
    'report',
    'config',
    'evidence',
    'package',
    'signature',
    'log'
] 