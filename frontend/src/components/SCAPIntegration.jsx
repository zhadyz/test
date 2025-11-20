import React, { useState } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  PlayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const SCAPIntegration = () => {
  const [file, setFile] = useState(null);
  const [autoGeneratePoam, setAutoGeneratePoam] = useState(true);
  const [autoUpdateTracker, setAutoUpdateTracker] = useState(true);
  const [systemId, setSystemId] = useState('default');
  const [overrideManualChanges, setOverrideManualChanges] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState(null);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState('');

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setError('');
    setResults(null);
    setValidation(null);

    if (selectedFile) {
      await validateFile(selectedFile);
    }
  };

  const validateFile = async (fileToValidate) => {
    setIsValidating(true);
    setValidation(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToValidate);

      const response = await fetch('/api/scap/validate-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to validate file');
      }

      const data = await response.json();
      setValidation(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const processSCAPFile = async () => {
    if (!file) {
      setError('Please select a SCAP scan results file');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('auto_generate_poam', autoGeneratePoam);
      formData.append('auto_update_tracker', autoUpdateTracker);
      formData.append('system_id', systemId);
      formData.append('override_manual_changes', overrideManualChanges);
      formData.append('preview_only', previewOnly);

      const response = await fetch('/api/scap/upload-scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process SCAP file');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'critical': 'text-red-600 bg-red-100',
      'high': 'text-red-500 bg-red-50',
      'medium': 'text-yellow-600 bg-yellow-100',
      'low': 'text-green-600 bg-green-100',
      'info': 'text-blue-600 bg-blue-100',
      'informational': 'text-blue-600 bg-blue-100'
    };
    return colors[severity?.toLowerCase()] || 'text-gray-600 bg-gray-100';
  };

  const getStatusColor = (status) => {
    const colors = {
      'fail': 'text-red-600 bg-red-100',
      'pass': 'text-green-600 bg-green-100',
      'error': 'text-orange-600 bg-orange-100',
      'unknown': 'text-gray-600 bg-gray-100',
      'notapplicable': 'text-blue-600 bg-blue-100',
      'notchecked': 'text-gray-500 bg-gray-50'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                SCAP Scan Integration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Upload OpenSCAP XML or Nessus .nessus files to automatically generate POA&M entries for failed security controls
              </p>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="p-6">
          <div className="space-y-6">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <div className="text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="scap-file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                      Upload SCAP scan results file
                    </span>
                    <input
                      id="scap-file-upload"
                      name="scap-file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xml,.nessus"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Supports OpenSCAP XML and Nessus .nessus files up to 50MB
                  </p>
                </div>
              </div>
            </div>

            {/* File Info and Validation */}
            {file && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(file.size / 1024)}KB
                      </p>
                    </div>
                  </div>
                  
                  {isValidating && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm">Validating...</span>
                    </div>
                  )}
                  
                  {validation && (
                    <div className={`flex items-center space-x-2 ${
                      validation.validation_status === 'valid' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {validation.validation_status === 'valid' ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5" />
                      )}
                      <span className="text-sm font-medium">
                        {validation.validation_status === 'valid' ? 'Valid' : 'Invalid'} 
                        {validation.detected_format !== 'unknown' && ` ${validation.detected_format.toUpperCase()}`} file
                      </span>
                    </div>
                  )}
                </div>
                
                {validation && validation.validation_status === 'invalid' && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {validation.xml_error || 'Unsupported file format. Please upload a valid OpenSCAP XML or Nessus .nessus file.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Processing Options */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Processing Options
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoGeneratePoam}
                    onChange={(e) => setAutoGeneratePoam(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Automatically generate POA&M entries for failed controls
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoUpdateTracker}
                    onChange={(e) => setAutoUpdateTracker(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Automatically update tracker for failed controls
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={overrideManualChanges}
                    onChange={(e) => setOverrideManualChanges(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Override manual changes for failed controls
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={previewOnly}
                    onChange={(e) => setPreviewOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Preview mode (show results without creating POA&M entries)
                  </span>
                </label>
              </div>
            </div>

            {/* System ID */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                System Information
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                    System ID:
                  </span>
                  <input
                    type="text"
                    value={systemId}
                    onChange={(e) => setSystemId(e.target.value)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={processSCAPFile}
              disabled={!file || isProcessing || (validation && validation.validation_status !== 'valid')}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing SCAP File...
                </>
              ) : previewOnly ? (
                <>
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Preview Results
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Process SCAP File
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 pb-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                    Error Processing File
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Scan Results Summary
              </h3>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        Total Rules
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {results.summary.total_rules}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-900 dark:text-red-300">
                        Failed
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {results.summary.failed}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900 dark:text-green-300">
                        Passed
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {results.summary.passed}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
                        POA&M Generated
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {results.preview_mode ? results.generated_poams : results.created_poams}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scan Metadata */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Scan Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Scanner:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {results.scanner || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Target:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {results.target_system || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Scan Date:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {results.scan_date ? new Date(results.scan_date).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Profile:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {results.profile || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* POA&M Preview */}
              {results.poam_preview && results.poam_preview.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    {results.preview_mode ? 'POA&M Preview' : 'Created POA&M Entries'}
                  </h4>
                  <div className="space-y-3">
                    {results.poam_preview.map((poam, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {poam.control_id}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                poam.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                poam.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                poam.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {poam.priority}
                              </span>
                              {poam.severity && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  poam.severity === 'CAT I' ? 'bg-red-100 text-red-800' :
                                  poam.severity === 'CAT II' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {poam.severity}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white mb-2">
                              {poam.description}
                            </p>
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              Due: {new Date(poam.estimated_completion_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Findings Sample */}
              {results.findings && results.findings.filter(f => f.status === 'fail').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Failed Security Rules (Sample)
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {results.findings
                      .filter(finding => finding.status === 'fail')
                      .slice(0, 10)
                      .map((finding, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {finding.rule_title}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(finding.status)}`}>
                                  {finding.status.toUpperCase()}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                                  {finding.severity?.toUpperCase()}
                                </span>
                              </div>
                              
                              {finding.control_id && (
                                <div className="mb-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {finding.control_id}
                                  </span>
                                </div>
                              )}
                              
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {finding.description}
                              </p>
                              
                              {finding.remediation && (
                                <p className="text-sm text-green-700 dark:text-green-400">
                                  <strong>Remediation:</strong> {finding.remediation}
                                </p>
                              )}
                              
                              {finding.affected_hosts && finding.affected_hosts.length > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  Affected hosts: {finding.affected_hosts.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {results.findings.filter(f => f.status === 'fail').length > 10 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                      Showing 10 of {results.findings.filter(f => f.status === 'fail').length} failed rules
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SCAPIntegration; 