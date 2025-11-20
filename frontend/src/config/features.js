// Feature tier configuration for the NIST Compliance App
// This file defines which features are free vs premium and their routing structure

export const FEATURE_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium'
};

export const DEV_MODE = {
  FREE: 'free',
  PREMIUM: 'premium',
  ALL: 'all' // Current default - shows all features
};

// Development mode settings
export const DEV_AUTO_POPULATE = {
  ENABLED: process.env.NODE_ENV === 'development', // Auto-enable in dev mode
  CONTROLS: true, // Auto-populate control selection
  FORMS: true, // Auto-populate form fields
  REPORTS: true, // Auto-populate report data
  TRACKER: true, // Auto-populate tracker data
  POAM: true, // Auto-populate POAM data
  PLAYBOOKS: true // Auto-populate playbook data
};

// Sample data for auto-population in development mode
export const DEV_SAMPLE_DATA = {
  // Sample controls for selection
  SELECTED_CONTROLS: [
    'AC-2', 'AC-3', 'AC-17', 'AU-2', 'AU-12', 'SC-28', 'SI-4', 'IA-2', 'CM-6', 'CP-9'
  ],
  
  // Sample form data
  FORM_DATA: {
    systemName: 'Sample Security System',
    systemOwner: 'John Smith',
    systemDescription: 'A sample system for testing compliance reporting and documentation generation.',
    organizationName: 'ACME Corporation',
    contactEmail: 'compliance@acme.com',
    assessmentDate: '2024-06-22',
    complianceFramework: 'NIST 800-53',
    riskLevel: 'Moderate',
    operatingSystem: 'ubuntu_20_04',
    environment: 'Production',
    classification: 'Confidential'
  },
  
  // Sample report data
  REPORT_DATA: {
    title: 'Sample Compliance Report',
    subtitle: 'NIST 800-53 Implementation Assessment',
    executiveSummary: 'This report provides a comprehensive assessment of the current compliance posture for the Sample Security System against NIST 800-53 controls.',
    findings: [
      {
        control: 'AC-2',
        status: 'Implemented',
        finding: 'Account management controls are properly implemented with automated provisioning.',
        recommendation: 'Continue monitoring account lifecycle processes.'
      },
      {
        control: 'AC-3',
        status: 'Partially Implemented',
        finding: 'Access enforcement is implemented but lacks fine-grained controls.',
        recommendation: 'Implement role-based access control with attribute-based policies.'
      },
      {
        control: 'AU-2',
        status: 'Not Implemented',
        finding: 'Audit events are not comprehensively defined.',
        recommendation: 'Develop comprehensive audit event matrix and implement logging.'
      }
    ]
  },
  
  // Sample tracker data
  TRACKER_DATA: {
    controls: [
      {
        id: 'AC-2',
        name: 'Account Management',
        status: 'Implemented',
        priority: 'High',
        assignee: 'Security Team',
        dueDate: '2024-03-15',
        progress: 100,
        notes: 'Automated account provisioning system deployed'
      },
      {
        id: 'AC-3',
        name: 'Access Enforcement',
        status: 'In Progress',
        priority: 'High',
        assignee: 'IAM Team',
        dueDate: '2024-04-01',
        progress: 75,
        notes: 'RBAC implementation 75% complete'
      },
      {
        id: 'AU-2',
        name: 'Audit Events',
        status: 'Not Started',
        priority: 'Medium',
        assignee: 'Logging Team',
        dueDate: '2024-05-01',
        progress: 0,
        notes: 'Pending audit event matrix development'
      }
    ]
  },
  
  // Sample POAM data
  POAM_DATA: {
    weaknesses: [
      {
        id: 'WEAK-001',
        description: 'Insufficient access controls for privileged accounts',
        source: 'Internal Assessment',
        control: 'AC-3',
        severity: 'High',
        likelihood: 'Medium',
        impact: 'High',
        riskRating: 'High',
        status: 'Open',
        plannedCompletionDate: '2024-04-15',
        resources: '$50,000',
        mitigationSteps: [
          'Implement privileged access management solution',
          'Develop access control policies',
          'Conduct user access review'
        ]
      },
      {
        id: 'WEAK-002',
        description: 'Incomplete audit logging configuration',
        source: 'Vulnerability Scan',
        control: 'AU-2',
        severity: 'Medium',
        likelihood: 'High',
        impact: 'Medium',
        riskRating: 'Medium',
        status: 'In Progress',
        plannedCompletionDate: '2024-03-30',
        resources: '$25,000',
        mitigationSteps: [
          'Configure comprehensive audit logging',
          'Implement log monitoring tools',
          'Establish log retention policies'
        ]
      }
    ]
  }
};

// Current development mode - set to 'free' for initial rollout
export const CURRENT_DEV_MODE = DEV_MODE.FREE;

// Feature definitions with tier classification
export const FEATURES = {
  // 🔓 FREE TIER FEATURES (Public Access)
  // Focus: Research and understanding NIST 800-53, STIG, and FedRAMP controls
  'landing': {
    id: 'landing',
    name: 'Landing Page',
    tier: FEATURE_TIERS.FREE,
    path: '/',
    category: 'core',
    description: 'Main landing page with feature overview and control research tools'
  },
  'home': {
    id: 'home',
    name: 'Dashboard',
    tier: FEATURE_TIERS.FREE,
    path: '/dashboard',
    category: 'core',
    description: 'Free dashboard with control research and exploration tools'
  },
  'search': {
    id: 'search',
    name: 'Control Search',
    tier: FEATURE_TIERS.FREE,
    path: '/search',
    category: 'research',
    description: 'Search and browse NIST 800-53, STIG, and FedRAMP controls'
  },
  'control-explorer': {
    id: 'control-explorer',
    name: 'Control Explorer',
    tier: FEATURE_TIERS.FREE,
    path: '/controls',
    category: 'research',
    description: 'Searchable control explorer with clean UX, AI explanations, and domain tags'
  },
  'control-details': {
    id: 'control-details',
    name: 'Control Details',
    tier: FEATURE_TIERS.FREE,
    path: '/controls/:id',
    category: 'research',
    description: 'Detailed control view with AI-powered plain-English explanations'
  },
  'spud-ai-basic': {
    id: 'spud-ai-basic',
    name: 'AI Control Assistant (Basic)',
    tier: FEATURE_TIERS.FREE,
    path: '/ai-assistant',
    category: 'ai',
    description: 'AI-powered plain-English explanations of controls (limited usage)',
    freeUsageLimit: 3 // Allow 3 free AI explanations
  },
  'tool-mapper': {
    id: 'tool-mapper',
    name: 'Tool Mapper',
    tier: FEATURE_TIERS.FREE,
    path: '/tool-mapper',
    category: 'research',
    description: 'Bi-directional tool mapping to discover controls satisfied by security tools'
  },

  // 🔐 PREMIUM TIER FEATURES (Subscription Access)
  // Focus: Advanced compliance tools, automation, and project management
  'rmf-tracker': {
    id: 'rmf-tracker',
    name: 'RMF Tracker',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/rmf-tracker',
    category: 'management',
    description: 'Risk Management Framework implementation tracking',
    proFeature: true,
    userRoles: ['solo', 'team', 'admin', 'auditor']
  },
  'poam-generator': {
    id: 'poam-generator',
    name: 'Auto POA&M Generator',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/poam-generator',
    category: 'automation',
    description: 'Automated Plan of Action & Milestones generation',
    proFeature: true,
    userRoles: ['solo', 'team', 'admin', 'auditor']
  },
  'ansible-stig-generator': {
    id: 'ansible-stig-generator',
    name: 'STIG Ansible Generator',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/ansible-stig',
    category: 'automation',
    description: 'STIG-based Ansible script generation for automated compliance',
    proFeature: true,
    userRoles: ['solo', 'team', 'admin']
  },
  'control-bundle-export': {
    id: 'control-bundle-export',
    name: 'Control Bundle Export',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/control-export',
    category: 'export',
    description: 'Export custom control bundles in various formats',
    proFeature: true,
    userRoles: ['solo', 'team', 'admin', 'auditor']
  },
  'ssp-rmf-builder': {
    id: 'ssp-rmf-builder',
    name: 'SSP/RMF Document Builder',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/document-builder',
    category: 'documentation',
    description: 'System Security Plan and RMF documentation builder (PDF/Word)',
    proFeature: true,
    userRoles: ['team', 'admin', 'auditor']
  },
  'compliance-calendar': {
    id: 'compliance-calendar',
    name: 'Compliance Calendar',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/calendar',
    category: 'management',
    description: 'Compliance calendar with alerts and milestone tracking',
    proFeature: true,
    userRoles: ['solo', 'team', 'admin', 'auditor']
  },
  'scap-storage-analysis': {
    id: 'scap-storage-analysis',
    name: 'Secure SCAP Analysis',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/scap-analysis',
    category: 'scanning',
    description: 'Secure SCAP file storage and comprehensive analysis',
    proFeature: true,
    userRoles: ['solo', 'team', 'admin', 'auditor']
  },
  'compliance-projects': {
    id: 'compliance-projects',
    name: 'Compliance Projects',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/projects',
    category: 'management',
    description: 'Save and revisit compliance projects with team collaboration',
    proFeature: true,
    userRoles: ['solo', 'team', 'admin', 'auditor']
  },
  'spud-ai-pro': {
    id: 'spud-ai-pro',
    name: 'Spud AI Pro',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/ai-chat',
    category: 'ai',
    description: 'Advanced AI-powered compliance assistance with unlimited usage',
    proFeature: true,
    userRoles: ['solo', 'team', 'admin', 'auditor']
  },
  'team-dashboard': {
    id: 'team-dashboard',
    name: 'Team Dashboard',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/team',
    category: 'management',
    description: 'Dashboard-driven experience for premium team collaboration',
    proFeature: true,
    userRoles: ['team', 'admin', 'auditor']
  },

  // Legacy features (keeping for backward compatibility)
  'tracker': {
    id: 'tracker',
    name: 'Implementation Tracker',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/tracker',
    category: 'management',
    description: 'Legacy implementation tracker (use RMF Tracker instead)',
    proFeature: true,
    deprecated: true
  },
  'playbook-generator': {
    id: 'playbook-generator',
    name: 'Playbook Generator',
    tier: FEATURE_TIERS.PREMIUM,
    path: '/pro/playbooks',
    category: 'automation',
    description: 'Legacy playbook generator (use STIG Ansible Generator instead)',
    proFeature: true,
    deprecated: true
  }
};

// User roles for premium features
export const USER_ROLES = {
  SOLO: 'solo',        // Individual user
  TEAM: 'team',        // Team member
  ADMIN: 'admin',      // Team administrator
  AUDITOR: 'auditor'   // Compliance auditor
};

// Usage limits for free tier
export const FREE_TIER_LIMITS = {
  AI_EXPLANATIONS: 3,  // Free AI control explanations per session
  CONTROL_LOOKUPS: 10, // Free control detail views per session
  SEARCH_QUERIES: 20   // Free search queries per session
};

// Helper functions
export const getFeaturesByTier = (tier) => {
  return Object.values(FEATURES).filter(feature => 
    feature.tier === tier && !feature.deprecated
  );
};

export const getFreeFeatures = () => getFeaturesByTier(FEATURE_TIERS.FREE);
export const getPremiumFeatures = () => getFeaturesByTier(FEATURE_TIERS.PREMIUM);

export const isFeaturePremium = (featureId) => {
  const feature = FEATURES[featureId];
  return feature && feature.tier === FEATURE_TIERS.PREMIUM;
};

export const isFeatureAccessible = (featureId, userTier = 'free', userRole = null) => {
  // For now, all features are accessible regardless of tier (dev mode)
  if (CURRENT_DEV_MODE === DEV_MODE.ALL) {
    return true;
  }
  
  const feature = FEATURES[featureId];
  if (!feature || feature.deprecated) return false;
  
  // Free tier users can only access free features
  if (userTier === 'free') {
    return feature.tier === FEATURE_TIERS.FREE;
  }
  
  // Premium users can access all features, but check role restrictions
  if (feature.userRoles && userRole) {
    return feature.userRoles.includes(userRole);
  }
  
  return true; // Premium mode grants access to everything
};

export const getFeatureConfig = (featureId) => {
  return FEATURES[featureId] || null;
};

export const shouldShowUpgradeCTA = (featureId) => {
  const feature = FEATURES[featureId];
  return feature && feature.tier === FEATURE_TIERS.PREMIUM;
};

export const getUpgradeMessage = (featureId) => {
  const feature = FEATURES[featureId];
  if (!feature || feature.tier === FEATURE_TIERS.FREE) return null;
  
  return `Unlock ${feature.name} with Spud Pro. Get advanced compliance tools, automation, and unlimited AI assistance.`;
};

// Categories for organizing features
export const FEATURE_CATEGORIES = {
  core: 'Core Features',
  research: 'Control Research',
  ai: 'AI Assistant',
  management: 'Project Management',
  automation: 'Automation Tools',
  documentation: 'Documentation',
  scanning: 'Security Scanning',
  export: 'Export & Reporting',
  reporting: 'Compliance Reports'
};

export const getFeaturesByCategory = (category) => {
  return Object.values(FEATURES).filter(feature => 
    feature.category === category && !feature.deprecated
  );
};

// Authentication configuration suggestions
export const AUTH_CONFIG = {
  providers: ['google', 'microsoft', 'email'],
  requireEmailVerification: true,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  selfHostingFlag: 'DISABLE_BILLING', // Environment flag to disable billing for demos
};

export default FEATURES; 