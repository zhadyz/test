import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BookOpenIcon,
  ArrowRightIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EyeIcon,
  PencilIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  HeartIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  XCircleIcon as XCircleIconSolid,
  HeartIcon as HeartIconSolid
} from '@heroicons/react/24/solid'
import { useTheme } from '../contexts/ThemeContext'

// Custom hook for debounced search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function ControlSearch({ controls, onControlSelect, loading }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFamily, setSelectedFamily] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [sortBy, setSortBy] = useState('control_id') // control_id, title, status, family, last_updated
  const [sortOrder, setSortOrder] = useState('asc') // asc, desc
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'table'

  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Mock tracker data for initial rollout (simplified)
  const trackerData = []

  // Simple status function for initial rollout
  const getControlStatus = useCallback((controlId) => {
    // For initial rollout, return a default status
    return 'Not Started'
  }, [])

  // Get unique control families for filtering
  const controlFamilies = useMemo(() => {
    if (!controls || !Array.isArray(controls)) return []
    return [...new Set(controls.map(control => control.control_id.split('-')[0]))].sort()
  }, [controls])

  // Status options for filtering
  const statusOptions = [
    { value: '', label: 'All Statuses', count: controls?.length || 0 },
    { value: 'Implemented', label: 'Implemented', count: 0 },
    { value: 'In Progress', label: 'In Progress', count: 0 },
    { value: 'Needs Review', label: 'Needs Review', count: 0 },
    { value: 'Deferred', label: 'Deferred', count: 0 },
    { value: 'Not Started', label: 'Not Started', count: 0 }
  ]

  // Calculate status counts
  statusOptions.forEach(option => {
    if (option.value && controls && Array.isArray(controls)) {
      option.count = controls.filter(control => getControlStatus(control.control_id) === option.value).length
    }
  })

  // Sort options
  const sortOptions = [
    { value: 'control_id', label: 'Control ID' },
    { value: 'title', label: 'Title' },
    { value: 'family', label: 'Family' },
    { value: 'status', label: 'Status' },
    { value: 'last_updated', label: 'Last Updated' }
  ]

  // Filter and sort controls
  const filteredAndSortedControls = useMemo(() => {
    if (!controls) return []

    let filtered = controls

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(control =>
        control.control_id.toLowerCase().includes(query) ||
        control.control_name.toLowerCase().includes(query) ||
        control.intent.toLowerCase().includes(query) ||
        control.official_text.toLowerCase().includes(query)
      )
    }

    // Apply family filter
    if (selectedFamily) {
      filtered = filtered.filter(control => 
        control.control_id.startsWith(selectedFamily + '-')
      )
    }

    // Apply status filter
    if (selectedStatus) {
      filtered = filtered.filter(control => 
        getControlStatus(control.control_id) === selectedStatus
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'title':
          aValue = a.control_name.toLowerCase()
          bValue = b.control_name.toLowerCase()
          break
        case 'family':
          aValue = a.control_id.split('-')[0]
          bValue = b.control_id.split('-')[0]
          break
        case 'status':
          aValue = getControlStatus(a.control_id)
          bValue = getControlStatus(b.control_id)
          break
        case 'last_updated': {
          const aTracker = trackerData.find(t => t.control_id === a.control_id)
          const bTracker = trackerData.find(t => t.control_id === b.control_id)
          aValue = aTracker?.last_updated || '1970-01-01'
          bValue = bTracker?.last_updated || '1970-01-01'
          break
        }
        default: // control_id
          aValue = a.control_id
          bValue = b.control_id
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [controls, debouncedSearchQuery, selectedFamily, selectedStatus, sortBy, sortOrder, getControlStatus, trackerData])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedFamily('')
    setSelectedStatus('')
    setSortBy('control_id')
    setSortOrder('asc')

    setShowMobileFilters(false)
  }

  const handleControlClick = (control) => {
    onControlSelect(control)
  }

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  const highlightText = (text, query) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100 px-1 rounded transition-colors duration-300">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      'Implemented': {
        icon: CheckCircleIconSolid,
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-800 dark:text-green-300',
        iconColor: 'text-green-600 dark:text-green-400'
      },
      'In Progress': {
        icon: ClockIconSolid,
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-800 dark:text-yellow-300',
        iconColor: 'text-yellow-600 dark:text-yellow-400'
      },
      'Needs Review': {
        icon: ExclamationTriangleIconSolid,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-800 dark:text-blue-300',
        iconColor: 'text-blue-600 dark:text-blue-400'
      },
      'Deferred': {
        icon: XCircleIconSolid,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-800 dark:text-red-300',
        iconColor: 'text-red-600 dark:text-red-400'
      },
      'Not Started': {
        icon: ClockIcon,
        bgColor: 'bg-gray-100 dark:bg-gray-800/50',
        textColor: 'text-gray-800 dark:text-gray-300',
        iconColor: 'text-gray-600 dark:text-gray-400'
      }
    }

    const config = statusConfig[status] || statusConfig['Not Started']
    const IconComponent = config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-300 ${config.bgColor} ${config.textColor}`}>
        <IconComponent className={`w-3 h-3 mr-1 transition-colors duration-300 ${config.iconColor}`} />
        {status}
      </span>
    )
  }

  // Add state for dropdowns
  const [familyDropdownOpen, setFamilyDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const familyDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (familyDropdownRef.current && !familyDropdownRef.current.contains(event.target)) setFamilyDropdownOpen(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) setStatusDropdownOpen(false);
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) setSortDropdownOpen(false);
    }
    if (familyDropdownOpen || statusDropdownOpen || sortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [familyDropdownOpen, statusDropdownOpen, sortDropdownOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Loading NIST controls...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{background: 'red', color: 'white', padding: 8, fontWeight: 'bold'}}>TESTING CONTROLSEARCH JSX</div>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">NIST 800-53 Controls</h1>
            <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">
              Search and explore {controls?.length || 0} security controls with detailed implementation guidance
            </p>
          </div>

          {/* Enhanced Search Bar - Full Width */}
          <div className="mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 dark:text-dark-400 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300" />
              <input
                type="text"
                placeholder="Search by control ID, keyword, or family..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-4 text-lg border border-gray-300 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent shadow-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-400 hover:text-gray-600 dark:hover:text-dark-600 transition-colors duration-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {filteredAndSortedControls.length === 0 ? (
            <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-12 text-center transition-colors duration-300">
              <BookOpenIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-dark-400 mb-4 transition-colors duration-300" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">No controls found</h3>
              <p className="text-gray-600 dark:text-dark-600 mb-6 max-w-md mx-auto transition-colors duration-300">
                {searchQuery || selectedFamily || selectedStatus 
                  ? "Try adjusting your search terms or filters to find what you're looking for."
                  : "No controls available to display."
                }
              </p>
              {(searchQuery || selectedFamily || selectedStatus) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-300"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedControls.map((control) => {
                const status = getControlStatus(control.control_id)
                return (
                  <div
                    key={control.control_id}
                    className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6 hover:shadow-md hover:border-gray-300 dark:hover:border-dark-400 transition-all duration-300 cursor-pointer group"
                    onClick={() => handleControlClick(control)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-medium transition-colors duration-300">
                          {control.control_id}
                        </span>
                        <StatusBadge status={status} />
                      </div>
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-dark-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300" />
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-dark-900 mb-3 line-clamp-2 transition-colors duration-300" title={control.control_name}>
                      {highlightText(control.control_name, debouncedSearchQuery)}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-dark-600 line-clamp-3 transition-colors duration-300" title={control.intent}>
                      {highlightText(control.intent, debouncedSearchQuery)}
                    </p>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-300 transition-colors duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-dark-500 transition-colors duration-300">
                          Family: {control.control_id.split('-')[0]}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleControlClick(control)
                            }}
                            className="p-1.5 text-gray-400 dark:text-dark-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleControlClick(control)
                            }}
                            className="p-1.5 text-gray-400 dark:text-dark-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 overflow-hidden transition-colors duration-300">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-300">
                  <thead className="bg-gray-50 dark:bg-dark-200 transition-colors duration-300">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors duration-300"
                        onClick={() => handleSort('control_id')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Control ID</span>
                          {sortBy === 'control_id' && (
                            <span className="text-indigo-600 dark:text-indigo-400 transition-colors duration-300">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors duration-300"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Title</span>
                          {sortBy === 'title' && (
                            <span className="text-indigo-600 dark:text-indigo-400 transition-colors duration-300">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors duration-300"
                        onClick={() => handleSort('family')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Family</span>
                          {sortBy === 'family' && (
                            <span className="text-indigo-600 dark:text-indigo-400 transition-colors duration-300">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors duration-300"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          {sortBy === 'status' && (
                            <span className="text-indigo-600 dark:text-indigo-400 transition-colors duration-300">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider transition-colors duration-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-100 divide-y divide-gray-200 dark:divide-dark-300 transition-colors duration-300">
                    {filteredAndSortedControls.map((control) => {
                      const status = getControlStatus(control.control_id)
                      return (
                        <tr 
                          key={control.control_id} 
                          className="hover:bg-gray-50 dark:hover:bg-dark-200 cursor-pointer transition-colors duration-300"
                          onClick={() => handleControlClick(control)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-medium transition-colors duration-300">
                              {control.control_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-dark-900 line-clamp-2 transition-colors duration-300" title={control.control_name}>
                              {highlightText(control.control_name, debouncedSearchQuery)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-dark-500 line-clamp-1 mt-1 transition-colors duration-300" title={control.intent}>
                              {highlightText(control.intent, debouncedSearchQuery)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-900 transition-colors duration-300">
                            {control.control_id.split('-')[0]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleControlClick(control)
                                }}
                                className="p-2 text-gray-400 dark:text-dark-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                title="View Details"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleControlClick(control)
                                }}
                                className="p-2 text-gray-400 dark:text-dark-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ControlSearch 