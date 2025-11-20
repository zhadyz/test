import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CheckCircleIcon, SparklesIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getControlScripts } from './ControlDetails';
import { enhancements as enhancementsData } from '../data/enhancements';
import clsx from 'clsx';

// Get family name for display
const getFamilyName = (controlId) => {
  const family = controlId.split('-')[0];
  const familyNames = {
    'AC': 'Access Control',
    'AT': 'Awareness and Training',
    'AU': 'Audit and Accountability',
    'CA': 'Security Assessment and Authorization',
    'CM': 'Configuration Management',
    'CP': 'Contingency Planning',
    'IA': 'Identification and Authentication',
    'IR': 'Incident Response',
    'MA': 'Maintenance',
    'MP': 'Media Protection',
    'PE': 'Physical and Environmental Protection',
    'PL': 'Planning',
    'PS': 'Personnel Security',
    'RA': 'Risk Assessment',
    'SA': 'System and Services Acquisition',
    'SC': 'System and Communications Protection',
    'SI': 'System and Information Integrity'
  };
  return family;
};

// Get priority level (mock data for now - you can enhance this)
const getPriorityLevel = (control) => {
  // This could come from control data
  return 'Critical Priority';
};

const getDifficultyLevel = (control) => {
  // This could come from control data
  return 'Medium Difficulty';
};

// Mock implementation steps (you'll want to get these from your backend/data)
const getImplementationSteps = (control) => {
  return [
    {
      number: 1,
      title: 'Define account management procedures and policies',
      description: 'Establish clear procedures for account creation, modification, and deletion'
    },
    {
      number: 2,
      title: 'Implement automated account creation workflows',
      description: 'Set up automated systems for account provisioning and de-provisioning'
    },
    {
      number: 3,
      title: 'Schedule regular account reviews (quarterly recommended)',
      description: 'Implement a recurring process to review all active accounts'
    },
    {
      number: 4,
      title: 'Set up automated account disabling for inactive accounts',
      description: 'Configure systems to automatically disable accounts after period of inactivity'
    },
    {
      number: 5,
      title: 'Document account authorization processes',
      description: 'Create and maintain documentation for all account management procedures'
    }
  ];
};

const getBestPractices = (control) => {
  return [
    'Document all implementation decisions',
    'Test changes in non-production environment first',
    'Schedule regular compliance reviews',
    'Maintain audit logs of all account changes',
    'Implement least privilege access principles'
  ];
};

// Get applicable platforms (mock data)
const getApplicablePlatforms = (control) => {
  return ['Windows', 'Linux', 'RHEL', 'Ubuntu', 'macOS'];
};

// Get related tags (mock data)
const getRelatedTags = (control) => {
  const controlId = control.control_id.toLowerCase();
  if (controlId.includes('ac-2')) {
    return ['accounts', 'access', 'identity'];
  }
  return ['security', 'compliance'];
};

// Suggested software (lightweight, modal-scoped)
const getSuggestedSoftware = (control) => {
  const id = control.control_id.toUpperCase();
  const family = id.split('-')[0];
  if (family === 'AU') {
    return [
      { name: 'Splunk', description: 'Enterprise SIEM for log ingestion, search, and alerting.', platforms: ['Windows', 'Linux', 'Cloud'] },
      { name: 'Elastic (ELK)', description: 'Open-source log aggregation and alerting stack.', platforms: ['Linux', 'Cloud'] },
      { name: 'Azure Sentinel', description: 'Cloud-native SIEM for Azure/Hybrid.', platforms: ['Cloud'] }
    ];
  }
  if (family === 'AC') {
    return [
      { name: 'Active Directory', description: 'Directory services and Group Policy for Windows.', platforms: ['Windows'] },
      { name: 'Okta', description: 'Cloud identity and lifecycle automation.', platforms: ['Cloud'] },
      { name: 'Keycloak', description: 'Open-source identity provider for SSO.', platforms: ['Linux', 'Cloud'] }
    ];
  }
  if (family === 'IA') {
    return [
      { name: 'Duo', description: 'MFA for apps and infrastructure.', platforms: ['Cloud'] },
      { name: 'Azure AD MFA', description: 'Microsoft MFA for hybrid identity.', platforms: ['Cloud'] }
    ];
  }
  if (family === 'SC') {
    return [
      { name: 'AWS WAF', description: 'Managed web application firewall.', platforms: ['Cloud'] },
      { name: 'pfSense', description: 'Firewall and routing platform.', platforms: ['Linux'] }
    ];
  }
  return [];
};

// Get AI-powered implementation guidance (mock data - you'll replace with actual AI)
const getImplementationGuidance = (control, suggestedSoftware) => {
  const controlId = control.control_id.toUpperCase();
  const family = controlId.split('-')[0];

  const hasAny = (names) => suggestedSoftware.some(s => names.some(n => s.name.toLowerCase().includes(n)));
  const listVendors = (names) => suggestedSoftware
    .filter(s => names.some(n => s.name.toLowerCase().includes(n)))
    .map(s => s.name)
    .slice(0, 2)
    .join(', ');

  const build = (windows, linux, cloud) => ({ windows, linux, cloud });

  // Specific: AC-2
  if (controlId.startsWith('AC-2')) {
    return build(
      'Use Group Policy and PowerShell automation to manage account creation, reviews, and deactivation. Configure policies to disable inactive users and log lifecycle events.',
      'Enforce account lifecycle management with Ansible or shell scripts. Regularly audit /etc/passwd and disable or remove inactive accounts automatically.',
      'Implement automated provisioning and deactivation policies using IAM or API workflows. Enable detailed logging and scheduled account reviews to maintain compliance.'
    );
  }

  // Specific: AC-3
  if (controlId.startsWith('AC-3')) {
    return build(
      'Use AD security groups and GPOs to enforce NTFS and application permissions. Automate group membership and recertification for continuous compliance.',
      'Apply RBAC with filesystem ACLs and sudoers managed via Ansible. Automate drift detection and corrective enforcement.',
      'Enforce least-privilege with IAM roles and resource policies defined via IaC. Continuously audit permissions and remediate via automation.'
    );
  }

  // Family-level defaults
  if (family === 'AC') {
    return build(
      `Use Active Directory, GPOs, and PowerShell to enforce access and lifecycle changes. Automate provisioning/deprovisioning and log all actions for review${hasAny(['okta','keycloak']) ? ` using ${listVendors(['okta','keycloak'])}` : ''}.`,
      'Use RBAC, PAM/sudo, and filesystem ACLs configured with Ansible. Automate periodic reviews and corrective enforcement.',
      `Use cloud IAM/SSO policies and automated workflows (APIs/Terraform). Continuously review access and lifecycle via scheduled automation${hasAny(['okta']) ? ` with ${listVendors(['okta'])}` : ''}.`
    );
  }

  if (family === 'AU') {
    return build(
      `Enable and forward Security/System/Application logs via GPO and PowerShell. Automate SIEM using tools like ${listVendors(['splunk','elastic','sentinel']) || 'your SIEM'} for forwarding, retention, and alerting.`,
      `Configure auditd/rsyslog with Ansible to capture critical events. Automate forwarding to SIEM${hasAny(['splunk','elastic']) ? ` (e.g., ${listVendors(['splunk','elastic'])})` : ''} and rotation/retention checks.`,
      'Enable cloud-native logging (CloudWatch/Log Analytics) with centralized policies. Automate retention, routing to SIEM, and alerts for key events.'
    );
  }

  if (family === 'IA') {
    return build(
      'Configure password/MFA policies in AD and enforce via GPO and PowerShell. Automate rotation and monitor noncompliance.',
      'Enforce PAM and password policies using Ansible and policy modules. Automate credential rotation and audit trails.',
      'Apply identity policies in IAM/IdP and enforce MFA through APIs/IaC. Automate lifecycle, rotation, and compliance checks.'
    );
  }

  if (family === 'SC') {
    return build(
      'Use Windows Firewall and TLS settings via GPO/PowerShell. Automate baselines and validation scans.',
      'Configure iptables/nftables and TLS ciphers via Ansible. Automate policy verification and remediation.',
      'Apply security groups, network ACLs, and TLS policies via IaC. Continuously validate with automated tests.'
    );
  }

  if (family === 'SI') {
    return build(
      'Automate patching with WSUS/SCCM and PowerShell DSC. Schedule vulnerability scans and remediation.',
      'Use package managers and Ansible patch roles with scheduled scans. Automate findings triage and fixes.',
      'Use managed patch/vuln services and IaC pipelines to enforce updates. Automate scanning and drift correction.'
    );
  }

  if (family === 'CM') {
    return build(
      'Manage baselines with GPO/DSC and audit via PowerShell. Automate configuration drift detection and rollback.',
      'Use Ansible/Puppet/Chef to apply and verify hardened baselines. Automate periodic compliance reports.',
      'Codify configurations with Terraform/Cloud policies and CI checks. Automate drift detection and remediation.'
    );
  }

  // Generic fallback
  return build(
    'Use native platform policies and management tools to enforce the control. Automate configuration and continuous verification.',
    'Use Ansible or shell scripts to configure, audit, and enforce the control. Automate periodic checks for continuous compliance.',
    'Use cloud IAM/APIs and IaC to configure and monitor the control. Automate lifecycle and policy drift detection.'
  );
};

export default function ImplementationModal({ control, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('implementation');
  const [activeScriptTab, setActiveScriptTab] = useState('powershell');
  // Enhancement selection shared across Implementation and Automation
  const enhancementList = (enhancementsData[control?.control_id?.toUpperCase()] || []);
  const [selectedEnhancementId, setSelectedEnhancementId] = useState(enhancementList[0]?.id || null);
  // Platform tabs for Implementation/Automation
  const [selectedPlatform, setSelectedPlatform] = useState('Windows');
  const modalRef = useRef(null);

  const scripts = control?.scripts ? getControlScripts(control) : null;
  const scriptTypes = ['powershell', 'bash', 'ansible'];
  
  const scriptTitles = {
    powershell: 'PowerShell',
    bash: 'Bash',
    ansible: 'Ansible'
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !control) return null;

  const family = getFamilyName(control.control_id);
  const priorityLevel = getPriorityLevel(control);
  const difficultyLevel = getDifficultyLevel(control);
  const implementationSteps = getImplementationSteps(control);
  const bestPractices = getBestPractices(control);
  const platforms = getApplicablePlatforms(control);
  const tags = getRelatedTags(control);
  const suggestedSoftware = getSuggestedSoftware(control);
  const implementationGuidance = getImplementationGuidance(control, suggestedSoftware);

  const selectedEnhancement = selectedEnhancementId
    ? enhancementList.find(e => e.id === selectedEnhancementId)
    : null;

  const enhancementHas = (plat) => {
    if (!selectedEnhancement) return false;
    if (plat === 'Windows') return !!selectedEnhancement.windows_script;
    if (plat === 'Linux') return !!selectedEnhancement.linux_script;
    if (plat === 'Ansible') return !!selectedEnhancement.ansible_script;
    return false;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // optionally show feedback
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="implementation-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with badges and close button */}
        <div className="px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Control ID Badge */}
              <span className="px-4 py-1.5 bg-blue-500 text-white text-sm font-bold rounded-full">
                {control.control_id.toUpperCase()}
              </span>
              
              {/* Family Badge */}
              <span className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold rounded-lg">
                {family}
              </span>
              
              {/* Priority Badge */}
              <span className="px-4 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-full">
                {priorityLevel}
              </span>
              
              {/* Difficulty Badge */}
              <span className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full">
                {difficultyLevel}
              </span>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          {/* Title */}
          <h2 id="implementation-modal-title" className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {control.control_name}
          </h2>
          
          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {control.plain_english_explanation || control.description}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-8 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={clsx(
              'px-6 py-4 text-base font-semibold transition-all relative',
              activeTab === 'overview'
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Overview
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('implementation')}
            className={clsx(
              'px-6 py-4 text-base font-semibold transition-all relative',
              activeTab === 'implementation'
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Implementation
            {activeTab === 'implementation' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={clsx(
              'px-6 py-4 text-base font-semibold transition-all relative',
              activeTab === 'automation'
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Automation
            {activeTab === 'automation' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="px-8 py-6 max-h-[calc(90vh-300px)] overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* AI-Powered Implementation Guidance */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <SparklesIcon className="h-6 w-6 text-purple-500" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    AI-Powered Implementation Guidance
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Windows / Active Directory</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      {implementationGuidance.windows}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Linux / Unix</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      {implementationGuidance.linux}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Cloud Identity / Cross-Platform</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      {implementationGuidance.cloud}
                    </p>
                  </div>
                </div>
              </div>

              {/* Applicable Platforms */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Applicable Platforms
                </h3>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              {/* Related Tags */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Related Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Suggested Software */}
              {suggestedSoftware.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Suggested Software</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suggestedSoftware.map((sw) => (
                      <li key={sw.name} className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-blue-700 dark:text-blue-300 font-semibold">{sw.name}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">{sw.description}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Control Enhancements */}
              {control.enhancements && control.enhancements.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    Control Enhancements
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      (Specific implementations with automation scripts)
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {control.enhancements.map((enh) => {
                      const enhancementId = `${control.control_id.toUpperCase()}-${enh}`;
                      const enhancementDetails = enhancementsData[control.control_id.toUpperCase()]?.find(
                        e => e.id === `${control.control_id.toUpperCase()}(${enh})`
                      );
                      
                      return (
                        <div
                          key={enh}
                          className="px-5 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                                  {control.control_id.toUpperCase()}({enh})
                                </span>
                                {enhancementDetails && (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                                    Has Scripts
                                  </span>
                                )}
                              </div>
                              {enhancementDetails && (
                                <>
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    {enhancementDetails.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {enhancementDetails.plain_english}
                                  </p>
                                </>
                              )}
                            </div>
                            <ChevronRightIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0 ml-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Implementation Tab */}
          {activeTab === 'implementation' && (
            <div className="space-y-8">
              {/* Enhancement Selector */}
              {enhancementList.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 max-w-2xl mx-auto">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Select Control or Enhancement</div>
                  <select
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
                    value={selectedEnhancementId || ''}
                    onChange={(e) => setSelectedEnhancementId(e.target.value)}
                  >
                    {enhancementList.map(eh => (
                      <option key={eh.id} value={eh.id}>{eh.id} - {eh.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Platform Tabs (manual config only: Windows/Linux) */}
              <div className="flex gap-3 flex-wrap max-w-2xl mx-auto">
                {['Windows', 'Linux'].map(plat => (
                  <button
                    key={plat}
                    onClick={() => setSelectedPlatform(plat)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      selectedPlatform === plat
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              {/* Implementation Content (Steps) */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{selectedPlatform} Implementation Steps</h3>
                {selectedEnhancement ? (
                  (() => {
                    const steps = selectedPlatform === 'Windows'
                      ? (selectedEnhancement.windows_steps || selectedEnhancement.steps)
                      : (selectedEnhancement.linux_steps || selectedEnhancement.steps);
                    return steps && steps.length > 0 ? (
                      <ol className="list-decimal list-inside space-y-3">
                        {steps.map((s, idx) => (
                          <li key={idx} className="text-gray-800 dark:text-gray-200 text-lg">{s}</li>
                        ))}
                      </ol>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">No steps available for this enhancement and platform.</div>
                    );
                  })()
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">Select an enhancement to view steps.</div>
                )}
              </div>

              {/* Best Practices */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Best Practices</h3>
                </div>
                <ul className="space-y-3">
                  {bestPractices.map((practice, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-gray-400 mt-1">•</span>
                      <span className="text-gray-700 dark:text-gray-300 text-lg">{practice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Automation Scripts</h3>

              {/* Enhancement Selector (same as Implementation) */}
              {enhancementList.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Select Control or Enhancement</div>
                  <select
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
                    value={selectedEnhancementId || ''}
                    onChange={(e) => setSelectedEnhancementId(e.target.value)}
                  >
                    {enhancementList.map(eh => (
                      <option key={eh.id} value={eh.id}>{eh.id} - {eh.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Platform Tabs */}
              <div className="flex gap-3 flex-wrap">
                {['Windows', 'Linux', 'Ansible'].map(plat => (
                  <button
                    key={plat}
                    onClick={() => setSelectedPlatform(plat)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      selectedPlatform === plat
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700'
                    } ${!enhancementHas(plat) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!enhancementHas(plat)}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              {/* Script Content from selected enhancement */}
              <div className="max-w-xl">
                {selectedEnhancement && enhancementHas(selectedPlatform) ? (
                  <div className="relative">
                    <pre className="language-jsx rounded-xl bg-gray-900 dark:bg-gray-950 p-4 overflow-auto text-sm border border-gray-700">
                      <code className="text-gray-100">
                        {selectedPlatform === 'Windows' && selectedEnhancement.windows_script}
                        {selectedPlatform === 'Linux' && selectedEnhancement.linux_script}
                        {selectedPlatform === 'Ansible' && selectedEnhancement.ansible_script}
                      </code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(
                        selectedPlatform === 'Windows' ? selectedEnhancement.windows_script :
                        selectedPlatform === 'Linux' ? selectedEnhancement.linux_script :
                        selectedEnhancement.ansible_script
                      )}
                      className="absolute top-4 right-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No script for this platform/enhancement.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
