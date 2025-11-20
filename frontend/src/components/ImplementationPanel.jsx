import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentCheckIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_BASE_URL = '/api';

/**
 * ImplementationPanel Component
 *
 * Displays OS-specific implementation scripts for NIST 800-53 controls.
 * Integrates with Phase 2 backend API for script retrieval.
 *
 * Features:
 * - OS selector (Windows ↔ Linux)
 * - Script format tabs (PowerShell | Bash | Ansible)
 * - Copy to clipboard with visual feedback
 * - Download script with proper file extensions
 * - Syntax highlighting using Prism
 */
const ImplementationPanel = ({ control, isOpen, onClose }) => {
  const [selectedOS, setSelectedOS] = useState('linux');
  const [selectedFormat, setSelectedFormat] = useState('ansible');
  const [scriptData, setScriptData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [availableFormats, setAvailableFormats] = useState(null);

  // Fetch available formats when modal opens
  useEffect(() => {
    if (!isOpen || !control) {
      return;
    }

    const fetchAvailableFormats = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/controls/${control.control_id}/formats`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setAvailableFormats(data.available_formats);

        // Auto-select first available OS and format
        const oses = Object.keys(data.available_formats);
        if (oses.length > 0) {
          const firstOS = oses[0];
          setSelectedOS(firstOS);

          const formats = data.available_formats[firstOS];
          if (formats && formats.length > 0) {
            setSelectedFormat(formats[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch available formats:', err);
        setError(err.message);
      }
    };

    fetchAvailableFormats();
  }, [control, isOpen]);

  // Fetch script when OS or format changes
  useEffect(() => {
    if (!isOpen || !control || !selectedOS || !selectedFormat) {
      return;
    }

    const fetchScript = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/controls/${control.control_id}/implementation?os=${selectedOS}&format=${selectedFormat}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setScriptData(data);
      } catch (err) {
        console.error('Failed to fetch script:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [control, selectedOS, selectedFormat, isOpen]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!scriptData?.implementation_script) {
      return;
    }

    try {
      await navigator.clipboard.writeText(scriptData.implementation_script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  // Download script
  const handleDownload = () => {
    if (!scriptData?.implementation_script) {
      return;
    }

    const fileExtensions = {
      powershell: 'ps1',
      bash: 'sh',
      ansible: 'yml'
    };

    const extension = fileExtensions[selectedFormat] || 'txt';
    const filename = `${control.control_id}_${selectedOS}_${selectedFormat}.${extension}`;

    const blob = new Blob([scriptData.implementation_script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get syntax highlighting language
  const getSyntaxLanguage = () => {
    const languageMap = {
      powershell: 'powershell',
      bash: 'bash',
      ansible: 'yaml'
    };
    return languageMap[selectedFormat] || 'text';
  };

  if (!isOpen || !control) {
    return null;
  }

  const osOptions = availableFormats ? Object.keys(availableFormats) : [];
  const formatOptions = availableFormats && selectedOS ? (availableFormats[selectedOS] || []) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="implementation-panel-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg">
                  {control.control_id.toUpperCase()}
                </span>
                <span className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold rounded-lg">
                  {control.family || 'Implementation'}
                </span>
              </div>
              <h2 id="implementation-panel-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {control.control_name}
              </h2>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close panel"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <p className="text-gray-600 dark:text-gray-400">
            {control.plain_english_explanation || control.description}
          </p>
        </div>

        {/* OS and Format Selectors */}
        <div className="px-8 py-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* OS Selector */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Operating System
              </label>
              <div className="flex gap-2">
                {osOptions.map((os) => (
                  <button
                    key={os}
                    onClick={() => {
                      setSelectedOS(os);
                      // Auto-select first format for new OS
                      const formats = availableFormats[os];
                      if (formats && formats.length > 0) {
                        setSelectedFormat(formats[0]);
                      }
                    }}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      selectedOS === os
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {os.charAt(0).toUpperCase() + os.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selector */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Script Format
              </label>
              <div className="flex gap-2">
                {formatOptions.map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      selectedFormat === format
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {format === 'powershell' ? 'PowerShell' :
                     format === 'bash' ? 'Bash' :
                     format === 'ansible' ? 'Ansible' : format}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Script Content */}
        <div className="px-8 py-6 max-h-[calc(90vh-400px)] overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Generating production-ready script...
              </p>
              {selectedFormat && (
                <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                  Using hybrid compliance strategy
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
                Failed to generate script
              </p>
              <p className="text-red-500 dark:text-red-300 text-sm mb-3">{error}</p>

              {error.includes('No content available') && (
                <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-sm">
                  <p className="text-yellow-700 dark:text-yellow-300 font-medium mb-1">
                    Manual Implementation Required
                  </p>
                  <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                    This control does not have automated content yet. Please refer to the
                    NIST 800-53 official documentation for implementation guidance.
                  </p>
                </div>
              )}
            </div>
          )}

          {!loading && !error && scriptData && (
            <>
              {/* Source Attribution Badge */}
              {scriptData?.source && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Script Source:
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      scriptData.source === 'OpenSCAP' ? 'bg-green-600 text-white' :
                      scriptData.source === 'ComplianceAsCode' ? 'bg-purple-600 text-white' :
                      'bg-orange-600 text-white'
                    }`}>
                      {scriptData.source}
                    </span>
                  </div>

                  <p className={`text-xs mt-1 ${
                    scriptData.source === 'OpenSCAP' ? 'text-green-700 dark:text-green-300' :
                    scriptData.source === 'ComplianceAsCode' ? 'text-purple-700 dark:text-purple-300' :
                    'text-orange-700 dark:text-orange-300'
                  }`}>
                    {scriptData.source === 'OpenSCAP' && 'Generated from OpenSCAP Security Guide - Industry-standard compliance content'}
                    {scriptData.source === 'ComplianceAsCode' && 'Generated from ComplianceAsCode project - Community-maintained content'}
                    {scriptData.source === 'Custom Template' && 'Generated from custom template - Tailored for this control'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentCheckIcon className="h-5 w-5" />
                      Copy to Clipboard
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Download Script
                </button>
              </div>

              {/* Syntax Highlighted Code */}
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <SyntaxHighlighter
                  language={getSyntaxLanguage()}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                  }}
                  showLineNumbers={true}
                  wrapLines={true}
                >
                  {scriptData.implementation_script}
                </SyntaxHighlighter>
              </div>

              {/* Metadata */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Script Information
                </h3>

                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Control ID</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">{scriptData.control_id.toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">OS</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium capitalize">{scriptData.os}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Format</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium capitalize">{scriptData.format}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium capitalize">
                      {scriptData.metadata?.status || 'Generated'}
                    </dd>
                  </div>

                  {/* Quality Indicators */}
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Idempotency</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">
                      {scriptData.metadata?.idempotent ? (
                        <span className="text-green-600 dark:text-green-400">✓ Verified</span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400">⚠ Not verified</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Rollback Support</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">
                      {scriptData.metadata?.has_rollback ? (
                        <span className="text-green-600 dark:text-green-400">✓ Supported</span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">✗ Not supported</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">OpenSCAP Validated</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">
                      {scriptData.metadata?.oscap_validated ? (
                        <span className="text-green-600 dark:text-green-400">✓ Validated</span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400">⚠ Pending</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Generated</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">
                      {scriptData.metadata?.generated_at ?
                        new Date(scriptData.metadata.generated_at).toLocaleDateString() :
                        'Unknown'}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          )}

          {!loading && !error && !scriptData && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
              <p className="text-yellow-600 dark:text-yellow-400 font-semibold">No script available</p>
              <p className="text-yellow-500 dark:text-yellow-300 text-sm mt-1">
                Implementation script not found for this control, OS, and format combination.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImplementationPanel;
