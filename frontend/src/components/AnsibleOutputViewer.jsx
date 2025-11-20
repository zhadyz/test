import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../contexts/ThemeContext';
import {
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const AnsibleOutputViewer = ({ 
  playbook, 
  onClose, 
  onExplainPlaybook, 
  onTestPlaybook 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState(new Set(['playbook']));
  const [copied, setCopied] = useState(false);
  const { isDarkMode } = useTheme();

  if (!playbook) return null;

  // Handle multiple playbooks (different OS versions)
  const playbooks = Array.isArray(playbook) ? playbook : [playbook];

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSourceBadge = (source) => {
    if (source === 'static_template') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 transition-colors duration-200">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Static Template
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 transition-colors duration-200">
          <ChatBubbleLeftRightIcon className="h-3 w-3 mr-1" />
          AI Generated
        </span>
      );
    }
  };

  const currentPlaybook = playbooks[activeTab];

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl dark:shadow-dark-medium max-w-6xl w-full max-h-[90vh] flex flex-col transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-300">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <PlayIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-900">
                Ansible Playbook: {currentPlaybook.control_id}
              </h2>
            </div>
            {getSourceBadge(currentPlaybook.source)}
            {currentPlaybook.cached && (
              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full transition-colors duration-200">
                Cached
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors duration-200"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-dark-500" />
          </button>
        </div>

        {/* Tabs for multiple OS versions */}
        {playbooks.length > 1 && (
          <div className="border-b border-gray-200 dark:border-dark-300">
            <nav className="flex space-x-8 px-6">
              {playbooks.map((pb, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === index
                      ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-dark-500 hover:text-gray-700 dark:hover:text-dark-700 hover:border-gray-300 dark:hover:border-dark-400'
                  }`}
                >
                  {pb.operating_system?.replace('_', ' ') || `Version ${index + 1}`}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Playbook Info */}
          <div className="p-6 bg-gray-50 dark:bg-dark-200/50 border-b border-gray-200 dark:border-dark-300 transition-colors duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {currentPlaybook.tasks?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-dark-600">Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {currentPlaybook.handlers?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-dark-600">Handlers</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  {Object.keys(currentPlaybook.variables || {}).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-dark-600">Variables</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {currentPlaybook.estimated_runtime || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-dark-600">Est. Runtime</div>
              </div>
            </div>

            {/* Description */}
            {currentPlaybook.description && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border dark:border-blue-800/30 rounded-lg transition-colors duration-300">
                <p className="text-sm text-blue-900 dark:text-blue-300">{currentPlaybook.description}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 bg-white dark:bg-dark-100 border-b border-gray-200 dark:border-dark-300 transition-colors duration-300">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => copyToClipboard(currentPlaybook.playbook_yaml)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 ${
                  copied 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                    : 'bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-dark-700 hover:bg-gray-200 dark:hover:bg-dark-300'
                }`}
              >
                <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              
              <button
                onClick={() => downloadPlaybook(
                  currentPlaybook.playbook_yaml,
                  `${currentPlaybook.control_id}_${currentPlaybook.operating_system || 'playbook'}.yml`
                )}
                className="flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 font-medium text-sm transition-colors duration-200"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download YAML
              </button>
              
              {onExplainPlaybook && (
                <button
                  onClick={() => onExplainPlaybook(currentPlaybook)}
                  className="flex items-center px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/40 font-medium text-sm transition-colors duration-200"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  Explain Playbook
                </button>
              )}
              
              {onTestPlaybook && (
                <button
                  onClick={() => onTestPlaybook(currentPlaybook)}
                  className="flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 font-medium text-sm transition-colors duration-200"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Test in Sandbox
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Sections */}
          <div className="flex-1 overflow-y-auto">
            {/* Main Playbook YAML */}
            <div className="border-b border-gray-200 dark:border-dark-300">
              <button
                onClick={() => toggleSection('playbook')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200"
              >
                <div className="flex items-center">
                  {expandedSections.has('playbook') ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-dark-500 mr-2" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-500 dark:text-dark-500 mr-2" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Ansible Playbook YAML</h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-dark-500">
                  {currentPlaybook.playbook_yaml?.split('\n').length || 0} lines
                </span>
              </button>
              
              {expandedSections.has('playbook') && (
                <div className="px-6 pb-4">
                  <div className="bg-gray-900 dark:bg-dark-50 rounded-lg overflow-hidden border dark:border-dark-300">
                    <SyntaxHighlighter
                      language="yaml"
                      style={isDarkMode ? oneDark : tomorrow}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        backgroundColor: isDarkMode ? '#18181b' : '#2d3748'
                      }}
                      showLineNumbers={true}
                    >
                      {currentPlaybook.playbook_yaml || '# No playbook content available'}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>

            {/* Requirements Section */}
            {currentPlaybook.requirements && currentPlaybook.requirements.length > 0 && (
              <div className="border-b border-gray-200 dark:border-dark-300">
                <button
                  onClick={() => toggleSection('requirements')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200"
                >
                  <div className="flex items-center">
                    {expandedSections.has('requirements') ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-dark-500 mr-2" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-500 dark:text-dark-500 mr-2" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Requirements</h3>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-dark-500">
                    {currentPlaybook.requirements.length} items
                  </span>
                </button>
                
                {expandedSections.has('requirements') && (
                  <div className="px-6 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentPlaybook.requirements.map((req, index) => (
                        <div
                          key={index}
                          className="flex items-center px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg transition-colors duration-200"
                        >
                          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                          <span className="text-sm text-yellow-800 dark:text-yellow-300">{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Variables Section */}
            {currentPlaybook.variables && Object.keys(currentPlaybook.variables).length > 0 && (
              <div className="border-b border-gray-200 dark:border-dark-300">
                <button
                  onClick={() => toggleSection('variables')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200"
                >
                  <div className="flex items-center">
                    {expandedSections.has('variables') ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-dark-500 mr-2" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-500 dark:text-dark-500 mr-2" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Variables</h3>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-dark-500">
                    {Object.keys(currentPlaybook.variables).length} variables
                  </span>
                </button>
                
                {expandedSections.has('variables') && (
                  <div className="px-6 pb-4">
                    <div className="bg-gray-900 dark:bg-dark-50 rounded-lg overflow-hidden border dark:border-dark-300">
                      <SyntaxHighlighter
                        language="yaml"
                        style={isDarkMode ? oneDark : tomorrow}
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          backgroundColor: isDarkMode ? '#18181b' : '#2d3748'
                        }}
                      >
                        {Object.entries(currentPlaybook.variables)
                          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                          .join('\n')}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Metadata Section */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-dark-200/50 transition-colors duration-300">
              <h4 className="text-sm font-medium text-gray-900 dark:text-dark-900 mb-3">Metadata</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-dark-600">Generated:</span>
                  <span className="ml-2 text-gray-900 dark:text-dark-900">
                    {new Date(currentPlaybook.generated_at).toLocaleString()}
                  </span>
                </div>
                {currentPlaybook.stig_id && (
                  <div>
                    <span className="text-gray-600 dark:text-dark-600">STIG ID:</span>
                    <span className="ml-2 text-gray-900 dark:text-dark-900">{currentPlaybook.stig_id}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600 dark:text-dark-600">Operating System:</span>
                  <span className="ml-2 text-gray-900 dark:text-dark-900">
                    {currentPlaybook.operating_system?.replace('_', ' ') || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-dark-600">Source:</span>
                  <span className="ml-2 text-gray-900 dark:text-dark-900">
                    {currentPlaybook.source === 'static_template' ? 'Static Template' : 'AI Generated'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnsibleOutputViewer; 