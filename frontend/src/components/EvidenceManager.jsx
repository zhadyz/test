import React, { useState, useEffect, useRef } from 'react';
import {
  DocumentIcon,
  PhotoIcon,
  DocumentTextIcon,
  CogIcon,
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  CalendarIcon,
  TagIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useSystem } from '../contexts/SystemContext';

const EvidenceManager = ({ control, onEvidenceUpdate }) => {
  const { currentSystem } = useSystem();
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    evidence_type: 'other',
    confidence_level: 'medium',
    date_collected: '',
    tags: '',
    file: null
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Evidence type options with icons
  const evidenceTypes = {
    document: { label: 'Document', icon: DocumentTextIcon, color: 'blue' },
    screenshot: { label: 'Screenshot', icon: PhotoIcon, color: 'green' },
    log_file: { label: 'Log File', icon: DocumentIcon, color: 'yellow' },
    configuration: { label: 'Configuration', icon: CogIcon, color: 'purple' },
    report: { label: 'Report', icon: ShieldCheckIcon, color: 'indigo' },
    certificate: { label: 'Certificate', icon: ShieldCheckIcon, color: 'red' },
    other: { label: 'Other', icon: DocumentIcon, color: 'gray' }
  };

  // Confidence level options
  const confidenceLevels = {
    low: { label: 'Low', color: 'red' },
    medium: { label: 'Medium', color: 'yellow' },
    high: { label: 'High', color: 'green' }
  };

  // Load evidence when component mounts or control changes
  useEffect(() => {
    if (control?.control_id && currentSystem?.system_id) {
      loadEvidence();
    }
  }, [control?.control_id, currentSystem?.system_id]);

  const loadEvidence = async () => {
    if (!control?.control_id || !currentSystem?.system_id) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/evidence/control/${control.control_id}?system_id=${currentSystem.system_id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvidenceList(data.data || []);
      } else {
        throw new Error('Failed to load evidence');
      }
    } catch (err) {
      setError('Failed to load evidence: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError('File size exceeds 50MB limit');
        return;
      }

      setUploadForm(prev => ({ ...prev, file }));
      
      // Auto-suggest title from filename
      if (!uploadForm.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadForm(prev => ({ ...prev, title: nameWithoutExt }));
      }

      // Auto-detect evidence type based on file extension
      const extension = file.name.split('.').pop().toLowerCase();
      let detectedType = 'other';
      
      if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) {
        detectedType = 'document';
      } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(extension)) {
        detectedType = 'screenshot';
      } else if (['log', 'csv', 'json', 'xml'].includes(extension)) {
        detectedType = 'log_file';
      } else if (['conf', 'config', 'cfg', 'ini', 'yaml', 'yml'].includes(extension)) {
        detectedType = 'configuration';
      }
      
      setUploadForm(prev => ({ ...prev, evidence_type: detectedType }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title.trim()) {
      setError('Please provide a file and title');
      return;
    }

    if (!currentSystem?.system_id) {
      setError('Please select a system first');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('control_id', control.control_id);
      formData.append('system_id', currentSystem.system_id);
      formData.append('title', uploadForm.title.trim());
      formData.append('description', uploadForm.description.trim());
      formData.append('evidence_type', uploadForm.evidence_type);
      formData.append('confidence_level', uploadForm.confidence_level);
      formData.append('tags', uploadForm.tags);
      formData.append('uploaded_by', 'Current User'); // TODO: Get from auth context
      
      if (uploadForm.date_collected) {
        formData.append('date_collected', uploadForm.date_collected);
      }

      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setEvidenceList(prev => [result.data, ...prev]);
        setShowUploadModal(false);
        resetUploadForm();
        
        // Notify parent component
        if (onEvidenceUpdate) {
          onEvidenceUpdate();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (evidenceId) => {
    if (!confirm('Are you sure you want to delete this evidence? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEvidenceList(prev => prev.filter(item => item.evidence_id !== evidenceId));
        
        // Notify parent component
        if (onEvidenceUpdate) {
          onEvidenceUpdate();
        }
      } else {
        throw new Error('Failed to delete evidence');
      }
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const handleDownload = async (evidenceId, filename) => {
    try {
      const response = await fetch(`/api/evidence/${evidenceId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      setError('Download failed: ' + err.message);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      evidence_type: 'other',
      confidence_level: 'medium',
      date_collected: '',
      tags: '',
      file: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEvidenceIcon = (type) => {
    const typeInfo = evidenceTypes[type] || evidenceTypes.other;
    const IconComponent = typeInfo.icon;
    return <IconComponent className="h-5 w-5" />;
  };

  const getConfidenceBadge = (level) => {
    const levelInfo = confidenceLevels[level] || confidenceLevels.medium;
    const colorClasses = {
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      green: 'bg-green-100 text-green-800 border-green-200'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClasses[levelInfo.color]}`}>
        {levelInfo.label}
      </span>
    );
  };

  if (!currentSystem) {
    return (
      <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-2">No System Selected</h3>
          <p className="text-gray-600 dark:text-dark-600">
            Please select a system to manage evidence for this control.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-dark-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                Evidence & Artifacts
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-500">
                {evidenceList.length} item{evidenceList.length !== 1 ? 's' : ''} for {control.control_id}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Upload Evidence
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Evidence List */}
      <div className="p-6">
        {loading && evidenceList.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-dark-600">Loading evidence...</p>
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="text-center py-8">
            <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-2">No Evidence Yet</h4>
            <p className="text-gray-600 dark:text-dark-600 mb-4">
              Upload documents, screenshots, logs, or other artifacts to support this control.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Upload First Evidence
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {evidenceList.map((evidence) => (
              <div
                key={evidence.evidence_id}
                className="border border-gray-200 dark:border-dark-300 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-${evidenceTypes[evidence.evidence_type]?.color || 'gray'}-100`}>
                      {getEvidenceIcon(evidence.evidence_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                          {evidence.title}
                        </h4>
                        {getConfidenceBadge(evidence.confidence_level)}
                      </div>
                      
                      {evidence.description && (
                        <p className="text-sm text-gray-600 dark:text-dark-600 mb-2">
                          {evidence.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-dark-500">
                        <span className="flex items-center">
                          <DocumentIcon className="h-3 w-3 mr-1" />
                          {evidence.filename} ({formatFileSize(evidence.file_size)})
                        </span>
                        
                        <span className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatDate(evidence.uploaded_at)}
                        </span>
                        
                        {evidence.uploaded_by && (
                          <span className="flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            {evidence.uploaded_by}
                          </span>
                        )}
                        
                        {evidence.access_count > 0 && (
                          <span className="flex items-center">
                            <EyeIcon className="h-3 w-3 mr-1" />
                            {evidence.access_count} view{evidence.access_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      
                      {evidence.tags && evidence.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <TagIcon className="h-3 w-3 text-gray-400" />
                          {evidence.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-dark-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleDownload(evidence.evidence_id, evidence.filename)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(evidence.evidence_id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-300">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                  Upload Evidence for {control.control_id}
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                  Select File *
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.log,.csv,.json,.xml,.conf,.config,.cfg,.ini,.yaml,.yml"
                  />
                  
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center space-x-2">
                      <DocumentIcon className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-900">
                          {uploadForm.file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-500">
                          {formatFileSize(uploadForm.file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => setUploadForm(prev => ({ ...prev, file: null }))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Click to select file
                      </button>
                      <p className="text-xs text-gray-500 dark:text-dark-500 mt-2">
                        PDF, DOC, images, logs, configs (max 50MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                  Evidence Title *
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-200 dark:text-dark-900"
                  placeholder="e.g., User Access Review Screenshot"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-200 dark:text-dark-900"
                  placeholder="Describe what this evidence demonstrates..."
                />
              </div>

              {/* Evidence Type and Confidence Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Evidence Type
                  </label>
                  <select
                    value={uploadForm.evidence_type}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, evidence_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-200 dark:text-dark-900"
                  >
                    {Object.entries(evidenceTypes).map(([key, type]) => (
                      <option key={key} value={key}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Confidence Level
                  </label>
                  <select
                    value={uploadForm.confidence_level}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, confidence_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-200 dark:text-dark-900"
                  >
                    {Object.entries(confidenceLevels).map(([key, level]) => (
                      <option key={key} value={key}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Collected and Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Date Collected
                  </label>
                  <input
                    type="datetime-local"
                    value={uploadForm.date_collected}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, date_collected: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-200 dark:text-dark-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-200 dark:text-dark-900"
                    placeholder="audit, quarterly, manual"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-dark-300 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-dark-700 border border-gray-300 dark:border-dark-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.file || !uploadForm.title.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Uploading...' : 'Upload Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceManager; 