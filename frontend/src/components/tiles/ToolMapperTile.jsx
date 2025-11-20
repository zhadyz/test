import React, { useState } from 'react'
import { 
  WrenchScrewdriverIcon,
  ServerIcon,
  CloudIcon,
  CpuChipIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

const ToolMapperTile = ({ 
  onNavigate,
  selectedControl = null
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null)

  // Mock platform data - in real app this would come from props/API
  const platforms = [
    { id: 'aws', name: 'AWS', icon: CloudIcon, color: 'orange', controls: 145 },
    { id: 'azure', name: 'Azure', icon: CloudIcon, color: 'blue', controls: 132 },
    { id: 'gcp', name: 'Google Cloud', icon: CloudIcon, color: 'green', controls: 128 },
    { id: 'kubernetes', name: 'Kubernetes', icon: CpuChipIcon, color: 'purple', controls: 89 },
    { id: 'docker', name: 'Docker', icon: ServerIcon, color: 'cyan', controls: 67 },
    { id: 'ansible', name: 'Ansible', icon: CodeBracketIcon, color: 'red', controls: 156 }
  ]

  const recentMappings = [
    { control: 'AC-2', platform: 'AWS IAM', status: 'mapped' },
    { control: 'SC-28', platform: 'Azure Key Vault', status: 'mapped' },
    { control: 'AU-12', platform: 'CloudTrail', status: 'pending' },
    { control: 'IA-5', platform: 'Kubernetes RBAC', status: 'mapped' }
  ]

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform)
  }

  const handleFullMapper = () => {
    onNavigate?.('tool-mapper')
  }

  const getColorClasses = (color) => {
    const colors = {
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700',
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700',
      cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700'
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="h-full flex flex-col">
      {selectedControl && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Mapping for {selectedControl.id}
            </span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {selectedControl.title}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {/* Quick Platform Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Platform Access
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {platforms.slice(0, 6).map((platform) => {
                const Icon = platform.icon
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformSelect(platform)}
                    className={`p-2 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                      selectedPlatform?.id === platform.id 
                        ? getColorClasses(platform.color)
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className={`h-4 w-4 ${
                        selectedPlatform?.id === platform.id 
                          ? '' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`} />
                      <div className="text-left">
                        <div className="text-xs font-medium truncate">{platform.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {platform.controls} controls
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Recent Mappings */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recent Mappings
            </h4>
            <div className="space-y-2">
              {recentMappings.map((mapping, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                      {mapping.control}
                    </span>
                    <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {mapping.platform}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1 ${
                    mapping.status === 'mapped' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    <CheckCircleIcon className="h-3 w-3" />
                    <span className="text-xs capitalize">{mapping.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleFullMapper}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <WrenchScrewdriverIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Open Full Mapper</span>
        </button>
        
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>{platforms.length} platforms available</span>
          <span>{recentMappings.length} recent mappings</span>
        </div>
      </div>
    </div>
  )
}

export default ToolMapperTile 