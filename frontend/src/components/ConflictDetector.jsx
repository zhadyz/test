/**
 * ConflictDetector Component
 * 
 * A reusable component for displaying conflict detection results and warnings.
 * Can be used in various parts of the application to show conflict status.
 */

import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { getConflictSummary, detectConflicts } from '../utils/conflictDetection';

const ConflictDetector = ({ 
  selectedControls = [], 
  installedSoftware = [], 
  showDetails = false,
  className = "",
  onConflictChange = null 
}) => {
  const [conflictSummary, setConflictSummary] = useState(null);
  const [detailedConflicts, setDetailedConflicts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Load conflict data when inputs change
  useEffect(() => {
    if (selectedControls.length > 0) {
      loadConflictData();
    } else {
      setConflictSummary(null);
      setDetailedConflicts(null);
    }
  }, [selectedControls, installedSoftware]);

  const loadConflictData = async () => {
    setLoading(true);
    try {
      // Load summary data
      const summary = await getConflictSummary(selectedControls, installedSoftware);
      setConflictSummary(summary);

      // Load detailed conflicts if requested
      if (showDetails) {
        const detailed = await detectConflicts(selectedControls, installedSoftware);
        setDetailedConflicts(detailed);
      }

      // Notify parent component of conflict status
      if (onConflictChange) {
        onConflictChange(summary);
      }
    } catch (error) {
      console.error('Error loading conflict data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Checking for conflicts...</span>
      </div>
    );
  }

  if (!conflictSummary || selectedControls.length === 0) {
    return null;
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    if (conflictSummary.has_critical_conflicts) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    } else if (conflictSummary.total_conflicts > 0) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    } else {
      return <ShieldCheckIcon className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusMessage = () => {
    if (conflictSummary.has_critical_conflicts) {
      return "Critical conflicts detected - immediate attention required";
    } else if (conflictSummary.total_conflicts > 0) {
      return `${conflictSummary.total_conflicts} potential conflict${conflictSummary.total_conflicts > 1 ? 's' : ''} detected`;
    } else {
      return "No conflicts detected";
    }
  };

  const getStatusColor = () => {
    if (conflictSummary.has_critical_conflicts) {
      return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700";
    } else if (conflictSummary.total_conflicts > 0) {
      return "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700";
    } else {
      return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700";
    }
  };

  return (
    <div className={`border rounded-lg ${getStatusColor()} ${className}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {getStatusIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Conflict Detection
              </h3>
              {conflictSummary.total_conflicts > 0 && showDetails && (
                <button
                  onClick={() => setShowDetailedView(!showDetailedView)}
                  className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showDetailedView ? 'Hide Details' : 'Show Details'}
                  {showDetailedView ? 
                    <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                    <ChevronDownIcon className="w-4 h-4 ml-1" />
                  }
                </button>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {getStatusMessage()}
            </p>

            {/* Summary Statistics */}
            {conflictSummary.total_conflicts > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(conflictSummary.severity_breakdown).map(([severity, count]) => (
                  count > 0 && (
                    <span
                      key={severity}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(severity)}`}
                    >
                      {count} {severity}
                    </span>
                  )
                ))}
              </div>
            )}

            {/* Conflict Types */}
            {conflictSummary.total_conflicts > 0 && Object.keys(conflictSummary.conflict_types).length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Types: {Object.entries(conflictSummary.conflict_types)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => `${count} ${type.replace('_', ' ')}`)
                    .join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Conflicts View */}
        {showDetailedView && detailedConflicts && detailedConflicts.conflicts.length > 0 && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
            <div className="space-y-3">
              {detailedConflicts.conflicts.map((conflict, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {conflict.source_control}
                          {conflict.target_control && ` ↔ ${conflict.target_control}`}
                          {conflict.target_software && ` ↔ ${conflict.target_software}`}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(conflict.severity)}`}>
                          {conflict.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {conflict.description}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        <strong>Resolution:</strong> {conflict.resolution_suggestion}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictDetector; 