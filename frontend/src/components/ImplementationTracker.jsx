import { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ChartBarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import ProgressTracker from './ProgressTracker'

function ImplementationTracker({ controls, onControlSelect, loading }) {
  const [trackerData, setTrackerData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')


  // Load tracker data from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('nist_tracker') || '[]')
    
    // Merge saved data with controls
    const merged = controls.map(control => {
      const existing = saved.find(item => item.control_id === control.control_id)
      return {
        ...control,
        status: existing?.status || 'Not Started',
        owner: existing?.owner || '',
        notes: existing?.notes || '',
        last_updated: existing?.last_updated || null
      }
    })

    setTrackerData(merged)
  }, [controls])

  // Apply filters
  useEffect(() => {
    let filtered = trackerData

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    if (ownerFilter) {
      filtered = filtered.filter(item => 
        item.owner.toLowerCase().includes(ownerFilter.toLowerCase())
      )
    }

    setFilteredData(filtered)
  }, [trackerData, statusFilter, ownerFilter])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Implemented':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'In Progress':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'Needs Review':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />
      case 'Deferred':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Implemented':
        return 'status-implemented'
      case 'In Progress':
        return 'status-in-progress'
      case 'Needs Review':
        return 'status-needs-review'
      case 'Deferred':
        return 'status-deferred'
      default:
        return 'status-not-started'
    }
  }

  const getUniqueOwners = () => {
    return [...new Set(trackerData.filter(item => item.owner).map(item => item.owner))]
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Loading implementation tracker...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">Implementation Tracker</h1>
          <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">
            Track progress and manage implementation of {controls.length} NIST security controls
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="mb-8">
          <ProgressTracker
            controls={controls}
            onFilterChange={(filter) => setStatusFilter(filter === 'All' ? '' : filter)}
            activeFilter={statusFilter || 'All'}
          />
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="flex items-center space-x-4">
            <FunnelIcon className="h-5 w-5 text-gray-400 dark:text-dark-400 transition-colors duration-300" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">
                  Filter by Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Statuses</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Implemented">Implemented</option>
                  <option value="Needs Review">Needs Review</option>
                  <option value="Deferred">Deferred</option>
                </select>
              </div>

              <div>
                <label htmlFor="owner-filter" className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">
                  Filter by Owner
                </label>
                <select
                  id="owner-filter"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Owners</option>
                  {getUniqueOwners().map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter('')
                    setOwnerFilter('')
                  }}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Controls List */}
        <div className="space-y-4">
          {filteredData.length === 0 ? (
            <div className="card text-center">
              <div className="mx-auto max-w-md">
                <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-dark-400 mb-4 transition-colors duration-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">No controls found</h3>
                <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">
                  Try adjusting your filters to see more controls.
                </p>
              </div>
            </div>
          ) : (
            filteredData.map((control) => (
              <div
                key={control.control_id}
                onClick={() => onControlSelect(control)}
                className="card hover:shadow-md cursor-pointer transition-all duration-200 ease-in-out"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm font-medium transition-colors duration-300">
                        {control.control_id}
                      </span>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(control.status)}
                        <span className={`status-badge ${getStatusColor(control.status)}`}>
                          {control.status}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">
                      {control.control_name}
                    </h3>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-dark-600 transition-colors duration-300">
                      {control.owner && (
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-4 w-4" />
                          <span>{control.owner}</span>
                        </div>
                      )}
                      {control.last_updated && (
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>Updated {new Date(control.last_updated).toLocaleDateString()}</span>
                        </div>
                      )}
                      {control.notes && (
                        <div className="flex items-center space-x-1">
                          <DocumentTextIcon className="h-4 w-4" />
                          <span className="truncate max-w-xs">{control.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-dark-400 ml-4 transition-colors duration-300" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ImplementationTracker 