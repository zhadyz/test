import React from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

const CoverageSummaryWidget = ({ 
  controlResults = [], 
  gapAnalysis = [], 
  selectedTools = [],
  totalControls = 40 // Standard baseline
}) => {
  // Calculate metrics
  const coveredControls = controlResults.length;
  const gapControls = gapAnalysis.length;
  const coveragePercentage = totalControls > 0 ? Math.round((coveredControls / totalControls) * 100) : 0;
  
  // Calculate compliance score based on match strength
  const strongMatches = controlResults.filter(c => c.strongestMatch === 'strong').length;
  const partialMatches = controlResults.filter(c => c.strongestMatch === 'partial').length;
  const supportiveMatches = controlResults.filter(c => c.strongestMatch === 'supportive').length;
  
  const complianceScore = totalControls > 0 ? Math.round(
    ((strongMatches * 1.0) + (partialMatches * 0.7) + (supportiveMatches * 0.4)) / totalControls * 100
  ) : 0;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <TrophyIcon className="w-6 h-6" />;
    if (score >= 60) return <ChartBarIcon className="w-6 h-6" />;
    return <ExclamationTriangleIcon className="w-6 h-6" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <ChartBarIcon className="w-6 h-6 mr-2 text-blue-600" />
            Coverage Summary
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} analyzed
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Coverage Percentage */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${coveragePercentage * 1.88} 188`}
                  className={coveragePercentage >= 80 ? 'text-green-500' : 
                           coveragePercentage >= 60 ? 'text-yellow-500' : 'text-red-500'}
                />
              </svg>
              <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
                {coveragePercentage}%
              </span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Coverage</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {coveredControls}/{totalControls} controls
            </div>
          </div>

          {/* Compliance Score */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 mb-2 ${getScoreColor(complianceScore)}`}>
              {getScoreIcon(complianceScore)}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Compliance Score
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {complianceScore}
            </div>
          </div>

          {/* Control Breakdown */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Control Quality
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-green-600">Strong</span>
                <span className="font-medium">{strongMatches}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-600">Partial</span>
                <span className="font-medium">{partialMatches}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600">Supportive</span>
                <span className="font-medium">{supportiveMatches}</span>
              </div>
            </div>
          </div>

          {/* Gap Analysis */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 mb-2">
              <span className="text-2xl font-bold text-red-600">{gapControls}</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Gaps Found
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {gapControls > 0 ? 'Needs attention' : 'Complete coverage!'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
            <span className="font-medium text-gray-900 dark:text-white">{coveragePercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                coveragePercentage >= 80 ? 'bg-green-500' : 
                coveragePercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>
        </div>

        {/* Quick Status */}
        <div className="mt-4 flex items-center justify-center">
          {coveragePercentage >= 80 ? (
            <div className="flex items-center text-green-600">
              <ShieldCheckIcon className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Excellent Coverage</span>
            </div>
          ) : coveragePercentage >= 60 ? (
            <div className="flex items-center text-yellow-600">
              <ChartBarIcon className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Good Progress</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">More Tools Needed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverageSummaryWidget; 