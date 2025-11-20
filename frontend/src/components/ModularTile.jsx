import React, { useState } from 'react'
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  MinusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

const ModularTile = ({ 
  id,
  title, 
  subtitle,
  icon: Icon, 
  children, 
  className = '',
  size = 'medium', // small, medium, large, full
  color = 'blue',
  collapsible = false,
  closable = false,
  configurable = false,
  defaultCollapsed = false,
  onClose,
  onConfig,
  onSizeChange,
  headerActions = [],
  footerActions = [],
  loading = false,
  error = null,
  badge = null,
  gradient = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isMinimized, setIsMinimized] = useState(false)

  // Size classes
  const sizeClasses = {
    small: 'w-full max-w-sm',
    medium: 'w-full max-w-md',
    large: 'w-full max-w-lg',
    xl: 'w-full max-w-xl',
    full: 'w-full'
  }

  // Color themes with Miami Vice inspiration
  const colorThemes = {
    blue: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-blue-200 dark:border-blue-700',
      header: 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
      accent: 'text-blue-600 dark:text-blue-400',
      button: 'hover:bg-blue-50 dark:hover:bg-blue-900/30'
    },
    purple: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-purple-200 dark:border-purple-700',
      header: 'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30',
      accent: 'text-purple-600 dark:text-purple-400',
      button: 'hover:bg-purple-50 dark:hover:bg-purple-900/30'
    },
    cyan: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-cyan-200 dark:border-cyan-700',
      header: 'bg-gradient-to-r from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30',
      accent: 'text-cyan-600 dark:text-cyan-400',
      button: 'hover:bg-cyan-50 dark:hover:bg-cyan-900/30'
    },
    pink: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-pink-200 dark:border-pink-700',
      header: 'bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30',
      accent: 'text-pink-600 dark:text-pink-400',
      button: 'hover:bg-pink-50 dark:hover:bg-pink-900/30'
    },
    green: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-green-200 dark:border-green-700',
      header: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30',
      accent: 'text-green-600 dark:text-green-400',
      button: 'hover:bg-green-50 dark:hover:bg-green-900/30'
    },
    red: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-red-200 dark:border-red-700',
      header: 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30',
      accent: 'text-red-600 dark:text-red-400',
      button: 'hover:bg-red-50 dark:hover:bg-red-900/30'
    },
    miami: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-gradient-to-r from-cyan-200 via-purple-200 to-pink-200 dark:from-cyan-700 dark:via-purple-700 dark:to-pink-700',
      header: 'bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 dark:from-cyan-900/30 dark:via-purple-900/30 dark:to-pink-900/30',
      accent: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600',
      button: 'hover:bg-gradient-to-r hover:from-cyan-50 hover:via-purple-50 hover:to-pink-50 dark:hover:from-cyan-900/30 dark:hover:via-purple-900/30 dark:hover:to-pink-900/30'
    }
  }

  const theme = colorThemes[color] || colorThemes.blue

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleClose = () => {
    if (onClose) onClose(id)
  }

  const handleConfig = () => {
    if (onConfig) onConfig(id)
  }

  if (isMinimized) {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <div className={`rounded-lg border-2 ${theme.bg} ${theme.border} shadow-sm`}>
          <div className={`px-4 py-2 ${theme.header} rounded-t-lg flex items-center justify-between`}>
            <div className="flex items-center space-x-3">
              {Icon && <Icon className={`h-4 w-4 ${theme.accent}`} />}
              <span className={`text-sm font-medium ${theme.accent}`}>{title}</span>
              {badge && (
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            <button
              onClick={handleMinimize}
              className={`p-1 rounded ${theme.button} transition-colors duration-200`}
            >
              <ArrowsPointingOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className={`rounded-lg border-2 ${theme.bg} ${theme.border} shadow-sm ${gradient ? 'shadow-lg' : ''} transition-all duration-300`}>
        {/* Header */}
        <div className={`px-4 py-3 ${theme.header} rounded-t-lg flex items-center justify-between`}>
          <div className="flex items-center space-x-3 flex-1">
            {Icon && <Icon className={`h-5 w-5 ${theme.accent} flex-shrink-0`} />}
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-semibold ${theme.accent} truncate`}>{title}</h3>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
              )}
            </div>
            {badge && (
              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex-shrink-0">
                {badge}
              </span>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {headerActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`p-1 rounded ${theme.button} transition-colors duration-200`}
                title={action.title}
              >
                <action.icon className="h-4 w-4" />
              </button>
            ))}
            
            {configurable && (
              <button
                onClick={handleConfig}
                className={`p-1 rounded ${theme.button} transition-colors duration-200`}
                title="Configure"
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </button>
            )}
            
            {collapsible && (
              <button
                onClick={handleToggleCollapse}
                className={`p-1 rounded ${theme.button} transition-colors duration-200`}
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronUpIcon className="h-4 w-4" />
                )}
              </button>
            )}

            <button
              onClick={handleMinimize}
              className={`p-1 rounded ${theme.button} transition-colors duration-200`}
              title="Minimize"
            >
              <MinusIcon className="h-4 w-4" />
            </button>

            {closable && (
              <button
                onClick={handleClose}
                className={`p-1 rounded ${theme.button} transition-colors duration-200`}
                title="Close"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {!isCollapsed && (
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 text-sm mb-2">⚠️ Error</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">{error}</div>
              </div>
            ) : (
              children
            )}
          </div>
        )}

        {/* Footer */}
        {footerActions.length > 0 && !isCollapsed && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {footerActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`px-3 py-1 text-xs rounded ${action.primary ? 
                      `bg-${color}-600 text-white hover:bg-${color}-700` : 
                      'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    } transition-colors duration-200`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModularTile