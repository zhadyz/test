import React, { useState } from 'react'
import { 
  DocumentTextIcon,
  PhotoIcon,
  DocumentArrowUpIcon,
  FolderIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

const EvidenceManagerTile = ({ 
  selectedControl = null,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState('recent')

  // Mock evidence data
  const evidenceItems = [
    {
      id: 1,
      name: 'AWS IAM Policy Document',
      type: 'document',
      control: 'AC-2',
      status: 'approved',
      date: '2024-01-15',
      size: '2.3 KB'
    },
    {
      id: 2,
      name: 'Network Diagram Screenshot',
      type: 'image',
      control: 'SC-7',
      status: 'pending',
      date: '2024-01-14',
      size: '156 KB'
    },
    {
      id: 3,
      name: 'Encryption Configuration',
      type: 'document',
      control: 'SC-28',
      status: 'approved',
      date: '2024-01-13',
      size: '5.1 KB'
    },
    {
      id: 4,
      name: 'Audit Log Sample',
      type: 'document',
      control: 'AU-12',
      status: 'review',
      date: '2024-01-12',
      size: '89 KB'
    }
  ]

  const controlEvidence = selectedControl 
    ? evidenceItems.filter(item => item.control === selectedControl.id)
    : []

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckBadgeIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      case 'review':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700'
      case 'pending':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700'
      case 'review':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700'
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image':
        return <PhotoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case 'document':
        return <DocumentTextIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      default:
        return <FolderIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const handleUploadEvidence = () => {
    // In a real app, this would open file upload dialog
    console.log('Upload evidence for', selectedControl?.id || 'general')
  }

  const handleViewFullManager = () => {
    onNavigate?.('evidence-manager')
  }

  const displayItems = activeTab === 'control' && selectedControl 
    ? controlEvidence 
    : evidenceItems.slice(0, 4)

  return (
    <div className="h-full flex flex-col">
      {/* Header with tabs */}
      <div className="mb-4">
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'recent'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setActiveTab('control')}
            className={`flex-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'control'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Current Control
          </button>
        </div>
      </div>

      {/* Selected Control Info */}
      {activeTab === 'control' && selectedControl && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Evidence for {selectedControl.id}
            </span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {controlEvidence.length} evidence items
          </p>
        </div>
      )}

      {/* Evidence List */}
      <div className="flex-1 overflow-y-auto">
        {displayItems.length === 0 ? (
          <div className="text-center py-8">
            <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {activeTab === 'control' && selectedControl 
                ? `No evidence for ${selectedControl.id} yet`
                : 'No evidence items yet'
              }
            </p>
            <button
              onClick={handleUploadEvidence}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Upload first evidence
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-1">
                    {getTypeIcon(item.type)}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs font-mono bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                          {item.control}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.size}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span className="capitalize">{item.status}</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Uploaded {new Date(item.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={handleUploadEvidence}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Upload Evidence</span>
        </button>
        
        <button
          onClick={handleViewFullManager}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <FolderIcon className="h-4 w-4" />
          <span className="text-sm font-medium">View All Evidence</span>
        </button>
        
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{evidenceItems.length} total items</span>
          <span>{evidenceItems.filter(i => i.status === 'approved').length} approved</span>
        </div>
      </div>
    </div>
  )
}

export default EvidenceManagerTile 