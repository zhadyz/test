import React, { useState } from 'react';
import { useSystem } from '../contexts/SystemContext';
import { 
  ChevronDownIcon, 
  PlusIcon, 
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  ServerIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const SystemSelector = ({ onCreateSystem }) => {
  const { currentSystem, systems, selectSystem, loading } = useSystem();
  const [isOpen, setIsOpen] = useState(false);

  const getSystemIcon = (tags) => {
    if (tags.includes('web') || tags.includes('website')) return ComputerDesktopIcon;
    if (tags.includes('server') || tags.includes('database')) return ServerIcon;
    if (tags.includes('mobile') || tags.includes('app')) return DevicePhoneMobileIcon;
    return BuildingOfficeIcon;
  };

  const getEnvironmentColor = (env) => {
    switch (env) {
      case 'production': return 'bg-red-100 text-red-800';
      case 'staging': return 'bg-yellow-100 text-yellow-800';
      case 'testing': return 'bg-blue-100 text-blue-800';
      case 'development': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
      </div>
    );
  }

  if (systems.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={onCreateSystem}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Create System
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {currentSystem ? (
          <>
            {React.createElement(getSystemIcon(currentSystem.tags), { className: "h-4 w-4 text-blue-600" })}
            <div className="flex flex-col items-start">
              <span className="text-gray-900 font-medium">{currentSystem.name}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(currentSystem.environment)}`}>
                {currentSystem.environment}
              </span>
            </div>
          </>
        ) : (
          <span>Select System</span>
        )}
        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
              Select System
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {systems.map((system) => {
                const IconComponent = getSystemIcon(system.tags);
                const isSelected = currentSystem?.system_id === system.system_id;
                
                return (
                  <button
                    key={system.system_id}
                    onClick={() => {
                      selectSystem(system);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                      isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {system.name}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(system.environment)}`}>
                            {system.environment}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {system.description}
                        </p>
                        {system.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {system.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {tag}
                              </span>
                            ))}
                            {system.tags.length > 3 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                +{system.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="border-t border-gray-200">
              <button
                onClick={() => {
                  onCreateSystem();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-blue-600 hover:bg-blue-50 focus:outline-none focus:bg-blue-50 flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Create New System</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SystemSelector; 