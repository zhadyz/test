import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  CogIcon,
  CommandLineIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlayIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { ENHANCED_CONTROLS } from '../data/controls';
import { generateImplementationPlan, detectConflicts } from '../utils/conflictDetection';
import { getAllTools } from '../data/toolMappings';

const ImplementationGuidance = ({ 
  selectedControls = [], 
  selectedPlatform = 'Windows',
  className = '' 
}) => {
  const [implementationPlan, setImplementationPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('comprehensive');
  const [loading, setLoading] = useState(false);

  // Generate comprehensive implementation narrative
  const generateComprehensiveNarrative = (controlIds, platform) => {
    const allTools = getAllTools();
    const narratives = [];
    
    // Group controls by family for better organization
    const controlsByFamily = {};
    controlIds.forEach(controlId => {
      const control = ENHANCED_CONTROLS[controlId];
      if (!control) return;
      
      if (!controlsByFamily[control.family]) {
        controlsByFamily[control.family] = [];
      }
      controlsByFamily[control.family].push(control);
    });

    // Generate family-based implementation narratives
    Object.entries(controlsByFamily).forEach(([family, controls]) => {
      const familyNarrative = generateFamilyImplementationNarrative(family, controls, platform, allTools);
      if (familyNarrative) {
        narratives.push(familyNarrative);
      }
    });

    return narratives;
  };

  const generateFamilyImplementationNarrative = (family, controls, platform, allTools) => {
    const controlIds = controls.map(c => c.id);
    const familyTools = [];
    
    // Find tools that support these controls
    allTools.forEach(tool => {
      const supportedControls = controlIds.filter(id => tool.supports_controls?.[id]);
      if (supportedControls.length > 0) {
        familyTools.push({
          ...tool,
          supportedControls,
          matchStrength: supportedControls.map(id => tool.supports_controls[id]?.strength || 'partial')
        });
      }
    });

    // Generate narrative based on family type
    let narrative = '';
    let implementation = '';
    
    switch (family) {
      case 'Access Control':
        narrative = generateAccessControlNarrative(controls, familyTools, platform);
        implementation = generateAccessControlImplementation(controls, familyTools, platform);
        break;
      case 'Audit and Accountability':
        narrative = generateAuditNarrative(controls, familyTools, platform);
        implementation = generateAuditImplementation(controls, familyTools, platform);
        break;
      case 'Configuration Management':
        narrative = generateConfigManagementNarrative(controls, familyTools, platform);
        implementation = generateConfigManagementImplementation(controls, familyTools, platform);
        break;
      case 'Identification and Authentication':
        narrative = generateIdentityNarrative(controls, familyTools, platform);
        implementation = generateIdentityImplementation(controls, familyTools, platform);
        break;
      case 'System and Communications Protection':
        narrative = generateProtectionNarrative(controls, familyTools, platform);
        implementation = generateProtectionImplementation(controls, familyTools, platform);
        break;
      default:
        narrative = generateGenericNarrative(family, controls, familyTools, platform);
        implementation = generateGenericImplementation(family, controls, familyTools, platform);
    }

    return {
      family,
      controls: controlIds,
      narrative,
      implementation,
      tools: familyTools,
      complexity: calculateFamilyComplexity(controls, familyTools),
      timeline: calculateFamilyTimeline(controls, familyTools, platform)
    };
  };

  // Narrative generation functions for each control family
  const generateAccessControlNarrative = (controls, tools, platform) => {
    const controlIds = controls.map(c => c.id).join(', ');
    const toolNames = tools.map(t => t.name).join(', ');
    
    return `To implement Access Control requirements (${controlIds}) on ${platform}, establish a comprehensive identity and access management framework using ${toolNames || 'built-in platform capabilities'}. Begin by configuring centralized authentication systems that enforce strong password policies, multi-factor authentication, and role-based access control (RBAC) to ensure users only access resources necessary for their job functions. Implement account lifecycle management processes including automated provisioning, regular access reviews, and immediate deprovisioning upon role changes or termination. ${tools.find(t => t.name === 'Okta' || t.name === 'Active Directory') ? 'Leverage enterprise identity providers to centralize user management and enable single sign-on (SSO) across applications.' : 'Utilize platform-native directory services and group policy management.'} Configure audit logging for all authentication events, failed login attempts, and privilege escalations to maintain accountability and support forensic investigations. This implementation directly satisfies NIST 800-53 Access Control family requirements while establishing a foundation for broader security compliance.`;
  };

  const generateAccessControlImplementation = (controls, tools, platform) => {
    const hasOkta = tools.find(t => t.name === 'Okta');
    const hasAD = tools.find(t => t.name === 'Active Directory');
    
    return `Implementation begins with ${hasOkta ? 'Okta identity platform deployment' : hasAD ? 'Active Directory configuration' : 'native platform identity services setup'} to centralize user authentication and authorization. Configure RBAC policies that map to organizational roles and implement least-privilege access principles across all systems. Deploy multi-factor authentication for privileged accounts and sensitive systems, integrating with ${platform === 'Windows' ? 'Windows Hello for Business or hardware tokens' : platform === 'Linux' ? 'PAM modules and OATH tokens' : 'platform-appropriate MFA solutions'}. Establish automated account provisioning workflows that create accounts with appropriate permissions based on job functions, and implement regular access certification campaigns to review and validate user permissions quarterly. Configure comprehensive audit logging to capture authentication events, authorization decisions, and administrative actions, ensuring logs are forwarded to centralized SIEM systems for correlation and analysis. This approach ensures compliance with controls like AC-2 (Account Management), AC-3 (Access Enforcement), and AC-6 (Least Privilege) while providing operational efficiency and security visibility.`;
  };

  const generateAuditNarrative = (controls, tools, platform) => {
    const controlIds = controls.map(c => c.id).join(', ');
    const toolNames = tools.map(t => t.name).join(', ');
    
    return `Establishing comprehensive audit and accountability capabilities (${controlIds}) requires deploying robust logging infrastructure using ${toolNames || 'platform-native logging services'} to capture, analyze, and retain security-relevant events across the ${platform} environment. Configure centralized log collection from all system components, applications, and security devices to ensure complete visibility into user activities, system events, and potential security incidents. Implement real-time log analysis and correlation capabilities to detect suspicious patterns, unauthorized access attempts, and policy violations, with automated alerting for high-priority security events. ${tools.find(t => t.name === 'Splunk' || t.name === 'ELK Stack') ? 'Leverage enterprise SIEM capabilities for advanced threat detection, incident correlation, and compliance reporting.' : 'Utilize platform-native logging and monitoring tools with custom correlation rules.'} Establish log retention policies that meet regulatory requirements while ensuring logs are protected against tampering and unauthorized access through encryption and integrity controls. This comprehensive audit framework provides the foundation for incident response, forensic analysis, and regulatory compliance reporting.`;
  };

  const generateAuditImplementation = (controls, tools, platform) => {
    const hasSplunk = tools.find(t => t.name === 'Splunk');
    const hasELK = tools.find(t => t.name === 'ELK Stack');
    
    return `Deploy ${hasSplunk ? 'Splunk Enterprise' : hasELK ? 'Elastic Stack (ELK)' : 'platform-native logging services'} as the centralized logging platform, configuring log forwarding from all ${platform} systems using ${platform === 'Windows' ? 'Windows Event Forwarding (WEF) and Sysmon' : platform === 'Linux' ? 'rsyslog, auditd, and Beats agents' : 'appropriate log collection agents'}. Configure comprehensive audit policies to capture authentication events, file access, privilege escalations, configuration changes, and network connections, ensuring all security-relevant activities are logged with sufficient detail for forensic analysis. Implement log parsing and normalization to standardize event formats across different sources, enabling effective correlation and analysis. Deploy real-time alerting rules for critical security events such as failed authentication attempts, privilege escalations, and suspicious network activity, with automated incident response workflows for high-priority alerts. Establish secure log storage with encryption at rest and in transit, implementing role-based access controls for log data and maintaining retention periods that meet both operational needs and regulatory requirements. This implementation satisfies controls like AU-2 (Audit Events), AU-3 (Content of Audit Records), AU-6 (Audit Review), and AU-9 (Protection of Audit Information) while providing operational security monitoring capabilities.`;
  };

  const generateConfigManagementNarrative = (controls, tools, platform) => {
    const controlIds = controls.map(c => c.id).join(', ');
    const toolNames = tools.map(t => t.name).join(', ');
    
    return `Implementing Configuration Management controls (${controlIds}) establishes systematic processes for maintaining secure system configurations using ${toolNames || 'platform-native configuration management tools'} across the ${platform} infrastructure. Deploy configuration management automation to enforce security baselines, prevent configuration drift, and ensure consistent security settings across all systems. Implement version control for all configuration files, security policies, and system templates, maintaining an authoritative source for approved configurations that can be rapidly deployed and verified. ${tools.find(t => t.name === 'Ansible' || t.name === 'Chef') ? 'Leverage infrastructure-as-code practices to automate configuration deployment and compliance verification.' : 'Utilize platform-specific configuration management capabilities and group policy systems.'} Establish configuration monitoring and compliance scanning to detect unauthorized changes, missing security patches, and deviations from approved baselines, with automated remediation capabilities where appropriate. This systematic approach to configuration management reduces security risks, ensures compliance consistency, and enables rapid response to security threats through coordinated configuration updates.`;
  };

  const generateConfigManagementImplementation = (controls, tools, platform) => {
    const hasAnsible = tools.find(t => t.name === 'Ansible');
    const hasChef = tools.find(t => t.name === 'Chef');
    
    return `Deploy ${hasAnsible ? 'Ansible automation platform' : hasChef ? 'Chef infrastructure automation' : 'platform-native configuration management'} to establish infrastructure-as-code practices for consistent security configuration deployment. Create security baseline templates that incorporate industry standards such as CIS Benchmarks and NIST guidelines, defining secure configurations for ${platform === 'Windows' ? 'Windows Server roles, services, and security policies' : platform === 'Linux' ? 'system services, kernel parameters, and security modules' : 'platform-specific security settings'}. Implement automated compliance scanning using ${platform === 'Windows' ? 'Microsoft Security Compliance Toolkit and PowerShell DSC' : platform === 'Linux' ? 'OpenSCAP and Lynis' : 'appropriate compliance tools'} to continuously verify system configurations against approved baselines. Configure version control integration for all configuration artifacts, enabling change tracking, rollback capabilities, and approval workflows for configuration modifications. Deploy configuration monitoring agents that detect unauthorized changes in real-time, automatically alerting security teams and triggering remediation workflows when deviations are detected. This approach ensures compliance with controls like CM-2 (Baseline Configuration), CM-3 (Configuration Change Control), CM-6 (Configuration Settings), and CM-8 (Information System Component Inventory) while providing operational efficiency and security assurance.`;
  };

  const generateIdentityNarrative = (controls, tools, platform) => {
    const controlIds = controls.map(c => c.id).join(', ');
    const toolNames = tools.map(t => t.name).join(', ');
    
    return `Establishing robust Identification and Authentication controls (${controlIds}) requires implementing comprehensive identity management using ${toolNames || 'platform-native identity services'} to ensure only authorized users and systems can access ${platform} resources. Deploy multi-factor authentication (MFA) across all user accounts and privileged access, combining something you know (passwords), something you have (tokens/certificates), and something you are (biometrics) to significantly reduce authentication-based attacks. Implement strong password policies with complexity requirements, regular rotation schedules, and password history to prevent reuse of compromised credentials. ${tools.find(t => t.name === 'Okta' || t.name === 'Azure AD') ? 'Leverage cloud identity providers for centralized authentication, single sign-on, and adaptive authentication based on risk assessment.' : 'Utilize platform directory services with enhanced authentication modules and policy enforcement.'} Configure account lockout mechanisms to prevent brute force attacks while maintaining user productivity through intelligent lockout policies and self-service reset capabilities. This comprehensive identity framework provides the foundation for all other security controls by ensuring authentic user identification and secure authentication processes.`;
  };

  const generateIdentityImplementation = (controls, tools, platform) => {
    const hasOkta = tools.find(t => t.name === 'Okta');
    const hasAzureAD = tools.find(t => t.name === 'Azure AD');
    
    return `Deploy ${hasOkta ? 'Okta Universal Directory and MFA' : hasAzureAD ? 'Azure Active Directory with Conditional Access' : 'platform-native identity services with enhanced authentication'} to establish centralized identity management and authentication services. Configure multi-factor authentication using ${platform === 'Windows' ? 'Windows Hello for Business, smart cards, or mobile authenticator apps' : platform === 'Linux' ? 'PAM modules with OATH tokens or certificate-based authentication' : 'appropriate MFA technologies'} for all administrative accounts and sensitive system access. Implement password policies that enforce minimum complexity, length requirements, and regular rotation while preventing common passwords and credential reuse across systems. Deploy privileged access management (PAM) solutions to control and monitor administrative access, implementing just-in-time access provisioning and session recording for high-privilege operations. Configure authentication logging and monitoring to capture all authentication events, failed login attempts, and suspicious authentication patterns, integrating with SIEM systems for correlation and alerting. This implementation satisfies controls like IA-2 (Identification and Authentication), IA-5 (Authenticator Management), IA-8 (Identification and Authentication for Non-Organizational Users), and IA-11 (Re-authentication) while providing strong security foundations for the entire infrastructure.`;
  };

  const generateProtectionNarrative = (controls, tools, platform) => {
    const controlIds = controls.map(c => c.id).join(', ');
    const toolNames = tools.map(t => t.name).join(', ');
    
    return `Implementing System and Communications Protection controls (${controlIds}) establishes comprehensive security boundaries and data protection using ${toolNames || 'platform-native security capabilities'} across the ${platform} infrastructure. Deploy network segmentation and micro-segmentation strategies to isolate critical systems, limit lateral movement during security incidents, and enforce least-privilege network access principles. Implement encryption for data at rest and in transit using industry-standard algorithms and key management practices, ensuring sensitive information remains protected even if underlying systems are compromised. ${tools.find(t => t.name === 'Cisco ASA' || t.name === 'pfSense') ? 'Leverage enterprise firewall and intrusion prevention systems for network-based threat detection and prevention.' : 'Utilize platform-native firewall capabilities and network security features.'} Configure secure communications protocols (TLS 1.3, SSH, IPSec) for all network traffic, eliminating legacy protocols that pose security risks. Establish continuous vulnerability management processes including regular scanning, patch management, and security configuration validation to maintain strong security postures across all system components.`;
  };

  const generateProtectionImplementation = (controls, tools, platform) => {
    const hasCisco = tools.find(t => t.name === 'Cisco ASA');
    const hasPfSense = tools.find(t => t.name === 'pfSense');
    
    return `Deploy ${hasCisco ? 'Cisco ASA firewalls with IPS modules' : hasPfSense ? 'pfSense firewall with Suricata IDS/IPS' : 'platform-native firewall and security features'} to establish network security boundaries and intrusion detection capabilities. Implement network segmentation using VLANs, security zones, and ${platform === 'Windows' ? 'Windows Defender Firewall with Advanced Security' : platform === 'Linux' ? 'iptables/netfilter and SELinux/AppArmor' : 'platform-appropriate network controls'} to isolate critical systems and limit attack surface. Configure encryption for all data storage using ${platform === 'Windows' ? 'BitLocker for disk encryption and EFS for file-level protection' : platform === 'Linux' ? 'LUKS for disk encryption and GPG for file protection' : 'platform-native encryption capabilities'}, implementing centralized key management and secure key rotation procedures. Deploy SSL/TLS termination and inspection capabilities to secure all network communications while maintaining visibility into encrypted traffic for security monitoring. Establish vulnerability management processes using automated scanning tools, patch management systems, and configuration compliance monitoring to continuously assess and remediate security weaknesses. This comprehensive protection strategy satisfies controls like SC-7 (Boundary Protection), SC-8 (Transmission Confidentiality), SC-13 (Cryptographic Protection), and SC-28 (Protection of Information at Rest) while providing defense-in-depth security architecture.`;
  };

  const generateGenericNarrative = (family, controls, tools, platform) => {
    const controlIds = controls.map(c => c.id).join(', ');
    const toolNames = tools.map(t => t.name).join(', ');
    
    return `Implementing ${family} controls (${controlIds}) requires establishing systematic processes and technical controls using ${toolNames || 'platform-native capabilities'} to ensure comprehensive security coverage across the ${platform} environment. Deploy appropriate security technologies and management processes that address the specific requirements of each control while maintaining operational efficiency and user productivity. Implement monitoring and compliance verification mechanisms to ensure ongoing adherence to security requirements and rapid detection of any deviations from approved configurations. This systematic approach to ${family.toLowerCase()} provides essential security capabilities while supporting broader organizational compliance and risk management objectives.`;
  };

  const generateGenericImplementation = (family, controls, tools, platform) => {
    const controlIds = controls.map(c => c.id).join(', ');
    
    return `Deploy technical and procedural controls to address ${family} requirements (${controlIds}) through systematic implementation of security technologies, management processes, and monitoring capabilities appropriate for the ${platform} environment. Configure platform-specific security features and integrate with existing security infrastructure to ensure comprehensive coverage and operational efficiency. Establish monitoring, logging, and compliance verification processes to maintain ongoing security posture and support audit requirements. This implementation approach ensures systematic coverage of ${family.toLowerCase()} requirements while maintaining alignment with broader organizational security and compliance objectives.`;
  };

  const calculateFamilyComplexity = (controls, tools) => {
    const baseComplexity = controls.length;
    const toolComplexity = tools.length * 0.5;
    const total = baseComplexity + toolComplexity;
    
    return total > 4 ? 'high' : total > 2 ? 'medium' : 'low';
  };

  const calculateFamilyTimeline = (controls, tools, platform) => {
    const baseTime = controls.length * 2; // 2 weeks per control
    const toolTime = tools.length * 1; // 1 week per tool
    const platformMultiplier = platform === 'Windows' ? 1 : 1.2; // Linux slightly longer
    
    const totalWeeks = (baseTime + toolTime) * platformMultiplier;
    
    return totalWeeks > 8 ? 'long' : totalWeeks > 4 ? 'medium' : 'short';
  };

  // Generate implementation plan when controls or platform change
  useEffect(() => {
    if (selectedControls.length > 0) {
      setLoading(true);
      try {
        const plan = generateImplementationPlan(selectedControls, selectedPlatform);
        // Enhance plan with comprehensive narratives
        plan.comprehensiveNarratives = generateComprehensiveNarrative(selectedControls, selectedPlatform);
        setImplementationPlan(plan);
      } catch (error) {
        console.error('Error generating implementation plan:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setImplementationPlan(null);
    }
  }, [selectedControls, selectedPlatform]);

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTimelineIcon = (timeline) => {
    switch (timeline) {
      case 'short':
        return '⚡ 1-2 weeks';
      case 'medium':
        return '⏱️ 1-2 months';
      case 'long':
        return '📅 2+ months';
      default:
        return '⏱️ Variable';
    }
  };

  const getSoftwareTypeIcon = (type) => {
    switch (type) {
      case 'built-in':
        return '🔧';
      case 'open-source':
        return '🌟';
      case 'commercial':
        return '💼';
      default:
        return '📦';
    }
  };

  const exportPlan = () => {
    if (!implementationPlan) return;
    
    const planText = `
Implementation Plan for ${selectedPlatform}
Generated: ${new Date().toLocaleDateString()}

Controls: ${selectedControls.join(', ')}
Complexity: ${implementationPlan.complexity}
Timeline: ${implementationPlan.timeline}

=== OVERVIEW ===
${implementationPlan.controls.map(control => `
${control.id} - ${control.title}
Priority: ${control.priority}
Family: ${control.family}
Overview: ${control.implementationGuidance?.[selectedPlatform]?.overview || 'No overview available'}
`).join('')}

=== KEY IMPLEMENTATION STEPS ===
${implementationPlan.controls.map(control => {
  const guidance = control.implementationGuidance?.[selectedPlatform];
  if (!guidance?.keySteps) return '';
  return `
${control.id} - ${control.title}:
${guidance.keySteps.map((step, index) => `  ${index + 1}. ${step}`).join('\n')}
`;
}).filter(Boolean).join('')}

=== RECOMMENDED TOOLS ===
${implementationPlan.allTools.map(tool => `- ${tool.name} (${tool.type}): ${tool.purpose}`).join('\n')}

${implementationPlan.conflicts.length > 0 ? `
=== CONFLICTS DETECTED ===
${implementationPlan.conflicts.map(conflict => `⚠️ ${conflict.description}`).join('\n')}
` : ''}
    `.trim();

    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `implementation-plan-${selectedPlatform.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateAnsiblePlaybooks = () => {
    if (!implementationPlan) return;
    
    // Get all controls that support Ansible
    const ansibleControls = implementationPlan.controls.filter(control => 
      control.ansibleSupport?.available && 
      control.ansibleSupport.playbooks.some(playbook => 
        playbook.platforms.includes(selectedPlatform)
      )
    );

    if (ansibleControls.length === 0) {
      alert('No Ansible playbooks available for the selected controls and platform.');
      return;
    }

    // Generate a combined playbook
    const playbookContent = `---
# Ansible Playbook for NIST Controls: ${selectedControls.join(', ')}
# Platform: ${selectedPlatform}
# Generated: ${new Date().toISOString()}

- name: NIST Compliance Implementation
  hosts: all
  become: yes
  vars:
    nist_controls: [${selectedControls.map(c => `"${c}"`).join(', ')}]
    target_platform: "${selectedPlatform}"
    
  tasks:
${ansibleControls.map(control => {
  const applicablePlaybooks = control.ansibleSupport.playbooks.filter(pb => 
    pb.platforms.includes(selectedPlatform)
  );
  
  return applicablePlaybooks.map(playbook => `
    # ${control.id} - ${control.title}
    # ${playbook.description}
    - name: "Include ${playbook.name} tasks for ${control.id}"
      include_tasks: "tasks/${playbook.name}.yml"
      tags: ["${control.id.toLowerCase()}", "${playbook.name}"]
  `).join('');
}).join('')}

    # Verification tasks
    - name: Verify compliance implementation
      debug:
        msg: "NIST controls {{ nist_controls }} implemented for {{ target_platform }}"
      tags: ["verify"]
`;

    const blob = new Blob([playbookContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nist-compliance-${selectedPlatform.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.yml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (selectedControls.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-6 text-center">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Implementation Guidance
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Select controls to see platform-specific implementation guidance and recommendations.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500 dark:text-gray-400">Generating implementation plan...</p>
        </div>
      </div>
    );
  }

  if (!implementationPlan) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Unable to Generate Plan
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Could not generate implementation guidance for the selected controls and platform.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Implementation Guidance
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Platform: {selectedPlatform} • {selectedControls.length} controls
            </p>
          </div>
          <div className="flex space-x-2">
            {/* Check if any controls support Ansible for this platform */}
            {implementationPlan?.controls.some(control => 
              control.ansibleSupport?.available && 
              control.ansibleSupport.playbooks.some(playbook => 
                playbook.platforms.includes(selectedPlatform)
              )
            ) && (
              <button
                onClick={generateAnsiblePlaybooks}
                className="flex items-center px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Generate Ansible
              </button>
            )}
            <button
              onClick={exportPlan}
              className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export Plan
            </button>
          </div>
        </div>

        {/* Plan Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-3 rounded-md border ${getComplexityColor(implementationPlan.complexity)}`}>
            <div className="flex items-center">
              <CogIcon className="w-5 h-5 mr-2" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide">Complexity</p>
                <p className="text-sm font-semibold capitalize">{implementationPlan.complexity}</p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-md border border-blue-200 bg-blue-50 text-blue-600">
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 mr-2" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide">Timeline</p>
                <p className="text-sm font-semibold">{getTimelineIcon(implementationPlan.timeline)}</p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-md border border-gray-200 bg-gray-50 text-gray-600">
            <div className="flex items-center">
              <DocumentIcon className="w-5 h-5 mr-2" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide">Recommended Tools</p>
                <p className="text-sm font-semibold">{implementationPlan.allTools.length} tools</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conflicts Alert */}
        {implementationPlan.conflicts.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  {implementationPlan.conflicts.length} Conflict(s) Detected
                </h4>
                <div className="space-y-1">
                  {implementationPlan.conflicts.map((conflict, index) => (
                    <p key={index} className="text-sm text-red-700 dark:text-red-300">
                      • {conflict.description}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {[
              { id: 'comprehensive', label: 'Implementation Plans', icon: BookOpenIcon, primary: true },
              { id: 'overview', label: 'Overview', icon: InformationCircleIcon },
              { id: 'guidance', label: 'Step-by-Step', icon: CommandLineIcon },
              { id: 'tools', label: 'Tools', icon: CogIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900 dark:text-white">Controls Overview</h4>
              <div className="grid gap-4">
                {implementationPlan.controls.map(control => {
                  const guidance = control.implementationGuidance?.[selectedPlatform];
                  return (
                    <div key={control.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {control.id} - {control.title}
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {control.family} • Priority: <span className={`font-medium ${
                              control.priority === 'High' ? 'text-red-600' : 
                              control.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>{control.priority}</span>
                          </p>
                        </div>
                        {control.ansibleSupport?.available && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            <PlayIcon className="w-3 h-3 mr-1" />
                            Ansible
                          </span>
                        )}
                      </div>
                      {guidance?.overview && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Implementation Approach:</strong> {guidance.overview}
                          </p>
                        </div>
                      )}
                      {guidance?.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                          💡 {guidance.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'guidance' && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900 dark:text-white">Platform-Specific Implementation Guidance</h4>
              <div className="space-y-6">
                {implementationPlan.controls.map(control => {
                  const guidance = control.implementationGuidance?.[selectedPlatform];
                  if (!guidance) return null;
                  
                  return (
                    <div key={control.id} className="border border-gray-200 dark:border-gray-600 rounded-md">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {control.id} - {control.title}
                        </h5>
                        {guidance.overview && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {guidance.overview}
                          </p>
                        )}
                      </div>
                      <div className="p-4">
                        {guidance.keySteps && guidance.keySteps.length > 0 && (
                          <div>
                            <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Key Implementation Steps:</h6>
                            <div className="space-y-2">
                              {guidance.keySteps.map((step, index) => (
                                <div key={index} className="flex items-start">
                                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                                    {index + 1}
                                  </span>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900 dark:text-white">Recommended Tools</h4>
              {implementationPlan.allTools.length > 0 ? (
                <div className="grid gap-4">
                  {implementationPlan.allTools.map((tool, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white">{tool.name}</h5>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{tool.purpose}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ml-3 ${
                          tool.type === 'identity-management' ? 'bg-blue-100 text-blue-800' :
                          tool.type === 'logging-siem' ? 'bg-purple-100 text-purple-800' :
                          tool.type === 'logging' ? 'bg-green-100 text-green-800' :
                          tool.type === 'access-control' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tool.type.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tool.platforms.map((platform, pIndex) => (
                          <span key={pIndex} className={`px-2 py-1 text-xs rounded ${
                            platform === selectedPlatform 
                              ? 'bg-blue-100 text-blue-800 font-medium' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CogIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No specific tools recommended for the selected controls and platform.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comprehensive' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Comprehensive Implementation Plans</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Detailed implementation narratives organized by control family with specific software recommendations and security control references.</p>
                  </div>
                </div>
              </div>

              {implementationPlan.comprehensiveNarratives && implementationPlan.comprehensiveNarratives.map((familyPlan, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {familyPlan.family} Implementation
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Controls: {familyPlan.controls.join(', ')} • {familyPlan.tools.length} tools • {familyPlan.complexity} complexity • {familyPlan.timeline} timeline
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          familyPlan.complexity === 'high' ? 'bg-red-100 text-red-800' :
                          familyPlan.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {familyPlan.complexity} complexity
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          familyPlan.timeline === 'long' ? 'bg-red-100 text-red-800' :
                          familyPlan.timeline === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {familyPlan.timeline === 'long' ? '2+ months' : 
                           familyPlan.timeline === 'medium' ? '1-2 months' : '1-2 weeks'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-6">
                      {/* Strategic Overview */}
                      <div>
                        <h6 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                          Strategic Implementation Overview
                        </h6>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {familyPlan.narrative}
                          </p>
                        </div>
                      </div>

                      {/* Detailed Implementation */}
                      <div>
                        <h6 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <WrenchScrewdriverIcon className="w-5 h-5 text-green-600" />
                          Detailed Implementation Plan
                        </h6>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {familyPlan.implementation}
                          </p>
                        </div>
                      </div>

                      {/* Supporting Tools */}
                      {familyPlan.tools.length > 0 && (
                        <div>
                          <h6 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <CogIcon className="w-5 h-5 text-purple-600" />
                            Supporting Tools & Technologies
                          </h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {familyPlan.tools.map((tool, toolIndex) => (
                              <div key={toolIndex} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h7 className="font-medium text-purple-900 dark:text-purple-100">{tool.name}</h7>
                                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">{tool.description}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {tool.supportedControls.map((controlId, cIndex) => (
                                        <span key={cIndex} className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded">
                                          {controlId}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                                    tool.matchStrength.includes('full') ? 'bg-green-100 text-green-800' :
                                    tool.matchStrength.includes('partial') ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {tool.matchStrength.includes('full') ? 'Full Support' : 'Partial Support'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!implementationPlan.comprehensiveNarratives || implementationPlan.comprehensiveNarratives.length === 0) && (
                <div className="text-center py-8">
                  <BookOpenIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No comprehensive implementation plans available for the selected controls.
                  </p>
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

export default ImplementationGuidance; 