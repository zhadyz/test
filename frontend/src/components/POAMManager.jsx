import React, { useState, useEffect } from 'react';
import { useSystem } from '../contexts/SystemContext';
import SystemSelector from './SystemSelector';
import { 
  CalendarIcon, 
  ExclamationTriangleIcon, 
  DocumentArrowDownIcon,
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { DevModeIndicator, DevAutoPopulateButton, useDevPOAMData, isDevModeEnabled } from '../utils/devMode.jsx';

const POAMManager = () => {
  // State management
  const [poams, setPOAMs] = useState([]);
  const [filteredPOAMs, setFilteredPOAMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPOAM, setSelectedPOAM] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    control_id: '',
    control_title: '',
    description: '',
    root_cause: '',
    remediation_action: '',
    status: 'Open',
    priority: 'Medium',
    severity: '',
    resources_required: '',
    business_impact: '',
    cost_estimate: ''
  });

  // Constants
  const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed', 'Deferred', 'Cancelled'];
  const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
  const SEVERITY_OPTIONS = ['CAT I', 'CAT II', 'CAT III'];

  // Priority colors
  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      'High': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      'Low': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  };

  // Status colors
  const getStatusColor = (status) => {
    const colors = {
      'Open': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      'Completed': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      'Deferred': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  };

  // Load POA&M data
  const loadPOAMs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/poam');
      if (!response.ok) throw new Error('Failed to load POA&M data');
      
      const data = await response.json();
      setPOAMs(data.data || []);
      
      // Load statistics
      const statsResponse = await fetch('/api/poam/stats/summary');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData.data);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...poams];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(poam => poam.status === statusFilter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(poam => poam.priority === priorityFilter);
    }
    
    setFilteredPOAMs(filtered);
  }, [poams, statusFilter, priorityFilter]);

  // Load data on component mount
  useEffect(() => {
    loadPOAMs();
  }, []);

  // Dev mode auto-population
  useEffect(() => {
    if (isDevModeEnabled() && (!poams || poams.length === 0)) {
      const autoPopulated = useDevPOAMData(poams, setPOAMs);
      if (autoPopulated && autoPopulated !== poams) {
        setLoading(false); // Skip API call in dev mode
      }
    }
  }, []);

  // Manual auto-populate function for dev mode
  const handleAutoPopulatePOAMs = (sampleData) => {
    setPOAMs(sampleData);
    setLoading(false);
  };

  // Handle form submission
  const handleCreatePOAM = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/poam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create POA&M');
      }
      
      await loadPOAMs(); // Reload data
      setShowCreateModal(false);
      resetForm();
      
    } catch (err) {
      setError(err.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      control_id: '',
      control_title: '',
      description: '',
      root_cause: '',
      remediation_action: '',
      status: 'Open',
      priority: 'Medium',
      severity: '',
      resources_required: '',
      business_impact: '',
      cost_estimate: ''
    });
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      const response = await fetch('/api/poam/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: format,
          status_filter: statusFilter !== 'all' ? statusFilter : null,
          priority_filter: priorityFilter !== 'all' ? priorityFilter : null,
          include_completed: true
        })
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `poam_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle PDF export
  const handlePDFExport = async (includeSummary = true, includeDetails = true) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      params.append('include_summary', includeSummary.toString());
      params.append('include_details', includeDetails.toString());

      const response = await fetch(`/api/poam/export/pdf?${params.toString()}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('PDF export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `poam_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Failed to export PDF report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Preview PDF report
  const previewPDFReport = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(`/api/poam/export/pdf-preview?${params.toString()}`);

      if (!response.ok) {
        throw new Error('PDF preview failed');
      }

      const previewData = await response.json();
      
      // Show preview modal or alert
      const message = `PDF Report Preview:
      
Total Records: ${previewData.total_records}
Estimated Size: ${previewData.estimated_pdf_size}

Status Breakdown:
${Object.entries(previewData.status_breakdown || {}).map(([status, count]) => `• ${status}: ${count}`).join('\n')}

Priority Breakdown:
${Object.entries(previewData.priority_breakdown || {}).map(([priority, count]) => `• ${priority}: ${count}`).join('\n')}

Would you like to generate the full PDF report?`;

      if (confirm(message)) {
        await handlePDFExport();
      }
    } catch (error) {
      console.error('Error previewing PDF:', error);
      setError('Failed to preview PDF report: ' + error.message);
    }
  };

  // Update POA&M status
  const updatePOAMStatus = async (poamId, newStatus) => {
    try {
      const response = await fetch(`/api/poam/${poamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          actual_completion_date: newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : null
        })
      });
      
      if (!response.ok) throw new Error('Failed to update POA&M');
      
      await loadPOAMs(); // Reload data
      
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            POA&M Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Plan of Action and Milestones for compliance remediation
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* System Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">System:</span>
            <SystemSelector onCreateSystem={() => window.location.href = '#system-manager'} />
          </div>
          
          {/* Export buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              JSON
            </button>
            <button
              onClick={previewPDFReport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              PDF Report
            </button>
          </div>
          
          {/* Create POA&M button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create POA&M
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total POA&Ms
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {statistics.total_poams}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Overdue
                    </dt>
                    <dd className="text-lg font-medium text-red-600">
                      {statistics.overdue_count}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Due Soon
                    </dt>
                    <dd className="text-lg font-medium text-yellow-600">
                      {statistics.due_soon_count}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Completion Rate
                    </dt>
                    <dd className="text-lg font-medium text-green-600">
                      {statistics.completion_rate}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Priority</option>
            {PRIORITY_OPTIONS.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredPOAMs.length} of {poams.length} POA&Ms
          </div>
        </div>
      </div>

      {/* POA&M Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          {filteredPOAMs.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No POA&Ms found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {poams.length === 0 
                  ? "Get started by creating your first POA&M entry." 
                  : "Try adjusting your filters to see more results."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Control
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPOAMs.map((poam) => (
                    <tr key={poam.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {poam.control_id}
                        </div>
                        {poam.control_title && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {poam.control_title}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                          {poam.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(poam.status)}`}>
                          {poam.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(poam.priority)}`}>
                          {poam.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPOAM(poam);
                              setShowDetailsModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            View
                          </button>
                          {poam.status !== 'Completed' && (
                            <button
                              onClick={() => updatePOAMStatus(poam.id, 'Completed')}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create POA&M Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Create New POA&M Entry
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePOAM} className="space-y-4">
              {/* Status field at the top */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Control ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.control_id}
                    onChange={(e) => setFormData({...formData, control_id: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., AC-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Control Title
                  </label>
                  <input
                    type="text"
                    value={formData.control_title}
                    onChange={(e) => setFormData({...formData, control_title: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="Control title for reference"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the compliance issue or finding..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Root Cause
                </label>
                <textarea
                  rows={2}
                  value={formData.root_cause}
                  onChange={(e) => setFormData({...formData, root_cause: e.target.value})}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Root cause analysis..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Remediation Action *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.remediation_action}
                  onChange={(e) => setFormData({...formData, remediation_action: e.target.value})}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the recommended remediation action..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  >
                    {PRIORITY_OPTIONS.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Severity
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({...formData, severity: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select severity</option>
                    {SEVERITY_OPTIONS.map(severity => (
                      <option key={severity} value={severity}>{severity}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cost Estimate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_estimate}
                    onChange={(e) => setFormData({...formData, cost_estimate: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="Estimated cost"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resources Required
                </label>
                <textarea
                  rows={2}
                  value={formData.resources_required}
                  onChange={(e) => setFormData({...formData, resources_required: e.target.value})}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Resources needed for remediation..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Business Impact
                </label>
                <textarea
                  rows={2}
                  value={formData.business_impact}
                  onChange={(e) => setFormData({...formData, business_impact: e.target.value})}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Business impact if not remediated..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Create POA&M
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPOAM && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                POA&M Details - {selectedPOAM.control_id}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Control ID</h4>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPOAM.control_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</h4>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedPOAM.status)}`}>
                    {selectedPOAM.status}
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h4>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPOAM.description}</p>
              </div>
              
              {selectedPOAM.root_cause && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Root Cause</h4>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPOAM.root_cause}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Remediation Action</h4>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPOAM.remediation_action}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</h4>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(selectedPOAM.priority)}`}>
                    {selectedPOAM.priority}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Owner</h4>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPOAM.assigned_owner || 'Unassigned'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</h4>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(selectedPOAM.estimated_completion_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {(selectedPOAM.resources_required || selectedPOAM.business_impact || selectedPOAM.cost_estimate) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPOAM.resources_required && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Resources Required</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPOAM.resources_required}</p>
                    </div>
                  )}
                  {selectedPOAM.cost_estimate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost Estimate</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">${selectedPOAM.cost_estimate}</p>
                    </div>
                  )}
                </div>
              )}
              
              {selectedPOAM.business_impact && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Business Impact</h4>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPOAM.business_impact}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-medium">Created:</span> {new Date(selectedPOAM.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {new Date(selectedPOAM.last_updated).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POAMManager; 