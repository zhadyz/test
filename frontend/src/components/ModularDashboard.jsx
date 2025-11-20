import React, { useState, useEffect } from 'react'
import { 
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  HeartIcon,
  UserCircleIcon,
  ClockIcon,
  FolderIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline'

import TileManager from './TileManager'
import ModularTile from './ModularTile'
import BaselineSelector from './BaselineSelector'
import { useSystem } from '../contexts/SystemContext'

// Import tile components
import ControlSearchTile from './tiles/ControlSearchTile'
import AIAssistantTile from './tiles/AIAssistantTile'
import StatsOverviewTile from './tiles/StatsOverviewTile'
import QuickActionsTile from './tiles/QuickActionsTile'
import ToolMapperTile from './tiles/ToolMapperTile'
import ComplianceTrackerTile from './tiles/ComplianceTrackerTile'
import EvidenceManagerTile from './tiles/EvidenceManagerTile'
import MyControlListTile from './tiles/MyControlListTile'

const ModularDashboard = ({
  controls = [],
  favorites = [],
  usageStats = {},
  onControlSelect,
  onToggleFavorite,
  onSearch,
  onNavigate,
  onAIQuery,
  selectedControl = null
}) => {
  const [activeTiles, setActiveTiles] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const { selectedBaseline, setSelectedBaseline } = useSystem();

  // Available tile definitions - Perfect Modularity
  const availableTiles = [
    {
      id: 'control-search',
      title: 'Control Search',
      description: 'Search and browse NIST controls',
      icon: MagnifyingGlassIcon,
      component: ControlSearchTile,
      color: 'blue',
      size: 'large',
      collapsible: true,
      configurable: true
    },
    {
      id: 'stats-overview',
      title: 'Stats Overview',
      description: 'View your progress and statistics',
      icon: ChartBarIcon,
      component: StatsOverviewTile,
      color: 'green',
      size: 'medium',
      collapsible: true
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      description: 'Fast access to common tasks',
      icon: CogIcon,
      component: QuickActionsTile,
      color: 'purple',
      size: 'medium',
      collapsible: true
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      description: 'Get AI-powered guidance',
      icon: SparklesIcon,
      component: AIAssistantTile,
      color: 'indigo',
      size: 'medium',
      collapsible: true,
      configurable: true
    },
    {
      id: 'tool-mapper',
      title: 'Platform Mapper',
      description: 'Map controls to platforms and tools',
      icon: WrenchScrewdriverIcon,
      component: ToolMapperTile,
      color: 'blue',
      size: 'large',
      collapsible: true,
      configurable: true
    },
    {
      id: 'compliance-tracker',
      title: 'Compliance Tracker',
      description: 'Track implementation progress',
      icon: CheckBadgeIcon,
      component: ComplianceTrackerTile,
      color: 'miami',
      size: 'large',
      collapsible: true,
      configurable: true
    },
    {
      id: 'evidence-manager',
      title: 'Evidence Manager',
      description: 'Manage compliance evidence',
      icon: FolderIcon,
      component: EvidenceManagerTile,
      color: 'green',
      size: 'medium',
      collapsible: true,
      configurable: true
    },
    {
      id: 'my-control-list',
      title: 'My Control List',
      description: 'Manage your saved controls',
      icon: HeartIcon,
      component: MyControlListTile,
      color: 'red',
      size: 'large',
      collapsible: true,
      configurable: true
    },
    {
      id: 'recent-activity',
      title: 'Recent Activity',
      description: 'Your recent actions and history',
      icon: ClockIcon,
      component: ({ usageStats }) => (
        <div className="h-full">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Searches today</span>
              <span className="font-medium">{usageStats.searchQueriesUsed || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Controls viewed</span>
              <span className="font-medium">{usageStats.controlLookupsUsed || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">AI queries</span>
              <span className="font-medium">{usageStats.aiQueriesUsed || 0}/3</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
            Activity tracking helps you understand your research patterns and optimize your workflow.
          </div>
        </div>
      ),
      color: 'cyan',
      size: 'small',
      collapsible: true
    },
    {
      id: 'control-families',
      title: 'Control Families',
      description: 'Browse controls by family',
      icon: DocumentTextIcon,
      component: ({ controls, onControlSelect }) => {
        const families = [...new Set(controls.map(c => c.family))].sort()
        return (
          <div className="h-full">
            <div className="grid grid-cols-1 gap-2">
              {families.slice(0, 8).map(family => {
                const count = controls.filter(c => c.family === family).length
                return (
                  <button
                    key={family}
                    className="p-2 text-left border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{family}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {count}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      },
      color: 'yellow',
      size: 'medium',
      collapsible: true
    }
  ]

  // Initialize with default tiles for perfect modularity
  useEffect(() => {
    const defaultTiles = [
      'control-search',
      'my-control-list',
      'stats-overview', 
      'quick-actions',
      'ai-assistant'
    ]
    
    const initialTiles = defaultTiles.map(tileId => {
      const tileConfig = availableTiles.find(t => t.id === tileId)
      return {
        id: `${tileId}-${Date.now()}`,
        ...tileConfig,
        children: renderTileContent(tileConfig)
      }
    })
    
    setActiveTiles(initialTiles)
  }, [])

  const renderTileContent = (tileConfig) => {
    const Component = tileConfig.component
    
    const commonProps = {
      controls,
      favorites,
      usageStats,
      onControlSelect,
      onToggleFavorite,
      onSearch: handleSearch,
      onNavigate,
      onAIQuery,
      selectedControl,
      searchQuery,
      searchResults
    }

    return <Component {...commonProps} />
  }

  const handleAddTile = (tileType) => {
    const tileConfig = availableTiles.find(t => t.id === tileType)
    if (!tileConfig) return

    const newTile = {
      id: `${tileType}-${Date.now()}`,
      ...tileConfig,
      children: renderTileContent(tileConfig)
    }

    setActiveTiles(prev => [...prev, newTile])
  }

  const handleRemoveTile = (tileId) => {
    setActiveTiles(prev => prev.filter(tile => tile.id !== tileId))
  }

  const handleTileConfig = (tileId) => {
    console.log('Configure tile:', tileId)
    // Implement tile configuration logic
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (onSearch) {
      const results = await onSearch(query)
      setSearchResults(results || [])
    }
  }

  const handleQuickSearch = () => {
    // Focus on search tile or add one if not present
    const searchTile = activeTiles.find(tile => tile.id.startsWith('control-search'))
    if (!searchTile) {
      handleAddTile('control-search')
    }
  }

  const handleRandomControl = () => {
    if (controls.length > 0) {
      const randomControl = controls[Math.floor(Math.random() * controls.length)]
      onControlSelect?.(randomControl)
    }
  }

  const handleShowFavorites = () => {
    const favoriteTile = activeTiles.find(tile => tile.id.startsWith('favorites'))
    if (!favoriteTile) {
      handleAddTile('favorites')
    }
  }

  // Update tile content when props change
  useEffect(() => {
    setActiveTiles(prev => prev.map(tile => ({
      ...tile,
      children: renderTileContent(tile)
    })))
  }, [controls, favorites, usageStats, selectedControl, searchQuery, searchResults])

  return (
    <div className="space-y-6">
      {/* Baseline Selector at the top */}
      <BaselineSelector
        selectedBaseline={selectedBaseline}
        onBaselineChange={setSelectedBaseline}
        showDetails={true}
        className="mb-6"
      />
      {/* Existing dashboard content below */}
      <TileManager
        tiles={activeTiles}
        availableTiles={availableTiles}
        onTileAdd={handleAddTile}
        onTileRemove={handleRemoveTile}
        onTileConfig={handleTileConfig}
      />
    </div>
  )
}

export default ModularDashboard 