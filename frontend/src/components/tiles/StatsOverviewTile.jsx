import React from 'react'
import { 
  HeartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

const StatsOverviewTile = ({ 
  favorites = [], 
  controls = [],
  usageStats = {},
  className = '' 
}) => {
  // Calculate stats
  const favoriteCount = favorites.length
  const aiQueriesUsed = usageStats.aiQueriesUsed || 0
  const aiQueriesLimit = 3

  // Get some insights
  const getInsight = () => {
    if (favoriteCount === 0) {
      return "Start building your control list by favoriting controls!"
    } else if (favoriteCount < 5) {
      return "Great start! Keep exploring to build your control list."
    } else if (favoriteCount < 15) {
      return "You're building a solid foundation of controls!"
    } else {
      return "Excellent! You have a comprehensive control list."
    }
  }

  const stats = [
    {
      name: 'My Control List',
      value: favoriteCount,
      icon: HeartIconSolid,
      color: 'text-red-500',
      bgColor: 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
      description: 'Controls in your list'
    },
    {
      name: 'AI Queries Used',
      value: `${aiQueriesUsed}/${aiQueriesLimit}`,
      icon: SparklesIcon,
      color: 'text-purple-500',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
      description: 'Free queries remaining'
    }
  ]

  return (
    <div className={`h-full flex flex-col space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-100 to-purple-100 dark:from-cyan-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center">
          <HeartIconSolid className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">Stats Overview</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className={`${stat.bgColor} p-4 rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stat.description}
                </p>
              </div>
              <div className={`p-2 rounded-lg bg-white/50 dark:bg-gray-800/50`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 dark:from-cyan-900/10 dark:via-purple-900/10 dark:to-pink-900/10 border border-cyan-200 dark:border-cyan-700 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Quick Insight
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {getInsight()}
        </p>
      </div>
    </div>
  )
}

export default StatsOverviewTile
