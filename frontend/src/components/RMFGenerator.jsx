import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  CloudArrowDownIcon, 
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  DocumentArrowDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const RMFGenerator = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    document_type: 'ssp',
    output_format: 'docx',
    system_info: {
      system_name: '',
      system_abbreviation: '',
      system_type: 'Information System',
      system_description: '',
      system_owner: '',
      authorizing_official: '',
      system_security_contact: '',
      operating_environment: 'Production',
      cloud_provider: '',
      data_types: [],
      user_types: [],
      confidentiality_impact: 'Moderate',
      integrity_impact: 'Moderate',
      availability_impact: 'Moderate',
      system_go_live_date: '',
      last_assessment_date: '',
      next_assessment_date: ''
    },
    document_metadata: {
      document_title: '',
      document_version: '1.0',
      prepared_by: '',
      reviewed_by: '',
      approved_by: '',
      classification: 'For Official Use Only',
      organization: ''
    },
    include_poams: true,
    include_scap_results: true,
    include_inventory: true,
    control_baseline: 'nist_800_53_moderate',
    selected_controls: [],
    include_control_implementation: true,
    include_risk_assessment: true,
    include_appendices: true,
    generate_implementation_statements: true,
    generate_risk_descriptions: true
  });

  const [baselines, setBaselines] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [outputFormats, setOutputFormats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [generationResult, setGenerationResult] = useState(null);
  const [documentHistory, setDocumentHistory] = useState([]);

  // New state for enhanced features
  const [systemMetadata, setSystemMetadata] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [autoPopulationStatus, setAutoPopulationStatus] = useState(null);
  const [dataSourceStats, setDataSourceStats] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    loadDocumentHistory();
    loadSystemMetadata();
    loadCacheStats();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [baselinesRes, typesRes, formatsRes] = await Promise.all([
        fetch('/api/rmf/baselines'),
        fetch('/api/rmf/document-types'),
        fetch('/api/rmf/output-formats')
      ]);

      if (baselinesRes.ok) {
        const baselinesData = await baselinesRes.json();
        setBaselines(baselinesData);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setDocumentTypes(typesData.document_types || []);
      }

      if (formatsRes.ok) {
        const formatsData = await formatsRes.json();
        setOutputFormats(formatsData.output_formats || []);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocumentHistory = async () => {
    try {
      const response = await fetch('/api/rmf/history');
      if (response.ok) {
        const history = await response.json();
        setDocumentHistory(history);
      }
    } catch (error) {
      console.error('Failed to load document history:', error);
    }
  };

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayInputChange = (section, field, value) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    handleInputChange(section, field, arrayValue);
  };

  const validateForm = async () => {
    try {
      const response = await fetch('/api/rmf/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      setValidationErrors(result.errors || []);
      return result.valid;
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationErrors(['Failed to validate form']);
      return false;
    }
  };

  const generatePreview = async () => {
    setIsLoading(true);
    try {
      const isValid = await validateForm();
      if (!isValid) {
        return;
      }

      const response = await fetch('/api/rmf/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const previewData = await response.json();
        setPreview(previewData);
      } else {
        const error = await response.json();
        setValidationErrors([error.detail || 'Failed to generate preview']);
      }
    } catch (error) {
      console.error('Preview generation failed:', error);
      setValidationErrors(['Failed to generate preview']);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDocument = async () => {
    setIsGenerating(true);
    setGenerationResult(null);
    
    try {
      const isValid = await validateForm();
      if (!isValid) {
        return;
      }

      const response = await fetch('/api/rmf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      setGenerationResult(result);

      if (result.success) {
        // Refresh document history
        await loadDocumentHistory();
      }
    } catch (error) {
      console.error('Document generation failed:', error);
      setGenerationResult({
        success: false,
        message: 'Failed to generate document',
        validation_errors: ['Network error occurred']
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = async (documentId) => {
    try {
      const response = await fetch(`/api/rmf/download/${documentId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `rmf_document_${documentId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const deleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/rmf/history/${documentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadDocumentHistory();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const documentTypeOptions = [
    { value: 'ssp', label: 'System Security Plan (SSP)' },
    { value: 'sar', label: 'Security Assessment Report (SAR)' },
    { value: 'poam', label: 'Plan of Action & Milestones (POA&M)' },
    { value: 'executive_summary', label: 'Executive Summary' }
  ];

  const outputFormatOptions = [
    { value: 'docx', label: 'Microsoft Word (.docx)' },
    { value: 'pdf', label: 'PDF Document (.pdf)' },
    { value: 'json', label: 'JSON Data (.json)' },
    { value: 'xml', label: 'XML Data (.xml)' }
  ];

  const impactLevels = [
    { value: 'Low', label: 'Low' },
    { value: 'Moderate', label: 'Moderate' },
    { value: 'High', label: 'High' }
  ];

  // New function to auto-populate system information
  const handleAutoPopulate = async () => {
    setIsGenerating(true);
    setAutoPopulationStatus(null);
    
    try {
      console.log('🔧 Auto-populate request data:', formData.system_info);
      
      const response = await fetch('/api/rmf/auto-populate-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.system_info)
      });
      
      console.log('🔧 Response status:', response.status);
      console.log('🔧 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔧 Response data:', result);
      
      if (result.success) {
        // Update form with auto-populated data
        setFormData(prev => ({
          ...prev,
          system_info: result.system_info
        }));
        
        setAutoPopulationStatus({
          success: true,
          message: result.message,
          autoPopulatedFields: result.auto_populated_fields,
          dataSourcesUsed: result.data_sources_used
        });
        
        // Show success notification
        setGenerationResult({
          success: true,
          message: `Auto-populated ${result.auto_populated_fields.length} fields from existing data sources`,
          document_id: null
        });
      } else {
        console.error('🔧 Backend returned success: false', result);
        throw new Error(result.message || 'Auto-population failed');
      }
    } catch (error) {
      console.error('🔧 Auto-population error:', error);
      setAutoPopulationStatus({
        success: false,
        message: error.message
      });
      setGenerationResult({
        success: false,
        message: `Auto-population failed: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // New function to load system metadata
  const loadSystemMetadata = async () => {
    try {
      const response = await fetch('/api/rmf/system-metadata');
      const result = await response.json();
      
      if (result.success) {
        setSystemMetadata(result.metadata);
        setDataSourceStats(result.metadata.data_source_stats);
      }
    } catch (error) {
      console.error('Failed to load system metadata:', error);
    }
  };

  // New function to load cache statistics
  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/rmf/cache/stats');
      const result = await response.json();
      
      if (result.success) {
        setCacheStats(result);
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  // New function to clear cache
  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/rmf/cache', {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        setGenerationResult({
          success: true,
          message: `Cache cleared: ${result.cleared_entries} entries removed`
        });
        loadCacheStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setGenerationResult({
        success: false,
        message: `Failed to clear cache: ${error.message}`
      });
    }
  };

  // New function to warm cache
  const handleWarmCache = async () => {
    try {
      const response = await fetch('/api/rmf/warm-cache', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        setGenerationResult({
          success: true,
          message: `${result.message}. Estimated completion: ${result.estimated_completion}`
        });
      }
    } catch (error) {
      console.error('Failed to warm cache:', error);
      setGenerationResult({
        success: false,
        message: `Failed to warm cache: ${error.message}`
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading RMF Generator...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              RMF Document Generator
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Generate comprehensive RMF documentation with AI assistance
            </p>
          </div>
          
          {/* Enhanced Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAutoPopulate}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Auto-Populate</span>
            </button>
            
            <button
              onClick={loadCacheStats}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Cache Stats</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-3">
            
            {/* System Metadata Dashboard */}
            {systemMetadata && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  System Environment Overview
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Data Source Statistics */}
                  {dataSourceStats && (
                    <>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {dataSourceStats.inventory?.total_assets || 0}
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">Total Assets</div>
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {dataSourceStats.tracker?.implemented || 0}
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-400">Controls Implemented</div>
                      </div>
                      
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {dataSourceStats.poams?.open || 0}
                        </div>
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">Open POA&Ms</div>
                      </div>
                      
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {dataSourceStats.scap?.critical_findings || 0}
                        </div>
                        <div className="text-sm text-red-600 dark:text-red-400">Critical Findings</div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Implementation Status */}
                {systemMetadata.implementation_status && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Implementation Progress</h4>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemMetadata.implementation_status.implementation_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {systemMetadata.implementation_status.implementation_percentage}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auto-Population Status */}
            {autoPopulationStatus && (
              <div className={`p-4 rounded-lg mb-6 ${
                autoPopulationStatus.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start">
                  <div className={`flex-shrink-0 ${
                    autoPopulationStatus.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {autoPopulationStatus.success ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      autoPopulationStatus.success 
                        ? 'text-green-800 dark:text-green-200' 
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {autoPopulationStatus.message}
                    </p>
                    {autoPopulationStatus.success && autoPopulationStatus.autoPopulatedFields && (
                      <div className="mt-2">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Auto-populated fields: {autoPopulationStatus.autoPopulatedFields.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Existing form sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Document Configuration */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Document Configuration
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Document Type
                      </label>
                      <select
                        value={formData.document_type}
                        onChange={(e) => handleInputChange(null, 'document_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {documentTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Output Format
                      </label>
                      <select
                        value={formData.output_format}
                        onChange={(e) => handleInputChange(null, 'output_format', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {outputFormatOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Control Baseline
                      </label>
                      <select
                        value={formData.control_baseline}
                        onChange={(e) => handleInputChange(null, 'control_baseline', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {baselines.map(baseline => (
                          <option key={baseline.baseline_id} value={baseline.baseline_id}>
                            {baseline.baseline_name} ({baseline.control_count} controls)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* System Information */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    System Information
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        System Name *
                      </label>
                      <input
                        type="text"
                        value={formData.system_info.system_name}
                        onChange={(e) => handleInputChange('system_info', 'system_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter system name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        System Abbreviation
                      </label>
                      <input
                        type="text"
                        value={formData.system_info.system_abbreviation}
                        onChange={(e) => handleInputChange('system_info', 'system_abbreviation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="System acronym"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        System Description *
                      </label>
                      <textarea
                        value={formData.system_info.system_description}
                        onChange={(e) => handleInputChange('system_info', 'system_description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Describe the system's purpose and functionality"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        System Owner *
                      </label>
                      <input
                        type="text"
                        value={formData.system_info.system_owner}
                        onChange={(e) => handleInputChange('system_info', 'system_owner', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="System owner name and organization"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Operating Environment
                      </label>
                      <select
                        value={formData.system_info.operating_environment}
                        onChange={(e) => handleInputChange('system_info', 'operating_environment', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="Production">Production</option>
                        <option value="Development">Development</option>
                        <option value="Testing">Testing</option>
                        <option value="Staging">Staging</option>
                      </select>
                    </div>

                    {/* Impact Levels */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confidentiality Impact
                      </label>
                      <select
                        value={formData.system_info.confidentiality_impact}
                        onChange={(e) => handleInputChange('system_info', 'confidentiality_impact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {impactLevels.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Integrity Impact
                      </label>
                      <select
                        value={formData.system_info.integrity_impact}
                        onChange={(e) => handleInputChange('system_info', 'integrity_impact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {impactLevels.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Availability Impact
                      </label>
                      <select
                        value={formData.system_info.availability_impact}
                        onChange={(e) => handleInputChange('system_info', 'availability_impact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {impactLevels.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Document Metadata */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Document Metadata
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Document Title
                      </label>
                      <input
                        type="text"
                        value={formData.document_metadata.document_title}
                        onChange={(e) => handleInputChange('document_metadata', 'document_title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Auto-generated if empty"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Version
                      </label>
                      <input
                        type="text"
                        value={formData.document_metadata.document_version}
                        onChange={(e) => handleInputChange('document_metadata', 'document_version', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Prepared By *
                      </label>
                      <input
                        type="text"
                        value={formData.document_metadata.prepared_by}
                        onChange={(e) => handleInputChange('document_metadata', 'prepared_by', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Organization *
                      </label>
                      <input
                        type="text"
                        value={formData.document_metadata.organization}
                        onChange={(e) => handleInputChange('document_metadata', 'organization', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Your organization"
                      />
                    </div>
                  </div>
                </div>

                {/* Generation Options */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Generation Options
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="include_poams"
                        checked={formData.include_poams}
                        onChange={(e) => handleInputChange(null, 'include_poams', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="include_poams" className="text-sm text-gray-700 dark:text-gray-300">
                        Include POA&M data from system
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="include_scap_results"
                        checked={formData.include_scap_results}
                        onChange={(e) => handleInputChange(null, 'include_scap_results', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="include_scap_results" className="text-sm text-gray-700 dark:text-gray-300">
                        Include SCAP scan results
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="include_inventory"
                        checked={formData.include_inventory}
                        onChange={(e) => handleInputChange(null, 'include_inventory', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="include_inventory" className="text-sm text-gray-700 dark:text-gray-300">
                        Include asset inventory
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="generate_implementation_statements"
                        checked={formData.generate_implementation_statements}
                        onChange={(e) => handleInputChange(null, 'generate_implementation_statements', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="generate_implementation_statements" className="text-sm text-gray-700 dark:text-gray-300">
                        Use AI to generate control implementation statements
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="generate_risk_descriptions"
                        checked={formData.generate_risk_descriptions}
                        onChange={(e) => handleInputChange(null, 'generate_risk_descriptions', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="generate_risk_descriptions" className="text-sm text-gray-700 dark:text-gray-300">
                        Use AI to generate risk descriptions
                      </label>
                    </div>
                  </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Validation Errors
                      </h3>
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700 dark:text-red-300">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Generation Result */}
                {generationResult && (
                  <div className={`border rounded-lg p-4 ${
                    generationResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {generationResult.success ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      )}
                      <h3 className={`text-sm font-medium ${
                        generationResult.success
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {generationResult.success ? 'Document Generated Successfully' : 'Generation Failed'}
                      </h3>
                    </div>
                    <p className={`text-sm ${
                      generationResult.success
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {generationResult.message}
                    </p>
                    {generationResult.success && (
                      <div className="mt-3 flex items-center space-x-4 text-sm">
                        <span className="text-green-700 dark:text-green-300">
                          Generation Time: {generationResult.generation_time?.toFixed(2)}s
                        </span>
                        <span className="text-green-700 dark:text-green-300">
                          Controls: {generationResult.controls_included}
                        </span>
                        <span className="text-green-700 dark:text-green-300">
                          POA&Ms: {generationResult.poams_included}
                        </span>
                        <button
                          onClick={() => downloadDocument(generationResult.document_id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={generatePreview}
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    {isLoading ? 'Generating Preview...' : 'Preview'}
                  </button>

                  <button
                    onClick={generateDocument}
                    disabled={isGenerating}
                    className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating Document...' : 'Generate Document'}
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                
                {/* Cache Management */}
                {cacheStats && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      Cache Management
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">RMF Cache:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {cacheStats.rmf_cache?.rmf_cache_entries || 0} entries
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">GPT Cache:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {cacheStats.gpt_cache?.total_entries || 0} entries
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Cache Hit Rate:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {((cacheStats.gpt_cache?.hits || 0) / Math.max(1, (cacheStats.gpt_cache?.total_requests || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <button
                        onClick={handleClearCache}
                        className="w-full mt-3 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
                      >
                        Clear Cache
                      </button>
                    </div>
                  </div>
                )}

                {/* Auto-Population Status */}
                {autoPopulationStatus && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Auto-Population
                    </h3>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Fields Populated:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {autoPopulationStatus.fields_populated || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Data Sources:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {autoPopulationStatus.sources_used?.join(', ') || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Metadata */}
                {systemMetadata && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      System Metadata
                    </h3>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Available Systems:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {systemMetadata.available_systems?.length || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">POA&M Records:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {systemMetadata.poam_count || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Control Coverage:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {systemMetadata.control_coverage || '0%'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Panel */}
                {preview && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <EyeIcon className="h-5 w-5 mr-2" />
                      Document Preview
                    </h3>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">System:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {preview.system_name}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Controls:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {preview.preview_sections?.controls_count || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">POA&Ms:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {preview.preview_sections?.poams_count || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Est. Pages:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {preview.estimated_pages || 'N/A'}
                        </span>
                      </div>
                      {preview.content_summary && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {preview.content_summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Document History */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Documents
                  </h3>
                  {documentHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No documents generated yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {documentHistory.slice(0, 5).map((doc) => (
                        <div key={doc.document_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {doc.system_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {doc.document_type?.toUpperCase()} v{doc.version}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(doc.generated_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => downloadDocument(doc.document_id)}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                              title="Download"
                            >
                              <CloudArrowDownIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteDocument(doc.document_id)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                              title="Delete"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Help Panel */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Getting Started
                    </h3>
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    <p>1. Fill in system information and document metadata</p>
                    <p>2. Choose your control baseline and document type</p>
                    <p>3. Configure generation options</p>
                    <p>4. Preview your document before generating</p>
                    <p>5. Generate and download your RMF document</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RMFGenerator; 