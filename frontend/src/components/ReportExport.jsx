import { useState, useEffect } from 'react'
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

function ReportExport() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportSettings, setReportSettings] = useState({
    format: 'markdown',
    statusFilter: '',
    filename: ''
  })
  const [reportPreview, setReportPreview] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Not Started', label: 'Not Started' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Implemented', label: 'Implemented' },
    { value: 'Needs Review', label: 'Needs Review' },
    { value: 'Deferred', label: 'Deferred' }
  ]

  const formatOptions = [
    { 
      value: 'markdown', 
      label: 'Markdown', 
      description: 'Text-based format for documentation',
      icon: DocumentTextIcon,
      extension: '.md'
    },
    { 
      value: 'pdf', 
      label: 'PDF', 
      description: 'Professional format for reports',
      icon: DocumentIcon,
      extension: '.pdf'
    }
  ]

  // Load report preview when settings change
  useEffect(() => {
    if (reportSettings.format || reportSettings.statusFilter) {
      loadReportPreview()
    }
  }, [reportSettings.format, reportSettings.statusFilter])

  const loadReportPreview = async () => {
    try {
      const params = new URLSearchParams()
      params.append('format', reportSettings.format)
      if (reportSettings.statusFilter) {
        params.append('status', reportSettings.statusFilter)
      }

      const response = await fetch(`/api/report/preview?${params}`)
      const data = await response.json()

      if (response.ok) {
        setReportPreview(data)
        setError('')
      } else {
        setError(data.detail || 'Failed to load report preview')
        setReportPreview(null)
      }
    } catch (err) {
      console.error('Error loading report preview:', err)
      setError('Failed to connect to server')
      setReportPreview(null)
    }
  }

  const handleSettingChange = (key, value) => {
    setReportSettings(prev => ({
      ...prev,
      [key]: value
    }))
    setError('')
    setSuccess('')
  }

  const generateReport = async () => {
    if (isGenerating) return

    setIsGenerating(true)
    setError('')
    setSuccess('')

    try {
      const params = new URLSearchParams()
      params.append('format', reportSettings.format)
      
      if (reportSettings.statusFilter) {
        params.append('status', reportSettings.statusFilter)
      }
      
      if (reportSettings.filename) {
        params.append('filename', reportSettings.filename)
      }

      const response = await fetch(`/api/report/export?${params}`)

      if (response.ok) {
        // Get filename from Content-Disposition header or create default
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = 'compliance_report'
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename=(.+)/)
          if (filenameMatch) {
            filename = filenameMatch[1].replace(/"/g, '')
          }
        } else {
          const extension = reportSettings.format === 'pdf' ? 'pdf' : 'md'
          filename = `${filename}.${extension}`
        }

        // Create blob and trigger download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        // Show success message
        setSuccess(`Report downloaded successfully: ${filename}`)
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to generate report')
      }
    } catch (err) {
      console.error('Error generating report:', err)
      setError('Failed to generate report. Please check your connection.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-400 dark:to-primary-600 rounded-full flex items-center justify-center mb-4 transition-colors duration-300">
            <ChartBarIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">Generate Compliance Report</h1>
          <p className="text-gray-600 dark:text-dark-600 max-w-2xl mx-auto transition-colors duration-300">
            Export your NIST 800-53 implementation progress in professional formats for sharing, 
            compliance audits, and documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Format Selection */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center transition-colors duration-300">
                <DocumentArrowDownIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-dark-600 transition-colors duration-300" />
                Report Format
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formatOptions.map(option => {
                  const Icon = option.icon
                  const isSelected = reportSettings.format === option.value
                  return (
                    <label
                      key={option.value}
                      className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                        isSelected
                          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200 dark:ring-primary-700'
                          : 'border-gray-200 dark:border-dark-300 hover:border-gray-300 dark:hover:border-dark-400 bg-white dark:bg-dark-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => handleSettingChange('format', e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-start space-x-3">
                        <Icon className={`h-6 w-6 mt-1 transition-colors duration-200 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-dark-400'}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium transition-colors duration-200 ${isSelected ? 'text-primary-900 dark:text-primary-300' : 'text-gray-900 dark:text-dark-900'}`}>
                              {option.label}
                            </span>
                            {isSelected && (
                              <CheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            )}
                          </div>
                          <p className={`text-xs mt-1 transition-colors duration-200 ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-500 dark:text-dark-500'}`}>
                            {option.description}
                          </p>
                          <span className={`text-xs font-mono transition-colors duration-200 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-dark-400'}`}>
                            {option.extension}
                          </span>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Filter Options */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center transition-colors duration-300">
                <FunnelIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-dark-600 transition-colors duration-300" />
                Report Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">
                    Filter by Status
                  </label>
                  <select
                    id="statusFilter"
                    value={reportSettings.statusFilter}
                    onChange={(e) => handleSettingChange('statusFilter', e.target.value)}
                    className="input-field"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="filename" className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">
                    Custom Filename (optional)
                  </label>
                  <input
                    type="text"
                    id="filename"
                    value={reportSettings.filename}
                    onChange={(e) => handleSettingChange('filename', e.target.value)}
                    placeholder="e.g., Q1_compliance_report"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 dark:text-dark-500 mt-1 transition-colors duration-300">
                    File extension will be added automatically
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 transition-colors duration-300">Ready to Generate?</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-600 mt-1 transition-colors duration-300">
                    Your report will be downloaded automatically
                  </p>
                </div>
                <button
                  onClick={generateReport}
                  disabled={isGenerating}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isGenerating ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 transition-colors duration-300">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 dark:text-green-300 mr-2" />
                  <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 transition-colors duration-300">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 dark:text-red-300 mr-2" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            {reportPreview ? (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center transition-colors duration-300">
                  <CogIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-dark-600 transition-colors duration-300" />
                  Report Preview
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 transition-colors duration-300">
                      <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Total Controls</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-dark-900 transition-colors duration-300">{reportPreview.total_controls}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-3 transition-colors duration-300">
                      <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Filtered Controls</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-dark-900 transition-colors duration-300">{reportPreview.filtered_controls}</p>
                    </div>
                  </div>

                  {reportPreview.statistics && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-dark-700 transition-colors duration-300">Status Breakdown</h4>
                      <div className="space-y-2">
                        {Object.entries(reportPreview.statistics).map(([status, count]) => (
                          <div key={status} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-dark-600 transition-colors duration-300">{status}</span>
                            <span className="font-medium text-gray-900 dark:text-dark-900 transition-colors duration-300">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 dark:border-dark-300 transition-colors duration-300">
                    <p className="text-xs text-gray-500 dark:text-dark-500 transition-colors duration-300">
                      Generated on {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Loading preview...</p>
                </div>
              </div>
            )}

            {/* Help Section */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 transition-colors duration-300">Report Help</h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-dark-600 transition-colors duration-300">
                <div className="flex items-start space-x-2">
                  <DocumentIcon className="h-4 w-4 mt-0.5 text-gray-400 dark:text-dark-400" />
                  <p>PDF reports are ideal for presentations and formal documentation</p>
                </div>
                <div className="flex items-start space-x-2">
                  <DocumentTextIcon className="h-4 w-4 mt-0.5 text-gray-400 dark:text-dark-400" />
                  <p>Markdown reports work well with documentation systems and version control</p>
                </div>
                <div className="flex items-start space-x-2">
                  <FunnelIcon className="h-4 w-4 mt-0.5 text-gray-400 dark:text-dark-400" />
                  <p>Use status filters to create targeted reports for specific implementation phases</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportExport 