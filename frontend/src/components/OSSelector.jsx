import React, { useState, useEffect } from 'react';
import { 
  ComputerDesktopIcon,
  ServerIcon,
  CubeIcon,
  CloudIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const OSSelector = ({ 
  selectedOS, 
  onOSChange, 
  supportedControls = [], 
  showDetails = true,
  className = ""
}) => {
  const [operatingSystems, setOperatingSystems] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [osStats, setOSStats] = useState({});

  // Enhanced OS information with descriptions and icons
  const osDetails = {
    'ubuntu_20_04': {
      name: 'Ubuntu 20.04 LTS',
      icon: ComputerDesktopIcon,
      color: 'orange',
      description: 'Long Term Support Ubuntu release with extensive security features',
      category: 'Linux Distribution',
      releaseYear: '2020',
      supportLevel: 'Excellent',
      popularity: 'High'
    },
    'ubuntu_22_04': {
      name: 'Ubuntu 22.04 LTS',
      icon: ComputerDesktopIcon,
      color: 'orange',
      description: 'Latest Ubuntu LTS with modern security frameworks and systemd',
      category: 'Linux Distribution',
      releaseYear: '2022',
      supportLevel: 'Excellent',
      popularity: 'Very High'
    },
    'rhel_8': {
      name: 'Red Hat Enterprise Linux 8',
      icon: ServerIcon,
      color: 'red',
      description: 'Enterprise-grade Linux with advanced security and compliance features',
      category: 'Enterprise Linux',
      releaseYear: '2019',
      supportLevel: 'Excellent',
      popularity: 'High'
    },
    'rhel_9': {
      name: 'Red Hat Enterprise Linux 9',
      icon: ServerIcon,
      color: 'red',
      description: 'Latest RHEL with enhanced container support and security hardening',
      category: 'Enterprise Linux',
      releaseYear: '2022',
      supportLevel: 'Excellent',
      popularity: 'Growing'
    },
    'centos_7': {
      name: 'CentOS 7',
      icon: ServerIcon,
      color: 'purple',
      description: 'Community-supported enterprise Linux, end-of-life June 2024',
      category: 'Enterprise Linux',
      releaseYear: '2014',
      supportLevel: 'Limited',
      popularity: 'Moderate'
    },
    'centos_8': {
      name: 'CentOS Stream 8',
      icon: ServerIcon,
      color: 'purple',
      description: 'Rolling-release upstream for RHEL, development-focused',
      category: 'Enterprise Linux',
      releaseYear: '2019',
      supportLevel: 'Good',
      popularity: 'Moderate'
    },
    'windows_server_2019': {
      name: 'Windows Server 2019',
      icon: CloudIcon,
      color: 'blue',
      description: 'Microsoft enterprise server OS with advanced security features',
      category: 'Windows Server',
      releaseYear: '2018',
      supportLevel: 'Good',
      popularity: 'High'
    },
    'windows_server_2022': {
      name: 'Windows Server 2022',
      icon: CloudIcon,
      color: 'blue',
      description: 'Latest Windows Server with enhanced hybrid cloud capabilities',
      category: 'Windows Server',
      releaseYear: '2021',
      supportLevel: 'Excellent',
      popularity: 'Growing'
    },
    'debian_11': {
      name: 'Debian 11 (Bullseye)',
      icon: ComputerDesktopIcon,
      color: 'red',
      description: 'Stable, secure, and highly customizable Linux distribution',
      category: 'Linux Distribution',
      releaseYear: '2021',
      supportLevel: 'Good',
      popularity: 'Moderate'
    },
    'suse_15': {
      name: 'SUSE Linux Enterprise 15',
      icon: ServerIcon,
      color: 'green',
      description: 'Enterprise Linux with strong container and cloud support',
      category: 'Enterprise Linux',
      releaseYear: '2018',
      supportLevel: 'Good',
      popularity: 'Moderate'
    }
  };

  useEffect(() => {
    fetchOperatingSystems();
  }, []);

  const fetchOperatingSystems = async () => {
    try {
      const response = await fetch('/api/playbook/operating-systems');
      if (response.ok) {
        const data = await response.json();
        setOperatingSystems(data.operating_systems);
        
        // Fetch stats for each OS
        const statsPromises = data.operating_systems.map(async (os) => {
          try {
            const statsResponse = await fetch(`/api/playbook/supported-controls/${os.value}`);
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              return { [os.value]: statsData };
            }
          } catch (err) {
            console.error(`Error fetching stats for ${os.value}:`, err);
          }
          return { [os.value]: { supported_controls: [], count: 0 } };
        });
        
        const allStats = await Promise.all(statsPromises);
        const combinedStats = allStats.reduce((acc, stat) => ({ ...acc, ...stat }), {});
        setOSStats(combinedStats);
      }
    } catch (err) {
      console.error('Error fetching operating systems:', err);
    }
  };

  const getOSIcon = (osValue) => {
    const details = osDetails[osValue];
    if (!details) return ComputerDesktopIcon;
    return details.icon;
  };

  const getOSColor = (osValue) => {
    const details = osDetails[osValue];
    if (!details) return 'gray';
    return details.color;
  };

  const getColorClasses = (color, variant = 'bg') => {
    const colorMap = {
      'orange': {
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        text: 'text-orange-800 dark:text-orange-300',
        border: 'border-orange-300 dark:border-orange-700',
        ring: 'ring-orange-500 dark:ring-orange-400'
      },
      'red': {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-300',
        border: 'border-red-300 dark:border-red-700',
        ring: 'ring-red-500 dark:ring-red-400'
      },
      'purple': {
        bg: 'bg-purple-100 dark:bg-purple-900/20',
        text: 'text-purple-800 dark:text-purple-300',
        border: 'border-purple-300 dark:border-purple-700',
        ring: 'ring-purple-500 dark:ring-purple-400'
      },
      'blue': {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700',
        ring: 'ring-blue-500 dark:ring-blue-400'
      },
      'green': {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-300 dark:border-green-700',
        ring: 'ring-green-500 dark:ring-green-400'
      },
      'gray': {
        bg: 'bg-gray-100 dark:bg-gray-900/20',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-300 dark:border-gray-700',
        ring: 'ring-gray-500 dark:ring-gray-400'
      }
    };
    
    return colorMap[color] || colorMap['gray'];
  };

  const selectedOSDetails = osDetails[selectedOS];
  const selectedOSStats = osStats[selectedOS];
  const IconComponent = getOSIcon(selectedOS);
  const colorClasses = getColorClasses(getOSColor(selectedOS));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* OS Selector Dropdown */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">
          Operating System *
        </label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full px-4 py-3 text-left border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${colorClasses.border} ${colorClasses.ring} bg-white dark:bg-dark-50 hover:bg-gray-50 dark:hover:bg-dark-100`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
                  <IconComponent className={`h-5 w-5 ${colorClasses.text}`} />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-dark-900">
                    {selectedOSDetails?.name || 'Select Operating System'}
                  </div>
                  {selectedOSDetails && (
                    <div className="text-sm text-gray-500 dark:text-dark-500">
                      {selectedOSDetails.category} • {selectedOSDetails.releaseYear}
                    </div>
                  )}
                </div>
              </div>
              <ChevronDownIcon 
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-dark-50 border border-gray-200 dark:border-dark-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
              {operatingSystems.map((os) => {
                const details = osDetails[os.value];
                const stats = osStats[os.value];
                const OSIcon = getOSIcon(os.value);
                const osColorClasses = getColorClasses(getOSColor(os.value));
                
                return (
                  <button
                    key={os.value}
                    type="button"
                    onClick={() => {
                      onOSChange(os.value);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors duration-200 border-b border-gray-100 dark:border-dark-200 last:border-b-0 ${selectedOS === os.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${osColorClasses.bg}`}>
                          <OSIcon className={`h-5 w-5 ${osColorClasses.text}`} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-dark-900">
                            {details?.name || os.display_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-dark-500">
                            {details?.category} • {details?.supportLevel} Support
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {stats && (
                          <div className="text-sm">
                            <div className="text-gray-600 dark:text-dark-600">
                              {stats.count || 0} templates
                            </div>
                            {selectedOS === os.value && (
                              <CheckCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto mt-1" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* OS Details Panel */}
      {showDetails && selectedOSDetails && (
        <div className={`p-4 rounded-lg border ${colorClasses.bg} ${colorClasses.border}`}>
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-white dark:bg-dark-50 ${colorClasses.border} border`}>
              <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${colorClasses.text}`}>
                {selectedOSDetails.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-dark-600 mt-1">
                {selectedOSDetails.description}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-dark-700">Support Level:</span>
                  <span className={`ml-1 ${colorClasses.text}`}>{selectedOSDetails.supportLevel}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-dark-700">Popularity:</span>
                  <span className={`ml-1 ${colorClasses.text}`}>{selectedOSDetails.popularity}</span>
                </div>
              </div>

              {selectedOSStats && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-300">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-dark-600">Available Templates:</span>
                    <span className={`font-semibold ${colorClasses.text}`}>
                      {selectedOSStats.count || 0} controls supported
                    </span>
                  </div>
                  
                  {selectedOSStats.supported_controls && selectedOSStats.supported_controls.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {selectedOSStats.supported_controls.slice(0, 8).map(control => (
                          <span
                            key={control}
                            className={`inline-block px-2 py-1 text-xs rounded ${colorClasses.bg} ${colorClasses.text}`}
                          >
                            {control}
                          </span>
                        ))}
                        {selectedOSStats.supported_controls.length > 8 && (
                          <span className="text-xs text-gray-500 dark:text-dark-500 px-2 py-1">
                            +{selectedOSStats.supported_controls.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OSSelector; 