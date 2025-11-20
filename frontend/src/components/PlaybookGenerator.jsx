import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  DocumentTextIcon, 
  ArrowDownTrayIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import AnsibleOutputViewer from './AnsibleOutputViewer';
import OSSelector from './OSSelector';
import OSComplianceGuide from './OSComplianceGuide';
import BaselineSelector from './BaselineSelector';

const PlaybookGenerator = () => {
  const [formData, setFormData] = useState({
    control_id: '',
    operating_system: 'ubuntu_20_04',
    stig_id: '',
    environment: {},
    force_refresh: false,
    include_comments: true,
    include_handlers: true,
    include_variables: true
  });

  const [operatingSystems, setOperatingSystems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  const [supportedControls, setSupportedControls] = useState([]);
  const [generatedPlaybook, setGeneratedPlaybook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [showAnsibleViewer, setShowAnsibleViewer] = useState(false);
  const [selectedBaseline, setSelectedBaseline] = useState('nist_800_53_moderate');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.operating_system) {
      fetchSupportedControls(formData.operating_system);
    }
  }, [formData.operating_system]);

  const fetchInitialData = async () => {
    try {
      const [osResponse, templatesResponse, statsResponse] = await Promise.all([
        fetch('/api/playbook/operating-systems'),
        fetch('/api/playbook/templates'),
        fetch('/api/playbook/stats')
      ]);

      if (osResponse.ok) {
        const osData = await osResponse.json();
        setOperatingSystems(osData.operating_systems);
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (err) {
      setError('Failed to load initial data');
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchSupportedControls = async (os) => {
    try {
      const response = await fetch(`/api/playbook/supported-controls/${os}`);
      if (response.ok) {
        const data = await response.json();
        setSupportedControls(data.supported_controls);
      }
    } catch (err) {
      console.error('Error fetching supported controls:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEnvironmentChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [key]: value
      }
    }));
  };

  const generatePlaybook = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/playbook/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate playbook');
      }

      const playbook = await response.json();
      setGeneratedPlaybook(playbook);
      setShowAnsibleViewer(true);
      
      // Refresh stats
      fetchInitialData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runDemo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/playbook/demo', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to run demo');
      }

      const demoResults = await response.json();
      setGeneratedPlaybook({
        ...demoResults,
        is_demo: true
      });
      setActiveTab('result');
      
      // Refresh stats
      fetchInitialData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/playbook/cache', {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Cache cleared successfully');
        fetchInitialData();
      } else {
        throw new Error('Failed to clear cache');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadPlaybook = (content, filename) => {
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExplainPlaybook = async (playbook) => {
    alert(`This Ansible playbook implements ${playbook.control_id} with ${playbook.tasks?.length || 0} tasks for ${playbook.operating_system?.replace('_', ' ')} systems.`);
  };

  const handleTestPlaybook = async (playbook) => {
    alert(`Testing playbook ${playbook.control_id} in sandbox environment (feature coming soon)`);
  };

  const renderGenerateForm = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-dark-100 p-6 rounded-lg shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 transition-colors duration-300">
          Generate Ansible Playbook
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="w-full md:w-1/2">
            <BaselineSelector
              selectedBaseline={selectedBaseline}
              onBaselineChange={setSelectedBaseline}
              showDetails={false}
            />
          </div>
          <div className="w-full md:w-1/2">
            <OSSelector
              selectedOS={formData.operating_system}
              onOSChange={(osValue) => setFormData(prev => ({ ...prev, operating_system: osValue }))}
              supportedControls={supportedControls}
              showDetails={false}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">
              NIST Control ID *
            </label>
            <input
              type="text"
              name="control_id"
              value={formData.control_id}
              onChange={handleInputChange}
              placeholder="e.g., AC-17, SC-28, AU-2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300"
              required
            />
            {supportedControls.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-dark-600 transition-colors duration-300">Static templates available for:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {supportedControls.map(control => (
                    <span
                      key={control}
                      className="inline-block px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors duration-200"
                      onClick={() => setFormData(prev => ({ ...prev, control_id: control }))}
                    >
                      {control}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">
              STIG ID (Optional)
            </label>
            <input
              type="text"
              name="stig_id"
              value={formData.stig_id}
              onChange={handleInputChange}
              placeholder="e.g., UBTU-20-010043"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">
              Environment Variables
            </label>
            <input
              type="text"
              placeholder="key=value (press Enter to add)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const [key, value] = e.target.value.split('=');
                  if (key && value) {
                    handleEnvironmentChange(key.trim(), value.trim());
                    e.target.value = '';
                  }
                }
              }}
            />
            {Object.keys(formData.environment).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(formData.environment).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded transition-colors duration-300"
                  >
                    {key}={value}
                    <button
                      onClick={() => {
                        const newEnv = { ...formData.environment };
                        delete newEnv[key];
                        setFormData(prev => ({ ...prev, environment: newEnv }));
                      }}
                      className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="include_comments"
                checked={formData.include_comments}
                onChange={handleInputChange}
                className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700 dark:text-dark-700 transition-colors duration-300">Include Comments</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="include_handlers"
                checked={formData.include_handlers}
                onChange={handleInputChange}
                className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700 dark:text-dark-700 transition-colors duration-300">Include Handlers</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="include_variables"
                checked={formData.include_variables}
                onChange={handleInputChange}
                className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700 dark:text-dark-700 transition-colors duration-300">Include Variables</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="force_refresh"
                checked={formData.force_refresh}
                onChange={handleInputChange}
                className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700 dark:text-dark-700 transition-colors duration-300">Force Refresh</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={generatePlaybook}
            disabled={loading || !formData.control_id}
            className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Playbook'}
          </button>
          
          <button
            onClick={runDemo}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <CogIcon className="h-4 w-4 mr-2" />
            Run Demo
          </button>
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="bg-white dark:bg-dark-100 p-6 rounded-lg shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 transition-colors duration-300">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center transition-colors duration-300">
        <ChartBarIcon className="h-5 w-5 mr-2" />
        Enhanced Hybrid STIG Ansible Generator
      </h3>
      
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors duration-300">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">{stats.total_templates}</div>
            <div className="text-sm text-blue-800 dark:text-blue-300 transition-colors duration-300">Total Templates</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg transition-colors duration-300">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 transition-colors duration-300">{stats.supported_controls}</div>
            <div className="text-sm text-green-800 dark:text-green-300 transition-colors duration-300">Supported Controls</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg transition-colors duration-300">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 transition-colors duration-300">{stats.operating_systems}</div>
            <div className="text-sm text-purple-800 dark:text-purple-300 transition-colors duration-300">Operating Systems</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg transition-colors duration-300">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 transition-colors duration-300">{stats.cache_size}</div>
            <div className="text-sm text-yellow-800 dark:text-yellow-300 transition-colors duration-300">Cached Results</div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-lg transition-colors duration-300">
          <h4 className="font-semibold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">🎯 Recent Enhancements</h4>
          <ul className="text-sm text-gray-700 dark:text-dark-700 space-y-1 transition-colors duration-300">
            <li>• <strong>Modular Template Management:</strong> Organized templates by OS and control ID</li>
            <li>• <strong>Enhanced GPT Fallback:</strong> Improved prompts with structured format</li>
            <li>• <strong>Extended STIG Mappings:</strong> 28+ control mappings across 4 OS types</li>
            <li>• <strong>Advanced Caching:</strong> Intelligent cache with performance optimization</li>
          </ul>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg transition-colors duration-300">
          <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2 transition-colors duration-300">🔧 Template Structure</h4>
          <div className="text-sm text-indigo-800 dark:text-indigo-400 transition-colors duration-300">
            {stats?.template_structure === 'Modular' ? (
              <span>✅ Using enhanced modular structure: <code className="bg-indigo-100 dark:bg-indigo-900/40 px-1 rounded transition-colors duration-300">/playbook-templates/{{os}}/{{control_id}}.yml</code></span>
            ) : (
              <span>⚠️ Using legacy structure: <code className="bg-indigo-100 dark:bg-indigo-900/40 px-1 rounded transition-colors duration-300">/playbook-templates/{{control}}_{{os}}.yml</code></span>
            )}
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={clearCache}
            className="flex items-center px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Modular Template Library
        </h3>
        <div className="text-sm text-gray-500">
          {stats?.template_structure === 'Modular' ? '📁 Modular Structure' : '📄 Legacy Structure'}
        </div>
      </div>

      {/* Template Structure Info */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Template Organization</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• <strong>Modular Structure:</strong> Templates organized by OS directory (e.g., ubuntu_20_04/AC-2.yml)</div>
          <div>• <strong>Enhanced Coverage:</strong> Expanded STIG mappings and OS-specific optimizations</div>
          <div>• <strong>Standardized Format:</strong> Consistent naming, tagging, and documentation</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <div key={`${template.control_id}_${template.operating_system}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-gray-900">{template.control_id}</h4>
              <div className="flex flex-col items-end space-y-1">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {template.operating_system.replace('_', ' ')}
                </span>
                {stats?.template_structure === 'Modular' && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    📁 Modular
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{template.description}</p>
            
            {template.stig_id && (
              <div className="text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                <strong>STIG:</strong> {template.stig_id}
              </div>
            )}
            
            <div className="flex flex-wrap gap-1 mb-3">
              {template.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{template.tags.length - 3} more</span>
              )}
            </div>

            {/* Template Stats */}
            <div className="text-xs text-gray-500 mb-3 space-y-1">
              {template.requirements && template.requirements.length > 0 && (
                <div>📦 {template.requirements.length} packages</div>
              )}
              {Object.keys(template.variables || {}).length > 0 && (
                <div>⚙️ {Object.keys(template.variables).length} variables</div>
              )}
            </div>
            
            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  control_id: template.control_id,
                  operating_system: template.operating_system
                }));
                setActiveTab('generate');
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
            >
              Use Template →
            </button>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No templates available. Generate your first playbook to see templates here.</p>
        </div>
      )}
    </div>
  );

  const renderResult = () => {
    if (!generatedPlaybook) return null;

    if (generatedPlaybook.is_demo) {
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Demo Results
            </h3>
            
            <div className="space-y-4">
              {generatedPlaybook.demo_results.map((result, index) => (
                <div key={index} className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">
                        {result.control_id} - {result.operating_system?.replace('_', ' ')}
                      </h4>
                      {result.success ? (
                        <div className="text-sm text-green-700">
                          Source: {result.source} | Tasks: {result.tasks_count} | Cached: {result.cached ? 'Yes' : 'No'}
                        </div>
                      ) : (
                        <div className="text-sm text-red-700">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                    <div className={`p-2 rounded-full ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                      {result.success ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Generated: {generatedPlaybook.total_generated} | Failed: {generatedPlaybook.total_failed}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Generated Playbook: {generatedPlaybook.control_id}
              </h3>
              <p className="text-sm text-gray-600">{generatedPlaybook.description}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded ${generatedPlaybook.source === 'static_template' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                {generatedPlaybook.source === 'static_template' ? 'Static Template' : 'AI Generated'}
              </span>
              {generatedPlaybook.cached && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Cached
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{generatedPlaybook.tasks?.length || 0}</div>
              <div className="text-sm text-gray-600">Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{generatedPlaybook.handlers?.length || 0}</div>
              <div className="text-sm text-gray-600">Handlers</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{Object.keys(generatedPlaybook.variables || {}).length}</div>
              <div className="text-sm text-gray-600">Variables</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-900">Ansible Playbook YAML</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(generatedPlaybook.playbook_yaml)}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                  Copy
                </button>
                <button
                  onClick={() => downloadPlaybook(
                    generatedPlaybook.playbook_yaml,
                    `${generatedPlaybook.control_id}_${generatedPlaybook.operating_system}.yml`
                  )}
                  className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                  Download
                </button>
                <button
                  onClick={() => setShowAnsibleViewer(true)}
                  className="flex items-center px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Enhanced View
                </button>
              </div>
            </div>
            
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generatedPlaybook.playbook_yaml}</code>
            </pre>
          </div>

          {generatedPlaybook.requirements && generatedPlaybook.requirements.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Requirements</h4>
              <div className="flex flex-wrap gap-2">
                {generatedPlaybook.requirements.map(req => (
                  <span key={req} className="px-2 py-1 text-sm bg-yellow-100 text-yellow-800 rounded">
                    {req}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-4 border-t">
            <div>Generated: {new Date(generatedPlaybook.generated_at).toLocaleString()}</div>
            <div>Estimated Runtime: {generatedPlaybook.estimated_runtime}</div>
            {generatedPlaybook.stig_id && <div>STIG ID: {generatedPlaybook.stig_id}</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900 mb-2 transition-colors duration-300">
            STIG Ansible Playbook Generator
          </h1>
          <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">
            Generate production-ready Ansible playbooks for NIST 800-53 controls using static templates and AI
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg transition-colors duration-300">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 transition-colors duration-300" />
              <span className="text-red-700 dark:text-red-300 transition-colors duration-300">{error}</span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-dark-300 transition-colors duration-300">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'generate', name: 'Generate', icon: PlayIcon },
                { id: 'os-guide', name: 'OS Guide', icon: CogIcon },
                { id: 'templates', name: 'Templates', icon: DocumentTextIcon },
                { id: 'stats', name: 'Statistics', icon: ChartBarIcon },
                { id: 'result', name: 'Result', icon: CheckCircleIcon }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-dark-500 hover:text-gray-700 dark:hover:text-dark-700 hover:border-gray-300 dark:hover:border-dark-400'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'generate' && renderGenerateForm()}
          {activeTab === 'os-guide' && (
            <OSComplianceGuide 
              selectedOS={formData.operating_system}
              onGeneratePlaybook={(controlId) => {
                setFormData(prev => ({ ...prev, control_id: controlId }));
                setActiveTab('generate');
              }}
            />
          )}
          {activeTab === 'templates' && renderTemplates()}
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'result' && renderResult()}
        </div>

        {showAnsibleViewer && generatedPlaybook && (
          <AnsibleOutputViewer
            playbook={generatedPlaybook}
            onClose={() => setShowAnsibleViewer(false)}
            onExplainPlaybook={handleExplainPlaybook}
            onTestPlaybook={handleTestPlaybook}
          />
        )}
      </div>
    </div>
  );
};

export default PlaybookGenerator; 