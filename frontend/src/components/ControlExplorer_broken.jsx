import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BookOpenIcon,
  CogIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  StarIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CloudIcon,
  ComputerDesktopIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  StarIcon as StarIconSolid,
  HeartIcon as HeartIconSolid
} from '@heroicons/react/24/solid';
import { useLocation } from 'react-router-dom';

// Custom hook for debounced search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for cycling placeholder text
function useCyclingPlaceholder() {
  const placeholders = [
    "Search controls by ID, name, or description...",
    "Try searching for 'access control' or 'encryption'...",
    "Find controls by typing 'AC-2' or 'authentication'...",
    "Search for 'audit' or 'monitoring' controls...",
    "Look up 'incident response' or 'backup' controls..."
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return placeholders[currentIndex];
}

// Demo enhancements for a few controls (same as ControlDetails)
const enhancements = {
  'AC-2': [
    {
      id: 'AC-2(1)',
      title: 'Automated Account Management',
      plain_english: 'Use automated tools to manage and review accounts.',
      implementation_tip: 'Deploy scripts or IAM tools to detect and disable unused accounts.',
      ansible_script: `---\n- name: Automated account review\n  hosts: all\n  tasks:\n    - name: List all users\n      command: getent passwd\n`,
      windows_script: `# PowerShell\nGet-LocalUser | Where-Object { $_.Enabled -eq $true }`,
      linux_script: `# Bash\ngetent passwd | cut -d: -f1`,
      steps: [
        'Log in to the system as an administrator.',
        'Open the user management tool.',
        'Review all enabled user accounts.',
        'Disable or remove any unauthorized accounts.'
      ]
    },
    {
      id: 'AC-2(2)',
      title: 'Removal of Temporary Accounts',
      plain_english: 'Ensure temporary accounts are removed after use.',
      implementation_tip: 'Set expiration dates for temporary accounts.',
      ansible_script: `---\n- name: Remove temporary accounts\n  hosts: all\n  tasks:\n    - name: Remove tempuser\n      user:\n        name: tempuser\n        state: absent\n`,
      windows_script: `# PowerShell\nRemove-LocalUser -Name tempuser`,
      linux_script: `# Bash\nsudo userdel tempuser`,
      steps: [
        'Identify temporary accounts on the system.',
        'For each temporary account, determine if it is still needed.',
        'Remove accounts that are no longer required.'
      ]
    }
  ],
  'AC-3': [
    {
      id: 'AC-3(1)',
      title: 'Automated Access Enforcement',
      plain_english: 'Automate enforcement of access policies.',
      implementation_tip: 'Use group policies or scripts to enforce permissions.'
    }
  ]
  // ...add more as needed
};

const ControlExplorer = ({ controls, onControlSelect, onGenerateAnsible, onExplainControl, handleDetails }) => {
  // All hooks must be at the top, before any return
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());
  const [selectedClouds, setSelectedClouds] = useState([]);
  const [selectedOS, setSelectedOS] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(new Set());
  const [expandedFamilies, setExpandedFamilies] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [viewMode, setViewMode] = useState('cards');
  const [showFilters, setShowFilters] = useState(false);
  const [explainedControls, setExplainedControls] = useState(new Set());
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandedImplementation, setExpandedImplementation] = useState(new Set());
  const [expandedAnsible, setExpandedAnsible] = useState(new Set());
  const [expandedLearnMore, setExpandedLearnMore] = useState(new Set());
  // Replace openEnhancementBubble and popoverRef with a single string state
  const [expandedEnhancement, setExpandedEnhancement] = useState({}); // { [controlId]: enhancementId }
  const [expandedEnhancementsControl, setExpandedEnhancementsControl] = useState(null);
  const bubbleRef = useRef(null);
  const [implementationTab, setImplementationTab] = useState({}); // { [controlId]: 'Ansible' | 'PowerShell' | 'Bash' }
  const [openEnhancementScript, setOpenEnhancementScript] = useState({}); // { [controlId]: { [enhId]: scriptType|null } }
  const [expandedDescriptions, setExpandedDescriptions] = React.useState({});

  const location = useLocation();
  useEffect(() => {
    if (location.state && location.state.search) {
      setSearchQuery(location.state.search);
    }
  }, [location.state]);

  // Handle outside clicks to close enhancement bubble
  useEffect(() => {
    function handleClickOutside(event) {
      if (Object.keys(expandedEnhancement).length > 0 && !event.target.closest('[data-enhancement-bubble]')) {
        setExpandedEnhancement({});
      }
    }

    if (Object.keys(expandedEnhancement).length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expandedEnhancement]);
  
  const placeholder = useCyclingPlaceholder();

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Debug: Test family colors with hardcoded data
  useEffect(() => {
    const testFamilies = ['AC', 'AU', 'CM', 'IA', 'IR'];
    console.log('🎨 Testing family colors:');
    testFamilies.forEach(family => {
      const styles = getFamilyBorderStyles(family);
      console.log(`${family}:`, styles.borderColorDark);
    });
  }, []);

  // Debug: Log controls data
  useEffect(() => {
    console.log('ControlExplorer received controls:', controls);
    console.log('Controls length:', controls?.length);
    console.log('Controls type:', typeof controls);
    console.log('First control:', controls?.[0]);
  }, [controls]);

  // Load favorites and implementation status from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('nist_favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }

    // Auto-expand first few families on initial load
    if (controls.length > 0) {
      const firstFamilies = [...new Set(controls.slice(0, 20).map(c => c.control_id.split('-')[0]))];
      setExpandedFamilies(new Set(firstFamilies.slice(0, 3)));
    }
  }, [controls]);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites) => {
    localStorage.setItem('nist_favorites', JSON.stringify([...newFavorites]));
  }, []);

  // Helper functions
  const getFamilyName = useCallback((familyId) => {
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
    return familyNames[familyId] || familyId;
  }, []);

  // Get Miami Vice gradient for family
  const getFamilyGradient = useCallback((familyId) => {
    const gradients = {
      'AC': 'from-pink-500 to-purple-600',
      'AT': 'from-blue-500 to-cyan-500',
      'AU': 'from-purple-500 to-indigo-600',
      'CA': 'from-cyan-500 to-teal-500',
      'CM': 'from-teal-500 to-green-500',
      'CP': 'from-green-500 to-emerald-500',
      'IA': 'from-emerald-500 to-blue-500',
      'IR': 'from-red-500 to-pink-500',
      'MA': 'from-yellow-500 to-orange-500',
      'MP': 'from-orange-500 to-red-500',
      'PE': 'from-indigo-500 to-purple-500',
      'PL': 'from-purple-500 to-pink-500',
      'PS': 'from-pink-500 to-rose-500',
      'RA': 'from-rose-500 to-red-500',
      'SA': 'from-blue-500 to-indigo-500',
      'SC': 'from-cyan-500 to-blue-500',
      'SI': 'from-teal-500 to-cyan-500'
    };
    return gradients[familyId] || 'from-gray-500 to-gray-600';
  }, []);

  // Get family-specific border and glow styles
  const getFamilyBorderStyles = useCallback((familyId) => {
    const colorMap = {
      'AC': { 
        primary: '#ec4899', // pink-500
        secondary: '#f9a8d4', // pink-300
        shadow: 'rgba(236, 72, 153, 0.4)'
      },
      'AT': { 
        primary: '#3b82f6', // blue-500
        secondary: '#93c5fd', // blue-300
        shadow: 'rgba(59, 130, 246, 0.4)'
      },
      'AU': { 
        primary: '#8b5cf6', // purple-500
        secondary: '#c4b5fd', // purple-300
        shadow: 'rgba(139, 92, 246, 0.4)'
      },
      'CA': { 
        primary: '#06b6d4', // cyan-500
        secondary: '#67e8f9', // cyan-300
        shadow: 'rgba(6, 182, 212, 0.4)'
      },
      'CM': { 
        primary: '#14b8a6', // teal-500
        secondary: '#5eead4', // teal-300
        shadow: 'rgba(20, 184, 166, 0.4)'
      },
      'CP': { 
        primary: '#22c55e', // green-500
        secondary: '#86efac', // green-300
        shadow: 'rgba(34, 197, 94, 0.4)'
      },
      'IA': { 
        primary: '#10b981', // emerald-500
        secondary: '#6ee7b7', // emerald-300
        shadow: 'rgba(16, 185, 129, 0.4)'
      },
      'IR': { 
        primary: '#ef4444', // red-500
        secondary: '#fca5a5', // red-300
        shadow: 'rgba(239, 68, 68, 0.4)'
      },
      'MA': { 
        primary: '#eab308', // yellow-500
        secondary: '#fde047', // yellow-300
        shadow: 'rgba(234, 179, 8, 0.4)'
      },
      'MP': { 
        primary: '#f97316', // orange-500
        secondary: '#fdba74', // orange-300
        shadow: 'rgba(249, 115, 22, 0.4)'
      },
      'PE': { 
        primary: '#6366f1', // indigo-500
        secondary: '#a5b4fc', // indigo-300
        shadow: 'rgba(99, 102, 241, 0.4)'
      },
      'PL': { 
        primary: '#8b5cf6', // violet-500
        secondary: '#c4b5fd', // violet-300
        shadow: 'rgba(139, 92, 246, 0.4)'
      },
      'PS': { 
        primary: '#f43f5e', // rose-500
        secondary: '#fda4af', // rose-300
        shadow: 'rgba(244, 63, 94, 0.4)'
      },
      'RA': { 
        primary: '#ec4899', // pink-500
        secondary: '#f9a8d4', // pink-300
        shadow: 'rgba(236, 72, 153, 0.4)'
      },
      'SA': { 
        primary: '#0ea5e9', // sky-500
        secondary: '#7dd3fc', // sky-300
        shadow: 'rgba(14, 165, 233, 0.4)'
      },
      'SC': { 
        primary: '#06b6d4', // cyan-500
        secondary: '#67e8f9', // cyan-300
        shadow: 'rgba(6, 182, 212, 0.4)'
      },
      'SI': { 
        primary: '#14b8a6', // teal-500
        secondary: '#5eead4', // teal-300
        shadow: 'rgba(20, 184, 166, 0.4)'
      }
    };
    
    const colors = colorMap[familyId] || {
      primary: '#6b7280', // gray-500
      secondary: '#d1d5db', // gray-300
      shadow: 'rgba(107, 114, 128, 0.4)'
    };
    
    return {
      borderColor: colors.secondary,
      borderColorDark: colors.primary,
      shadowColor: colors.shadow,
      ringColor: colors.shadow,
      gradientFrom: colors.primary,
      gradientTo: colors.secondary
    };
  }, []);

  // Get control status from tracker data
  const getControlStatus = useCallback((controlId) => {
    const tracker = JSON.parse(localStorage.getItem('nist_tracker') || '[]');
    const record = tracker.find(t => t.control_id === controlId);
    return record?.status || 'Not Started';
  }, []);

  // Get control families with counts
  const controlFamilies = useMemo(() => {
    const familyMap = new Map();
    
    controls.forEach(control => {
      const family = control.control_id.split('-')[0];
      if (!familyMap.has(family)) {
        familyMap.set(family, {
          id: family,
          name: getFamilyName(family),
          controls: [],
          count: 0
        });
      }
      
      const familyData = familyMap.get(family);
      familyData.controls.push(control);
      familyData.count++;
    });

    return Array.from(familyMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [controls, getFamilyName]);

  // Filter options with icons
  const filterOptions = {
    clouds: [
      { value: 'AWS', icon: CloudIcon },
      { value: 'Azure', icon: CloudIcon },
      { value: 'GCP', icon: CloudIcon },
      { value: 'Multi-Cloud', icon: CloudIcon }
    ],
    operatingSystems: [
      { value: 'Ubuntu 20.04', icon: ComputerDesktopIcon },
      { value: 'Ubuntu 22.04', icon: ComputerDesktopIcon },
      { value: 'RHEL 8', icon: ComputerDesktopIcon },
      { value: 'Windows Server 2019', icon: ComputerDesktopIcon },
      { value: 'CentOS 7', icon: ComputerDesktopIcon }
    ],
    tools: [
      { value: 'Ansible', icon: WrenchScrewdriverIcon },
      { value: 'Terraform', icon: WrenchScrewdriverIcon },
      { value: 'Chef', icon: WrenchScrewdriverIcon },
      { value: 'Puppet', icon: WrenchScrewdriverIcon },
      { value: 'PowerShell', icon: WrenchScrewdriverIcon }
    ]
  };

  // Calculate implementation stats
  const implementationStats = useMemo(() => {
    const statuses = controls.map(control => getControlStatus(control.control_id));
    const implemented = statuses.filter(status => status === 'Implemented').length;
    const total = statuses.length;
    return { implemented, total };
  }, [controls, getControlStatus]);

  const progressPercentage = implementationStats.total > 0 
    ? Math.round((implementationStats.implemented / implementationStats.total) * 100) 
    : 0;

  // Filter and search controls
  const filteredControls = useMemo(() => {
    let filtered = controls;

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(control =>
        control.control_id.toLowerCase().includes(query) ||
        control.control_name.toLowerCase().includes(query) ||
        control.description?.toLowerCase().includes(query) ||
        control.plain_english_explanation?.toLowerCase().includes(query) ||
        control.intent?.toLowerCase().includes(query)
      );
    }

    // Apply family filter
    if (selectedFamilies.size > 0) {
      filtered = filtered.filter(control => {
        const family = control.control_id.split('-')[0];
        return selectedFamilies.has(family);
      });
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(control => favorites.has(control.control_id));
    }

    return filtered;
  }, [controls, debouncedSearchQuery, selectedFamilies, favorites, showFavoritesOnly]);

  const toggleFamily = (familyId) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId);
    } else {
      newExpanded.add(familyId);
    }
    setExpandedFamilies(newExpanded);
  };

  const toggleFavorite = (controlId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(controlId)) {
      newFavorites.delete(controlId);
    } else {
      newFavorites.add(controlId);
    }
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const toggleFilter = (filterType, value) => {
    if (filterType === 'families') {
      const newSelectedFamilies = new Set(selectedFamilies);
      if (newSelectedFamilies.has(value)) {
        newSelectedFamilies.delete(value);
      } else {
        newSelectedFamilies.add(value);
      }
      setSelectedFamilies(newSelectedFamilies);
    } else {
      // Handle array-based filters (clouds, OS, tools)
      const setters = {
        clouds: setSelectedClouds,
        operatingSystems: setSelectedOS,
        tools: setSelectedTools
      };

      const getters = {
        clouds: selectedClouds,
        operatingSystems: selectedOS,
        tools: selectedTools
      };

      const setter = setters[filterType];
      const current = getters[filterType];

      if (current.includes(value)) {
        setter(current.filter(item => item !== value));
      } else {
        setter([...current, value]);
      }
    }
  };

  const clearAllFilters = () => {
    setSelectedFamilies(new Set());
    setSelectedClouds([]);
    setSelectedOS([]);
    setSelectedTools([]);
    setSearchQuery('');
  };

  const toggleExplanation = (controlId) => {
    const newExplainedControls = new Set(explainedControls);
    if (newExplainedControls.has(controlId)) {
      newExplainedControls.delete(controlId);
    } else {
      newExplainedControls.add(controlId);
    }
    setExplainedControls(newExplainedControls);
  };

  // Demo implementation checklists for a few controls
  const implementationChecklists = {
    'AC-2': [
      'Establish and document account management procedures.',
      'Assign account management responsibilities.',
      'Review accounts at least annually.',
      'Disable accounts when no longer needed.'
    ],
    'AC-3': [
      'Define access enforcement policies.',
      'Configure system to enforce access controls.',
      'Test access enforcement regularly.'
    ],
    'AU-2': [
      'Identify auditable events.',
      'Configure system to audit required events.',
      'Review audit logs regularly.'
    ]
    // Add more as needed
  };

  // Scripts are now loaded from control data directly

  // Demo rationale and examples for a few controls
  const controlRationale = {
    'AC-2': 'Proper account management reduces the risk of unauthorized access and helps maintain audit trails.',
    'AC-3': 'Access enforcement ensures only authorized users can access sensitive resources.',
    'AU-2': 'Auditing key events helps detect and respond to security incidents.'
  };
  const controlExamples = {
    'AC-2': [
      'Disabling accounts of former employees immediately after departure.',
      'Reviewing all user accounts quarterly.'
    ],
    'AC-3': [
      'Restricting access to financial records to only the finance team.',
      'Using file permissions to prevent unauthorized data modification.'
    ],
    'AU-2': [
      'Configuring Windows Event Logs to capture logon events.',
      'Enabling auditd on Linux to track file access.'
    ]
  };

  // Demo platform-specific implementation steps for a few controls
  const platformImplementation = {
    'AC-2': {
      Windows: [
        'Open "Computer Management" > "Local Users and Groups".',
        'Right-click the user and select "Disable".',
        'Or run PowerShell: Disable-LocalUser -Name "olduser1"'
      ],
      Linux: [
        'List users: cut -d: -f1 /etc/passwd',
        'Disable user: sudo usermod -L olduser1'
      ]
    },
    'AC-3': {
      Linux: [
        'Set file permissions: sudo chmod 600 /etc/important.conf',
        'Set owner: sudo chown root:root /etc/important.conf'
      ]
    }
    // Add more as needed
  };

  // Handle script button toggle for implementation
  const handleImplementationToggle = (controlId, scriptType) => {
    setImplementationTab(prev => ({ ...prev, [controlId]: scriptType }));
  };

  // Get scripts for a control from the control data itself
  const getControlScripts = (control) => {
    if (!control.scripts) return null;
    return control.scripts;
  };

  // Export Ansible scripts for all favorited controls
  const handleExportAnsibleScripts = () => {
    const scripts = Array.from(favorites)
      .map(controlId => {
        const control = controls.find(c => c.control_id === controlId);
        const controlScripts = getControlScripts(control);
        if (controlScripts && controlScripts.Ansible) {
          return `# --- ${controlId}: ${control?.control_name || ''} ---\n${controlScripts.Ansible.trim()}\n`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');
    if (!scripts) {
      alert('No Ansible scripts found for your favorites.');
      return;
    }
    const blob = new Blob([scripts], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-favorite-ansible-scripts.yml';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Handler for script button click in enhancement details
  const handleViewScript = (controlId, scriptType) => {
    setExpandedImplementation(prev => {
      const newSet = new Set(prev);
      newSet.add(controlId);
      return newSet;
    });
    setImplementationTab(prev => ({ ...prev, [controlId]: scriptType }));
    // Optionally scroll into view
    setTimeout(() => {
      const el = document.getElementById(`impl-script-${controlId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Handler for script button click in enhancement details
  const handleEnhancementScriptToggle = (controlId, enhancementId, scriptType) => {
    setOpenEnhancementScript(prev => ({
      ...prev,
      [controlId]: {
        ...(prev[controlId] || {}),
        [enhancementId]: prev[controlId]?.[enhancementId] === scriptType ? null : scriptType
      }
    }));
  };

  // Only after all hooks, check for loading state
  if (!controls || controls.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center transition-colors duration-300">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gradient-to-r from-pink-500 to-cyan-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">🔄 Loading Controls...</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {controls === null ? 'Fetching NIST 800-53 controls from server...' : 'No controls available'}
          </p>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Debug Information:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>Controls received: {controls?.length || 0}</li>
              <li>Controls type: {typeof controls}</li>
              <li>Controls is array: {Array.isArray(controls) ? 'Yes' : 'No'}</li>
              <li>API should be available at: /api/controls</li>
              <li>Current time: {new Date().toLocaleTimeString()}</li>
            </ul>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-900 py-8 px-4">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            NIST Control Explorer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover, explore, and implement NIST 800-53 security controls with ease
          </p>
        </div>

        {/* Modern Search Bar */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-full max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-14 pr-6 py-5 text-lg rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
              placeholder={searchFocused ? "Search controls by ID, name, or description..." : placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              aria-label="Search controls"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-6 py-3 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 shadow-md"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {selectedFamilies.size > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {selectedFamilies.size}
              </span>
            )}
          </button>
        </div>

        {/* Enhanced Filter Chips */}
        {showFilters && (
          <div className="mb-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-600 shadow-lg">
            <div>
              <label className="flex items-center text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                <TagIcon className="h-5 w-5 mr-2 text-purple-500" />
                Filter by Control Family
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {controlFamilies.map(family => (
                  <button
                    key={family.id}
                    onClick={() => toggleFilter('families', family.id)}
                    className={`flex flex-col items-center p-4 rounded-xl text-sm font-medium transition-all duration-300 border-2 group ${
                      selectedFamilies.has(family.id)
                        ? `bg-gradient-to-r ${getFamilyGradient(family.id)} text-white border-transparent shadow-lg transform scale-105`
                        : 'bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full mb-2 bg-gradient-to-r ${getFamilyGradient(family.id)} ${!selectedFamilies.has(family.id) ? 'opacity-70' : ''}`}></span>
                    <span className="font-bold">{family.id}</span>
                    <span className="text-xs opacity-80 mt-1">{family.count}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {(selectedFamilies.size > 0 || searchQuery) && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFamilies.size} filter{selectedFamilies.size !== 1 ? 's' : ''} active
                </span>
                <button
                  onClick={clearAllFilters}
                  className="flex items-center px-4 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-all duration-200 group"
                >
                  <XMarkIcon className="h-4 w-4 mr-1 group-hover:rotate-90 transition-transform duration-200" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {showFavoritesOnly ? 'Favorite Controls' : 'All Controls'}
              </h2>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                {filteredControls.length} results
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  showFavoritesOnly
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700'
                }`}
              >
                <StarIcon className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'text-yellow-600' : 'text-gray-400'}`} />
                Favorites Only
              </button>
              
              {showFavoritesOnly && filteredControls.length > 0 && (
                <button
                  onClick={handleExportAnsibleScripts}
                  className="flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-all duration-200"
                  title="Export all favorited Ansible scripts as YAML"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export Scripts
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Control Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredControls.map(control => {
              const isFavorite = favorites.has(control.control_id);
              const family = control.control_id.split('-')[0];
              const familyColors = getFamilyBorderStyles(family);
              
              return (
                <div
                  key={control.control_id}
                  className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-blue-300 dark:hover:border-blue-500 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)`,
                  }}
                >
                  {/* Gradient accent bar */}
                  <div 
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getFamilyGradient(family)}`}
                  />
                  
                  {/* Card Content */}
                  <div className="p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <span 
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getFamilyGradient(family)} shadow-sm`}
                          >
                            {control.control_id}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                          {control.control_name}
                        </h3>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(control.control_id); }}
                        className="ml-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group-hover:scale-110"
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite ? (
                          <StarIconSolid className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                        ) : (
                          <StarIcon className="h-5 w-5 text-gray-400 dark:text-gray-400 hover:text-yellow-500 transition-colors" />
                        )}
                      </button>
                    </div>
                    
                    {/* Description */}
                    <div className="flex-1 mb-6">
                      {(() => {
                        const desc = control.plain_english_explanation || control.intent || control.plain_english || control.description || 'No plain English explanation available for this control.';
                        const maxChars = 120;
                        const isTruncated = desc.length > maxChars && !expandedDescriptions[control.control_id];
                        return (
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                            {isTruncated ? (
                              <>
                                {desc.slice(0, maxChars).replace(/\s+$/, '')}
                                <button
                                  className="text-blue-600 hover:text-blue-800 ml-1 font-medium"
                                  onClick={() => setExpandedDescriptions(prev => ({ ...prev, [control.control_id]: true }))}
                                >
                                  Read more
                                </button>
                              </>
                            ) : (
                              desc
                            )}
                          </p>
                        );
                      })()}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-auto">
                      <button
                        onClick={e => { e.stopPropagation(); handleDetails(control); }}
                        className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                      >
                        <BookOpenIcon className="h-4 w-4 mr-2" />
                        Details
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const newSet = new Set(expandedImplementation);
                          if (newSet.has(control.control_id)) {
                            newSet.delete(control.control_id);
                          } else {
                            newSet.add(control.control_id);
                          }
                          setExpandedImplementation(newSet);
                        }}
                        className={`flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          expandedImplementation.has(control.control_id)
                            ? `bg-gradient-to-r ${getFamilyGradient(family)} text-white shadow-md`
                            : `bg-gradient-to-r ${getFamilyGradient(family)} bg-opacity-10 text-gray-700 dark:text-gray-300 hover:bg-opacity-20 border border-current border-opacity-20`
                        }`}
                      >
                        <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                        Implement
                      </button>
                    </div>
                  
                  {/* Expanded Sections */}
                  {expandedImplementation.has(control.control_id) && (
                    <div className="px-6 pb-6">
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        {platformImplementation[control.control_id] ? (
                          <PlatformStepsTabs steps={platformImplementation[control.control_id]} />
                        ) : implementationChecklists[control.control_id] ? (
                          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-900 dark:text-blue-100 max-w-prose mx-auto">
                            {implementationChecklists[control.control_id].map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        ) : (control.control_id === 'ac-4' || getControlScripts(control)) ? (
                          <SampleScriptTabs
                            scripts={control.control_id === 'ac-4' ? {
                              Bash: control.bash_script || (control.scripts && control.scripts.Bash),
                              PowerShell: control.powershell_script || (control.scripts && control.scripts.PowerShell),
                              Ansible: (control.scripts && control.scripts.Ansible) || control.ansible_script
                            } : getControlScripts(control)}
                            activeTab={implementationTab[control.control_id]}
                            setActiveTab={tab => setImplementationTab(prev => ({ ...prev, [control.control_id]: tab }))}
                            control={control}
                            forceAllTabs={control.control_id === 'ac-4'}
                          />
                        ) : (
                          <div className="text-sm text-gray-500 italic py-4 text-center">No implementation guidance available for this control yet.</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {expandedLearnMore.has(control.control_id) && (
                    <div className="px-6 pb-6">
                      <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                        <div className="font-semibold text-purple-800 dark:text-purple-200 mb-2">More About This Control</div>
                        {control.intent && (
                          <div className="mb-2">
                            <div className="font-semibold text-xs text-purple-700 dark:text-purple-300">Intent & Purpose</div>
                            <div className="text-sm text-purple-900 dark:text-purple-100">{control.intent}</div>
                          </div>
                        )}
                        {controlRationale[control.control_id] && (
                          <div className="mb-2">
                            <div className="font-semibold text-xs text-purple-700 dark:text-purple-300">Rationale</div>
                            <div className="text-sm text-purple-900 dark:text-purple-100">{controlRationale[control.control_id]}</div>
                          </div>
                        )}
                        {controlExamples[control.control_id] && (
                          <div className="mb-2">
                            <div className="font-semibold text-xs text-purple-700 dark:text-purple-300">Real-World Examples</div>
                            <ul className="list-disc list-inside text-sm text-purple-900 dark:text-purple-100 space-y-1">
                              {controlExamples[control.control_id].map((ex, idx) => (
                                <li key={idx}>{ex}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!control.intent && !controlRationale[control.control_id] && !controlExamples[control.control_id] && (
                          <div className="text-sm text-purple-700 dark:text-purple-300">No additional context available yet for this control.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredControls.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <MagnifyingGlassIcon className="h-10 w-10 text-gray-400 dark:text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">No controls found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {showFavoritesOnly 
                  ? "You haven't favorited any controls yet. Star some controls to see them here!"
                  : "Try adjusting your search terms or filters to find what you're looking for."
                }
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Clear All Filters
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlExplorer;

function SampleScriptTabs({ scripts, activeTab: controlledActiveTab, setActiveTab: setControlledActiveTab, control, forceAllTabs }) {
  // Determine available script types
  let scriptTypes = [];
  // Always show all tabs for AC-3 and AC-4
  if (control.control_id === 'ac-3' || control.control_id === 'ac-4' || forceAllTabs) {
    scriptTypes = ['Linux', 'Windows', 'Ansible'];
  } else {
    if (scripts.Bash) scriptTypes.push('Linux');
    if (scripts.PowerShell) scriptTypes.push('Windows');
    if (Array.isArray(scripts.Ansible) && scripts.Ansible.length > 0) scriptTypes.push('Ansible');
    else if (typeof scripts.Ansible === 'string' && scripts.Ansible.trim()) scriptTypes.push('Ansible');
  }

  const [internalActiveTab, setInternalActiveTab] = React.useState(scriptTypes[0]);
  const activeTab = controlledActiveTab || internalActiveTab;
  const setActiveTab = setControlledActiveTab || setInternalActiveTab;
  const [ansibleExpanded, setAnsibleExpanded] = React.useState(false);

  // Persistent tab selection
  React.useEffect(() => {
    try {
      const savedTab = localStorage.getItem('implTabPref');
      if (savedTab && scriptTypes.includes(savedTab)) {
        setActiveTab(savedTab);
      }
    } catch {}
    // eslint-disable-next-line
  }, []);
  const [showSteps, setShowSteps] = React.useState(false);

  // Helper to extract STIG ID from script yaml/tags
  function extractStigId(script) {
    if (!script) return '';
    const stigMatch = script.match(/(V-\d{6}|WN\d{2}-\d{2}-\d{6}|CCE-\d{5}-\d|DISA-STIG-[A-Z0-9-]+)/i);
    return stigMatch ? stigMatch[0] : '';
  }
  function getActionSummary(title, script) {
    if (control.control_id === 'ac-3') {
      return 'enforces access using Role-Based Access Control (RBAC) via groups (Active Directory on Windows, Unix groups on Linux)';
    }
    if (title && title !== 'Ansible Script') return title;
    if (script) {
      const taskMatch = script.match(/- name: ([^\n]+)/);
      if (taskMatch) return taskMatch[1];
      const commentMatch = script.match(/# ?(.+)/);
      if (commentMatch) return commentMatch[1];
    }
    return 'applies the required configuration';
  }
  const [showWhyWorks, setShowWhyWorks] = React.useState(true);
  function getScriptTags() {
    const tags = [];
    if (scripts.Bash) tags.push({ label: 'Bash', icon: <span className="inline-block bg-gray-800 text-white px-2 py-0.5 rounded text-xs font-semibold ml-2 first:ml-0">Bash</span> });
    if (scripts.PowerShell) tags.push({ label: 'PowerShell', icon: <span className="inline-block bg-blue-800 text-white px-2 py-0.5 rounded text-xs font-semibold ml-2 first:ml-0">PowerShell</span> });
    if (scripts.Ansible) tags.push({ label: 'Ansible', icon: <span className="inline-block bg-green-700 text-white px-2 py-0.5 rounded text-xs font-semibold ml-2 first:ml-0">Ansible</span> });
    return tags;
  }
  function getStigPill(script) {
    const stig = extractStigId(script);
    if (!stig) return null;
    return <span className="inline-block bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full text-xs font-semibold ml-1 mt-2">{stig}</span>;
  }

  // Demo manual steps (replace with real data if available)
  const manualSteps = {
    Linux: control.control_id === 'ac-4' ? [
      'Open a terminal and edit /etc/ssh/sshd_config as root.',
      'Set PermitRootLogin to no and save the file.',
      'Restart SSH: sudo systemctl restart sshd.',
    ] : control.control_id === 'ac-3' ? [
      'Open a terminal.',
      'Create a group for the role: sudo groupadd <role>',
      'Add users to the group: sudo usermod -aG <role> <username>',
      'Set permissions on resources for the group: sudo chown :<role> /path/to/resource && sudo chmod 770 /path/to/resource',
    ] : null,
    Windows: control.control_id === 'ac-4' ? [
      'Open Computer Management and go to Local Users and Groups > Users.',
      'Right-click Administrator, select Properties, and check Account is disabled.',
      'Open Local Security Policy, go to Security Options, and set Administrator account status to Disabled.',
    ] : control.control_id === 'ac-3' ? [
      'Open Active Directory Users and Computers.',
      'Create or select a security group for the role.',
      'Add users to the group as needed.',
      'Set permissions on resources for that group.',
    ] : null,
  };

  // --- UI Polishing ---
  return (
    <div className="mt-6 w-full">
      <hr className="mt-6 mb-4 border-t border-gray-200 dark:border-gray-700" />
      <div className="flex items-center justify-center mb-1 pt-1 pb-1">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight text-center w-full">Implementation Guidance</h2>
      </div>
      {control.control_id === 'ac-3' && (
        <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-3 py-0.5 font-medium inline-block mb-2">Role-Based Access Control</span>
      )}
      {control.control_id === 'ac-4' && (
        <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-3 py-0.5 font-medium inline-block mb-2">Script-Based Implementation</span>
      )}
      <div className="flex flex-row justify-center items-center gap-1 mb-1">
          {scriptTypes.map((type) => (
            <button
              key={type}
              onClick={() => { setActiveTab(type); try { localStorage.setItem('implTabPref', type); } catch {} }}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-150 text-xs
                ${activeTab === type
                  ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-sm'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-blue-50'}
              `}
              style={{ minWidth: 70 }}
            >
              {type}
            </button>
          ))}
        </div>
        <div>
          {(scriptTypes.length > 1) ? (
            <button
              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded transition-all mb-1"
              aria-expanded={showWhyWorks}
              onClick={() => setShowWhyWorks(v => !v)}
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${showWhyWorks ? '' : '-rotate-90'}`} />
              Why This Implementation Works
            </button>
          ) : (
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Why This Implementation Works</div>
          )}
          {showWhyWorks && (
            <div className="p-2.5 mt-1 text-sm text-gray-700 dark:text-gray-300 max-w-xs mx-auto text-center">
              {(() => {
                if (control.control_id === 'ac-3') {
                  return (
                    <span>
                      Role-Based Access Control (RBAC) ensures that only authorized users can access specific resources based on their assigned roles or groups. By managing permissions through groups (Active Directory on Windows, Unix groups on Linux), organizations can efficiently enforce least privilege and reduce the risk of unauthorized access.
                    </span>
                  );
                }
                if (control.control_id === 'ac-4') {
                  return (
                    <span>
                      This script automates the configuration required to meet the control, reducing manual errors and ensuring consistent enforcement across systems.
                    </span>
                  );
                }
                const scriptType = activeTab;
                const NIST_control = control.control_id;
                let script = null, title = '', recommended = null;
                if (activeTab === 'Ansible' && Array.isArray(scripts.Ansible)) {
                  recommended = scripts.Ansible.find(s => s.recommended) || scripts.Ansible[0];
                  script = recommended?.yaml;
                  title = recommended?.title;
                } else if (activeTab === 'Ansible') {
                  script = scripts.Ansible;
                  title = 'Ansible Script';
                } else if (activeTab === 'Linux') {
                  script = scripts.Bash;
                  title = 'Bash Script';
                } else if (activeTab === 'Windows') {
                  script = scripts.PowerShell;
                  title = 'PowerShell Script';
                }
                const STIG_id = extractStigId(script);
                const action_summary = getActionSummary(title, script);
                let scriptTypeLabel = '';
                if (activeTab === 'Linux') scriptTypeLabel = 'Bash script';
                else if (activeTab === 'Windows') scriptTypeLabel = 'PowerShell script';
                else if (activeTab === 'Ansible') scriptTypeLabel = 'Ansible script';
                return (
                  <span>
                    This {scriptTypeLabel} {action_summary} for NIST control {NIST_control}{STIG_id ? ` (STIG ID: ${STIG_id})` : ''}.
                  </span>
                );
              })()}
            </div>
          )}
        </div>
        {/* Manual Steps for Linux/Windows (AC-4 and AC-3 only) - Collapsible */}
        {(['ac-4', 'ac-3'].includes(control.control_id)) && (activeTab === 'Linux' || activeTab === 'Windows') && manualSteps[activeTab] && (
          <div className="mt-2">
            <button
              className="text-xs text-indigo-700 dark:text-indigo-300 font-medium underline mb-1"
              onClick={() => setShowSteps(prev => !prev)}
              aria-expanded={showSteps}
            >
              {showSteps ? 'Hide steps' : 'Show implementation steps'}
            </button>
            {showSteps && (
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-800 dark:text-gray-200 max-w-xs mx-auto mb-2 mt-1">
                {manualSteps[activeTab].map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}
    </div>
  );
}

function PlatformStepsTabs({ steps }) {
  const platforms = Object.keys(steps);
  const [activeTab, setActiveTab] = React.useState(platforms[0]);
  if (platforms.length === 1) {
    return (
      <div>
        <div className="font-semibold text-xs text-blue-700 dark:text-blue-300 mb-1">{platforms[0]}</div>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-900 dark:text-blue-100">
          {steps[platforms[0]].map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div>
      <div className="flex space-x-2 mb-2">
        {platforms.map(platform => (
          <button
            key={platform}
            onClick={() => setActiveTab(platform)}
            className={`px-3 py-1 text-xs font-medium rounded-t border-b-2 transition-all duration-200 ${
              activeTab === platform
                ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/10'
            }`}
          >
            {platform}
          </button>
        ))}
      </div>
      <ol className="list-decimal list-inside space-y-1 text-sm text-blue-900 dark:text-blue-100">
        {steps[activeTab].map((step, idx) => (
          <li key={idx}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function CopyAnsibleButton({ script, label, floating }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  if (floating) {
    return (
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 active:bg-gray-500 transition text-sm font-medium text-white shadow focus:outline-none focus:ring-2 focus:ring-blue-400`}
        style={{ minWidth: 70 }}
        title={`Copy ${label} script to clipboard`}
      >
        <ClipboardIcon className="h-4 w-4" />
        {copied ? 'Copied!' : 'Copy'}
      </button>
    );
  }
  // Default/legacy style
  return (
    <button
      onClick={handleCopy}
      className="flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200"
      title={`Copy ${label} script to clipboard`}
      style={{ minWidth: 80, height: 32 }}
    >
      {copied ? (
        <>
          <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <ClipboardIcon className="h-4 w-4 mr-1 text-gray-400" />
          Copy
        </>
      )}
    </button>
  );
}