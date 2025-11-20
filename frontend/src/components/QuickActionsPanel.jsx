import React, { useState } from 'react';
import {
  BookmarkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ShareIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

const QuickActionsPanel = ({ 
  selectedTools = [],
  controlResults = [],
  gapAnalysis = [],
  onReset,
  onSaveMapping,
  onLoadMapping
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [mappingName, setMappingName] = useState('');
  const [savedMappings, setSavedMappings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tool-mappings') || '[]');
    } catch {
      return [];
    }
  });

  const exportToJSON = () => {
    const results = {
      mappingName: `Tool Mapping - ${new Date().toLocaleDateString()}`,
      selectedTools: selectedTools.map(tool => ({
        id: tool.id,
        name: tool.name,
        category: tool.category,
        vendor: tool.vendor
      })),
      coverage: {
        totalControls: controlResults.length,
        gaps: gapAnalysis.length,
        coveragePercentage: Math.round((controlResults.length / (controlResults.length + gapAnalysis.length)) * 100)
      },
      coveredControls: controlResults.map(control => ({
        controlId: control.controlId,
        matchStrength: control.strongestMatch,
        toolCount: control.tools.length,
        tools: control.tools.map(t => t.tool.name)
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

  const exportToCSV = () => {
    const csvData = [
      ['Control ID', 'Coverage Status', 'Match Strength', 'Tools', 'Tool Count'],
      ...controlResults.map(control => [
        control.controlId,
        'Covered',
        control.strongestMatch,
        control.tools.map(t => t.tool.name).join('; '),
        control.tools.length
      ]),
      ...gapAnalysis.map(controlId => [controlId, 'Gap', 'None', '', 0])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-mapping-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    const summary = `Tool Mapping Summary
Selected Tools: ${selectedTools.map(t => t.name).join(', ')}
Controls Covered: ${controlResults.length}
Gaps Identified: ${gapAnalysis.length}
Coverage: ${Math.round((controlResults.length / (controlResults.length + gapAnalysis.length)) * 100)}%

Strong Matches: ${controlResults.filter(c => c.strongestMatch === 'strong').length}
Partial Matches: ${controlResults.filter(c => c.strongestMatch === 'partial').length}
Supportive Matches: ${controlResults.filter(c => c.strongestMatch === 'supportive').length}

Generated: ${new Date().toLocaleString()}`;

    try {
      await navigator.clipboard.writeText(summary);
      // You could add a toast notification here
      console.log('Summary copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const saveMapping = () => {
    if (!mappingName.trim()) return;

    const newMapping = {
      id: Date.now(),
      name: mappingName,
      tools: selectedTools.map(t => t.id),
      createdAt: new Date().toISOString(),
      coverage: controlResults.length,
      gaps: gapAnalysis.length
    };

    const updated = [...savedMappings, newMapping];
    setSavedMappings(updated);
    localStorage.setItem('tool-mappings', JSON.stringify(updated));
    setMappingName('');
    setShowSaveDialog(false);
    
    if (onSaveMapping) onSaveMapping(newMapping);
  };

  const loadMapping = (mapping) => {
    if (onLoadMapping) onLoadMapping(mapping);
  };

  const deleteMapping = (mappingId) => {
    const updated = savedMappings.filter(m => m.id !== mappingId);
    setSavedMappings(updated);
    localStorage.setItem('tool-mappings', JSON.stringify(updated));
  };

  return (
    <>
      {/* Quick Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Cog6ToothIcon className="w-5 h-5 mr-2 text-blue-600" />
                Quick Actions
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Save Mapping */}
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={selectedTools.length === 0}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <BookmarkIcon className="w-4 h-4 mr-1" />
                Save
              </button>

              {/* Export Dropdown */}
              <div className="relative inline-block text-left">
                <div className="flex">
                  <button
                    onClick={exportToJSON}
                    disabled={selectedTools.length === 0}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-l-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                    Export
                  </button>
                  <div className="border-l border-gray-300 dark:border-gray-600">
                    <button
                      onClick={exportToCSV}
                      disabled={selectedTools.length === 0}
                      className="inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 border-l-0 text-sm font-medium rounded-r-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Export as CSV"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Copy Summary */}
              <button
                onClick={copyToClipboard}
                disabled={selectedTools.length === 0}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                Copy
              </button>

              {/* Reset */}
              <button
                onClick={onReset}
                disabled={selectedTools.length === 0}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4 mr-1" />
                Reset
              </button>
            </div>
          </div>

          {/* Saved Mappings Quick Access */}
          {savedMappings.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">
                  Saved Mappings:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedMappings.slice(-3).map((mapping) => (
                  <button
                    key={mapping.id}
                    onClick={() => loadMapping(mapping)}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                  >
                    {mapping.name}
                    <span className="ml-1 text-blue-500">({mapping.coverage} controls)</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Save Tool Mapping
            </h3>
            <input
              type="text"
              value={mappingName}
              onChange={(e) => setMappingName(e.target.value)}
              placeholder="Enter mapping name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && saveMapping()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setMappingName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveMapping}
                disabled={!mappingName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickActionsPanel; 