import React, { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  HeartIcon,
  FunnelIcon,
  PlusIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

const ControlSearchTile = ({ 
  controls = [], 
  onControlSelect, 
  favorites = [], 
  onToggleFavorite,
  onSearch,
  searchQuery = '',
  searchResults = []
}) => {
  const [query, setQuery] = useState(searchQuery)
  const [results, setResults] = useState([])

  // Simple family mapping for NIST controls
  const getFamilyFromControlId = (controlId) => {
    const prefix = controlId.split('-')[0]
    const familyMap = {
      'AC': 'Access Control',
      'AU': 'Audit and Accountability', 
      'CM': 'Configuration Management',
      'IA': 'Identification and Authentication',
      'IR': 'Incident Response',
      'PE': 'Physical and Environmental Protection',
      'RA': 'Risk Assessment',
      'SC': 'System and Communications Protection',
      'SI': 'System and Information Integrity',
      'CP': 'Contingency Planning',
      'MP': 'Media Protection',
      'PS': 'Personnel Security'
    }
    return familyMap[prefix] || 'Other'
  }

  useEffect(() => {
    if (searchResults.length > 0) {
      setResults(searchResults)
    } else if (query.trim()) {
      const filtered = controls.filter(control => 
        control.control_id.toLowerCase().includes(query.toLowerCase()) ||
        control.control_name.toLowerCase().includes(query.toLowerCase()) ||
        getFamilyFromControlId(control.control_id).toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered.slice(0, 10))
    } else {
      setResults(controls.slice(0, 10))
    }
  }, [searchResults, query, controls])

  const handleSearch = (searchValue) => {
    setQuery(searchValue)
    if (onSearch) onSearch(searchValue)
  }

  const handleAddToList = (controlId, e) => {
    e.stopPropagation()
    onToggleFavorite?.(controlId)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search header */}
      <div className="mb-4">
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search NIST controls..."
            className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        {/* Quick info banner */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <HeartIconSolid className="h-4 w-4 text-red-500" />
            <span className="text-xs text-blue-800 dark:text-blue-200">
              Click the heart to add controls to your personal list
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {results.map((control) => {
            const isInList = favorites.includes(control.control_id)
            const family = getFamilyFromControlId(control.control_id)
            return (
              <div
                key={control.control_id}
                onClick={() => onControlSelect?.(control)}
                className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{control.control_id}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{family}</span>
                      {isInList && (
                        <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded flex items-center space-x-1">
                          <CheckIcon className="h-3 w-3" />
                          <span>In List</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">{control.control_name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{control.plain_english_explanation}</p>
                  </div>
                  
                  {/* Enhanced add to list button */}
                  <div className="ml-2 flex items-center space-x-1">
                    <button
                      onClick={(e) => handleAddToList(control.control_id, e)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isInList
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 group-hover:text-red-500'
                      }`}
                      title={isInList ? 'Remove from list' : 'Add to list'}
                    >
                      {isInList ? (
                        <HeartIconSolid className="h-4 w-4" />
                      ) : (
                        <HeartIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{controls.length} total controls</span>
          <div className="flex items-center space-x-2">
            <HeartIconSolid className="h-3 w-3 text-red-500" />
            <span>{favorites.length} in your list</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ControlSearchTile