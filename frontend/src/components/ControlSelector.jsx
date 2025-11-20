import React, { useState, useEffect, useContext } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { ENHANCED_CONTROLS, CONTROL_DESCRIPTIONS } from '../data/controls';
import { clientSideConflictCheck, detectConflicts } from '../utils/conflictDetection';
import { SystemContext } from '../contexts/SystemContext';

const ControlSelector = ({ 
  selectedControls = [], 
  onControlSelect, 
  onControlRemove, 
  selectedPlatform = 'all',
  className = '',
  onEnhancementBadgeClick,
  selectedEnhancements = {},
  onRemoveEnhancement
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredControls, setFilteredControls] = useState([]);
  const [showAddControls, setShowAddControls] = useState(false);
  const [conflictAnalysis, setConflictAnalysis] = useState({ hasIssues: false });
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const { selectedBaseline } = useContext(SystemContext);

  // Filter controls based on search query and platform
  useEffect(() => {
    let controls = Object.values(ENHANCED_CONTROLS);
    
    // Filter by platform if specified
    if (selectedPlatform !== 'all') {
      controls = controls.filter(control => 
        control.platforms?.includes(selectedPlatform)
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      controls = controls.filter(control =>
        control.id.toLowerCase().includes(query) ||
        control.title.toLowerCase().includes(query) ||
        control.family.toLowerCase().includes(query) ||
        control.description.toLowerCase().includes(query)
      );
    }
    
    // Exclude already selected controls
    controls = controls.filter(control => 
      !selectedControls.includes(control.id)
    );
    
    setFilteredControls(controls);
  }, [searchQuery, selectedPlatform, selectedControls]);

  // Update conflict analysis when selected controls change
  useEffect(() => {
    if (selectedControls.length > 0) {
      const analysis = detectConflicts(selectedControls);
      setConflictAnalysis(analysis);
    } else {
      setConflictAnalysis({ hasIssues: false });
    }
  }, [selectedControls]);

  const handleControlAdd = (controlId) => {
    // Check for conflicts before adding
    const conflictCheck = clientSideConflictCheck(selectedControls, controlId);
    
    if (conflictCheck.hasConflicts) {
      // Show warning but allow addition
      console.warn('Control conflicts detected:', conflictCheck);
    }
    
    onControlSelect(controlId);
  };

  const getControlFamilyColor = (family) => {
    const familyColors = {
      'Access Control': 'bg-blue-100 text-blue-800 border-blue-200',
      'Audit and Accountability': 'bg-green-100 text-green-800 border-green-200',
      'System and Communications Protection': 'bg-purple-100 text-purple-800 border-purple-200',
      'Configuration Management': 'bg-orange-100 text-orange-800 border-orange-200',
      'Identification and Authentication': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Incident Response': 'bg-red-100 text-red-800 border-red-200',
      'Physical and Environmental Protection': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Risk Assessment': 'bg-pink-100 text-pink-800 border-pink-200',
      'System and Information Integrity': 'bg-teal-100 text-teal-800 border-teal-200'
    };
    return familyColors[family] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Helper to toggle expanded state
  const toggleDescription = (controlId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [controlId]: !prev[controlId]
    }));
  };

  // Helper function to get enhancement info for a control
  const getEnhancementInfo = (control) => {
    if (!control.enhancements || control.enhancements.length === 0) {
      return null;
    }

    const requiredEnhancements = control.enhancements.filter(enhancement =>
      enhancement.required_for?.includes(selectedBaseline)
    );

    return {
      total: control.enhancements.length,
      required: requiredEnhancements.length,
      hasRequired: requiredEnhancements.length > 0
    };
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Selected Controls ({selectedControls.length})
          </h3>
          <button
            onClick={() => setShowAddControls(!showAddControls)}
            className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Controls
          </button>
        </div>

        {/* Conflict Summary */}
        {conflictAnalysis.hasIssues && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <div className="text-sm">
                <span className="font-medium text-yellow-800 dark:text-yellow-200">
                  {conflictAnalysis.summary.totalIssues} potential issues detected
                </span>
                <span className="text-yellow-600 dark:text-yellow-300 ml-2">
                  ({conflictAnalysis.summary.highSeverity} high, {conflictAnalysis.summary.mediumSeverity} medium, {conflictAnalysis.summary.lowSeverity} low)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Controls List */}
        {selectedControls.length > 0 ? (
          <div className="space-y-2 mb-4">
            {selectedControls.map(controlId => {
              const control = ENHANCED_CONTROLS[controlId];
              if (!control) return null;

              return (
                <div
                  key={controlId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {control.id}
                      </span>
                      {(() => {
                        const enhancementInfo = getEnhancementInfo(control);
                        if (enhancementInfo) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onEnhancementBadgeClick) {
                                  onEnhancementBadgeClick(control.id);
                                }
                              }}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium hover:scale-105 transition-transform ${
                                enhancementInfo.hasRequired 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                              }`}
                              title={`Click to select enhancements: ${enhancementInfo.total} total (${enhancementInfo.required} required for ${selectedBaseline})`}
                            >
                              +{enhancementInfo.total}
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getControlFamilyColor(control.family)}`}>
                        {control.family}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(control.priority)}`}>
                        {control.priority}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {control.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(() => {
                        const desc = control.description || '';
                        const isLong = desc.length > 120;
                        const isExpanded = expandedDescriptions[control.id];
                        if (!isLong) return desc;
                        if (isExpanded) {
                          return <>
                            {desc} <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={e => { e.stopPropagation(); toggleDescription(control.id); }}>see less</button>
                          </>;
                        }
                        return <>
                          {desc.slice(0, 120)}... <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={e => { e.stopPropagation(); toggleDescription(control.id); }}>see more</button>
                        </>;
                      })()}
                    </p>
                    
                    {/* Selected Enhancements Display */}
                    {selectedEnhancements[controlId] && selectedEnhancements[controlId].length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Selected Enhancements:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedEnhancements[controlId].map(enhancementId => {
                            const enhancement = control.enhancements?.find(e => e.id === enhancementId);
                            if (!enhancement) return null;
                            
                            const isRequired = enhancement.required_for?.includes(selectedBaseline);
                            
                            return (
                              <span
                                key={enhancementId}
                                className={`relative inline-flex items-center px-2 py-1 rounded text-xs font-medium select-none ${
                                  isRequired 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-700'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
                                }`}
                                title={enhancement.title}
                              >
                                {enhancement.id}
                                {isRequired && <span className="ml-1 text-xs">*</span>}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onRemoveEnhancement) {
                                      onRemoveEnhancement(controlId, enhancementId);
                                    }
                                  }}
                                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gray-400 hover:bg-red-500 text-white flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  style={{fontSize: '8px', lineHeight: 1}}
                                  title="Remove enhancement"
                                  tabIndex={0}
                                >
                                  <XMarkIcon className="w-2 h-2" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          * Required for {selectedBaseline} baseline
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onControlRemove(controlId)}
                    className="ml-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No controls selected yet</p>
            <p className="text-xs">Click "Add Controls" to get started</p>
          </div>
        )}

        {/* Add Controls Panel */}
        {showAddControls && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search controls by ID, title, or family..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredControls.length > 0 ? (
                filteredControls.map(control => {
                  const conflictCheck = clientSideConflictCheck(selectedControls, control.id);
                  
                  return (
                    <div
                      key={control.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        conflictCheck.hasConflicts
                          ? 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => handleControlAdd(control.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                              {control.id}
                            </span>
                            {(() => {
                              const enhancementInfo = getEnhancementInfo(control);
                              if (enhancementInfo) {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onEnhancementBadgeClick) {
                                        onEnhancementBadgeClick(control.id);
                                      }
                                    }}
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium hover:scale-105 transition-transform ${
                                      enhancementInfo.hasRequired 
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                                    }`}
                                    title={`Click to select enhancements: ${enhancementInfo.total} total (${enhancementInfo.required} required for ${selectedBaseline})`}
                                  >
                                    +{enhancementInfo.total}
                                  </button>
                                );
                              }
                              return null;
                            })()}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getControlFamilyColor(control.family)}`}>
                              {control.family}
                            </span>
                            {conflictCheck.hasConflicts && (
                              <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {control.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(() => {
                              const desc = control.description || '';
                              const isLong = desc.length > 120;
                              const isExpanded = expandedDescriptions[control.id];
                              if (!isLong) return desc;
                              if (isExpanded) {
                                return <>
                                  {desc} <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={e => { e.stopPropagation(); toggleDescription(control.id); }}>see less</button>
                                </>;
                              }
                              return <>
                                {desc.slice(0, 120)}... <button className="text-blue-600 hover:underline ml-1 text-xs font-semibold" onClick={e => { e.stopPropagation(); toggleDescription(control.id); }}>see more</button>
                              </>;
                            })()}
                          </p>
                          {conflictCheck.hasConflicts && (
                            <div className="mt-2">
                              <p className="text-xs text-red-600 dark:text-red-400">
                                ⚠️ May conflict with: {conflictCheck.conflicts.map(c => c.conflictsWith).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                        <PlusIcon className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No controls found</p>
                  <p className="text-xs">Try adjusting your search or platform filter</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlSelector; 