import React, { useState, useEffect, useMemo } from 'react'
import { useSystem } from '../contexts/SystemContext'
import SystemSelector from './SystemSelector'
import { 
  DocumentArrowDownIcon, 
  DocumentDuplicateIcon, 
  TableCellsIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  FunnelIcon,
  SparklesIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import { DevModeIndicator, DevAutoPopulateButton, useDevAutoPopulate, isDevModeEnabled } from '../utils/devMode.jsx'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const ComplianceReport = ({ controls = [], implementationData = {} }) => {
  const [reportTitle, setReportTitle] = useState('NIST 800-53 Compliance Report')
  const [organizationName, setOrganizationName] = useState('Your Organization')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterFamily, setFilterFamily] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [aiSummary, setAiSummary] = useState('')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const itemsPerPage = 10

  // Dev mode auto-population
  useEffect(() => {
    if (isDevModeEnabled()) {
      const formData = { reportTitle, organizationName };
      const autoPopulated = useDevAutoPopulate(formData, null, 'FORM_DATA');
      if (autoPopulated && autoPopulated !== formData) {
        setReportTitle(autoPopulated.systemName || reportTitle);
        setOrganizationName(autoPopulated.organizationName || organizationName);
      }
    }
  }, []);

  // Manual auto-populate function for dev mode
  const handleAutoPopulate = (sampleData) => {
    setReportTitle(sampleData.systemName || 'Sample Security System Compliance Report');
    setOrganizationName(sampleData.organizationName || 'ACME Corporation');
    setAiSummary(sampleData.executiveSummary || '');
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const implemented = Object.values(implementationData).filter(status => status === 'implemented').length
    const inProgress = Object.values(implementationData).filter(status => status === 'in-progress').length
    const notStarted = controls.length - implemented - inProgress
    const total = controls.length
    const completionPercentage = total > 0 ? Math.round((implemented / total) * 100) : 0

    return {
      implemented,
      inProgress,
      notStarted,
      total,
      completionPercentage
    }
  }, [controls, implementationData])

  // Filter controls
  const filteredControls = useMemo(() => {
    return controls.filter(control => {
      const statusMatch = filterStatus === 'all' || 
        (filterStatus === 'implemented' && implementationData[control.id] === 'implemented') ||
        (filterStatus === 'in-progress' && implementationData[control.id] === 'in-progress') ||
        (filterStatus === 'not-started' && !implementationData[control.id])
      
      const familyMatch = filterFamily === 'all' || control.family === filterFamily
      
      return statusMatch && familyMatch
    })
  }, [controls, implementationData, filterStatus, filterFamily])

  // Pagination
  const paginatedControls = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredControls.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredControls, currentPage])

  const totalPages = Math.ceil(filteredControls.length / itemsPerPage)

  // Get unique families for filter
  const families = useMemo(() => {
    return [...new Set(controls.map(control => control.family))].sort()
  }, [controls])

  // Chart data
  const pieChartData = {
    labels: ['Implemented', 'In Progress', 'Not Started'],
    datasets: [{
      data: [stats.implemented, stats.inProgress, stats.notStarted],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderColor: ['#059669', '#d97706', '#dc2626'],
      borderWidth: 2
    }]
  }

  const barChartData = {
    labels: families,
    datasets: [{
      label: 'Implemented',
      data: families.map(family => {
        const familyControls = controls.filter(c => c.family === family)
        return familyControls.filter(c => implementationData[c.id] === 'implemented').length
      }),
      backgroundColor: '#10b981'
    }, {
      label: 'In Progress',
      data: families.map(family => {
        const familyControls = controls.filter(c => c.family === family)
        return familyControls.filter(c => implementationData[c.id] === 'in-progress').length
      }),
      backgroundColor: '#f59e0b'
    }, {
      label: 'Not Started',
      data: families.map(family => {
        const familyControls = controls.filter(c => c.family === family)
        return familyControls.filter(c => !implementationData[c.id]).length
      }),
      backgroundColor: '#ef4444'
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  }

  // Generate AI Summary
  const generateAISummary = async () => {
    setIsGeneratingAI(true)
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: `Generate an executive summary for this NIST 800-53 compliance report: 
          - Total Controls: ${stats.total}
          - Implemented: ${stats.implemented} (${stats.completionPercentage}%)
          - In Progress: ${stats.inProgress}
          - Not Started: ${stats.notStarted}
          
          Provide insights on compliance posture, key achievements, priority areas for improvement, and strategic recommendations. Keep it professional and concise (2-3 paragraphs).`,
          context: {
            type: 'compliance_report',
            stats: stats
          }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiSummary(data.response)
      } else {
        setAiSummary('Unable to generate AI summary at this time. Please try again later.')
      }
    } catch (error) {
      console.error('Error generating AI summary:', error)
      setAiSummary('Unable to generate AI summary at this time. Please try again later.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Export functions
  const exportToPDF = () => {
    window.print()
  }

  const exportToCSV = () => {
    const headers = ['Control ID', 'Title', 'Family', 'Status', 'Last Updated']
    const csvData = filteredControls.map(control => [
      control.id,
      `"${control.title}"`,
      control.family,
      getStatusText(implementationData[control.id]),
      new Date().toLocaleDateString()
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nist-compliance-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    const reportText = `
${reportTitle}
${organizationName}
Generated on ${new Date().toLocaleDateString()}

SUMMARY:
- Total Controls: ${stats.total}
- Implemented: ${stats.implemented} (${stats.completionPercentage}%)
- In Progress: ${stats.inProgress}
- Not Started: ${stats.notStarted}

CONTROLS:
${filteredControls.map(control => 
  `${control.id}: ${control.title} - ${getStatusText(implementationData[control.id])}`
).join('\n')}

${aiSummary ? `\nAI SUMMARY:\n${aiSummary}` : ''}
    `.trim()

    try {
      await navigator.clipboard.writeText(reportText)
      alert('Report copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'implemented': return 'Implemented'
      case 'in-progress': return 'In Progress'
      default: return 'Not Started'
    }
  }

  const getStatusBadge = (status) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full'
    switch (status) {
      case 'implemented':
        return `${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`
      case 'in-progress':
        return `${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`
      default:
        return `${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-dark-50 min-h-screen print:p-4 transition-colors duration-300">
      <DevModeIndicator />
      {/* Header */}
      <div className="mb-8 print:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">📄 Compliance Report</h1>
            <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* System Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-dark-500">System:</span>
              <SystemSelector onCreateSystem={() => window.location.href = '#system-manager'} />
            </div>
            
            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                onClick={exportToPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-200"
              >
                <TableCellsIcon className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 dark:bg-dark-400 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-dark-500 transition-colors duration-200"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Customization Fields */}
        <div className="grid md:grid-cols-2 gap-4 mb-6 print:hidden">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">
              Report Title
              <DevAutoPopulateButton 
                onPopulate={handleAutoPopulate} 
                dataType="FORM_DATA" 
                label="Fill Sample Data" 
              />
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors duration-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">Organization Name</label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors duration-300"
            />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-900 transition-colors duration-300">{reportTitle}</h2>
          <p className="text-lg text-gray-600 dark:text-dark-600 transition-colors duration-300">{organizationName}</p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-900 mb-4 transition-colors duration-300">📊 Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700 transition-colors duration-300">
            <div className="text-2xl font-bold text-green-800 dark:text-green-300">{stats.implemented}</div>
            <div className="text-sm text-green-600 dark:text-green-400">✅ Implemented</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 transition-colors duration-300">
            <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{stats.inProgress}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">🟨 In Progress</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-700 transition-colors duration-300">
            <div className="text-2xl font-bold text-red-800 dark:text-red-300">{stats.notStarted}</div>
            <div className="text-sm text-red-600 dark:text-red-400">⛔ Not Started</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors duration-300">
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">{stats.total}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">📋 Total Controls</div>
          </div>
        </div>

        {/* Completion Percentage */}
        <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-lg mb-6 transition-colors duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-dark-700">Overall Completion</span>
            <span className="text-sm font-medium text-gray-700 dark:text-dark-700">{stats.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-2">
            <div 
              className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Simple Charts using CSS */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-100 p-4 rounded-lg border border-gray-200 dark:border-dark-300 transition-colors duration-300">
            <h4 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-4 transition-colors duration-300">Status Distribution</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-dark-600">Implemented</span>
                <span className="text-sm font-medium text-gray-900 dark:text-dark-900">{stats.implemented}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-2">
                <div 
                  className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                  style={{ width: `${stats.total > 0 ? (stats.implemented / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-dark-600">In Progress</span>
                <span className="text-sm font-medium text-gray-900 dark:text-dark-900">{stats.inProgress}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-2">
                <div 
                  className="bg-yellow-500 dark:bg-yellow-400 h-2 rounded-full"
                  style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-dark-600">Not Started</span>
                <span className="text-sm font-medium text-gray-900 dark:text-dark-900">{stats.notStarted}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-2">
                <div 
                  className="bg-red-500 dark:bg-red-400 h-2 rounded-full"
                  style={{ width: `${stats.total > 0 ? (stats.notStarted / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-100 p-4 rounded-lg border border-gray-200 dark:border-dark-300 transition-colors duration-300">
            <h4 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-4 transition-colors duration-300">Implementation by Family</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {families.map(family => {
                const familyControls = controls.filter(c => c.family === family)
                const familyImplemented = familyControls.filter(c => implementationData[c.id] === 'implemented').length
                const familyTotal = familyControls.length
                const familyPercentage = familyTotal > 0 ? (familyImplemented / familyTotal) * 100 : 0
                
                return (
                  <div key={family} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600 dark:text-dark-600 truncate">{family}</span>
                      <span className="text-gray-900 dark:text-dark-900 font-medium">{familyImplemented}/{familyTotal}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-1.5">
                      <div 
                        className="bg-indigo-500 dark:bg-indigo-400 h-1.5 rounded-full"
                        style={{ width: `${familyPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 print:hidden">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-900 mb-4 transition-colors duration-300">📁 Control Details</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-4 w-4 text-gray-500 dark:text-dark-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors duration-300"
            >
              <option value="all">All Statuses</option>
              <option value="implemented">Implemented</option>
              <option value="in-progress">In Progress</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>
          <div>
            <select
              value={filterFamily}
              onChange={(e) => setFilterFamily(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors duration-300"
            >
              <option value="all">All Families</option>
              {families.map(family => (
                <option key={family} value={family}>{family}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Controls Table */}
      <div className="mb-8">
        <div className="bg-white dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-dark-300 overflow-hidden transition-colors duration-300">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">Control</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">Family</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-100 divide-y divide-gray-200 dark:divide-dark-300">
                {paginatedControls.map((control) => (
                  <tr key={control.id} className="hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-dark-900">
                      {control.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-dark-900">
                      <div className="max-w-xs truncate">{control.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-500">
                      {control.family}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(implementationData[control.id])}>
                        {getStatusText(implementationData[control.id])}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-500">
                      {new Date().toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {paginatedControls.map((control) => (
              <div key={control.id} className="p-4 border-b border-gray-200 dark:border-dark-300 last:border-b-0 transition-colors duration-300">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-gray-900 dark:text-dark-900">{control.id}</div>
                  <span className={getStatusBadge(implementationData[control.id])}>
                    {getStatusText(implementationData[control.id])}
                  </span>
                </div>
                <div className="text-sm text-gray-900 dark:text-dark-900 mb-2">{control.title}</div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-500">
                  <span>{control.family}</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 print:hidden">
            <div className="text-sm text-gray-700 dark:text-dark-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredControls.length)} of {filteredControls.length} controls
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Summary Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg p-6 border border-indigo-200 dark:border-indigo-700 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-900 flex items-center transition-colors duration-300">
              <SparklesIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
              🧠 AI Executive Summary
              <DevAutoPopulateButton 
                onPopulate={(sampleData) => setAiSummary(sampleData.executiveSummary)} 
                dataType="REPORT_DATA" 
                label="Sample Summary" 
              />
            </h3>
            {!aiSummary && (
              <button
                onClick={generateAISummary}
                disabled={isGeneratingAI}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 print:hidden"
              >
                <SparklesIcon className="h-4 w-4" />
                <span>{isGeneratingAI ? 'Generating...' : 'Generate Summary'}</span>
              </button>
            )}
          </div>
          
          {aiSummary ? (
            <div className="prose prose-sm max-w-none">
              <div className="text-gray-700 dark:text-dark-700 whitespace-pre-wrap transition-colors duration-300">{aiSummary}</div>
              <button
                onClick={() => navigator.clipboard.writeText(aiSummary)}
                className="mt-4 flex items-center space-x-2 px-3 py-1 text-sm bg-white dark:bg-dark-100 border border-gray-300 dark:border-dark-300 text-gray-900 dark:text-dark-900 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200 print:hidden"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                <span>Copy Summary</span>
              </button>
            </div>
          ) : isGeneratingAI ? (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
              <span className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Generating AI summary...</span>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">Click "Generate Summary" to create an AI-powered executive summary of your compliance posture.</p>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:mb-6 { margin-bottom: 1.5rem !important; }
          .print\\:p-4 { padding: 1rem !important; }
        }
      `}</style>
    </div>
  )
}

export default ComplianceReport 