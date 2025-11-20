import { useState, useEffect } from 'react'

function Tracker({ onSelectControl }) {
  const [trackerData, setTrackerData] = useState({
    records: [],
    loading: true,
    error: null,
    summary: null
  })

  const [filters, setFilters] = useState({
    status: '',
    owner: '',
    searchTerm: ''
  })

  // Load tracker data on component mount
  useEffect(() => {
    loadTrackerData()
    loadSummaryData()
  }, [])

  // Load all tracker records
  const loadTrackerData = async () => {
    setTrackerData(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/tracker')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setTrackerData(prev => ({
          ...prev,
          records: data.data || [],
          loading: false
        }))
      } else {
        throw new Error(data.message || 'Failed to load tracker data')
      }
    } catch (error) {
      console.error('Failed to load tracker data:', error)
      setTrackerData(prev => ({
        ...prev,
        loading: false,
        error: `Failed to load data: ${error.message}`
      }))
    }
  }

  // Load summary statistics
  const loadSummaryData = async () => {
    try {
      const response = await fetch('/api/tracker/stats/summary')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setTrackerData(prev => ({
          ...prev,
          summary: data.data
        }))
      }
    } catch (error) {
      console.error('Failed to load summary data:', error)
    }
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Not Started': return '⭕'
      case 'In Progress': return '🔄'
      case 'Implemented': return '✅'
      case 'Needs Review': return '🔍'
      case 'Deferred': return '⏸️'
      default: return '❓'
    }
  }

  // Get status color class with dark mode support
  const getStatusClass = (status) => {
    switch (status) {
      case 'Implemented':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
      case 'In Progress':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700'
      case 'Needs Review':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700'
      case 'Deferred':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-dark-600 border-gray-200 dark:border-dark-300'
    }
  }

  // Filter records based on current filters
  const filteredRecords = trackerData.records.filter(record => {
    if (filters.status && record.status !== filters.status) return false
    if (filters.owner && !record.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      return (
        record.control_id.toLowerCase().includes(term) ||
        record.owner.toLowerCase().includes(term) ||
        record.notes.toLowerCase().includes(term)
      )
    }
    return true
  })

  // Get unique owners for filter dropdown
  const uniqueOwners = [...new Set(trackerData.records.map(record => record.owner))].sort()

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (trackerData.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-300 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 p-8 text-center transition-colors duration-300">
            <div className="text-gray-900 dark:text-dark-900 text-lg transition-colors duration-300">
              📊 Loading implementation tracker...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-300 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900 mb-4 transition-colors duration-300">📊 Implementation Tracker</h1>
          <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Track and monitor the implementation status of NIST 800-53 controls across your organization.</p>
        </div>

        {/* Summary Statistics */}
        {trackerData.summary && (
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 p-6 transition-colors duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-dark-200 rounded-lg transition-colors duration-300">
                <div className="text-3xl font-bold text-gray-900 dark:text-dark-900 transition-colors duration-300">{trackerData.summary.total_controls}</div>
                <div className="text-sm text-gray-600 dark:text-dark-600 transition-colors duration-300">Total Controls Tracked</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors duration-300">
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-300 transition-colors duration-300">{trackerData.summary.completion_rate}%</div>
                <div className="text-sm text-blue-600 dark:text-blue-400 transition-colors duration-300">Completion Rate</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg transition-colors duration-300">
                <div className="text-3xl font-bold text-green-900 dark:text-green-300 transition-colors duration-300">{trackerData.summary.status_breakdown['Implemented'] || 0}</div>
                <div className="text-sm text-green-600 dark:text-green-400 transition-colors duration-300">Implemented</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg transition-colors duration-300">
                <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-300 transition-colors duration-300">{trackerData.summary.status_breakdown['In Progress'] || 0}</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400 transition-colors duration-300">In Progress</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 p-6 transition-colors duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">Filter by Status:</label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300"
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
              <label htmlFor="owner-filter" className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">Filter by Owner:</label>
              <select
                id="owner-filter"
                value={filters.owner}
                onChange={(e) => setFilters(prev => ({ ...prev, owner: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300"
              >
                <option value="">All Owners</option>
                {uniqueOwners.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">Search:</label>
              <input
                id="search-filter"
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                placeholder="Search controls, owners, or notes..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', owner: '', searchTerm: '' })}
                className="w-full px-4 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {trackerData.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 transition-colors duration-300">
            <div className="text-red-800 dark:text-red-300 transition-colors duration-300">
              ❌ {trackerData.error}
            </div>
          </div>
        )}

        {/* Results Info */}
        <div className="text-gray-600 dark:text-dark-600 transition-colors duration-300">
          <p>
            Showing {filteredRecords.length} of {trackerData.records.length} tracked controls
            {(filters.status || filters.owner || filters.searchTerm) && ' (filtered)'}
          </p>
        </div>

        {/* Tracker Table */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 p-8 text-center transition-colors duration-300">
            {trackerData.records.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">No controls are being tracked yet</h3>
                <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Start by viewing a control and clicking "Start Tracking" to begin implementation tracking.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">No controls match your filters</h3>
                <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Try adjusting your search criteria or clearing the filters.</p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 overflow-hidden transition-colors duration-300">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-200 transition-colors duration-300">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider transition-colors duration-300">Control ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider transition-colors duration-300">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider transition-colors duration-300">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider transition-colors duration-300">Last Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider transition-colors duration-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-300 transition-colors duration-300">
                  {filteredRecords.map(record => (
                    <tr key={record.control_id} className="hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-dark-900 transition-colors duration-300">{record.control_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-300 ${getStatusClass(record.status)}`}>
                          {getStatusIcon(record.status)} {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-dark-900 transition-colors duration-300">
                        {record.owner}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-dark-500 transition-colors duration-300">
                        {formatDate(record.last_updated)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => onSelectControl(record.control_id)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium transition-colors duration-200"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Tracker 