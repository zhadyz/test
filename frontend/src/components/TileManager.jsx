import React, { useState, useEffect } from 'react'
import { 
  PlusIcon,
  Squares2X2Icon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline'
import ModularTile from './ModularTile'

const TileManager = ({ 
  tiles = [], 
  onTileAdd, 
  onTileRemove, 
  onTileConfig,
  onTileMove,
  availableTiles = [],
  className = ''
}) => {
  const [layout, setLayout] = useState('grid') // grid, masonry, list
  const [gridCols, setGridCols] = useState(3)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [activeTiles, setActiveTiles] = useState(tiles)

  useEffect(() => {
    setActiveTiles(tiles)
  }, [tiles])

  const handleAddTile = (tileType) => {
    if (onTileAdd) onTileAdd(tileType)
    setShowAddMenu(false)
  }

  const handleRemoveTile = (tileId) => {
    if (onTileRemove) onTileRemove(tileId)
  }

  const handleTileConfig = (tileId) => {
    if (onTileConfig) onTileConfig(tileId)
  }

  const getLayoutClasses = () => {
    switch (layout) {
      case 'grid':
        return `grid gap-6 ${
          gridCols === 1 ? 'grid-cols-1' :
          gridCols === 2 ? 'grid-cols-1 md:grid-cols-2' :
          gridCols === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`
      case 'masonry':
        return 'columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6'
      case 'list':
        return 'flex flex-col space-y-4'
      default:
        return 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${className}`}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {activeTiles.length} active tiles
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Layout Controls */}
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setLayout('grid')}
                className={`p-2 rounded ${layout === 'grid' ? 
                  'bg-white dark:bg-gray-600 shadow-sm' : 
                  'hover:bg-gray-200 dark:hover:bg-gray-600'
                } transition-colors duration-200`}
                title="Grid Layout"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLayout('list')}
                className={`p-2 rounded ${layout === 'list' ? 
                  'bg-white dark:bg-gray-600 shadow-sm' : 
                  'hover:bg-gray-200 dark:hover:bg-gray-600'
                } transition-colors duration-200`}
                title="List Layout"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Grid Columns Control */}
            {layout === 'grid' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Columns:</span>
                <select
                  value={gridCols}
                  onChange={(e) => setGridCols(Number(e.target.value))}
                  className="px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
            )}

            {/* Add Tile Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Tile</span>
              </button>

              {/* Add Tile Menu */}
              {showAddMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <div className="p-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2">
                      Available Tiles
                    </div>
                    {availableTiles.map((tile) => (
                      <button
                        key={tile.id}
                        onClick={() => handleAddTile(tile.id)}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                      >
                        <tile.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {tile.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tile.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tiles Container */}
      <div className="p-6">
        {activeTiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-gray-400 mb-4">
              <Squares2X2Icon className="h-16 w-16" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tiles added yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
              Add your first tile to start building your personalized dashboard. 
              Choose from various controls, tools, and features.
            </p>
            <button
              onClick={() => setShowAddMenu(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Your First Tile</span>
            </button>
          </div>
        ) : (
          <div className={getLayoutClasses()}>
            {activeTiles.map((tile) => (
              <div 
                key={tile.id} 
                className={layout === 'masonry' ? 'break-inside-avoid mb-6' : ''}
              >
                <ModularTile
                  {...tile}
                  onClose={handleRemoveTile}
                  onConfig={handleTileConfig}
                  closable={true}
                  configurable={tile.configurable}
                  collapsible={tile.collapsible}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close add menu */}
      {showAddMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowAddMenu(false)}
        />
      )}
    </div>
  )
}

export default TileManager