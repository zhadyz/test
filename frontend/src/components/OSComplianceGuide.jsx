import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ServerIcon,
  ComputerDesktopIcon,
  CloudIcon,
  CubeIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const OSComplianceGuide = ({ selectedOS, onGeneratePlaybook }) => {
  const [osInfo, setOSInfo] = useState(null);
  const [supportedControls, setSupportedControls] = useState([]);
  const [loading, setLoading] = useState(false);

  // Comprehensive OS information with compliance details
  const osComplianceData = {
    'ubuntu_20_04': {
      name: 'Ubuntu 20.04 LTS',
      icon: ComputerDesktopIcon,
      color: 'orange',
      category: 'Linux Distribution',
      complianceFrameworks: ['NIST 800-53', 'CIS Benchmarks', 'DISA STIG'],
      strengths: [
        'Extensive package management with APT',
        'Strong community security support',
        'Regular security updates and patches',
        'Built-in firewall (UFW)',
        'AppArmor for mandatory access control',
        'Comprehensive audit capabilities with auditd'
      ],
      considerations: [
        'Requires manual hardening for enterprise environments',
        'Default installation may need security configuration',
        'Third-party repositories need careful management'
      ],
      commonControls: ['AC-2', 'AC-3', 'AU-2', 'AU-3', 'CM-6', 'IA-2', 'SC-7'],
      hardening: {
        difficulty: 'Moderate',
        timeEstimate: '2-4 hours',
        prerequisites: ['sudo access', 'basic Linux knowledge']
      }
    },
    'ubuntu_22_04': {
      name: 'Ubuntu 22.04 LTS',
      icon: ComputerDesktopIcon,
      color: 'orange',
      category: 'Linux Distribution',
      complianceFrameworks: ['NIST 800-53', 'CIS Benchmarks', 'DISA STIG'],
      strengths: [
        'Latest security features and kernel updates',
        'Improved systemd integration',
        'Enhanced container security',
        'Better hardware support',
        'Updated cryptographic libraries',
        'Modern package versions with security fixes'
      ],
      considerations: [
        'Newer release may have fewer tested configurations',
        'Some legacy applications may need updates',
        'Default configurations still require hardening'
      ],
      commonControls: ['AC-2', 'AC-3', 'AU-2', 'AU-3', 'CM-6', 'IA-2', 'SC-7', 'SC-28'],
      hardening: {
        difficulty: 'Moderate',
        timeEstimate: '2-4 hours',
        prerequisites: ['sudo access', 'basic Linux knowledge']
      }
    },
    'rhel_8': {
      name: 'Red Hat Enterprise Linux 8',
      icon: ServerIcon,
      color: 'red',
      category: 'Enterprise Linux',
      complianceFrameworks: ['NIST 800-53', 'CIS Benchmarks', 'DISA STIG', 'FIPS 140-2'],
      strengths: [
        'Enterprise-grade security features',
        'FIPS 140-2 compliant cryptography',
        'SELinux mandatory access control',
        'Comprehensive audit framework',
        'Professional support and updates',
        'Extensive compliance documentation'
      ],
      considerations: [
        'Requires subscription for updates',
        'More complex configuration management',
        'Learning curve for SELinux policies'
      ],
      commonControls: ['AC-2', 'AC-3', 'AU-2', 'AU-3', 'CM-6', 'IA-2', 'SC-7', 'SC-28'],
      hardening: {
        difficulty: 'Advanced',
        timeEstimate: '4-8 hours',
        prerequisites: ['enterprise Linux experience', 'SELinux knowledge']
      }
    },
    'rhel_9': {
      name: 'Red Hat Enterprise Linux 9',
      icon: ServerIcon,
      color: 'red',
      category: 'Enterprise Linux',
      complianceFrameworks: ['NIST 800-53', 'CIS Benchmarks', 'DISA STIG', 'FIPS 140-2'],
      strengths: [
        'Latest enterprise security features',
        'Enhanced container security',
        'Improved system hardening',
        'Advanced cryptographic support',
        'Better cloud integration',
        'Modernized security tooling'
      ],
      considerations: [
        'Newest enterprise release',
        'Migration from RHEL 8 may require planning',
        'Some third-party tools may need updates'
      ],
      commonControls: ['AC-2', 'AC-3', 'AU-2', 'AU-3', 'CM-6', 'IA-2', 'SC-7', 'SC-28'],
      hardening: {
        difficulty: 'Advanced',
        timeEstimate: '4-8 hours',
        prerequisites: ['enterprise Linux experience', 'SELinux knowledge']
      }
    },
    'windows_server_2019': {
      name: 'Windows Server 2019',
      icon: CloudIcon,
      color: 'blue',
      category: 'Windows Server',
      complianceFrameworks: ['NIST 800-53', 'CIS Benchmarks', 'DISA STIG'],
      strengths: [
        'Advanced security features (Credential Guard)',
        'Windows Defender integration',
        'Group Policy management',
        'Comprehensive audit logging',
        'Active Directory integration',
        'PowerShell for automation'
      ],
      considerations: [
        'Regular patch management required',
        'Complex security configuration',
        'Licensing considerations'
      ],
      commonControls: ['AC-2', 'AC-3', 'AU-2', 'AU-3', 'CM-6', 'IA-2', 'SC-7'],
      hardening: {
        difficulty: 'Advanced',
        timeEstimate: '4-6 hours',
        prerequisites: ['Windows Server administration', 'Group Policy knowledge']
      }
    },
    'windows_server_2022': {
      name: 'Windows Server 2022',
      icon: CloudIcon,
      color: 'blue',
      category: 'Windows Server',
      complianceFrameworks: ['NIST 800-53', 'CIS Benchmarks', 'DISA STIG'],
      strengths: [
        'Latest security enhancements',
        'Improved hybrid cloud security',
        'Enhanced container support',
        'Advanced threat protection',
        'Better PowerShell integration',
        'Modern authentication features'
      ],
      considerations: [
        'Latest release - ongoing compatibility testing',
        'Migration planning from older versions',
        'New features require learning'
      ],
      commonControls: ['AC-2', 'AC-3', 'AU-2', 'AU-3', 'CM-6', 'IA-2', 'SC-7', 'SC-28'],
      hardening: {
        difficulty: 'Advanced',
        timeEstimate: '4-6 hours',
        prerequisites: ['Windows Server administration', 'Group Policy knowledge']
      }
    },
    'debian_11': {
      name: 'Debian 11 (Bullseye)',
      icon: ComputerDesktopIcon,
      color: 'red',
      category: 'Linux Distribution',
      complianceFrameworks: ['NIST 800-53', 'CIS Benchmarks'],
      strengths: [
        'Stable and well-tested packages',
        'Strong security focus',
        'Minimal default installation',
        'Excellent package management',
        'Long-term support',
        'High customizability'
      ],
      considerations: [
        'Conservative package versions',
        'Manual security configuration needed',
        'Smaller enterprise support ecosystem'
      ],
      commonControls: ['AC-2', 'AC-3', 'AU-2', 'CM-6', 'IA-2'],
      hardening: {
        difficulty: 'Moderate',
        timeEstimate: '3-5 hours',
        prerequisites: ['Linux administration', 'Debian package management']
      }
    },
    'suse_15': {
      name: 'SUSE Linux Enterprise 15',
      icon: ServerIcon,
      color: 'green',
      category: 'Enterprise Linux',
      complianceFrameworks: ['NIST 800-53', 'CIS Benchmarks', 'Common Criteria'],
      strengths: [
        'Enterprise security features',
        'YaST configuration management',
        'AppArmor security framework',
        'Strong container support',
        'Professional support available',
        'Good cloud integration'
      ],
      considerations: [
        'Different from Red Hat ecosystem',
        'Learning curve for YaST',
        'Smaller community compared to RHEL/Ubuntu'
      ],
      commonControls: ['AC-2', 'AC-3', 'AU-2', 'CM-6', 'IA-2', 'SC-7'],
      hardening: {
        difficulty: 'Advanced',
        timeEstimate: '4-6 hours',
        prerequisites: ['SUSE administration', 'AppArmor knowledge']
      }
    }
  };

  useEffect(() => {
    if (selectedOS && osComplianceData[selectedOS]) {
      setOSInfo(osComplianceData[selectedOS]);
      fetchSupportedControls(selectedOS);
    }
  }, [selectedOS]);

  const fetchSupportedControls = async (os) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/playbook/supported-controls/${os}`);
      if (response.ok) {
        const data = await response.json();
        setSupportedControls(data.supported_controls || []);
      }
    } catch (err) {
      console.error('Error fetching supported controls:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 dark:text-green-400';
      case 'Moderate': return 'text-yellow-600 dark:text-yellow-400';
      case 'Advanced': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!selectedOS || !osInfo) {
    return (
      <div className="bg-gray-50 dark:bg-dark-100 p-6 rounded-lg border border-gray-200 dark:border-dark-300">
        <div className="text-center">
          <InformationCircleIcon className="h-12 w-12 text-gray-400 dark:text-dark-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-2">
            Select an Operating System
          </h3>
          <p className="text-gray-600 dark:text-dark-600">
            Choose an operating system above to see detailed compliance guidance and available templates.
          </p>
        </div>
      </div>
    );
  }

  const IconComponent = osInfo.icon;
  const colorMap = {
    'orange': 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    'red': 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
    'blue': 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    'green': 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
    'purple': 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
  };
  const colorClasses = colorMap[osInfo.color] || colorMap['blue'];

  return (
    <div className="space-y-6">
      {/* OS Header */}
      <div className={`p-6 rounded-lg border ${colorClasses}`}>
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white dark:bg-dark-50 rounded-lg border border-gray-200 dark:border-dark-300">
            <IconComponent className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{osInfo.name}</h2>
              <span className="px-3 py-1 text-sm font-medium bg-white dark:bg-dark-50 rounded-full border border-gray-200 dark:border-dark-300">
                {osInfo.category}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {osInfo.complianceFrameworks.map(framework => (
                <span
                  key={framework}
                  className="px-2 py-1 text-xs font-medium bg-white dark:bg-dark-50 rounded border border-gray-200 dark:border-dark-300"
                >
                  {framework}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hardening Information */}
      <div className="bg-white dark:bg-dark-100 p-6 rounded-lg border border-gray-200 dark:border-dark-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center">
          <CubeIcon className="h-5 w-5 mr-2" />
          Hardening Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-dark-50 rounded-lg">
            <div className={`text-lg font-semibold ${getDifficultyColor(osInfo.hardening.difficulty)}`}>
              {osInfo.hardening.difficulty}
            </div>
            <div className="text-sm text-gray-600 dark:text-dark-600">Difficulty</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-dark-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {osInfo.hardening.timeEstimate}
            </div>
            <div className="text-sm text-gray-600 dark:text-dark-600">Est. Time</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-dark-50 rounded-lg">
            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              {supportedControls.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-dark-600">Templates</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-dark-900 mb-2">Prerequisites:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-dark-600 space-y-1">
              {osInfo.hardening.prerequisites.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Strengths and Considerations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-100 p-6 rounded-lg border border-gray-200 dark:border-dark-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
            Security Strengths
          </h3>
          <ul className="space-y-2">
            {osInfo.strengths.map((strength, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm">
                <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-dark-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-dark-100 p-6 rounded-lg border border-gray-200 dark:border-dark-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
            Considerations
          </h3>
          <ul className="space-y-2">
            {osInfo.considerations.map((consideration, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-dark-700">{consideration}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Available Templates */}
      <div className="bg-white dark:bg-dark-100 p-6 rounded-lg border border-gray-200 dark:border-dark-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Available Compliance Templates
        </h3>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 dark:text-dark-600 mt-2">Loading templates...</p>
          </div>
        ) : supportedControls.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {supportedControls.map(control => (
              <button
                key={control}
                onClick={() => onGeneratePlaybook && onGeneratePlaybook(control)}
                className={`p-3 rounded-lg border-2 border-dashed transition-all duration-200 hover:border-solid hover:shadow-md ${colorClasses.replace('border-', 'border-').replace(/bg-\w+-\d+/, 'bg-white')} dark:bg-dark-50 hover:scale-105`}
              >
                <div className="text-center">
                  <div className="font-semibold text-sm">{control}</div>
                  <ArrowRightIcon className="h-4 w-4 mx-auto mt-1 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-dark-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-dark-600">
              No templates available for this operating system yet.
            </p>
            <p className="text-sm text-gray-500 dark:text-dark-500 mt-2">
              Templates will be generated dynamically using AI.
            </p>
          </div>
        )}
      </div>

      {/* Common Controls */}
      <div className="bg-white dark:bg-dark-100 p-6 rounded-lg border border-gray-200 dark:border-dark-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">
          Commonly Implemented Controls
        </h3>
        <div className="flex flex-wrap gap-2">
          {osInfo.commonControls.map(control => (
            <span
              key={control}
              className={`px-3 py-1 text-sm font-medium rounded-full ${colorClasses}`}
            >
              {control}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-600 dark:text-dark-600 mt-3">
          These are the most frequently implemented NIST 800-53 controls for {osInfo.name}.
        </p>
      </div>
    </div>
  );
};

export default OSComplianceGuide; 