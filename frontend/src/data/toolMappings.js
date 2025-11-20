// Tool-to-Control mapping data for NIST 800-53 compliance tools
// This data structure supports bi-directional mapping between tools and controls

export const TOOL_CATEGORIES = {
  IAM: 'Identity & Access Management',
  LOGGING: 'Logging & Monitoring',
  SIEM: 'Security Information & Event Management',
  SCANNING: 'Vulnerability Scanning',
  BACKUP: 'Backup & Recovery',
  ENCRYPTION: 'Encryption & Data Protection',
  NETWORK: 'Network Security',
  ENDPOINT: 'Endpoint Protection',
  CLOUD: 'Cloud Security',
  COMPLIANCE: 'Compliance Management',
  AUTOMATION: 'Security Automation',
  CONTAINER: 'Container Security',
  PLATFORM: 'Cloud Platforms',
  ORCHESTRATION: 'Container Orchestration'
};

export const TOOL_TAGS = {
  OPEN_SOURCE: 'Open Source',
  COMMERCIAL: 'Commercial',
  FEDRAMP: 'FedRAMP Ready',
  AUTOMATION: 'Automation',
  ENTERPRISE: 'Enterprise',
  CLOUD_NATIVE: 'Cloud Native',
  ON_PREMISE: 'On-Premise',
  HYBRID: 'Hybrid',
  SAAS: 'SaaS',
  FREE: 'Free',
  PAID: 'Paid',
  AWS: 'AWS',
  AZURE: 'Azure',
  GCP: 'Google Cloud',
  KUBERNETES: 'Kubernetes'
};

export const CONTROL_MATCH_STRENGTH = {
  STRONG: 'strong',    // Tool directly implements the control
  PARTIAL: 'partial',  // Tool helps with part of the control
  SUPPORTIVE: 'supportive' // Tool provides supporting capabilities
};

export const TOOL_MAPPINGS = {
  // Identity & Access Management Tools
  'Keycloak': {
    id: 'keycloak',
    name: 'Keycloak',
    category: TOOL_CATEGORIES.IAM,
    description: 'Open source identity and access management solution',
    vendor: 'Red Hat',
    website: 'https://www.keycloak.org',
    tags: [TOOL_TAGS.OPEN_SOURCE, TOOL_TAGS.ENTERPRISE],
    supported_os: ['linux', 'windows', 'macos'],
    supports_controls: {
      'AC-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Provides comprehensive account management including creation, modification, and deactivation with role-based access control'
      },
      'AC-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Implements fine-grained access control policies and enforcement mechanisms'
      },
      'AC-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Enforces principle of least privilege through role-based and attribute-based access controls'
      },
      'AC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Provides account lockout capabilities after unsuccessful login attempts'
      },
      'IA-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Supports multi-factor authentication and various identity proofing mechanisms'
      },
      'IA-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Manages unique user identifiers and prevents identifier reuse'
      },
      'IA-5': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Supports password policies and authentication token management'
      }
    }
  },

  'Okta': {
    id: 'okta',
    name: 'Okta Identity Cloud',
    category: TOOL_CATEGORIES.IAM,
    description: 'Cloud-based identity and access management platform with comprehensive SSO and MFA capabilities',
    vendor: 'Okta',
    website: 'https://www.okta.com',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.CLOUD_NATIVE, TOOL_TAGS.SAAS, TOOL_TAGS.FEDRAMP],
    supports_controls: {
      'AC-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Okta provides automated user provisioning, deprovisioning, and lifecycle management with API integrations',
        enhancements: ['AC-2(1)', 'AC-2(2)', 'AC-2(7)', 'AC-2(12)'] // Explicitly show which enhancements are supported
      },
      'AC-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Role-based access control with fine-grained permissions and policy enforcement',
        enhancements: ['AC-3(2)', 'AC-3(4)']
      },
      'AC-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Least privilege enforcement through role-based access and just-in-time access',
        enhancements: ['AC-6(1)', 'AC-6(2)', 'AC-6(9)']
      },
      'IA-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Multi-factor authentication with various factors including biometrics, tokens, and push notifications',
        enhancements: ['IA-2(1)', 'IA-2(2)', 'IA-2(3)', 'IA-2(6)', 'IA-2(11)']
      },
      'IA-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Centralized identity management with unique identifier assignment and management'
      },
      'IA-5': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Password policy enforcement and credential management through integrations',
        enhancements: ['IA-5(1)', 'IA-5(2)', 'IA-5(4)']
      },
      'IA-8': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Non-organizational user identification and authentication through federation'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Authentication and authorization event logging with SIEM integration capabilities'
      }
    },
    platforms: ['Windows', 'macOS', 'Linux', 'Cloud Services'],
    integration_complexity: 'Medium',
    deployment_time: '2-4 weeks'
  },

  // SIEM & Logging Tools
  'Splunk': {
    id: 'splunk',
    name: 'Splunk',
    category: TOOL_CATEGORIES.SIEM,
    description: 'Enterprise security information and event management platform',
    vendor: 'Splunk',
    website: 'https://www.splunk.com',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.ENTERPRISE],
    supported_os: ['linux', 'windows', 'macos'],
    supports_controls: {
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Comprehensive audit event identification and logging capabilities'
      },
      'AU-2(3)': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Automated review and update of audit events through dashboards and alerts'
      },
      'AU-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Detailed audit record content with customizable fields and metadata'
      },
      'AU-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Advanced audit review, analysis, and reporting with machine learning capabilities'
      },
      'AU-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Powerful audit reduction and report generation with real-time analysis'
      },
      'AU-12': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Centralized audit generation and management across enterprise systems'
      },
      'SI-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Real-time system monitoring with anomaly detection and threat intelligence'
      },
      'IR-4': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Supports incident handling through log analysis and correlation'
      }
    }
  },

  'ELK Stack': {
    id: 'elk-stack',
    name: 'ELK Stack (Elasticsearch, Logstash, Kibana)',
    category: TOOL_CATEGORIES.LOGGING,
    description: 'Open source log management and analytics platform',
    vendor: 'Elastic',
    website: 'https://www.elastic.co',
    tags: [TOOL_TAGS.OPEN_SOURCE],
    supports_controls: {
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Comprehensive log collection and audit event identification'
      },
      'AU-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Structured audit record content with flexible schema support'
      },
      'AU-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Advanced log analysis and visualization capabilities through Kibana'
      },
      'AU-7': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Log aggregation and basic reporting capabilities'
      },
      'SI-4': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'System monitoring through log analysis and custom alerting'
      }
    }
  },

  // Vulnerability Scanning Tools
  'Nessus': {
    id: 'nessus',
    name: 'Nessus',
    category: TOOL_CATEGORIES.SCANNING,
    description: 'Comprehensive vulnerability assessment solution',
    vendor: 'Tenable',
    website: 'https://www.tenable.com/products/nessus',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.ENTERPRISE],
    supports_controls: {
      'RA-5': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Automated vulnerability scanning and assessment capabilities'
      },
      'SI-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Identifies missing security patches and configuration issues'
      },
      'CA-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Supports security assessments through vulnerability identification'
      },
      'CA-7': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Continuous monitoring through scheduled vulnerability scans'
      }
    }
  },

  'OpenVAS': {
    id: 'openvas',
    name: 'OpenVAS',
    category: TOOL_CATEGORIES.SCANNING,
    description: 'Open source vulnerability assessment and management solution',
    vendor: 'Greenbone Networks',
    website: 'https://www.openvas.org',
    tags: [TOOL_TAGS.OPEN_SOURCE, TOOL_TAGS.FREE],
    supports_controls: {
      'RA-5': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Comprehensive vulnerability scanning with extensive plugin database'
      },
      'SI-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Identifies security vulnerabilities and missing patches'
      },
      'CA-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Supports security control assessments through vulnerability testing'
      }
    }
  },

  // Network Security Tools
  'pfSense': {
    id: 'pfsense',
    name: 'pfSense',
    category: TOOL_CATEGORIES.NETWORK,
    description: 'Open source firewall and router platform',
    vendor: 'Netgate',
    website: 'https://www.pfsense.org',
    tags: [TOOL_TAGS.OPEN_SOURCE],
    supported_os: ['other'],
    supports_controls: {
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Implements boundary protection through firewall rules and network segmentation'
      },
      'AC-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Controls information flow between network segments and external connections'
      },
      'SI-4': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Network monitoring and intrusion detection capabilities'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Network traffic logging and firewall event auditing'
      }
    }
  },

  // Backup & Recovery Tools
  'Veeam': {
    id: 'veeam',
    name: 'Veeam Backup & Replication',
    category: TOOL_CATEGORIES.BACKUP,
    description: 'Enterprise backup and disaster recovery solution',
    vendor: 'Veeam',
    website: 'https://www.veeam.com',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.ENTERPRISE],
    supported_os: ['windows', 'linux'],
    supports_controls: {
      'CP-9': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Comprehensive information system backup with automated scheduling and verification'
      },
      'CP-10': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Information system recovery and reconstitution capabilities'
      },
      'CP-6': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Supports alternate storage sites for backup data'
      },
      'SI-12': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Handles information output with backup verification and integrity checking'
      }
    }
  },

  // Encryption Tools
  'HashiCorp Vault': {
    id: 'hashicorp-vault',
    name: 'HashiCorp Vault',
    category: TOOL_CATEGORIES.ENCRYPTION,
    description: 'Secrets management and data protection platform',
    vendor: 'HashiCorp',
    website: 'https://www.vaultproject.io',
    tags: [TOOL_TAGS.OPEN_SOURCE],
    supports_controls: {
      'SC-28': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Provides encryption of data at rest with key management and rotation'
      },
      'SC-8': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Supports encryption of data in transit through secure API communications'
      },
      'SC-12': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Comprehensive cryptographic key establishment and management'
      },
      'SC-13': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Implements FIPS-validated cryptographic modules and algorithms'
      },
      'IA-5': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Manages authentication credentials and secrets securely'
      }
    }
  },

  // Container Security
  'Prisma Cloud': {
    id: 'prisma-cloud',
    name: 'Prisma Cloud',
    category: TOOL_CATEGORIES.CONTAINER,
    description: 'Container and cloud native security platform',
    vendor: 'Palo Alto Networks',
    website: 'https://www.paloaltonetworks.com/prisma/cloud',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.CLOUD_NATIVE],
    supports_controls: {
      'SI-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Runtime protection and monitoring for containers and serverless functions'
      },
      'RA-5': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Vulnerability scanning for container images and running containers'
      },
      'CM-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Configuration management for container baseline configurations'
      },
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Network microsegmentation and boundary protection for containers'
      }
    }
  },

  // Compliance Management
  'AWS Config': {
    id: 'aws-config',
    name: 'AWS Config',
    category: TOOL_CATEGORIES.COMPLIANCE,
    description: 'AWS configuration compliance and governance service',
    vendor: 'Amazon Web Services',
    website: 'https://aws.amazon.com/config/',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.CLOUD_NATIVE],
    supports_controls: {
      'CM-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Baseline configuration management and drift detection for AWS resources'
      },
      'CM-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Configuration settings management with compliance rules and remediation'
      },
      'CA-7': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Continuous monitoring of AWS resource configurations'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Configuration change auditing and logging'
      }
    }
  },

  // Automation Tools
  'Ansible': {
    id: 'ansible',
    name: 'Ansible',
    category: TOOL_CATEGORIES.AUTOMATION,
    description: 'Open source automation platform for configuration management',
    vendor: 'Red Hat',
    website: 'https://www.ansible.com',
    tags: [TOOL_TAGS.OPEN_SOURCE, TOOL_TAGS.AUTOMATION],
    supported_os: ['linux', 'windows', 'macos'],
    supports_controls: {
      'CM-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Automated baseline configuration management and enforcement'
      },
      'CM-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Configuration settings management through infrastructure as code'
      },
      'SI-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Automated patch management and system updates'
      },
      'CM-3': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Configuration change control through version-controlled playbooks'
      }
    }
  },

  // Cloud Platforms
  'AWS': {
    id: 'aws',
    name: 'Amazon Web Services (AWS)',
    category: TOOL_CATEGORIES.PLATFORM,
    description: 'Comprehensive cloud computing platform with security services',
    vendor: 'Amazon',
    website: 'https://aws.amazon.com',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.CLOUD_NATIVE, TOOL_TAGS.FEDRAMP, TOOL_TAGS.AWS],
    supports_controls: {
      'AC-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'AWS IAM provides comprehensive account management with programmatic user creation, modification, and deactivation'
      },
      'AC-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'AWS IAM policies and resource-based permissions enforce granular access control'
      },
      'AC-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'IAM roles and policies enforce least privilege access across all AWS services'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'CloudTrail and CloudWatch provide comprehensive audit logging for all AWS API calls'
      },
      'AU-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'CloudTrail logs include detailed audit record content with timestamps, user identity, and resource details'
      },
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'VPCs, Security Groups, and NACLs provide network boundary protection and traffic filtering'
      },
      'SC-8': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'TLS/SSL encryption in transit is available across all AWS services'
      },
      'SC-28': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'KMS and service-specific encryption provide data protection at rest across all storage services'
      },
      'IA-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'AWS SSO and IAM support MFA and federated authentication'
      },
      'CM-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'AWS Config provides configuration management and baseline tracking'
      },
      'SI-4': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'CloudWatch, GuardDuty, and Security Hub provide system monitoring capabilities'
      }
    }
  },

  'Azure': {
    id: 'azure',
    name: 'Microsoft Azure',
    category: TOOL_CATEGORIES.PLATFORM,
    description: 'Microsoft cloud computing platform with integrated security services',
    vendor: 'Microsoft',
    website: 'https://azure.microsoft.com',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.CLOUD_NATIVE, TOOL_TAGS.FEDRAMP, TOOL_TAGS.AZURE],
    supports_controls: {
      'AC-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Azure Active Directory provides comprehensive identity and account management'
      },
      'AC-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Azure RBAC and Conditional Access policies enforce fine-grained access control'
      },
      'AC-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Azure RBAC enforces least privilege through custom and built-in roles'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Azure Monitor and Activity Logs provide comprehensive audit event logging'
      },
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Virtual Networks, NSGs, and Azure Firewall provide network boundary protection'
      },
      'SC-28': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Azure Key Vault and service encryption provide data protection at rest'
      },
      'IA-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Azure AD supports MFA, conditional access, and identity protection'
      }
    }
  },

  'Google Cloud Platform': {
    id: 'gcp',
    name: 'Google Cloud Platform (GCP)',
    category: TOOL_CATEGORIES.PLATFORM,
    description: 'Google cloud computing services with security-first design',
    vendor: 'Google',
    website: 'https://cloud.google.com',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.CLOUD_NATIVE, TOOL_TAGS.FEDRAMP, TOOL_TAGS.GCP],
    supports_controls: {
      'AC-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Google Cloud IAM provides identity and account management with fine-grained permissions'
      },
      'AC-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'IAM policies and resource hierarchy enforce access control across all GCP services'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Cloud Audit Logs and Cloud Logging provide comprehensive audit trail'
      },
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'VPC networks, firewall rules, and Cloud Armor provide network security'
      },
      'SC-28': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Cloud KMS and default encryption provide data protection at rest'
      }
    }
  },

  'Kubernetes': {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: TOOL_CATEGORIES.ORCHESTRATION,
    description: 'Container orchestration platform with built-in security features',
    vendor: 'Cloud Native Computing Foundation',
    website: 'https://kubernetes.io',
    tags: [TOOL_TAGS.OPEN_SOURCE, TOOL_TAGS.CLOUD_NATIVE, TOOL_TAGS.KUBERNETES],
    supports_controls: {
      'AC-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'ServiceAccounts and user management provide basic account management for cluster access'
      },
      'AC-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'RBAC (Role-Based Access Control) provides fine-grained access control to cluster resources'
      },
      'AC-6': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'RBAC and Pod Security Standards enforce least privilege access'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Audit logging can be configured to track API server requests and cluster events'
      },
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Network Policies, Service Mesh, and namespace isolation provide boundary protection'
      },
      'SC-28': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Secrets management and etcd encryption provide some data protection capabilities'
      },
      'SI-4': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Resource monitoring and health checks provide basic system monitoring'
      }
    }
  },

  'Amazon S3': {
    id: 'aws-s3',
    name: 'Amazon S3',
    category: TOOL_CATEGORIES.CLOUD,
    description: 'Object storage service with comprehensive security features',
    vendor: 'Amazon',
    website: 'https://aws.amazon.com/s3/',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.CLOUD_NATIVE, TOOL_TAGS.AWS],
    supports_controls: {
      'SC-28': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Server-side encryption with KMS, SSE-S3, or customer-provided keys protects data at rest'
      },
      'AC-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Bucket policies, ACLs, and IAM policies provide granular access control'
      },
      'SC-8': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'HTTPS/TLS encryption protects data in transit to and from S3'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'S3 access logging and CloudTrail provide comprehensive audit trails'
      },
      'SC-12': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Integration with AWS KMS provides cryptographic key management'
      }
    }
  },

  'BitLocker': {
    id: 'bitlocker',
    name: 'BitLocker',
    category: TOOL_CATEGORIES.ENCRYPTION,
    description: 'Windows disk encryption feature',
    vendor: 'Microsoft',
    website: '',
    tags: ['windows'],
    supports_controls: {
      'SC-28': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Full disk encryption for data at rest protection'
      },
      'SC-28(1)': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'AES cryptographic protection for stored data'
      }
    }
  },

  // OS-Specific Security Tools
  'Microsoft Defender': {
    id: 'microsoft-defender',
    name: 'Microsoft Defender for Endpoint',
    category: TOOL_CATEGORIES.ENDPOINT,
    description: 'Enterprise endpoint detection and response platform for Windows environments',
    vendor: 'Microsoft',
    website: 'https://www.microsoft.com/en-us/security/business/threat-protection/endpoint-defender',
    tags: [TOOL_TAGS.COMMERCIAL, TOOL_TAGS.ENTERPRISE, TOOL_TAGS.FEDRAMP],
    supported_os: ['windows'], // Windows-only
    supports_controls: {
      'SI-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Automated flaw remediation and patch management for Windows systems'
      },
      'SI-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Real-time malware protection and endpoint security monitoring'
      },
      'SI-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Advanced threat detection and system monitoring with behavioral analysis'
      },
      'AC-6': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Supports least privilege through application control and device control'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Security event logging and audit trail generation'
      },
      'IR-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Automated incident response and threat remediation capabilities'
      }
    },
    platforms: ['Windows 10', 'Windows 11', 'Windows Server'],
    integration_complexity: 'Low',
    deployment_time: '1-2 weeks'
  },

  'macOS Security': {
    id: 'macos-security',
    name: 'macOS Built-in Security',
    category: TOOL_CATEGORIES.ENDPOINT,
    description: 'Native macOS security features including XProtect, Gatekeeper, and System Integrity Protection',
    vendor: 'Apple',
    website: 'https://support.apple.com/guide/security/',
    tags: [TOOL_TAGS.FREE, 'Built-in'],
    supported_os: ['macos'], // macOS-only
    supports_controls: {
      'SI-3': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'XProtect provides malware detection and removal for macOS'
      },
      'SI-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'System Integrity Protection (SIP) ensures software and firmware integrity'
      },
      'AC-3': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Gatekeeper controls application execution and code signing verification'
      },
      'SC-8': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Built-in encryption for data in transit through secure protocols'
      },
      'SC-28': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'FileVault provides full-disk encryption for data at rest'
      }
    },
    platforms: ['macOS'],
    integration_complexity: 'None',
    deployment_time: 'Pre-installed'
  },

  'ClamAV': {
    id: 'clamav',
    name: 'ClamAV',
    category: TOOL_CATEGORIES.ENDPOINT,
    description: 'Open source antivirus engine for Linux and Unix systems',
    vendor: 'Cisco Talos',
    website: 'https://www.clamav.net/',
    tags: [TOOL_TAGS.OPEN_SOURCE, TOOL_TAGS.FREE],
    supported_os: ['linux'], // Linux-only
    supports_controls: {
      'SI-3': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Malware protection and virus scanning for Linux systems'
      },
      'SI-4': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Real-time scanning and monitoring capabilities'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Logging of scan results and malware detection events'
      }
    },
    platforms: ['Linux', 'Unix'],
    integration_complexity: 'Medium',
    deployment_time: '1 week'
  },

  'Windows Defender Firewall': {
    id: 'windows-firewall',
    name: 'Windows Defender Firewall',
    category: TOOL_CATEGORIES.NETWORK,
    description: 'Built-in network firewall for Windows operating systems',
    vendor: 'Microsoft',
    website: 'https://docs.microsoft.com/en-us/windows/security/threat-protection/windows-firewall/',
    tags: [TOOL_TAGS.FREE, 'Built-in'],
    supported_os: ['windows'], // Windows-only
    supports_controls: {
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Network boundary protection and traffic filtering'
      },
      'AC-4': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Information flow enforcement through network rules'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Firewall event logging and audit capabilities'
      }
    },
    platforms: ['Windows'],
    integration_complexity: 'None',
    deployment_time: 'Pre-installed'
  },

  'iptables': {
    id: 'iptables',
    name: 'iptables',
    category: TOOL_CATEGORIES.NETWORK,
    description: 'Linux kernel firewall for packet filtering and network address translation',
    vendor: 'Linux Community',
    website: 'https://www.netfilter.org/projects/iptables/',
    tags: [TOOL_TAGS.OPEN_SOURCE, TOOL_TAGS.FREE],
    supported_os: ['linux'], // Linux-only
    supports_controls: {
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Network boundary protection and packet filtering'
      },
      'AC-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Information flow enforcement through network rules and NAT'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'Logging of network events and rule matches'
      }
    },
    platforms: ['Linux'],
    integration_complexity: 'High',
    deployment_time: '2-3 weeks'
  },

  'pfSense': {
    id: 'pfsense',
    name: 'pfSense',
    category: TOOL_CATEGORIES.NETWORK,
    description: 'Open source firewall and router platform based on FreeBSD',
    vendor: 'Netgate',
    website: 'https://www.pfsense.org/',
    tags: [TOOL_TAGS.OPEN_SOURCE, TOOL_TAGS.FREE],
    supported_os: ['other'], // FreeBSD-based
    supports_controls: {
      'SC-7': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Comprehensive network boundary protection and traffic management'
      },
      'AC-4': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Advanced information flow enforcement with VPN and routing capabilities'
      },
      'AU-2': {
        strength: CONTROL_MATCH_STRENGTH.STRONG,
        explanation: 'Detailed logging and monitoring of network activities'
      },
      'SC-8': {
        strength: CONTROL_MATCH_STRENGTH.PARTIAL,
        explanation: 'VPN capabilities for secure transmission protection'
      }
    },
    platforms: ['FreeBSD', 'x86 Hardware'],
    integration_complexity: 'Medium',
    deployment_time: '1-2 weeks'
  }
};

// Helper functions for tool mapping operations
export const getAllTools = () => {
  return Object.values(TOOL_MAPPINGS);
};

export const getToolsByCategory = (category) => {
  return Object.values(TOOL_MAPPINGS).filter(tool => tool.category === category);
};

export const getToolsForControl = (controlId) => {
  const tools = [];
  Object.values(TOOL_MAPPINGS).forEach(tool => {
    if (tool.supports_controls[controlId]) {
      tools.push({
        ...tool,
        controlMatch: tool.supports_controls[controlId]
      });
    }
  });
  return tools.sort((a, b) => {
    // Sort by match strength: strong > partial > supportive
    const strengthOrder = { strong: 3, partial: 2, supportive: 1 };
    return strengthOrder[b.controlMatch.strength] - strengthOrder[a.controlMatch.strength];
  });
};

export const getControlsForTools = (toolIds) => {
  const controlMap = new Map();
  
  toolIds.forEach(toolId => {
    const tool = TOOL_MAPPINGS[toolId];
    if (tool) {
      Object.entries(tool.supports_controls).forEach(([controlId, matchInfo]) => {
        if (!controlMap.has(controlId)) {
          controlMap.set(controlId, {
            controlId,
            tools: [],
            strongestMatch: 'supportive'
          });
        }
        
        const controlInfo = controlMap.get(controlId);
        controlInfo.tools.push({
          tool: tool,
          matchInfo: matchInfo
        });
        
        // Update strongest match
        const strengthOrder = { strong: 3, partial: 2, supportive: 1 };
        if (strengthOrder[matchInfo.strength] > strengthOrder[controlInfo.strongestMatch]) {
          controlInfo.strongestMatch = matchInfo.strength;
        }
      });
    }
  });
  
  return Array.from(controlMap.values());
};

export const getToolGaps = (toolIds, requiredControls = []) => {
  const coveredControls = new Set();
  
  toolIds.forEach(toolId => {
    const tool = TOOL_MAPPINGS[toolId];
    if (tool) {
      Object.keys(tool.supports_controls).forEach(controlId => {
        coveredControls.add(controlId);
      });
    }
  });
  
  if (requiredControls.length === 0) {
    // Return all NIST 800-53 controls not covered
    // This would be populated from your existing controls data
    return [];
  }
  
  return requiredControls.filter(controlId => !coveredControls.has(controlId));
};

export const searchTools = (query) => {
  const lowerQuery = query.toLowerCase();
  return Object.values(TOOL_MAPPINGS).filter(tool => 
    tool.name.toLowerCase().includes(lowerQuery) ||
    tool.description.toLowerCase().includes(lowerQuery) ||
    tool.category.toLowerCase().includes(lowerQuery) ||
    tool.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}; 