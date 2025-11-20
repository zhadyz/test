import { useState, useMemo } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  XCircleIcon as XCircleIconSolid
} from '@heroicons/react/24/solid'

function ProgressTracker({ 
  controls = [], 
  onFilterChange = () => {}, 
  activeFilter = 'All',
  className = '',
  showFilters = true,
  compact = false 
}) {
  const [clickedSegment, setClickedSegment] = useState(null)

  // Calculate stats from controls and localStorage tracker data
  const stats = useMemo(() => {
    const trackerData = JSON.parse(localStorage.getItem('nist_tracker') || '[]')
    const totalControls = controls?.length || 0
    
    let implemented = 0, inProgress = 0, notStarted = 0, needsReview = 0, deferred = 0

    if (trackerData.length > 0 && totalControls > 0) {
      // Count each status from tracker data
      implemented = trackerData.filter(c => c.status === 'Implemented').length
      inProgress = trackerData.filter(c => c.status === 'In Progress').length
      needsReview = trackerData.filter(c => c.status === 'Needs Review').length
      deferred = trackerData.filter(c => c.status === 'Deferred').length
      notStarted = Math.max(0, totalControls - (implemented + inProgress + needsReview + deferred))
    } else {
      notStarted = totalControls
    }
    
    const completionPercentage = totalControls > 0 ? Math.round((implemented / totalControls) * 100) : 0
    
    return {
      total: totalControls,
      implemented,
      inProgress,
      notStarted,
      needsReview,
      deferred,
      completionPercentage
    }
  }, [controls])

  // Calculate segment widths for progress bar
  const segmentData = useMemo(() => {
    if (stats.total === 0) return []

    const segments = [
      {
        status: 'Implemented',
        count: stats.implemented,
        percentage: (stats.implemented / stats.total) * 100,
        color: 'bg-green-500',
        hoverColor: 'bg-green-600',
        icon: CheckCircleIconSolid,
        textColor: 'text-green-700 dark:text-green-400'
      },
      {
        status: 'In Progress',
        count: stats.inProgress,
        percentage: (stats.inProgress / stats.total) * 100,
        color: 'bg-yellow-500',
        hoverColor: 'bg-yellow-600',
        icon: ClockIconSolid,
        textColor: 'text-yellow-700 dark:text-yellow-400'
      },
      {
        status: 'Needs Review',
        count: stats.needsReview,
        percentage: (stats.needsReview / stats.total) * 100,
        color: 'bg-blue-500',
        hoverColor: 'bg-blue-600',
        icon: ExclamationTriangleIconSolid,
        textColor: 'text-blue-700 dark:text-blue-400'
      },
      {
        status: 'Deferred',
        count: stats.deferred,
        percentage: (stats.deferred / stats.total) * 100,
        color: 'bg-red-500',
        hoverColor: 'bg-red-600',
        icon: XCircleIconSolid,
        textColor: 'text-red-700 dark:text-red-400'
      },
      {
        status: 'Not Started',
        count: stats.notStarted,
        percentage: (stats.notStarted / stats.total) * 100,
        color: 'bg-gray-400',
        hoverColor: 'bg-gray-500',
        icon: ClockIcon,
        textColor: 'text-gray-700 dark:text-gray-400'
      }
    ]

    return segments.filter(segment => segment.count > 0)
  }, [stats])

  const filterOptions = [
    { key: 'All', label: 'All', icon: ChartBarIcon, count: stats.total },
    { key: 'Implemented', label: 'Implemented', icon: CheckCircleIconSolid, count: stats.implemented },
    { key: 'In Progress', label: 'In Progress', icon: ClockIconSolid, count: stats.inProgress },
    { key: 'Needs Review', label: 'Needs Review', icon: ExclamationTriangleIconSolid, count: stats.needsReview },
    { key: 'Deferred', label: 'Deferred', icon: XCircleIconSolid, count: stats.deferred },
    { key: 'Not Started', label: 'Not Started', icon: ClockIcon, count: stats.notStarted }
  ]

  const handleFilterClick = (filterKey) => {
    onFilterChange(filterKey)
  }

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'Implemented': return '✅'
      case 'In Progress': return '🟨'
      case 'Needs Review': return '🔍'
      case 'Deferred': return '⏸️'
      case 'Not Started': return '⛔'
      default: return '📊'
    }
  }

  if (compact) {
    return (
      <div className={`bg-white dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-dark-300 p-4 transition-colors duration-300 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-900 transition-colors duration-300">Progress Overview</h3>
          <span className="text-2xl font-bold text-gray-900 dark:text-dark-900 transition-colors duration-300">{stats.completionPercentage}%</span>
        </div>
        
        {/* Compact Progress Bar */}
        <div className="relative w-full h-3 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden mb-3 shadow-inner transition-colors duration-300">
          {segmentData.map((segment, index) => {
            const leftOffset = segmentData.slice(0, index).reduce((sum, s) => sum + s.percentage, 0)
            const isActive = activeFilter === segment.status
            return (
              <div
                key={segment.status}
                className={`absolute top-0 h-full transition-all duration-300 cursor-pointer hover:scale-y-110 transform ${segment.color} ${
                  isActive ? 'ring-1 ring-offset-1 ring-indigo-400 dark:ring-indigo-300 z-10' : ''
                } ${
                  clickedSegment === segment.status ? 'animate-pulse' : ''
                }`}
                style={{
                  left: `${leftOffset}%`,
                  width: `${segment.percentage}%`,
                  transformOrigin: 'bottom'
                }}
                onClick={() => {
                  setClickedSegment(segment.status)
                  setTimeout(() => setClickedSegment(null), 200)
                  onFilterChange(segment.status)
                }}
              />
            )
          })}
        </div>

        {/* Compact Stats */}
        <div className="text-xs text-gray-600 dark:text-dark-600 transition-colors duration-300">
          {stats.implemented} of {stats.total} controls implemented
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6 transition-colors duration-300 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-900 mb-1 transition-colors duration-300">Compliance Progress</h2>
          <p className="text-sm text-gray-600 dark:text-dark-600 transition-colors duration-300">
            Track implementation status across {stats.total} NIST security controls
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-gray-400 dark:text-dark-400 transition-colors duration-300" />
            <span className="text-2xl font-bold text-gray-900 dark:text-dark-900 transition-colors duration-300">{stats.completionPercentage}%</span>
            <span className="text-sm text-gray-500 dark:text-dark-500 transition-colors duration-300">complete</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="relative w-full h-4 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden shadow-inner transition-colors duration-300">
          {segmentData.map((segment, index) => {
            const leftOffset = segmentData.slice(0, index).reduce((sum, s) => sum + s.percentage, 0)
            const isActive = activeFilter === segment.status
            return (
              <div
                key={segment.status}
                className={`absolute top-0 h-full transition-all duration-300 cursor-pointer hover:scale-y-110 transform ${segment.color} ${
                  isActive ? 'ring-2 ring-offset-2 ring-indigo-400 dark:ring-indigo-300 dark:ring-offset-dark-100 z-10' : ''
                } ${
                  clickedSegment === segment.status ? 'animate-pulse' : ''
                }`}
                style={{
                  left: `${leftOffset}%`,
                  width: `${segment.percentage}%`,
                  transformOrigin: 'bottom'
                }}
                onClick={() => {
                  setClickedSegment(segment.status)
                  setTimeout(() => setClickedSegment(null), 200)
                  onFilterChange(segment.status)
                }}
                title={`${segment.status}: ${segment.count} controls (${segment.percentage.toFixed(1)}%)`}
              />
            )
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs">
          {segmentData.map((segment) => {
            const Icon = segment.icon
            return (
              <div key={segment.status} className="flex items-center space-x-1">
                <div className={`w-3 h-3 rounded-full ${segment.color}`}></div>
                <Icon className={`h-3 w-3 ${segment.textColor} transition-colors duration-300`} />
                <span className="text-gray-600 dark:text-dark-600 transition-colors duration-300">
                  {segment.status} ({segment.count})
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter Buttons */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const Icon = option.icon
            const isActive = activeFilter === option.key
            return (
              <button
                key={option.key}
                onClick={() => handleFilterClick(option.key)}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out
                  ${isActive 
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm border border-primary-200 dark:border-primary-700' 
                    : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-dark-600 hover:bg-gray-200 dark:hover:bg-dark-300 hover:text-gray-800 dark:hover:text-dark-800 border border-gray-200 dark:border-dark-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
                {option.count > 0 && (
                  <span className={`
                    inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full
                    ${isActive 
                      ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200' 
                      : 'bg-gray-200 dark:bg-dark-300 text-gray-700 dark:text-dark-700'
                    }
                  `}>
                    {option.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 transition-colors duration-300">
          <div className="text-lg font-bold text-green-800 dark:text-green-300">{stats.implemented}</div>
          <div className="text-xs text-green-600 dark:text-green-400">✅ Implemented</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700 transition-colors duration-300">
          <div className="text-lg font-bold text-yellow-800 dark:text-yellow-300">{stats.inProgress}</div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">🟨 In Progress</div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors duration-300">
          <div className="text-lg font-bold text-blue-800 dark:text-blue-300">{stats.needsReview}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400">🔍 Needs Review</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-300 transition-colors duration-300">
          <div className="text-lg font-bold text-gray-800 dark:text-dark-800">{stats.notStarted}</div>
          <div className="text-xs text-gray-600 dark:text-dark-600">⛔ Not Started</div>
        </div>
      </div>
    </div>
  )
}

export default ProgressTracker 