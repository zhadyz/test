import React from 'react'
import { 
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

const ComplianceTrackerTile = ({ 
  controls = [],
  favorites = [],
  usageStats = {},
  onNavigate
}) => {
  // Calculate compliance metrics
  const totalControls = controls.length
  const implementedControls = Math.floor(totalControls * 0.65) // Mock implementation
  const inProgressControls = Math.floor(totalControls * 0.25)
  const notStartedControls = totalControls - implementedControls - inProgressControls
  
  const compliancePercentage = Math.round((implementedControls / totalControls) * 100)
  
  // Control families analysis
  const familyStats = controls.reduce((acc, control) => {
    const family = control.family || 'Unknown'
    if (!acc[family]) {
      acc[family] = { total: 0, implemented: 0 }
    }
    acc[family].total++
    // Mock implementation status
    if (Math.random() > 0.4) {
      acc[family].implemented++
    }
    return acc
  }, {})

  const topFamilies = Object.entries(familyStats)
    .map(([family, stats]) => ({
      family,
      ...stats,
      percentage: Math.round((stats.implemented / stats.total) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5)

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getProgressBg = (percentage) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="h-full flex flex-col">
      {/* Overall Progress */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-blue-800 dark:text-blue-300">
              Overall Compliance
            </span>
          </div>
          <span className={`text-2xl font-bold ${getProgressColor(compliancePercentage)}`}>
            {compliancePercentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getProgressBg(compliancePercentage)}`}
            style={{ width: `${compliancePercentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{implementedControls} implemented</span>
          <span>{totalControls} total controls</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {/* Status Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Implementation Status
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-800 dark:text-green-300">Implemented</span>
                </div>
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  {implementedControls}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-300">In Progress</span>
                </div>
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  {inProgressControls}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-800 dark:text-red-300">Not Started</span>
                </div>
                <span className="text-sm font-medium text-red-800 dark:text-red-300">
                  {notStartedControls}
                </span>
              </div>
            </div>
          </div>

          {/* Top Control Families */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Top Control Families
            </h4>
            <div className="space-y-2">
              {topFamilies.map((family, index) => (
                <div key={family.family} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {family.family}
                    </span>
                    <span className={`text-sm font-medium ${getProgressColor(family.percentage)}`}>
                      {family.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressBg(family.percentage)}`}
                      style={{ width: `${family.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{family.implemented}/{family.total}</span>
                    <span>#{index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center space-x-2 mb-2">
              <ArrowTrendingUpIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                Quick Insights
              </span>
            </div>
            <div className="space-y-1 text-xs text-purple-700 dark:text-purple-300">
              <p>• {favorites.length} controls marked as favorites</p>
              <p>• {usageStats.searchQueriesUsed || 0} searches performed</p>
              <p>• Focus on {topFamilies[topFamilies.length - 1]?.family} family (lowest progress)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onNavigate?.('rmf-tracker')}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
        >
          <DocumentTextIcon className="h-4 w-4" />
          <span className="text-sm font-medium">View Full RMF Tracker</span>
        </button>
        
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>Updated {new Date().toLocaleDateString()}</span>
          <span>{Object.keys(familyStats).length} families tracked</span>
        </div>
      </div>
    </div>
  )
}

export default ComplianceTrackerTile 