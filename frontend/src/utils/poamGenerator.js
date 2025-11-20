/**
 * POA&M Generator Utility
 * Automatically creates POA&M entries when controls are marked as non-compliant
 */

/**
 * Generate POA&M entry for a non-compliant control
 * @param {Object} control - The NIST control object
 * @param {string} status - The compliance status (e.g., 'Deferred', 'Needs Review')
 * @param {string} reason - Reason for non-compliance
 * @param {string} owner - Assigned owner (optional)
 * @returns {Object} POA&M data object
 */
export const generatePOAMFromControl = (control, status, reason = '', owner = '') => {
  // Calculate default completion date (30 days from now for most, 90 days for complex controls)
  const getDefaultCompletionDate = () => {
    const today = new Date();
    const daysToAdd = control.control_family === 'SC' || control.control_family === 'SI' ? 90 : 30;
    const completionDate = new Date(today.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    return completionDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  };

  // Determine priority based on control family and status
  const getPriority = () => {
    if (control.control_family === 'AC' || control.control_family === 'IA') return 'High';
    if (control.control_family === 'SC' || control.control_family === 'SI') return 'Critical';
    if (status === 'Deferred') return 'Medium';
    return 'Medium';
  };

  // Determine severity based on control family
  const getSeverity = () => {
    if (control.control_family === 'SC' || control.control_family === 'IA') return 'CAT I';
    if (control.control_family === 'AC' || control.control_family === 'AU') return 'CAT II';
    return 'CAT III';
  };

  // Generate description based on control and status
  const getDescription = () => {
    const baseDescription = `Control ${control.control_id} (${control.control_name}) is currently non-compliant.`;
    
    if (reason) {
      return `${baseDescription} Reason: ${reason}`;
    }
    
    if (status === 'Deferred') {
      return `${baseDescription} Implementation has been deferred and requires remediation planning.`;
    }
    
    if (status === 'Needs Review') {
      return `${baseDescription} Control implementation requires review and potential remediation.`;
    }
    
    return `${baseDescription} Control requires implementation to achieve compliance.`;
  };

  // Generate remediation action based on control type
  const getRemediationAction = () => {
    const controlFamily = control.control_family;
    const controlActions = {
      'AC': `Review and implement access control measures for ${control.control_id}. Ensure proper user account management, access permissions, and authentication mechanisms are in place.`,
      'AU': `Implement comprehensive audit and accountability measures for ${control.control_id}. Configure audit logging, log review procedures, and audit record retention policies.`,
      'AT': `Develop and implement security awareness and training program for ${control.control_id}. Create training materials and conduct regular security awareness sessions.`,
      'CM': `Establish configuration management controls for ${control.control_id}. Implement baseline configurations, change control procedures, and configuration monitoring.`,
      'CP': `Develop contingency planning procedures for ${control.control_id}. Create backup strategies, disaster recovery plans, and business continuity procedures.`,
      'IA': `Implement identification and authentication controls for ${control.control_id}. Configure multi-factor authentication, password policies, and identity management systems.`,
      'IR': `Establish incident response procedures for ${control.control_id}. Develop incident handling procedures, response team structure, and incident reporting mechanisms.`,
      'MA': `Implement maintenance controls for ${control.control_id}. Establish maintenance procedures, tool controls, and maintenance personnel requirements.`,
      'MP': `Establish media protection controls for ${control.control_id}. Implement media handling procedures, sanitization methods, and media storage requirements.`,
      'PE': `Implement physical and environmental protection measures for ${control.control_id}. Establish facility access controls, environmental monitoring, and physical security procedures.`,
      'PL': `Develop planning controls for ${control.control_id}. Create security plans, system security plans, and security control implementation procedures.`,
      'PS': `Implement personnel security controls for ${control.control_id}. Establish personnel screening procedures, access agreements, and personnel termination procedures.`,
      'RA': `Conduct risk assessment activities for ${control.control_id}. Perform vulnerability assessments, risk analysis, and security control assessments.`,
      'SA': `Implement system and services acquisition controls for ${control.control_id}. Establish acquisition processes, supplier assessments, and system integration procedures.`,
      'SC': `Implement system and communications protection measures for ${control.control_id}. Configure security controls, encryption, and network protection mechanisms.`,
      'SI': `Establish system and information integrity controls for ${control.control_id}. Implement malware protection, system monitoring, and information input validation.`
    };

    return controlActions[controlFamily] || `Implement necessary security controls and procedures to achieve compliance with ${control.control_id}. Review control requirements and develop appropriate implementation strategy.`;
  };

  // Generate business impact statement
  const getBusinessImpact = () => {
    const impactStatements = {
      'Critical': 'High risk to organizational security posture. Non-compliance may result in significant security vulnerabilities and potential compliance violations.',
      'High': 'Moderate risk to organizational security. Non-compliance may result in security gaps and reduced security effectiveness.',
      'Medium': 'Low to moderate risk to organizational security. Non-compliance should be addressed to maintain comprehensive security posture.',
      'Low': 'Minimal risk to organizational security. Non-compliance should be addressed as part of overall security improvement efforts.'
    };

    return impactStatements[getPriority()] || 'Non-compliance may impact organizational security posture and regulatory compliance requirements.';
  };

  // Generate resource requirements
  const getResourceRequirements = () => {
    const priority = getPriority();
    const resources = [];

    if (priority === 'Critical' || priority === 'High') {
      resources.push('Security team lead assignment');
      resources.push('Technical implementation resources');
    }

    resources.push('Documentation and policy review');
    resources.push('Staff training and awareness');

    if (control.control_family === 'SC' || control.control_family === 'SI') {
      resources.push('Technical infrastructure updates');
      resources.push('Security tool configuration');
    }

    return resources.join(', ');
  };

  return {
    control_id: control.control_id,
    control_title: control.control_name,
    description: getDescription(),
    root_cause: reason || 'Control implementation gap identified during compliance review',
    remediation_action: getRemediationAction(),
    estimated_completion_date: getDefaultCompletionDate(),
    assigned_owner: owner,
    priority: getPriority(),
    severity: getSeverity(),
    resources_required: getResourceRequirements(),
    business_impact: getBusinessImpact(),
    milestones: [
      'Complete control requirements analysis',
      'Develop implementation plan',
      'Implement security controls',
      'Test and validate implementation',
      'Update documentation and procedures'
    ]
  };
};

/**
 * Create POA&M entry via API
 * @param {Object} poamData - POA&M data object
 * @returns {Promise<Object>} API response
 */
export const createPOAMEntry = async (poamData) => {
  try {
    const response = await fetch('/api/poam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(poamData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create POA&M entry');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating POA&M entry:', error);
    throw error;
  }
};

/**
 * Check if POA&M already exists for a control
 * @param {string} controlId - Control ID to check
 * @returns {Promise<boolean>} True if POA&M exists
 */
export const checkExistingPOAM = async (controlId) => {
  try {
    const response = await fetch(`/api/poam?control_id=${encodeURIComponent(controlId)}`);
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.data && data.data.length > 0;
  } catch (error) {
    console.error('Error checking existing POA&M:', error);
    return false;
  }
};

/**
 * Auto-generate POA&M for non-compliant control
 * @param {Object} control - Control object
 * @param {string} status - Compliance status
 * @param {string} reason - Reason for non-compliance
 * @param {string} owner - Assigned owner
 * @param {boolean} force - Force creation even if POA&M exists
 * @returns {Promise<Object|null>} Created POA&M or null if skipped
 */
export const autoGeneratePOAM = async (control, status, reason = '', owner = '', force = false) => {
  // Only generate for non-compliant statuses
  const nonCompliantStatuses = ['Deferred', 'Needs Review', 'Not Started'];
  if (!nonCompliantStatuses.includes(status)) {
    return null;
  }

  try {
    // Check if POA&M already exists (unless forced)
    if (!force) {
      const exists = await checkExistingPOAM(control.control_id);
      if (exists) {
        console.log(`POA&M already exists for control ${control.control_id}`);
        return null;
      }
    }

    // Generate POA&M data
    const poamData = generatePOAMFromControl(control, status, reason, owner);

    // Create POA&M entry
    const result = await createPOAMEntry(poamData);

    console.log(`✅ Auto-generated POA&M for control ${control.control_id}`);
    return result;

  } catch (error) {
    console.error(`❌ Failed to auto-generate POA&M for control ${control.control_id}:`, error);
    throw error;
  }
};

/**
 * Batch generate POA&M entries for multiple controls
 * @param {Array} controls - Array of control objects with status
 * @param {string} defaultOwner - Default owner for all POA&Ms
 * @returns {Promise<Array>} Array of created POA&M entries
 */
export const batchGeneratePOAMs = async (controls, defaultOwner = '') => {
  const results = [];
  
  for (const control of controls) {
    try {
      const result = await autoGeneratePOAM(
        control, 
        control.status, 
        control.notes || '', 
        control.owner || defaultOwner
      );
      
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Failed to generate POA&M for ${control.control_id}:`, error);
      // Continue with other controls even if one fails
    }
  }

  return results;
};

/**
 * Get remediation suggestions from AI (placeholder for future implementation)
 * @param {string} controlId - Control ID
 * @returns {Promise<Object>} AI-generated suggestions
 */
export const getAIRemediationSuggestions = async (controlId) => {
  try {
    const response = await fetch(`/api/poam/generate-suggestions/${encodeURIComponent(controlId)}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to get AI suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    // Return default suggestions if AI service fails
    return {
      success: true,
      control_id: controlId,
      suggestions: {
        remediation_actions: [
          `Review and implement security controls for ${controlId}`,
          `Establish monitoring and compliance procedures`,
          `Create documentation and training materials`,
          `Conduct regular assessments and reviews`
        ],
        estimated_effort: '2-4 weeks',
        recommended_priority: 'Medium',
        resources_needed: [
          'Security team involvement',
          'Technical implementation resources',
          'Documentation review and updates'
        ]
      }
    };
  }
}; 