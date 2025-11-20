import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  CheckIcon, 
  XMarkIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  CogIcon,
  ChartBarIcon,
  CloudIcon,
  CubeIcon,
  ServerIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { 
  getAllTools, 
  getControlsForTools, 
  getToolGaps, 
  searchTools,
  TOOL_CATEGORIES,
  CONTROL_MATCH_STRENGTH
} from '../data/toolMappings';
import { CONTROL_DESCRIPTIONS } from '../data/controls';

const ToolMapper = () => {
  const [selectedTools, setSelectedTools] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTools, setFilteredTools] = useState([]);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [controlResults, setControlResults] = useState([]);
  const [gapAnalysis, setGapAnalysis] = useState([]);
  const [loading, setLoading] = useState(false);

  // Quick start options for first rollout
  const quickStartOptions = [
    {
      id: 'aws-basic',
      name: 'AWS Basic Setup',
      description: 'Core AWS services for compliance',
      icon: CloudIcon,
      color: 'orange',
      tools: ['aws', 'aws-s3']
    },
    {
      id: 'kubernetes-security',
      name: 'Kubernetes Security',
      description: 'Container orchestration compliance',
      icon: CubeIcon,
      color: 'blue',
      tools: ['kubernetes']
    },
    {
      id: 'multi-cloud',
      name: 'Multi-Cloud Strategy',
      description: 'AWS, Azure, and GCP coverage',
      icon: GlobeAltIcon,
      color: 'purple',
      tools: ['aws', 'azure', 'gcp']
    },
    {
      id: 'enterprise-security',
      name: 'Enterprise Security Stack',
      description: 'Comprehensive security tooling',
      icon: ShieldCheckIcon,
      color: 'green',
      tools: ['splunk', 'okta', 'hashicorp-vault']
    }
  ];

  // Initialize tools
  useEffect(() => {
    const allTools = getAllTools();
    setFilteredTools(allTools);
  }, []);

  // Filter tools based on search and category
  useEffect(() => {
    let tools = searchQuery ? searchTools(searchQuery) : getAllTools();
    
    if (categoryFilter !== 'all') {
      tools = tools.filter(tool => tool.category === categoryFilter);
    }
    
    setFilteredTools(tools);
  }, [searchQuery, categoryFilter]);

  // Update control results when tools change
  useEffect(() => {
    if (selectedTools.length > 0) {
      setLoading(true);
      const toolIds = selectedTools.map(tool => tool.id);
      const controls = getControlsForTools(toolIds);
      setControlResults(controls);
      
      // Common controls for gap analysis
      const commonControls = [
        'AC-1', 'AC-2', 'AC-3', 'AC-6', 'AC-7', 
        'AU-1', 'AU-2', 'AU-3', 'AU-6', 'AU-12', 
        'CA-1', 'CA-2', 'CA-7', 
        'CM-1', 'CM-2', 'CM-6', 
        'CP-1', 'CP-9', 
        'IA-1', 'IA-2', 'IA-4', 'IA-5',
        'IR-1', 'IR-4', 
        'RA-1', 'RA-5', 
        'SC-1', 'SC-7', 'SC-8', 'SC-12', 'SC-13', 'SC-28', 
        'SI-1', 'SI-2', 'SI-4'
      ];
      const gaps = getToolGaps(toolIds, commonControls);
      setGapAnalysis(gaps);
      setLoading(false);
    } else {
      setControlResults([]);
      setGapAnalysis([]);
    }
  }, [selectedTools]);

  const handleQuickStart = (option) => {
    const allTools = getAllTools();
    const selectedToolObjects = allTools.filter(tool => option.tools.includes(tool.id));
    setSelectedTools(selectedToolObjects);
    setShowToolSelector(false);
  };

  const handleToolSelect = (tool) => {
    const isSelected = selectedTools.some(t => t.id === tool.id);
    if (isSelected) {
      setSelectedTools(selectedTools.filter(t => t.id !== tool.id));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleRemoveTool = (toolId) => {
    setSelectedTools(selectedTools.filter(t => t.id !== toolId));
  };

  const getMatchStrengthColor = (strength) => {
    switch (strength) {
      case CONTROL_MATCH_STRENGTH.STRONG:
        return 'text-green-600 bg-green-50 border-green-200';
      case CONTROL_MATCH_STRENGTH.PARTIAL:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case CONTROL_MATCH_STRENGTH.SUPPORTIVE:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMatchStrengthIcon = (strength) => {
    switch (strength) {
      case CONTROL_MATCH_STRENGTH.STRONG:
        return <ShieldCheckIcon className="w-4 h-4" />;
      case CONTROL_MATCH_STRENGTH.PARTIAL:
        return <CogIcon className="w-4 h-4" />;
      case CONTROL_MATCH_STRENGTH.SUPPORTIVE:
        return <ChartBarIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getQuickStartColor = (color) => {
    const colors = {
      orange: 'from-orange-500 to-red-500',
      blue: 'from-blue-500 to-indigo-500',
      purple: 'from-purple-500 to-pink-500',
      green: 'from-green-500 to-emerald-500'
    };
    return colors[color] || colors.blue;
  };

  const exportResults = () => {
    const results = {
      selectedTools: selectedTools.map(tool => ({
        name: tool.name,
        category: tool.category,
        vendor: tool.vendor
      })),
      coveredControls: controlResults.map(control => ({
        controlId: control.controlId,
        matchStrength: control.strongestMatch,
        toolCount: control.tools.length
      })),
      gapAnalysis: gapAnalysis,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-mapping-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🛠️ Platform Mapper
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Map NIST 800-53 controls to your technology stack. Select platforms like AWS, Kubernetes, Azure, and security tools to see which controls they help satisfy.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-blue-800 dark:text-blue-300 font-medium">
                Free Tool - Understand which controls your platforms already satisfy
              </span>
            </div>
          </div>
        </div>

        {/* Quick Start Options */}
        {selectedTools.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                🚀 Quick Start Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickStartOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleQuickStart(option)}
                    className="group relative p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-transparent hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 hover:scale-105"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${getQuickStartColor(option.color)} opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-200`}></div>
                    <div className="relative">
                      <option.icon className={`w-8 h-8 mb-3 text-${option.color}-600 dark:text-${option.color}-400`} />
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {option.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tool Selection Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Selected Platforms & Tools ({selectedTools.length})
              </h2>
              <button
                onClick={() => setShowToolSelector(!showToolSelector)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {showToolSelector ? 'Hide' : 'Add'} Platforms
              </button>
            </div>

            {/* Selected Tools Display */}
            {selectedTools.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {tool.name}
                    <button
                      onClick={() => handleRemoveTool(tool.id)}
                      className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No platforms selected. Choose a quick start template above or click "Add Platforms" to get started.
              </p>
            )}

            {/* Tool Selector */}
            {showToolSelector && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="relative">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                    >
                      <option value="all">All Categories</option>
                      {Object.entries(TOOL_CATEGORIES).map(([key, value]) => (
                        <option key={key} value={value}>{value}</option>
                      ))}
                    </select>
                    <FunnelIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Tool Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredTools.map((tool) => {
                    const isSelected = selectedTools.some(t => t.id === tool.id);
                    return (
                      <div
                        key={tool.id}
                        onClick={() => handleToolSelect(tool)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                              {tool.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                              {tool.category}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                              {tool.description}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckIcon className="w-5 h-5 text-blue-600 ml-2 flex-shrink-0" />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {/* NIST Control Bubbles */}
                          {tool.supports_controls && Object.keys(tool.supports_controls).map((controlId) => (
                            <span
                              key={controlId}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-300 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              title={CONTROL_DESCRIPTIONS[controlId] || controlId}
                            >
                              {controlId}
                            </span>
                          ))}
                          {/* Existing tags */}
                          {tool.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={tag + index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {selectedTools.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Control Coverage */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Control Coverage ({controlResults.length} controls)
                    </h2>
                    <button
                      onClick={exportResults}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                      Export
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {controlResults.map((control) => (
                        <div
                          key={control.controlId}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <h3 className="font-medium text-gray-900 dark:text-white mr-3">
                                {control.controlId}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getMatchStrengthColor(control.strongestMatch)}`}>
                                {getMatchStrengthIcon(control.strongestMatch)}
                                <span className="ml-1 capitalize">{control.strongestMatch}</span>
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {control.tools.length} tool{control.tools.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {control.tools.map((toolInfo, index) => (
                              <div key={index} className="text-sm">
                                <div className="flex items-center mb-1">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {toolInfo.tool.name}:
                                  </span>
                                  <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getMatchStrengthColor(toolInfo.matchInfo.strength)}`}>
                                    {getMatchStrengthIcon(toolInfo.matchInfo.strength)}
                                    <span className="ml-1 capitalize">{toolInfo.matchInfo.strength}</span>
                                  </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 ml-2">
                                  {toolInfo.matchInfo.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gap Analysis Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Gap Analysis
                    </h2>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Coverage Summary
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-green-600">Covered Controls:</span>
                        <span className="text-sm font-bold text-green-600">{controlResults.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-red-600">Gap Controls:</span>
                        <span className="text-sm font-bold text-red-600">{gapAnalysis.length}</span>
                      </div>
                    </div>
                  </div>

                  {gapAnalysis.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Controls Not Covered:
                      </h3>
                      <div className="max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-1">
                          {gapAnalysis.map((controlId) => (
                            <span
                              key={controlId}
                              className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            >
                              {controlId}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {gapAnalysis.length === 0 && controlResults.length > 0 && (
                    <div className="text-center py-4">
                      <ShieldCheckIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-green-600 font-medium">
                        Complete Coverage!
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Your selected tools cover all analyzed controls
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {selectedTools.length === 0 && (
          <div className="text-center py-12">
            <CogIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Tools Selected
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Select security tools to analyze their NIST 800-53 control coverage and identify gaps
            </p>
            <button
              onClick={() => setShowToolSelector(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolMapper; 