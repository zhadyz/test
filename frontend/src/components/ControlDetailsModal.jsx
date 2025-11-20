import React, { useState, useEffect, useContext } from 'react';
import {
  XMarkIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  CogIcon,
  ServerIcon,
  FolderIcon,
  DocumentIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { getAllTools, CONTROL_MATCH_STRENGTH } from '../data/toolMappings';
import { getControlImpact, clientSideConflictCheck } from '../utils/conflictDetection';
import { ENHANCED_CONTROLS } from '../data/controls';
import { SystemContext } from '../contexts/SystemContext';

const ControlDetailsModal = ({ controlId, isOpen, onClose, controlData, toolsImplementing = [], onAddTool, selectedControls = [] }) => {
  const [impactData, setImpactData] = useState(null);
  const [conflictData, setConflictData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const { selectedBaseline } = useContext(SystemContext);

  // Load impact and conflict data when modal opens
  useEffect(() => {
    if (isOpen && controlId) {
      loadControlAnalysis();
    }
  }, [isOpen, controlId, selectedControls]);

  const loadControlAnalysis = async () => {
    setLoading(true);
    try {
      // Load impact analysis
      const impact = await getControlImpact(controlId);
      setImpactData(impact);

      // Check for conflicts with selected controls
      const conflicts = clientSideConflictCheck(selectedControls, controlId);
      setConflictData(conflicts);
    } catch (error) {
      console.error('Error loading control analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen || !controlId) return null;

  // Sample control details (in real app, this would come from a comprehensive database)
  const controlDetails = {
    'AC-2': {
      title: 'Account Management',
      family: 'Access Control',
      description: 'The organization manages information system accounts, including establishing, activating, modifying, reviewing, disabling, and removing accounts.',
      implementation: 'Organizations should implement processes for account lifecycle management including creation, modification, and termination procedures.',
      priority: 'High',
      baseline: ['Low', 'Moderate', 'High'],
      relatedControls: ['AC-3', 'AC-6', 'IA-2', 'IA-4'],
      guidance: 'Account management includes the identification of account types (individual, shared, group, system, guest/anonymous, emergency, developer/manufacturer/vendor, temporary, and service), establishment of conditions for group membership, and assignment of associated authorizations.',
      supplementalGuidance: 'Information system account types include, for example, individual, shared, group, system, guest/anonymous, emergency, developer/manufacturer/vendor, temporary, and service accounts.',
      controlEnhancements: [
        {
          id: 'AC-2(1)',
          title: 'Automated System Account Management',
          description: 'Support account management functions using automated mechanisms.'
        },
        {
          id: 'AC-2(2)',
          title: 'Removal of Temporary / Emergency Accounts',
          description: 'Automatically remove or disable temporary and emergency accounts.'
        }
      ]
    },
    'AU-2': {
      title: 'Audit Events',
      family: 'Audit and Accountability',
      description: 'The organization determines that the information system is capable of auditing specific events and coordinates the security audit function with other organizational entities.',
      implementation: 'Organizations should define auditable events and configure systems to capture relevant security events for monitoring and compliance purposes.',
      priority: 'High',
      baseline: ['Low', 'Moderate', 'High'],
      relatedControls: ['AU-3', 'AU-6', 'AU-12', 'SI-4'],
      guidance: 'Auditable events are those events for which the organization determines that audit records must be generated.',
      supplementalGuidance: 'Auditable events include, for example, password changes, failed logons, or failed accesses related to information systems.',
      controlEnhancements: [
        {
          id: 'AU-2(3)',
          title: 'Reviews and Updates',
          description: 'Review and update the audited events annually or whenever there is a change in the threat environment.'
        }
      ]
    },
    'SC-28': {
      title: 'Protection of Information at Rest',
      family: 'System and Communications Protection',
      description: 'The information system protects the confidentiality and integrity of information at rest.',
      implementation: 'Implement encryption or other protective measures for sensitive data stored on systems, databases, and storage media.',
      priority: 'High',
      baseline: ['Moderate', 'High'],
      relatedControls: ['SC-8', 'SC-12', 'SC-13', 'MP-5'],
      guidance: 'Information at rest refers to the state of information when it is located on storage devices as specific components of information systems.',
      supplementalGuidance: 'Information at rest addresses the confidentiality and integrity of information as opposed to the availability of information.',
      controlEnhancements: [
        {
          id: 'SC-28(1)',
          title: 'Cryptographic Protection',
          description: 'Implement cryptographic mechanisms to prevent unauthorized disclosure and modification of information at rest.'
        }
      ]
    }
  };

  const details = controlDetails[controlId] || {
    title: controlId,
    family: 'Unknown',
    description: 'Control details not available in demo data.',
    implementation: 'Please refer to NIST SP 800-53 for complete control details.',
    priority: 'Medium',
    baseline: ['Unknown'],
    relatedControls: [],
    guidance: 'No guidance available in demo mode.',
    supplementalGuidance: 'Please refer to official NIST documentation.',
    controlEnhancements: []
  };

  const getImplementationStatus = () => {
    if (toolsImplementing.length === 0) {
      return {
        status: 'gap',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: <ExclamationTriangleIcon className="w-5 h-5" />,
        text: 'Not Implemented'
      };
    }

    const strongMatch = toolsImplementing.some(tool => tool.matchInfo?.strength === 'strong');
    const partialMatch = toolsImplementing.some(tool => tool.matchInfo?.strength === 'partial');

    if (strongMatch) {
      return {
        status: 'implemented',
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: <CheckCircleIcon className="w-5 h-5" />,
        text: 'Well Implemented'
      };
    } else if (partialMatch) {
      return {
        status: 'partial',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: <WrenchScrewdriverIcon className="w-5 h-5" />,
        text: 'Partially Implemented'
      };
    } else {
      return {
        status: 'supportive',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: <InformationCircleIcon className="w-5 h-5" />,
        text: 'Supportive Tools Available'
      };
    }
  };

  // Get detailed explanations for why tools meet/don't meet the control
  const getToolImplementationDetails = (tool, controlId) => {
    const toolData = tool.tool || tool;
    const matchInfo = tool.matchInfo;
    
    // Default explanations based on tool type and control
    const explanations = {
      'AC-2': {
        'Keycloak': {
          strong: 'Keycloak provides comprehensive account management with user lifecycle management, role-based access control, and automated provisioning/deprovisioning capabilities.',
          partial: 'Keycloak handles user authentication and basic account management, but may require additional tools for complete account lifecycle automation.',
          weak: 'Keycloak provides basic user management but lacks comprehensive account lifecycle features required for full AC-2 compliance.'
        },
        'Active Directory': {
          strong: 'Active Directory provides enterprise-grade account management with automated user provisioning, group management, and comprehensive access controls.',
          partial: 'Active Directory handles core account management but may need additional tools for automated compliance reporting and advanced lifecycle management.',
          weak: 'Active Directory provides basic user accounts but requires significant configuration for full AC-2 compliance.'
        },
        'Okta': {
          strong: 'Okta offers complete identity lifecycle management with automated provisioning, deprovisioning, and comprehensive account governance features.',
          partial: 'Okta provides strong identity management but may require integration with other systems for complete organizational account management.',
          weak: 'Okta provides identity services but lacks some enterprise account management features for full AC-2 compliance.'
        }
      },
      'AU-2': {
        'Splunk': {
          strong: 'Splunk provides comprehensive audit event collection, analysis, and reporting capabilities with extensive log aggregation and correlation features.',
          partial: 'Splunk can collect and analyze audit events but requires proper configuration and data sources to fully meet AU-2 requirements.',
          weak: 'Splunk provides log management but needs significant setup to capture all required audit events for AU-2 compliance.'
        },
        'ELK Stack': {
          strong: 'ELK Stack (Elasticsearch, Logstash, Kibana) provides powerful audit event collection, processing, and visualization for comprehensive audit compliance.',
          partial: 'ELK Stack can handle audit events but requires custom configuration and parsing rules to meet specific AU-2 requirements.',
          weak: 'ELK Stack provides basic log collection but needs extensive customization for full AU-2 audit event compliance.'
        },
        'Windows Event Log': {
          strong: 'Windows Event Log provides comprehensive audit event logging for Windows systems with detailed security event tracking.',
          partial: 'Windows Event Log captures system events but may need additional tools for centralized collection and analysis.',
          weak: 'Windows Event Log provides basic event logging but lacks advanced analysis and correlation features for full AU-2 compliance.'
        }
      },
      'SC-28': {
        'BitLocker': {
          strong: 'BitLocker provides full-disk encryption for Windows systems, ensuring comprehensive protection of information at rest.',
          partial: 'BitLocker encrypts system drives but may not cover all data storage locations or removable media.',
          weak: 'BitLocker provides basic encryption but may not meet all organizational requirements for data at rest protection.'
        },
        'HashiCorp Vault': {
          strong: 'HashiCorp Vault provides comprehensive secrets management and encryption services for protecting sensitive data at rest.',
          partial: 'HashiCorp Vault secures secrets and keys but may require additional tools for full data-at-rest encryption.',
          weak: 'HashiCorp Vault manages secrets but doesn\'t provide comprehensive data-at-rest encryption for all storage systems.'
        },
        'AWS KMS': {
          strong: 'AWS KMS provides enterprise-grade key management and encryption services for comprehensive data protection at rest.',
          partial: 'AWS KMS handles encryption keys but requires integration with other AWS services for complete data-at-rest protection.',
          weak: 'AWS KMS provides key management but may not cover all data storage scenarios for full SC-28 compliance.'
        }
      }
    };

    // Get the explanation based on tool name and strength
    const controlExplanations = explanations[controlId] || {};
    const toolExplanations = controlExplanations[toolData.name] || {};
    
    if (matchInfo && matchInfo.strength) {
      return toolExplanations[matchInfo.strength] || 
             `${toolData.name} ${matchInfo.strength === 'strong' ? 'fully supports' : 
               matchInfo.strength === 'partial' ? 'partially supports' : 'provides limited support for'} this control.`;
    }
    
    return `${toolData.name} provides support for this control.`;
  };

  // Helper function to get partial match reasoning and suggestions with clickable tools
  const getPartialMatchDetails = (controlId, toolsImplementing) => {
    // Get all tools that could help with this control
    const allTools = getAllTools();
    
    // Find tools that provide strong matches for this control
    const strongMatchTools = allTools.filter(tool => 
      tool.supports_controls && 
      tool.supports_controls[controlId] && 
      tool.supports_controls[controlId].strength === CONTROL_MATCH_STRENGTH.STRONG
    );
    
    // Get the current partial tools and their explanations
    const partialTools = toolsImplementing.filter(t => 
      t.matchInfo && t.matchInfo.strength === CONTROL_MATCH_STRENGTH.PARTIAL
    );
    
    if (partialTools.length === 0) {
      return null;
    }
    
    // Generate suggestions for completion with tool objects
    let suggestions = [];
    let clickableTools = [];
    
    if (strongMatchTools.length > 0) {
      // Suggest specific tools that would make it green
      const suggestedTools = strongMatchTools.filter(tool => 
        !toolsImplementing.some(impl => impl.tool.id === tool.id)
      ).slice(0, 2);
      
      suggestedTools.forEach(tool => {
        suggestions.push(`Add ${tool.name} for complete coverage`);
        clickableTools.push(tool);
      });
    } else {
      // Generic suggestions based on control family with specific tool recommendations
      const family = controlId.split('-')[0];
      
      // Find tools that could help with this control family
      const familyTools = allTools.filter(tool => {
        if (!tool.supports_controls) return false;
        return Object.keys(tool.supports_controls).some(cid => cid.startsWith(family + '-'));
      }).filter(tool => !toolsImplementing.some(impl => impl.tool.id === tool.id));
      
      switch (family) {
        case 'AC':
          const iamTools = familyTools.filter(tool => tool.category === 'Identity & Access Management').slice(0, 2);
          if (iamTools.length > 0) {
            iamTools.forEach(tool => {
              suggestions.push(`Add ${tool.name} for comprehensive IAM coverage`);
              clickableTools.push(tool);
            });
          } else {
            suggestions.push('Add a comprehensive IAM solution like Okta or Keycloak');
          }
          break;
        case 'AU':
          const auditTools = familyTools.filter(tool => 
            tool.category === 'Security Information & Event Management' || 
            tool.category === 'Logging & Monitoring'
          ).slice(0, 2);
          if (auditTools.length > 0) {
            auditTools.forEach(tool => {
              suggestions.push(`Add ${tool.name} for comprehensive audit coverage`);
              clickableTools.push(tool);
            });
          } else {
            suggestions.push('Add a SIEM tool like Splunk or comprehensive logging solution');
          }
          break;
        case 'SC':
          const secTools = familyTools.filter(tool => 
            tool.category === 'Encryption & Data Protection' || 
            tool.category === 'Network Security'
          ).slice(0, 2);
          if (secTools.length > 0) {
            secTools.forEach(tool => {
              suggestions.push(`Add ${tool.name} for enhanced security coverage`);
              clickableTools.push(tool);
            });
          } else {
            suggestions.push('Add dedicated encryption tools or network security solutions');
          }
          break;
        case 'SI':
          const integrityTools = familyTools.filter(tool => 
            tool.category === 'Vulnerability Scanning' || 
            tool.category === 'System Monitoring'
          ).slice(0, 2);
          if (integrityTools.length > 0) {
            integrityTools.forEach(tool => {
              suggestions.push(`Add ${tool.name} for system integrity monitoring`);
              clickableTools.push(tool);
            });
          } else {
            suggestions.push('Add vulnerability scanning or system monitoring tools');
          }
          break;
        case 'CM':
          const configTools = familyTools.filter(tool => 
            tool.category === 'Security Automation' || 
            tool.category === 'Configuration Management'
          ).slice(0, 2);
          if (configTools.length > 0) {
            configTools.forEach(tool => {
              suggestions.push(`Add ${tool.name} for configuration management`);
              clickableTools.push(tool);
            });
          } else {
            suggestions.push('Add configuration management tools like Ansible or Puppet');
          }
          break;
        case 'RA':
          const riskTools = familyTools.filter(tool => 
            tool.category === 'Vulnerability Scanning'
          ).slice(0, 2);
          if (riskTools.length > 0) {
            riskTools.forEach(tool => {
              suggestions.push(`Add ${tool.name} for risk assessment`);
              clickableTools.push(tool);
            });
          } else {
            suggestions.push('Add vulnerability assessment tools like Nessus or OpenVAS');
          }
          break;
        case 'IR':
          suggestions.push('Add incident response platform or SOAR tools');
          break;
        case 'CA':
          const complianceTools = familyTools.filter(tool => 
            tool.category === 'Compliance Management'
          ).slice(0, 2);
          if (complianceTools.length > 0) {
            complianceTools.forEach(tool => {
              suggestions.push(`Add ${tool.name} for compliance monitoring`);
              clickableTools.push(tool);
            });
          } else {
            suggestions.push('Add compliance monitoring or continuous assessment tools');
          }
          break;
        default:
          suggestions.push('Add specialized tools for complete control implementation');
      }
    }
    
    return {
      partialTools,
      suggestions: suggestions.slice(0, 2), // Limit to 2 suggestions
      clickableTools: clickableTools.slice(0, 2) // Limit to 2 clickable tools
    };
  };

  const implementationStatus = getImplementationStatus();
  const partialMatchDetails = getPartialMatchDetails(controlId, toolsImplementing);

  // Helper function to get enhancement status based on baseline
  const getEnhancementStatus = (enhancement) => {
    const isRequired = enhancement.required_for?.includes(selectedBaseline);
    // Check if this enhancement is implemented by current tools
    const isImplemented = toolsImplementing.some(tool => 
      tool.tool.supports_controls?.[enhancement.id]
    );
    
    return {
      isRequired,
      isImplemented,
      status: isImplemented ? 'implemented' : (isRequired ? 'required' : 'optional')
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {controlId}: {details.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {details.family} Family
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Implementation Status */}
          <div className="mb-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${implementationStatus.color}`}>
              {implementationStatus.icon}
              <span className="ml-2 font-medium">{implementationStatus.text}</span>
            </div>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Priority</h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                details.priority === 'High' ? 'bg-red-100 text-red-800' :
                details.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {details.priority}
              </span>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Baseline</h3>
              <div className="flex flex-wrap gap-1">
                {details.baseline.map((baseline) => (
                  <span key={baseline} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {baseline}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Description
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {(() => {
                const desc = details.description || '';
                const isLong = desc.length > 200;
                const isExpanded = expandedSections['description'];
                if (!isLong) return desc;
                if (isExpanded) {
                  return <>{desc} <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={() => toggleSection('description')}>see less</button></>;
                }
                return <>{desc.slice(0, 200)}... <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={() => toggleSection('description')}>see more</button></>;
              })()}
            </p>
          </div>

          {/* Conflict Detection */}
          {conflictData && conflictData.has_conflicts && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-red-500" />
                Conflicts Detected
              </h3>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <div className="space-y-3">
                  {conflictData.conflicts.map((conflict, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                          {conflict.description}
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-300">
                          <strong>Resolution:</strong> {conflict.resolution_suggestion}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        conflict.severity === 'high' ? 'bg-red-100 text-red-800' :
                        conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {conflict.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Implementation Guidance */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Implementation Guidance
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {details.implementation}
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Control Guidance</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {details.guidance}
              </p>
            </div>
          </div>

          {/* Current Implementation */}
          {toolsImplementing.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Current Implementation ({toolsImplementing.length} tools)
              </h3>
              <div className="space-y-3">
                {toolsImplementing.map((toolInfo, index) => {
                  const matchStrength = toolInfo.matchInfo?.strength || 'supportive';
                  const detailedExplanation = getToolImplementationDetails(toolInfo, controlId);
                  
                  return (
                    <div key={index} className={`border-2 rounded-lg p-4 ${
                      matchStrength === 'strong' ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20' :
                      matchStrength === 'partial' ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20' :
                      'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            matchStrength === 'strong' ? 'bg-green-500' :
                            matchStrength === 'partial' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}></div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {toolInfo.tool.name}
                          </h4>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          matchStrength === 'strong' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          matchStrength === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {matchStrength === 'strong' ? '✅ Fully Compliant' :
                           matchStrength === 'partial' ? '⚠️ Partially Compliant' :
                           '🔧 Supportive'}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <h5 className={`text-sm font-medium mb-2 ${
                          matchStrength === 'strong' ? 'text-green-800 dark:text-green-300' :
                          matchStrength === 'partial' ? 'text-yellow-800 dark:text-yellow-300' :
                          'text-blue-800 dark:text-blue-300'
                        }`}>
                          {matchStrength === 'strong' ? 'Why this control is fully met:' :
                           matchStrength === 'partial' ? 'Why this control is partially met:' :
                           'How this tool supports the control:'}
                        </h5>
                        <p className={`text-sm leading-relaxed ${
                          matchStrength === 'strong' ? 'text-green-700 dark:text-green-200' :
                          matchStrength === 'partial' ? 'text-yellow-700 dark:text-yellow-200' :
                          'text-blue-700 dark:text-blue-200'
                        }`}>
                          {detailedExplanation}
                        </p>
                      </div>
                      
                      {/* Additional context for partial/weak matches */}
                      {matchStrength === 'partial' && (
                        <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                          <div className="flex items-start gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-yellow-700 dark:text-yellow-300">
                              <strong>To achieve full compliance:</strong> Consider adding additional tools or configurations to address the remaining requirements for complete {controlId} implementation.
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {matchStrength !== 'strong' && matchStrength !== 'partial' && (
                        <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-start gap-2">
                            <InformationCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                              <strong>Additional tools needed:</strong> While {toolInfo.tool.name} provides supportive capabilities, additional specialized tools may be required for full {controlId} compliance.
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Tool details */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Tool Category: {toolInfo.tool.category || 'General'}</span>
                          <span>Supports {Object.keys(toolInfo.tool.supports_controls || {}).length} controls</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Partial Match Analysis */}
              {partialMatchDetails && partialMatchDetails.partialTools.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        Partial Implementation Analysis
                      </h4>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        Your current tools provide partial coverage for this control. Here's what's missing:
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                          Current Partial Coverage:
                        </div>
                        {partialMatchDetails.partialTools.map((tool, idx) => (
                          <div key={idx} className="text-xs text-yellow-700 dark:text-yellow-300 ml-2 mb-1">
                            • <strong>{tool.tool.name}:</strong> {tool.matchInfo.explanation}
                          </div>
                        ))}
                      </div>
                      
                      <div>
                        <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                          To achieve full compliance:
                        </div>
                        {partialMatchDetails.suggestions.map((suggestion, idx) => (
                          <div key={idx} className="flex items-center justify-between mb-2">
                            <div className="text-xs text-yellow-700 dark:text-yellow-300 flex-1">
                              • {suggestion}
                            </div>
                            {partialMatchDetails.clickableTools[idx] && onAddTool && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onAddTool(partialMatchDetails.clickableTools[idx]);
                                }}
                                className="ml-3 inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md border border-green-700"
                                title={`Add ${partialMatchDetails.clickableTools[idx].name} to your tools`}
                              >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add {partialMatchDetails.clickableTools[idx].name}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Impact Analysis */}
          {impactData && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <CogIcon className="w-5 h-5 mr-2" />
                System Impact Analysis
              </h3>
              
              {/* Affected Settings */}
              {impactData.affected_settings && impactData.affected_settings.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Affected System Settings
                  </h4>
                  <div className="space-y-2">
                    {impactData.affected_settings.map((setting, index) => {
                      const getSettingIcon = (type) => {
                        switch (type) {
                          case 'registry': return <CommandLineIcon className="w-4 h-4" />;
                          case 'file': return <DocumentIcon className="w-4 h-4" />;
                          case 'service': return <ServerIcon className="w-4 h-4" />;
                          case 'policy': return <FolderIcon className="w-4 h-4" />;
                          default: return <CogIcon className="w-4 h-4" />;
                        }
                      };

                      return (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="text-blue-500 mt-0.5">
                              {getSettingIcon(setting.type)}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                {setting.type.charAt(0).toUpperCase() + setting.type.slice(1)}: {setting.path}
                              </div>
                              {setting.value && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                  Value: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded">{setting.value}</code>
                                </div>
                              )}
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {setting.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prerequisites and Dependencies */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {impactData.prerequisite_controls && impactData.prerequisite_controls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Prerequisites</h4>
                    <div className="space-y-1">
                      {impactData.prerequisite_controls.map((prereq) => (
                        <span key={prereq} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1 mb-1">
                          {prereq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {impactData.overridden_controls && impactData.overridden_controls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Overrides</h4>
                    <div className="space-y-1">
                      {impactData.overridden_controls.map((override) => (
                        <span key={override} className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded mr-1 mb-1">
                          {override}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {impactData.conflicting_controls && impactData.conflicting_controls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Potential Conflicts</h4>
                    <div className="space-y-1">
                      {impactData.conflicting_controls.map((conflict) => (
                        <span key={conflict} className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded mr-1 mb-1">
                          {conflict}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Software Impacts */}
              {impactData.software_impacts && impactData.software_impacts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Software Tools Implementing This Control
                  </h4>
                  <div className="space-y-2">
                    {impactData.software_impacts.map((software, index) => (
                      <div key={index} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            {software.tool_name}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            software.match_strength === 'strong' ? 'bg-green-100 text-green-800' :
                            software.match_strength === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {software.match_strength}
                          </span>
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">
                          {software.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Related Controls */}
          {details.relatedControls.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Related Controls
              </h3>
              <div className="flex flex-wrap gap-2">
                {details.relatedControls.map((relatedControl) => (
                  <button
                    key={relatedControl}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                    onClick={() => {
                      // In a real app, this would open the related control
                      console.log(`Opening control: ${relatedControl}`);
                    }}
                  >
                    {relatedControl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Control Enhancements */}
          {details.controlEnhancements && details.controlEnhancements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Control Enhancements
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  ({selectedBaseline} Baseline)
                </span>
              </h3>
              <div className="space-y-3">
                {details.controlEnhancements.map((enhancement) => {
                  const enhancementStatus = getEnhancementStatus(enhancement);
                  return (
                    <div 
                      key={enhancement.id} 
                      className={`border rounded-lg p-4 ${
                        enhancementStatus.status === 'implemented' ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20' :
                        enhancementStatus.status === 'required' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20' :
                        'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {enhancement.id}: {enhancement.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {enhancementStatus.isRequired ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                              Optional
                            </span>
                          )}
                          {enhancementStatus.isImplemented ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          ) : enhancementStatus.isRequired ? (
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <InformationCircleIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {enhancement.description}
                      </p>
                      {enhancementStatus.isRequired && !enhancementStatus.isImplemented && implementationStatus.status === 'implemented' && (
                        <div className="text-xs text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 rounded p-2 mt-2">
                          ℹ️ The main control is implemented, but this required enhancement is not yet met.
                        </div>
                      )}
                      {!enhancementStatus.isRequired && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          This enhancement is optional for {selectedBaseline} baseline.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Supplemental Guidance */}
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Supplemental Guidance
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {(() => {
                const supp = details.supplementalGuidance || '';
                const isLong = supp.length > 200;
                const isExpanded = expandedSections['supplementalGuidance'];
                if (!isLong) return supp;
                if (isExpanded) {
                  return <>{supp} <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={() => toggleSection('supplementalGuidance')}>see less</button></>;
                }
                return <>{supp.slice(0, 200)}... <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={() => toggleSection('supplementalGuidance')}>see more</button></>;
              })()}
            </p>
          </div>

          {/* Official Control Text */}
          {controlData?.official_text && (
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Official Control Text</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <span className="text-gray-800 dark:text-gray-200 text-sm">
                  {(() => {
                    const official = controlData.official_text;
                    const isLong = official.length > 200;
                    const isExpanded = expandedSections['official'];
                    if (!isLong) return official;
                    if (isExpanded) {
                      return <>{official} <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={() => toggleSection('official')}>see less</button></>;
                    }
                    return <>{official.slice(0, 200)}... <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={() => toggleSection('official')}>see more</button></>;
                  })()}
                </span>
              </div>
            </div>
          )}

          {/* Plain English Translation */}
          {controlData?.plain_english_explanation && (
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Plain English Translation</h3>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <span className="text-gray-800 dark:text-gray-200 text-sm">
                  {(() => {
                    const plain = controlData.plain_english_explanation;
                    const isLong = plain.length > 200;
                    const isExpanded = expandedSections['plain'];
                    if (!isLong) return plain;
                    if (isExpanded) {
                      return <>{plain} <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={() => toggleSection('plain')}>see less</button></>;
                    }
                    return <>{plain.slice(0, 200)}... <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={() => toggleSection('plain')}>see more</button></>;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Reference: NIST SP 800-53 Rev 5
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlDetailsModal; 