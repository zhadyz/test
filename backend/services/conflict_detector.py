"""
Control Conflict Detection Service

This service detects conflicts between compliance controls, software settings,
and system-level configurations like Group Policy.
"""

from typing import List, Dict, Any, Set, Optional
from dataclasses import dataclass
from data.controls import get_all_controls, get_control_by_id


@dataclass
class ConflictResult:
    """Represents a detected conflict between controls or settings"""
    type: str  # 'control_conflict', 'setting_conflict', 'override'
    severity: str  # 'high', 'medium', 'low'
    source_control: str
    target_control: Optional[str] = None
    target_software: Optional[str] = None
    description: str = ""
    resolution_suggestion: str = ""
    affected_settings: Optional[List[Dict[str, Any]]] = None

    def __post_init__(self):
        if self.affected_settings is None:
            self.affected_settings = []


@dataclass
class ImpactResult:
    """Represents the impact of a control on system settings and other controls"""
    control_id: str
    affected_settings: List[Dict[str, Any]]
    overridden_controls: List[str]
    prerequisite_controls: List[str]
    conflicting_controls: List[str]
    software_impacts: List[Dict[str, Any]]


class ConflictDetector:
    """Service for detecting conflicts between controls and software"""
    
    def __init__(self):
        self.controls = {ctrl.control_id: ctrl for ctrl in get_all_controls()}
        # Mock tools data - in production this would come from a proper service
        self.tools = []
    
    def detect_conflicts(self, selected_controls: List[str], installed_software: Optional[List[str]] = None) -> List[ConflictResult]:
        """
        Detect conflicts between selected controls and software
        
        Args:
            selected_controls: List of control IDs that are selected/implemented
            installed_software: List of software tool IDs that are installed
            
        Returns:
            List of detected conflicts
        """
        conflicts = []
        
        # Check direct control conflicts
        conflicts.extend(self._check_control_conflicts(selected_controls))
        
        # Check system setting overlaps
        conflicts.extend(self._check_setting_conflicts(selected_controls))
        
        # Check software conflicts if provided
        if installed_software:
            conflicts.extend(self._check_software_conflicts(selected_controls, installed_software))
        
        return conflicts
    
    def get_control_impact(self, control_id: str) -> ImpactResult:
        """
        Get the impact of a specific control on system settings and other controls
        
        Args:
            control_id: The control ID to analyze
            
        Returns:
            Impact analysis result
        """
        control = self.controls.get(control_id)
        if not control:
            return ImpactResult(
                control_id=control_id,
                affected_settings=[],
                overridden_controls=[],
                prerequisite_controls=[],
                conflicting_controls=[],
                software_impacts=[]
            )
        
        # Get software that implements this control
        software_impacts = []
        for tool in self.tools:
            if hasattr(tool, 'supports_controls') and control_id in tool.supports_controls:
                match_info = tool.supports_controls[control_id]
                software_impacts.append({
                    'tool_name': tool.name,
                    'tool_id': tool.id,
                    'match_strength': match_info.get('strength', 'unknown'),
                    'explanation': match_info.get('explanation', '')
                })
        
        return ImpactResult(
            control_id=control_id,
            affected_settings=getattr(control, 'affects', []),
            overridden_controls=getattr(control, 'overrides', []),
            prerequisite_controls=getattr(control, 'prerequisites', []),
            conflicting_controls=getattr(control, 'conflicts_with', []),
            software_impacts=software_impacts
        )
    
    def _check_control_conflicts(self, selected_controls: List[str]) -> List[ConflictResult]:
        """Check for direct conflicts between selected controls"""
        conflicts = []
        
        for control_id in selected_controls:
            control = self.controls.get(control_id)
            if not control:
                continue
                
            conflicts_with = getattr(control, 'conflicts_with', [])
            for conflicting_control in conflicts_with:
                if conflicting_control in selected_controls:
                    conflicts.append(ConflictResult(
                        type='control_conflict',
                        severity='high',
                        source_control=control_id,
                        target_control=conflicting_control,
                        description=f"Control {control_id} conflicts with {conflicting_control}",
                        resolution_suggestion=f"Review implementation of {control_id} and {conflicting_control} to ensure they can coexist, or implement one with exceptions for the other."
                    ))
        
        return conflicts
    
    def _check_setting_conflicts(self, selected_controls: List[str]) -> List[ConflictResult]:
        """Check for conflicts in system settings between controls"""
        conflicts = []
        setting_map = {}  # Maps setting paths to controls that affect them
        
        # Build map of settings to controls
        for control_id in selected_controls:
            control = self.controls.get(control_id)
            if not control:
                continue
                
            affects = getattr(control, 'affects', [])
            for setting in affects:
                setting_key = f"{setting.get('type', '')}:{setting.get('path', '')}"
                if setting_key not in setting_map:
                    setting_map[setting_key] = []
                setting_map[setting_key].append({
                    'control_id': control_id,
                    'setting': setting
                })
        
        # Check for conflicts
        for setting_key, control_settings in setting_map.items():
            if len(control_settings) > 1:
                # Multiple controls affect the same setting
                values = set()
                for cs in control_settings:
                    value = cs['setting'].get('value')
                    if value:
                        values.add(value)
                
                # If different values are specified, it's a conflict
                if len(values) > 1:
                    control_ids = [cs['control_id'] for cs in control_settings]
                    conflicts.append(ConflictResult(
                        type='setting_conflict',
                        severity='medium',
                        source_control=control_ids[0],
                        target_control=control_ids[1] if len(control_ids) > 1 else None,
                        description=f"Multiple controls ({', '.join(control_ids)}) set different values for {setting_key}",
                        resolution_suggestion="Review the conflicting settings and determine which value should take precedence, or implement a compromise solution.",
                        affected_settings=[cs['setting'] for cs in control_settings]
                    ))
        
        return conflicts
    
    def _check_software_conflicts(self, selected_controls: List[str], installed_software: List[str]) -> List[ConflictResult]:
        """Check for conflicts between controls and installed software"""
        conflicts = []
        
        # This is a simplified implementation
        # In practice, you'd have a more comprehensive database of software conflicts
        
        known_conflicts = {
            'AC-7': {
                'conflicting_software': ['rdp-wrapper', 'remote-desktop-enabler'],
                'reason': 'These tools may bypass account lockout mechanisms for RDP connections'
            },
            'SC-28': {
                'conflicting_software': ['truecrypt', 'veracrypt'],
                'reason': 'Third-party encryption tools may conflict with enterprise encryption policies'
            }
        }
        
        for control_id in selected_controls:
            if control_id in known_conflicts:
                conflict_info = known_conflicts[control_id]
                for software in conflict_info['conflicting_software']:
                    if software in installed_software:
                        conflicts.append(ConflictResult(
                            type='software_conflict',
                            severity='medium',
                            source_control=control_id,
                            target_software=software,
                            description=f"Control {control_id} may conflict with installed software {software}",
                            resolution_suggestion=f"Review {software} configuration to ensure it doesn't interfere with {control_id} requirements. {conflict_info['reason']}"
                        ))
        
        return conflicts


# Convenience functions for API endpoints
def detect_control_conflicts(selected_controls: List[str], installed_software: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Detect conflicts and return as dictionary for JSON serialization"""
    detector = ConflictDetector()
    conflicts = detector.detect_conflicts(selected_controls, installed_software)
    
    return [
        {
            'type': conflict.type,
            'severity': conflict.severity,
            'source_control': conflict.source_control,
            'target_control': conflict.target_control,
            'target_software': conflict.target_software,
            'description': conflict.description,
            'resolution_suggestion': conflict.resolution_suggestion,
            'affected_settings': conflict.affected_settings
        }
        for conflict in conflicts
    ]


def get_control_impact_analysis(control_id: str) -> Dict[str, Any]:
    """Get control impact analysis as dictionary for JSON serialization"""
    detector = ConflictDetector()
    impact = detector.get_control_impact(control_id)
    
    return {
        'control_id': impact.control_id,
        'affected_settings': impact.affected_settings,
        'overridden_controls': impact.overridden_controls,
        'prerequisite_controls': impact.prerequisite_controls,
        'conflicting_controls': impact.conflicting_controls,
        'software_impacts': impact.software_impacts
    } 