import React, { useState, useMemo } from 'react';
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

const GuidancePanel = ({
  selectedTools = [],
  controlResults = [],
  gapAnalysis = [],
  baseline = 'moderate' // low, moderate, high
}) => {
  const [activeTab, setActiveTab] = useState('recommendations');

  // Generate smart recommendations based on current selection and gaps
  const recommendations = useMemo(() => {
    const recs = [];
    
    // Analysis of tool categories
    const toolCategories = selectedTools.reduce((acc, tool) => {
      acc[tool.category] = (acc[tool.category] || 0) + 1;
      return acc;
    }, {});

    // Missing critical categories
    const criticalCategories = ['Security Information and Event Management', 'Identity and Access Management', 'Cloud Services'];
    const missingCritical = criticalCategories.filter(cat => !toolCategories[cat]);

    missingCritical.forEach(category => {
      if (category === 'Security Information and Event Management') {
        recs.push({
          type: 'critical',
          category: 'Logging & Monitoring',
          title: 'Add SIEM Solution',
          description: 'Many audit controls (AU-*) require centralized logging and monitoring.',
          impact: 'High',
          controls: ['AU-2', 'AU-3', 'AU-6', 'AU-12', 'SI-4'],
          suggestions: ['Splunk', 'Elastic Security', 'AWS CloudWatch', 'Azure Sentinel'],
          priority: 1
        });
      }
      
      if (category === 'Identity and Access Management') {
        recs.push({
          type: 'critical',
          category: 'Identity Management',
          title: 'Implement IAM Solution',
          description: 'Access control (AC-*) and identification (IA-*) controls need robust IAM.',
          impact: 'High',
          controls: ['AC-2', 'AC-3', 'AC-6', 'IA-2', 'IA-4', 'IA-5'],
          suggestions: ['Okta', 'Azure AD', 'AWS IAM', 'Auth0'],
          priority: 1
        });
      }
    });

    // Gap-based recommendations
    const auditGaps = gapAnalysis.filter(control => control.startsWith('AU-'));
    if (auditGaps.length > 3) {
      recs.push({
        type: 'improvement',
        category: 'Audit Enhancement',
        title: 'Strengthen Audit Coverage',
        description: `${auditGaps.length} audit controls need attention. Consider log aggregation.`,
        impact: 'Medium',
        controls: auditGaps.slice(0, 5),
        suggestions: ['Centralized logging', 'Log correlation', 'Automated monitoring'],
        priority: 2
      });
    }

    const accessGaps = gapAnalysis.filter(control => control.startsWith('AC-'));
    if (accessGaps.length > 2) {
      recs.push({
        type: 'improvement',
        category: 'Access Control',
        title: 'Enhance Access Controls',
        description: `${accessGaps.length} access control gaps found. Review permissions management.`,
        impact: 'Medium',
        controls: accessGaps.slice(0, 5),
        suggestions: ['Role-based access', 'Privilege management', 'Regular access reviews'],
        priority: 2
      });
    }

    // Coverage-based recommendations
    const coveragePercentage = (controlResults.length / (controlResults.length + gapAnalysis.length)) * 100;
    
    if (coveragePercentage < 70) {
      recs.push({
        type: 'optimization',
        category: 'Overall Coverage',
        title: 'Improve Overall Coverage',
        description: `Only ${Math.round(coveragePercentage)}% of controls covered. Consider comprehensive tools.`,
        impact: 'Medium',
        controls: gapAnalysis.slice(0, 8),
        suggestions: ['Multi-purpose security platforms', 'Integrated security suites', 'Compliance automation tools'],
        priority: 3
      });
    }

    return recs.sort((a, b) => a.priority - b.priority);
  }, [selectedTools, controlResults, gapAnalysis]);

  // Generate next steps based on baseline and current state
  const nextSteps = useMemo(() => {
    const steps = [];
    const coveragePercentage = (controlResults.length / (controlResults.length + gapAnalysis.length)) * 100;

    if (selectedTools.length === 0) {
      steps.push({
        step: 1,
        title: 'Select Core Tools',
        description: 'Start with your primary platforms (AWS, Azure, etc.) and security tools.',
        status: 'pending',
        priority: 'high'
      });
    } else if (coveragePercentage < 50) {
      steps.push({
        step: 1,
        title: 'Add Essential Security Tools',
        description: 'Focus on IAM, logging, and monitoring solutions to cover critical controls.',
        status: 'pending',
        priority: 'high'
      });
    } else if (coveragePercentage < 80) {
      steps.push({
        step: 1,
        title: 'Fill Coverage Gaps',
        description: 'Address remaining gaps with specialized tools or manual processes.',
        status: 'pending',
        priority: 'medium'
      });
    } else {
      steps.push({
        step: 1,
        title: 'Optimize Implementation',
        description: 'Review partial matches and strengthen implementations.',
        status: 'pending',
        priority: 'low'
      });
    }

    steps.push({
      step: 2,
      title: 'Document Implementations',
      description: 'Create documentation for how each tool satisfies control requirements.',
      status: 'pending',
      priority: 'medium'
    });

    steps.push({
      step: 3,
      title: 'Regular Reviews',
      description: 'Schedule quarterly reviews to assess new tools and changing requirements.',
      status: 'pending',
      priority: 'low'
    });

    return steps;
  }, [selectedTools, controlResults, gapAnalysis]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'critical': return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'improvement': return <ChartBarIcon className="w-5 h-5 text-yellow-500" />;
      case 'optimization': return <LightBulbIcon className="w-5 h-5 text-blue-500" />;
      default: return <LightBulbIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'improvement': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'optimization': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        {/* Tab Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <LightBulbIcon className="w-6 h-6 mr-2 text-blue-600" />
            Compliance Guidance
          </h2>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'recommendations'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Recommendations
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'roadmap'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Next Steps
            </button>
            <button
              onClick={() => setActiveTab('gaps')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'gaps'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Gap Analysis
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getTypeColor(rec.type)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      {getTypeIcon(rec.type)}
                      <h3 className="font-medium ml-2">{rec.title}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(rec.priority === 1 ? 'high' : rec.priority === 2 ? 'medium' : 'low')}`}>
                      {rec.impact} Impact
                    </span>
                  </div>
                  
                  <p className="text-sm mb-3">{rec.description}</p>
                  
                  {rec.controls && rec.controls.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium opacity-75">Affected Controls:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rec.controls.slice(0, 6).map((control) => (
                          <span key={control} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white bg-opacity-50">
                            {control}
                          </span>
                        ))}
                        {rec.controls.length > 6 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white bg-opacity-50">
                            +{rec.controls.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-xs font-medium opacity-75">Suggested Solutions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rec.suggestions.map((suggestion, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white bg-opacity-70">
                          {suggestion}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <TrophyIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Excellent Tool Selection!
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Your current tools provide solid coverage. Consider the roadmap for optimization.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {nextSteps.map((step, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {step.status === 'completed' ? <CheckIcon className="w-4 h-4" /> : step.step}
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white ml-3">{step.title}</h3>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(step.priority)}`}>
                    {step.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">{step.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="max-h-96 overflow-y-auto">
            {gapAnalysis.length > 0 ? (
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {gapAnalysis.length} Controls Need Attention
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {Math.round((gapAnalysis.length / (controlResults.length + gapAnalysis.length)) * 100)}% gap
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${(gapAnalysis.length / (controlResults.length + gapAnalysis.length)) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {gapAnalysis.map((controlId) => (
                    <button
                      key={controlId}
                      className="p-2 text-sm font-medium rounded-lg border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 transition-colors"
                      title={`Control ${controlId} - Click for details`}
                    >
                      {controlId}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldCheckIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Complete Coverage!
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All analyzed controls are covered by your selected tools.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuidancePanel; 