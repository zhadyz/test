import React, { useState, useEffect, useRef } from 'react';
import { 
  MagnifyingGlassIcon, 
  CheckIcon, 
  XMarkIcon, 
  DocumentArrowDownIcon,
  PlayIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  ServerIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const ComplianceControlBuilder = ({ onClose }) => {
  const [controls, setControls] = useState([]);
  const [filteredControls, setFilteredControls] = useState([]);
  const [selectedControls, setSelectedControls] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [baselineFilter, setBaselineFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playbook, setPlaybook] = useState(null);
  const [playbookName, setPlaybookName] = useState('Multi-Control Compliance Playbook');
  const [operatingSystem, setOperatingSystem] = useState('ubuntu_22_04');
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [error, setError] = useState(null);
  const searchInputRef = useRef(null);

  // Load controls on component mount
  useEffect(() => {
    fetchControls();
  }, []);

  // Filter controls based on search and baseline
  useEffect(() => {
    let filtered = controls;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(control => 
        control.control_id?.toLowerCase().includes(query) ||
        control.control_name?.toLowerCase().includes(query) ||
        control.plain_english_explanation?.toLowerCase().includes(query)
      );
    }

    // Apply baseline filter
    if (baselineFilter !== 'all') {
      filtered = filtered.filter(control => {
        const family = control.control_id?.split('-')[0];
        if (baselineFilter === 'low') {
          return ['AC', 'AU', 'CM'].includes(family);
        } else if (baselineFilter === 'moderate') {
          return ['AC', 'AU', 'CM', 'SC', 'SI'].includes(family);
        } else if (baselineFilter === 'high') {
          return true;
        }
        return true;
      });
    }

    setFilteredControls(filtered);
  }, [controls, searchQuery, baselineFilter]);

  const fetchControls = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/controls');
      if (!response.ok) throw new Error('Failed to fetch controls');
      
      const data = await response.json();
      setControls(data);
      setFilteredControls(data);
    } catch (err) {
      setError('Failed to load controls: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleControlSelection = (control) => {
    setSelectedControls(prev => {
      const isSelected = prev.some(c => c.control_id === control.control_id);
      if (isSelected) {
        return prev.filter(c => c.control_id !== control.control_id);
      } else {
        if (prev.length >= 100) {
          setError('Maximum 100 controls allowed per playbook');
          return prev;
        }
        return [...prev, control];
      }
    });
    setError(null);
  };

  const selectAllFiltered = () => {
    const newSelections = filteredControls.filter(control => 
      !selectedControls.some(selected => selected.control_id === control.control_id)
    );
    
    if (selectedControls.length + newSelections.length > 100) {
      setError('Cannot select more than 100 controls total');
      return;
    }
    
    setSelectedControls(prev => [...prev, ...newSelections]);
    setError(null);
  };

  const clearAllSelections = () => {
    setSelectedControls([]);
    setError(null);
  };

  const removeSelectedControl = (controlId) => {
    setSelectedControls(prev => prev.filter(c => c.control_id !== controlId));
  };

  const generatePlaybook = async () => {
    if (selectedControls.length === 0) {
      setError('Please select at least one control');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/playbook/generate-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          control_ids: selectedControls.map(c => c.control_id),
          operating_system: operatingSystem,
          playbook_name: playbookName,
          environment: {}
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate playbook');
      }

      const playbookData = await response.json();
      setPlaybook(playbookData);
      setShowPlaybookModal(true);
    } catch (err) {
      setError('Failed to generate playbook: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPlaybook = () => {
    if (!playbook) return;

    const blob = new Blob([playbook.playbook_yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playbookName.toLowerCase().replace(/\s+/g, '_')}.yml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const operatingSystemOptions = [
    { value: 'ubuntu_20_04', label: 'Ubuntu 20.04 LTS' },
    { value: 'ubuntu_22_04', label: 'Ubuntu 22.04 LTS' },
    { value: 'rhel_8', label: 'Red Hat Enterprise Linux 8' },
    { value: 'windows_server_2019', label: 'Windows Server 2019' }
  ];

  const baselineOptions = [
    { value: 'all', label: 'All Controls' },
    { value: 'low', label: 'Low Baseline' },
    { value: 'moderate', label: 'Moderate Baseline' },
    { value: 'high', label: 'High Baseline' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-7xl h-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="h-8 w-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">Compliance Control Builder</h2>
                <p className="text-blue-100 mt-1">Select multiple NIST controls and generate a combined Ansible playbook</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Left Panel - Control Selection */}
          <div className="w-2/3 p-6 border-r border-gray-200 dark:border-dark-600 overflow-y-auto">
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search controls by ID, name, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-dark-100"
                  />
                </div>
                <select
                  value={baselineFilter}
                  onChange={(e) => setBaselineFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-dark-100"
                >
                  {baselineOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={selectAllFiltered}
                    disabled={filteredControls.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Select All Filtered ({filteredControls.length})
                  </button>
                  <button
                    onClick={clearAllSelections}
                    disabled={selectedControls.length === 0}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="text-sm text-gray-600 dark:text-dark-300">
                  {selectedControls.length}/100 controls selected
                </div>
              </div>
            </div>

            {/* Controls List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-dark-300">Loading controls...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                {error}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Instruction Text */}
                <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      Click on any control below to add it to your selection
                    </span>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-full">
                    {filteredControls.length} available
                  </span>
                </div>

                {filteredControls.map(control => {
                  const isSelected = selectedControls.some(c => c.control_id === control.control_id);
                  return (
                    <div
                      key={control.control_id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:transform hover:scale-[1.02] group ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 shadow-sm'
                          : 'border-gray-200 dark:border-dark-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-650'
                      }`}
                      onClick={() => toggleControlSelection(control)}
                      title={isSelected ? 'Click to deselect this control' : 'Click to select this control'}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          {/* Enhanced Checkbox */}
                          <div 
                            className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 mt-1 transition-all duration-200 cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                                : 'border-2 border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105 animate-pulse-subtle'
                            }`}
                          >
                            {isSelected ? (
                              <CheckIcon className="h-5 w-5 font-bold" />
                            ) : (
                              <div className="w-4 h-4 rounded-sm border border-gray-400 dark:border-dark-400 bg-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-colors"></div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-dark-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                {control.control_id} - {control.control_name}
                              </h3>
                              {isSelected && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-dark-300 line-clamp-2">
                              {control.plain_english_explanation || 'No description available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {filteredControls.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                    No controls found matching your search criteria.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Selected Controls & Configuration */}
          <div className="w-1/3 p-6 bg-gray-50 dark:bg-dark-900 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-100 mb-4">
              Selected Controls ({selectedControls.length})
            </h3>

            {/* Configuration */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  Playbook Name
                </label>
                <input
                  type="text"
                  value={playbookName}
                  onChange={(e) => setPlaybookName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-dark-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  Target Operating System
                </label>
                <select
                  value={operatingSystem}
                  onChange={(e) => setOperatingSystem(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-dark-100"
                >
                  {operatingSystemOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Controls List */}
            <div className="mb-6">
              {selectedControls.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-dark-400">
                  <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No controls selected</p>
                  <p className="text-sm">Select controls from the left panel</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedControls.map(control => (
                    <div
                      key={control.control_id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-dark-100 truncate">
                          {control.control_id}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-dark-300 truncate">
                          {control.control_name}
                        </p>
                      </div>
                      <button
                        onClick={() => removeSelectedControl(control.control_id)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={generatePlaybook}
              disabled={selectedControls.length === 0 || isGenerating}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                selectedControls.length === 0 || isGenerating
                  ? 'bg-gray-300 dark:bg-dark-600 text-gray-500 dark:text-dark-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Playbook...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Generate Ansible Playbook
                </div>
              )}
            </button>

            {/* Help Text */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• Select up to 100 NIST controls</li>
                    <li>• Choose your target operating system</li>
                    <li>• Generate a combined Ansible playbook</li>
                    <li>• Download and run on your infrastructure</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playbook Modal */}
      {showPlaybookModal && playbook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Generated Playbook</h3>
                <button
                  onClick={() => setShowPlaybookModal(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-dark-100">{playbook.description}</h4>
                  <p className="text-sm text-gray-600 dark:text-dark-300">
                    Generated on {new Date(playbook.generated_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={downloadPlaybook}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Download YAML
                </button>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                  {playbook.playbook_yaml}
                </pre>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-dark-100">Tasks</p>
                  <p className="text-gray-600 dark:text-dark-300">{playbook.tasks?.length || 0} tasks</p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-dark-100">Estimated Runtime</p>
                  <p className="text-gray-600 dark:text-dark-300">{playbook.estimated_runtime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceControlBuilder; 