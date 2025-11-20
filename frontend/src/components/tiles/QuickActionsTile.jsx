import React from 'react'
import { 
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

const QuickActionsTile = ({ 
  onNavigate,
  onQuickSearch,
  onRandomControl,
  onShowFavorites,
  className = ''
}) => {
  const quickActions = [
    {
      id: 'quick-search',
      title: 'Quick Search',
      description: 'Search all controls',
      icon: MagnifyingGlassIcon,
      color: 'blue',
      onClick: () => onQuickSearch?.()
    },
    {
      id: 'random-control',
      title: 'Random Control',
      description: 'Explore a random control',
      icon: ShieldCheckIcon,
      color: 'green',
      onClick: () => onRandomControl?.()
    },
    {
      id: 'tool-mapper',
      title: 'Tool Mapper',
      description: 'Map controls to tools',
      icon: WrenchScrewdriverIcon,
      color: 'purple',
      onClick: () => onNavigate?.('tool-mapper')
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      description: 'Get AI guidance',
      icon: SparklesIcon,
      color: 'indigo',
      onClick: () => onNavigate?.('spud-ai-basic')
    }
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
    }
    return colors[color] || colors.blue
  }

  return (
    <div className={`h-full ${className}`}>
      <div className="grid grid-cols-1 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md group ${getColorClasses(action.color)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1 truncate">
                      {action.title}
                    </h4>
                    <p className="text-xs opacity-75 truncate">
                      {action.description}
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Quick Shortcuts
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Press</span>
            <div className="flex space-x-1">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl</kbd>
              <span className="text-gray-400">+</span>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">K</kbd>
              <span className="text-gray-600 dark:text-gray-400 ml-2">to search</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickActionsTile
