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
 * ImplementationModal Component (Updated for Phase 2)
 *
 * Displays OS-specific implementation scripts for NIST 800-53 controls.
 * Integrates with Phase 2 backend API for script retrieval.
 *
 * Features:
 * - OS selector (Windows ↔ Linux)
 * - Script format tabs (PowerShell | Bash | Ansible)
 * - Copy to clipboard with visual feedback
 * - Download script with proper file extensions
 * - Syntax highlighting using react-syntax-highlighter
 */
export default function ImplementationModal({ control, isOpen, onClose }) {
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

        // Backend now ALWAYS returns 200 with metadata
        const data = await response.json();
        setScriptData(data);

        // Error is only for network failures
        if (!response.ok && response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      aria-labelledby="implementation-modal-title"
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
              <h2 id="implementation-modal-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {control.control_name}
              </h2>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
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
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Network Error</p>
              <p className="text-red-500 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Script NOT available - display helpful message */}
          {!loading && !error && scriptData && scriptData.available === false && (
            <div className={`rounded-xl p-8 border-2 ${
              scriptData.reason === 'policy-only'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                : scriptData.reason === 'administrative'
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                : scriptData.reason === 'documentation'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
            }`}>
              {/* Icon and Title */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-lg ${
                  scriptData.reason === 'policy-only'
                    ? 'bg-blue-100 dark:bg-blue-800'
                    : scriptData.reason === 'administrative'
                    ? 'bg-purple-100 dark:bg-purple-800'
                    : scriptData.reason === 'documentation'
                    ? 'bg-green-100 dark:bg-green-800'
                    : 'bg-yellow-100 dark:bg-yellow-800'
                }`}>
                  <svg className={`h-6 w-6 ${
                    scriptData.reason === 'policy-only'
                      ? 'text-blue-600 dark:text-blue-400'
                      : scriptData.reason === 'administrative'
                      ? 'text-purple-600 dark:text-purple-400'
                      : scriptData.reason === 'documentation'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 ${
                    scriptData.reason === 'policy-only'
                      ? 'text-blue-900 dark:text-blue-100'
                      : scriptData.reason === 'administrative'
                      ? 'text-purple-900 dark:text-purple-100'
                      : scriptData.reason === 'documentation'
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-yellow-900 dark:text-yellow-100'
                  }`}>
                    {scriptData.reason === 'policy-only' && 'Policy-Only Control'}
                    {scriptData.reason === 'administrative' && 'Administrative Control'}
                    {scriptData.reason === 'documentation' && 'Documentation Control'}
                    {scriptData.reason === 'technical' && 'Implementation Coming Soon'}
                  </h3>
                  <p className={`text-sm ${
                    scriptData.reason === 'policy-only'
                      ? 'text-blue-700 dark:text-blue-300'
                      : scriptData.reason === 'administrative'
                      ? 'text-purple-700 dark:text-purple-300'
                      : scriptData.reason === 'documentation'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {scriptData.message}
                  </p>
                </div>
              </div>

              {/* Guidance */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Implementation Guidance
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {scriptData.guidance}
                </p>
              </div>

              {/* Alternative Resources */}
              {scriptData.alternative && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Alternative:</span>
                  <span className={`font-medium ${
                    scriptData.reason === 'policy-only'
                      ? 'text-blue-700 dark:text-blue-300'
                      : scriptData.reason === 'administrative'
                      ? 'text-purple-700 dark:text-purple-300'
                      : scriptData.reason === 'documentation'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {scriptData.alternative.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
              )}

              {/* Available Formats Info */}
              {scriptData.available_formats && Object.keys(scriptData.available_formats).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Note:</strong> This control has scripts available for other OS/format combinations.
                    Try switching OS or format above.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Script IS available - display normally */}
          {!loading && !error && scriptData && scriptData.available === true && (
            <>
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
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Script Information</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
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
                    <dd className="text-gray-900 dark:text-gray-100 font-medium capitalize">{scriptData.metadata?.status || 'N/A'}</dd>
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
}
