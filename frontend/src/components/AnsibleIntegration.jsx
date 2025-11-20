import React, { useState } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  PlayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const AnsibleIntegration = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [textOutput, setTextOutput] = useState('');
  const [outputFormat, setOutputFormat] = useState('auto');
  const [autoGeneratePoam, setAutoGeneratePoam] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setError('');
  };

  const handleTextChange = (event) => {
    setTextOutput(event.target.value);
    setError('');
  };

  const processAnsibleOutput = async () => {
    setIsProcessing(true);
    setError('');
    setResults(null);

    try {
      let response;
      
      if (activeTab === 'upload' && file) {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('output_format', outputFormat);
        formData.append('auto_generate_poam', autoGeneratePoam);

        response = await fetch('/api/ansible/upload-results', {
          method: 'POST',
          body: formData,
        });
      } else if (activeTab === 'text' && textOutput.trim()) {
        // Parse text output
        const formData = new FormData();
        formData.append('output', textOutput);
        formData.append('output_format', outputFormat);
        formData.append('auto_generate_poam', autoGeneratePoam);

        response = await fetch('/api/ansible/parse-output', {
          method: 'POST',
          body: formData,
        });
      } else {
        throw new Error('Please provide Ansible output via file upload or text input');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process Ansible output');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const testParser = async () => {
    if (!textOutput.trim()) {
      setError('Please enter sample Ansible output to test');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('sample_output', textOutput);
      formData.append('output_format', outputFormat);

      const response = await fetch('/api/ansible/test-parser', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Parser test failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="mt-6 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Processing Results
          </h3>
          
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {results.parsed_tasks || results.test_results?.parsed_tasks || 0}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Tasks Parsed</div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {results.failed_tasks || results.test_results?.failed_tasks || 0}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">Failed Tasks</div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {results.generated_poams || results.test_results?.would_generate_poams || 0}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                {results.generated_poams ? 'POA&Ms Created' : 'POA&Ms Would Create'}
              </div>
            </div>
            
            {results.filename && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {Math.round((results.file_size || 0) / 1024)}KB
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">File Size</div>
              </div>
            )}
          </div>

          {/* Task Results */}
          {(results.task_results || results.sample_tasks) && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Task Results {results.sample_tasks && '(Sample)'}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(results.task_results || results.sample_tasks || []).map((task, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    {task.status === 'failed' ? (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    ) : task.status === 'ok' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {task.task_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {task.control_id && `Control: ${task.control_id} | `}
                        Status: {task.status} | Host: {task.host || 'N/A'}
                      </div>
                      {task.error_message && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {task.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Created POA&Ms */}
          {(results.created_poams || results.potential_poams) && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                {results.created_poams ? 'Created POA&M Entries' : 'Potential POA&M Entries'}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(results.created_poams || results.potential_poams || []).map((poam, index) => (
                  <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 rounded border-l-4 border-green-400">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {poam.control_id}
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          poam.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                          poam.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                          poam.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {poam.priority}
                        </span>
                        {poam.severity && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {poam.severity}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {poam.description}
                    </div>
                    {poam.status && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Status: {poam.status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Results */}
          {results.test_results && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-md font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Parser Test Results
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <div>✅ Parsing: {results.test_results.parsed_successfully ? 'Success' : 'Failed'}</div>
                <div>🔍 Detected Format: {results.test_results.detected_format}</div>
                <div>📊 Would Parse: {results.test_results.parsed_tasks} tasks</div>
                <div>⚠️ Would Generate: {results.test_results.would_generate_poams} POA&M entries</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Ansible Integration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Parse Ansible security scan results and automatically generate POA&M entries for failed controls
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'text'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Paste Output
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Configuration Options */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Output Format
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="auto">Auto-detect</option>
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
                <option value="stdout">Standard Output</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoGeneratePoam"
                checked={autoGeneratePoam}
                onChange={(e) => setAutoGeneratePoam(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoGeneratePoam" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Automatically generate POA&M entries for failures
              </label>
            </div>
          </div>

          {/* File Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <div className="text-center">
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                        Upload Ansible results file
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".json,.yaml,.yml,.txt,.log"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      JSON, YAML, or text files up to 10MB
                    </p>
                  </div>
                </div>
              </div>
              
              {file && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>{file.name} ({Math.round(file.size / 1024)}KB)</span>
                </div>
              )}
            </div>
          )}

          {/* Text Input Tab */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ansible Output
                </label>
                <textarea
                  value={textOutput}
                  onChange={handleTextChange}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Paste your Ansible output here (JSON, YAML, or standard output format)..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={testParser}
                  disabled={isProcessing || !textOutput.trim()}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Parser
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                    Processing Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setFile(null);
                setTextOutput('');
                setResults(null);
                setError('');
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear
            </button>
            
            <button
              onClick={processAnsibleOutput}
              disabled={isProcessing || (!file && !textOutput.trim())}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  <span>Process Output</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {renderResults()}
      </div>
    </div>
  );
};

export default AnsibleIntegration; 