/**
 * Enhanced Conflict Detection and Impact Analysis Utilities
 * 
 * Provides comprehensive functions for detecting conflicts between controls and software,
 * analyzing control impacts, generating implementation guidance, and managing conflict resolution.
 */

import { getAllTools } from '../data/toolMappings';
import { ENHANCED_CONTROLS } from '../data/controls';

/**
 * Detects conflicts between selected controls and software
 * @param {Array} selectedControls - Array of selected control IDs
 * @param {Array} selectedSoftware - Array of selected software/tools
 * @param {string} newControlId - Optional new control being added
 * @returns {Object} Conflict analysis results
 */
export const detectConflicts = (selectedControls = [], selectedSoftware = [], newControlId = null) => {
  const conflicts = [];
  const overrides = [];
  const warnings = [];
  
  // Include the new control in analysis if provided
  const allControls = newControlId ? [...selectedControls, newControlId] : selectedControls;
  
  // Check for direct control conflicts
  allControls.forEach(controlId => {
    const control = ENHANCED_CONTROLS[controlId];
    if (!control) return;
    
    // Check conflicts with other selected controls
    control.conflictsWith?.forEach(conflictId => {
      if (allControls.includes(conflictId)) {
        conflicts.push({
          type: 'control-conflict',
          control1: controlId,
          control2: conflictId,
          severity: 'high',
          description: `${control.title} conflicts with ${conflictId}`,
          resolution: `These controls have incompatible requirements. Choose one approach.`
        });
      }
    });
    
    // Check what this control overrides
    control.overrides?.forEach(overrideId => {
      if (allControls.includes(overrideId)) {
        overrides.push({
          type: 'control-override',
          overriding: controlId,
          overridden: overrideId,
          severity: 'medium',
          description: `${control.title} overrides ${overrideId}`,
          resolution: `${overrideId} settings will be superseded by ${controlId}`
        });
      }
    });
  });
  
  // Check for overlapping system settings
  const systemSettings = {};
  allControls.forEach(controlId => {
    const control = ENHANCED_CONTROLS[controlId];
    if (!control?.affects) return;
    
    control.affects.forEach(setting => {
      if (!systemSettings[setting]) {
        systemSettings[setting] = [];
      }
      systemSettings[setting].push(controlId);
    });
  });
  
  // Find settings affected by multiple controls
  Object.entries(systemSettings).forEach(([setting, controls]) => {
    if (controls.length > 1) {
      warnings.push({
        type: 'setting-overlap',
        setting: setting,
        controls: controls,
        severity: 'low',
        description: `Multiple controls affect ${setting}`,
        resolution: `Ensure ${controls.join(', ')} are configured consistently for ${setting}`
      });
    }
  });
  
  return {
    conflicts,
    overrides,
    warnings,
    hasIssues: conflicts.length > 0 || overrides.length > 0 || warnings.length > 0,
    summary: {
      totalIssues: conflicts.length + overrides.length + warnings.length,
      highSeverity: conflicts.length,
      mediumSeverity: overrides.length,
      lowSeverity: warnings.length
    }
  };
};

/**
 * Gets the impact analysis for a specific control
 * @param {string} controlId - The control ID to analyze
 * @param {string} platform - The target platform
 * @returns {Object} Impact analysis data
 */
export const getControlImpact = async (controlId, platform = 'all') => {
  const control = ENHANCED_CONTROLS[controlId];
  if (!control) {
    return {
      error: `Control ${controlId} not found`,
      controlId
    };
  }
  
  const impact = {
    controlId,
    title: control.title,
    family: control.family,
    priority: control.priority,
    affectedSystems: control.affects || [],
    platforms: control.platforms || [],
    conflicts: control.conflictsWith || [],
    overrides: control.overrides || [],
    implementation: null,
    recommendedSoftware: []
  };
  
  // Get platform-specific guidance if available
  if (platform !== 'all' && control.implementationGuidance?.[platform]) {
    impact.implementation = control.implementationGuidance[platform];
  }
  
  // Get recommended software for platform
  if (platform !== 'all' && control.recommendedSoftware?.[platform]) {
    impact.recommendedSoftware = control.recommendedSoftware[platform];
  } else if (platform === 'all') {
    // Aggregate all platform recommendations
    const allSoftware = [];
    Object.values(control.recommendedSoftware || {}).forEach(platformSoftware => {
      allSoftware.push(...platformSoftware);
    });
    impact.recommendedSoftware = allSoftware;
  }
  
  return impact;
};

/**
 * Client-side conflict check for real-time feedback
 * @param {Array} selectedControls - Currently selected controls
 * @param {string} candidateControlId - Control being considered for addition
 * @returns {Object} Quick conflict check results
 */
export const clientSideConflictCheck = (selectedControls = [], candidateControlId) => {
  if (!candidateControlId) return { hasConflicts: false };
  
  const candidateControl = ENHANCED_CONTROLS[candidateControlId];
  if (!candidateControl) return { hasConflicts: false };
  
  const conflicts = [];
  const overrides = [];
  
  // Check if candidate conflicts with any selected control
  candidateControl.conflictsWith?.forEach(conflictId => {
    if (selectedControls.includes(conflictId)) {
      conflicts.push({
        conflictsWith: conflictId,
        reason: `${candidateControl.title} conflicts with ${conflictId}`
      });
    }
  });
  
  // Check if candidate overrides any selected control
  candidateControl.overrides?.forEach(overrideId => {
    if (selectedControls.includes(overrideId)) {
      overrides.push({
        overrides: overrideId,
        reason: `${candidateControl.title} will override ${overrideId}`
      });
    }
  });
  
  // Check if any selected control would conflict with candidate
  selectedControls.forEach(selectedId => {
    const selectedControl = ENHANCED_CONTROLS[selectedId];
    if (!selectedControl) return;
    
    if (selectedControl.conflictsWith?.includes(candidateControlId)) {
      conflicts.push({
        conflictsWith: selectedId,
        reason: `${selectedId} conflicts with ${candidateControl.title}`
      });
    }
    
    if (selectedControl.overrides?.includes(candidateControlId)) {
      overrides.push({
        overriddenBy: selectedId,
        reason: `${selectedId} will override ${candidateControl.title}`
      });
    }
  });
  
  return {
    hasConflicts: conflicts.length > 0,
    hasOverrides: overrides.length > 0,
    conflicts,
    overrides,
    canAdd: conflicts.length === 0, // Can add if no direct conflicts
    warnings: overrides.length > 0 ? ['This control may be overridden by existing selections'] : []
  };
};

/**
 * Generates implementation guidance for a set of controls and platform
 * @param {Array} controlIds - Array of control IDs
 * @param {string} platform - Target platform
 * @returns {Object} Comprehensive implementation guidance
 */
export const generateImplementationPlan = (controlIds = [], platform = 'Windows') => {
  const plan = {
    platform,
    controls: [],
    allTools: [],
    conflicts: [],
    timeline: 'medium', // estimated implementation timeline
    complexity: 'medium'
  };
  
  // Analyze each control
  controlIds.forEach(controlId => {
    const control = ENHANCED_CONTROLS[controlId];
    if (!control) return;
    
    const controlPlan = {
      id: controlId,
      title: control.title,
      family: control.family,
      priority: control.priority,
      implementationGuidance: control.implementationGuidance,
      recommendedTools: control.recommendedTools || [],
      ansibleSupport: control.ansibleSupport
    };
    
    plan.controls.push(controlPlan);
    
    // Aggregate recommended tools
    if (control.recommendedTools) {
      plan.allTools.push(...control.recommendedTools.filter(tool => 
        tool.platforms.includes(platform)
      ));
    }
  });
  
  // Remove duplicate tools
  plan.allTools = plan.allTools.filter((tool, index, self) => 
    index === self.findIndex(t => t.name === tool.name)
  );
  
  // Check for conflicts
  const conflictAnalysis = detectConflicts(controlIds);
  plan.conflicts = conflictAnalysis.conflicts;
  
  // Estimate complexity and timeline based on control count and platform
  const complexityFactors = {
    controlCount: controlIds.length,
    platformComplexity: ['RHEL 8', 'Ubuntu 22.04'].includes(platform) ? 1.2 : 1.0,
    ansibleSupport: plan.controls.some(c => c.ansibleSupport?.available) ? 0.8 : 1.0
  };
  
  const complexityScore = complexityFactors.controlCount * complexityFactors.platformComplexity * complexityFactors.ansibleSupport;
  
  plan.complexity = complexityScore > 6 ? 'high' : complexityScore > 3 ? 'medium' : 'low';
  plan.timeline = complexityScore > 6 ? 'long' : complexityScore > 3 ? 'medium' : 'short';
  
  return plan;
};

/**
 * Gets controls that are commonly implemented together
 * @param {string} controlId - Base control ID
 * @returns {Array} Array of related control IDs
 */
export const getRelatedControls = (controlId) => {
  const control = ENHANCED_CONTROLS[controlId];
  if (!control) return [];
  
  // Find controls in the same family
  const sameFamily = Object.values(ENHANCED_CONTROLS)
    .filter(c => c.family === control.family && c.id !== controlId)
    .map(c => c.id);
  
  // Find controls that affect similar systems
  const similarSystems = Object.values(ENHANCED_CONTROLS)
    .filter(c => {
      if (c.id === controlId) return false;
      return c.affects?.some(setting => control.affects?.includes(setting));
    })
    .map(c => c.id);
  
  // Combine and deduplicate
  const related = [...new Set([...sameFamily, ...similarSystems])];
  
  return related.slice(0, 5); // Return top 5 related controls
};

/**
 * Validates a control configuration for a specific platform
 * @param {string} controlId - Control ID to validate
 * @param {string} platform - Target platform
 * @param {Object} currentConfig - Current system configuration
 * @returns {Object} Validation results
 */
export const validateControlConfiguration = (controlId, platform, currentConfig = {}) => {
  const control = ENHANCED_CONTROLS[controlId];
  if (!control) {
    return {
      valid: false,
      error: `Control ${controlId} not found`
    };
  }
  
  const validation = {
    controlId,
    platform,
    valid: true,
    issues: [],
    recommendations: [],
    missingRequirements: []
  };
  
  // Check if platform is supported
  if (!control.platforms.includes(platform)) {
    validation.valid = false;
    validation.issues.push(`Control ${controlId} is not supported on ${platform}`);
    return validation;
  }
  
  // Check implementation requirements
  const guidance = control.implementationGuidance?.[platform];
  if (guidance) {
    // Check if required config files exist (simulated)
    guidance.configFiles?.forEach(file => {
      if (!currentConfig[file]) {
        validation.missingRequirements.push(`Missing configuration: ${file}`);
      }
    });
  }
  
  // Check for recommended software
  const software = control.recommendedSoftware?.[platform];
  if (software) {
    software.forEach(sw => {
      if (sw.type === 'built-in') {
        validation.recommendations.push(`Ensure ${sw.name} is enabled and configured`);
      } else {
        validation.recommendations.push(`Consider installing ${sw.name} for ${sw.purpose}`);
      }
    });
  }
  
  return validation;
};

/**
 * Analyze the impact of selected tools on controls
 * @param {string[]} selectedToolIds - Array of selected tool IDs
 * @param {string[]} selectedControls - Array of selected control IDs
 * @returns {Object} Tool impact analysis
 */
export const analyzeToolImpacts = (selectedToolIds, selectedControls) => {
  const tools = getAllTools();
  const impacts = [];

  for (const toolId of selectedToolIds) {
    const tool = tools.find(t => t.id === toolId);
    if (!tool || !tool.supports_controls) continue;

    const toolImpacts = {
      tool_name: tool.name,
      tool_id: tool.id,
      affected_controls: [],
      potential_conflicts: []
    };

    // Check which selected controls this tool affects
    for (const controlId of selectedControls) {
      if (tool.supports_controls[controlId]) {
        toolImpacts.affected_controls.push({
          control_id: controlId,
          match_strength: tool.supports_controls[controlId].strength,
          explanation: tool.supports_controls[controlId].explanation
        });
      }
    }

    impacts.push(toolImpacts);
  }

  return impacts;
};

/**
 * Calculate baseline-aware coverage for controls
 * Only considers enhancements required for the selected baseline
 */
export function calculateBaselineAwareCoverage(controlId, toolsImplementing, selectedBaseline = 'Moderate') {
  const control = ENHANCED_CONTROLS[controlId];
  if (!control) {
    return { status: 'unknown', coverage: 0, details: 'Control not found' };
  }

  // Check base control implementation
  const baseImplemented = toolsImplementing.some(tool => 
    tool.tool.supports_controls?.[controlId]
  );

  if (!baseImplemented) {
    return { 
      status: 'not_implemented', 
      coverage: 0, 
      details: 'Base control not implemented',
      requiredEnhancements: [],
      implementedEnhancements: []
    };
  }

  // Get enhancements required for this baseline
  const requiredEnhancements = control.controlEnhancements?.filter(enhancement => 
    enhancement.required_for?.includes(selectedBaseline)
  ) || [];

  // Check which required enhancements are implemented
  const implementedEnhancements = requiredEnhancements.filter(enhancement =>
    toolsImplementing.some(tool => 
      tool.tool.supports_controls?.[enhancement.id]
    )
  );

  // Calculate coverage percentage
  const totalRequired = 1 + requiredEnhancements.length; // base + required enhancements
  const totalImplemented = 1 + implementedEnhancements.length; // base + implemented enhancements
  const coverage = (totalImplemented / totalRequired) * 100;

  // Determine status
  let status;
  if (coverage === 100) {
    status = 'fully_implemented';
  } else if (implementedEnhancements.length > 0 || requiredEnhancements.length === 0) {
    status = 'partially_implemented';
  } else {
    status = 'base_only';
  }

  return {
    status,
    coverage: Math.round(coverage),
    details: `${totalImplemented}/${totalRequired} requirements met for ${selectedBaseline} baseline`,
    requiredEnhancements: requiredEnhancements.map(e => e.id),
    implementedEnhancements: implementedEnhancements.map(e => e.id),
    missingEnhancements: requiredEnhancements.filter(enhancement =>
      !toolsImplementing.some(tool => tool.tool.supports_controls?.[enhancement.id])
    ).map(e => e.id)
  };
}

/**
 * Get enhancement-aware implementation status for display
 */
export function getEnhancementAwareStatus(controlId, toolsImplementing, selectedBaseline = 'Moderate') {
  const coverage = calculateBaselineAwareCoverage(controlId, toolsImplementing, selectedBaseline);
  
  switch (coverage.status) {
    case 'fully_implemented':
      return {
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: '✅',
        text: 'Fully Implemented',
        description: `All requirements for ${selectedBaseline} baseline are met`
      };
    case 'partially_implemented':
      return {
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: '⚠️',
        text: 'Partially Implemented',
        description: `${coverage.coverage}% coverage for ${selectedBaseline} baseline`
      };
    case 'base_only':
      return {
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: 'ℹ️',
        text: 'Base Control Only',
        description: `Base control implemented, but missing required enhancements for ${selectedBaseline} baseline`
      };
    default:
      return {
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: '❌',
        text: 'Not Implemented',
        description: 'Control not implemented'
      };
  }
} 