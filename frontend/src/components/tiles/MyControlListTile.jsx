import React, { useState } from 'react'
import { 
  HeartIcon,
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  TagIcon,
  FolderIcon,
  StarIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

const MyControlListTile = ({ 
  favorites = [], 
  controls = [],
  onControlSelect,
  onToggleFavorite,
  onNavigate,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

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

  // Get full control objects for favorites with family information
  const favoriteControls = favorites
    .map(id => {
      const control = controls.find(c => c.control_id === id)
      if (control) {
        return {
          ...control,
          family: getFamilyFromControlId(control.control_id)
        }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.control_id.localeCompare(b.control_id))

  // Filter controls based on search and category
  const filteredControls = favoriteControls.filter(control => {
    const matchesSearch = !searchQuery || 
      control.control_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      control.control_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      control.family.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || 
      control.family.toLowerCase() === selectedCategory.toLowerCase()
    
    return matchesSearch && matchesCategory
  })

  // Get unique families from favorite controls
  const categories = ['all', ...new Set(favoriteControls.map(c => c.family))]

  const handleRemoveFromList = (controlId, e) => {
    e.stopPropagation()
    onToggleFavorite?.(controlId)
  }

  const handleViewControl = (control, e) => {
    e.stopPropagation()
    onControlSelect?.(control)
  }

  const handleAddControls = () => {
    // Navigate to control search to add more controls
    onNavigate?.('control-explorer')
  }

  if (favorites.length === 0) {
    return (
      <div className={`h-full flex flex-col items-center justify-center text-center p-6 ${className}`}>
        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center mb-4">
          <HeartIcon className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Controls in Your List
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
          Start building your personal control list by favoriting controls while exploring.
        </p>
        <button
          onClick={handleAddControls}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Controls
        </button>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <HeartIconSolid className="h-5 w-5 text-red-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            My Control List ({favorites.length})
          </h3>
        </div>
        <button
          onClick={handleAddControls}
          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Add more controls"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Search and filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your controls..."
            className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20'
              }`}
            >
              {category === 'all' ? 'All' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Controls list */}
      <div className="flex-1 overflow-y-auto">
        {filteredControls.length === 0 ? (
          <div className="text-center py-8">
            <MagnifyingGlassIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No controls match your search
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredControls.map((control) => (
              <div
                key={control.control_id}
                className="group p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200"
                onClick={() => handleViewControl(control)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <ShieldCheckIcon className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {control.control_id}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {control.family}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 line-clamp-1">
                      {control.control_name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {control.plain_english_explanation}
                    </p>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleViewControl(control, e)}
                      className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleRemoveFromList(control.control_id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remove from list"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {filteredControls.length} of {favorites.length} controls
          </span>
          <span className="flex items-center space-x-1">
            <HeartIconSolid className="h-3 w-3 text-red-500" />
            <span>Saved</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default MyControlListTile