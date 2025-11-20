import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../contexts/SystemContext';
import SystemSelector from './SystemSelector';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Upload, 
  Download, 
  Trash2, 
  FileText, 
  User, 
  Calendar,
  BarChart3,
  Target,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Save,
  X,
  Filter,
  Search,
  ExternalLink,
  Award,
  TrendingUp,
  Zap,
  Scan,
  Shield,
  Bot
} from 'lucide-react';

const RMFTracker = () => {
  const { currentSystem, hasSystem } = useSystem();
  const [stages, setStages] = useState({});
  const [activeStage, setActiveStage] = useState('prepare');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({});
  const [statistics, setStatistics] = useState({});
  const [scanManagedControls, setScanManagedControls] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [uploadingArtifact, setUploadingArtifact] = useState(null);
  const [showScanControls, setShowScanControls] = useState(false);
  const fileInputRef = useRef(null);

  // Task status options
  const taskStatuses = {
    'not_started': { label: 'Not Started', color: 'gray', icon: Circle },
    'in_progress': { label: 'In Progress', color: 'blue', icon: Clock },
    'completed': { label: 'Completed', color: 'green', icon: CheckCircle },
    'blocked': { label: 'Blocked', color: 'red', icon: AlertTriangle },
    'under_review': { label: 'Under Review', color: 'yellow', icon: Clock }
  };

  const taskPriorities = {
    'critical': { label: 'Critical', color: 'red' },
    'high': { label: 'High', color: 'orange' },
    'medium': { label: 'Medium', color: 'yellow' },
    'low': { label: 'Low', color: 'green' }
  };

  // Load RMF stages and progress data
  useEffect(() => {
    if (hasSystem) {
      loadRMFData();
    }
  }, [currentSystem, hasSystem]);

  // Show system selection prompt if no system is selected
  if (!hasSystem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a System</h2>
          <p className="text-gray-600 mb-6">
            Please select or create a system to track RMF progress. Each system has its own independent RMF tracking environment.
          </p>
          <button
            onClick={() => window.location.href = '#system-manager'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Manage Systems
          </button>
        </div>
      </div>
    );
  }

  const loadRMFData = async () => {
    try {
      setLoading(true);
      
      // Add system_id parameter to all API calls
      const systemParam = `?system_id=${currentSystem.system_id}`;
      
      // Load stages data
      const stagesResponse = await fetch(`/api/rmf-tracker/stages${systemParam}`);
      const stagesData = await stagesResponse.json();
      
      if (stagesData.success) {
        setStages(stagesData.data);
      }

      // Load progress data
      const progressResponse = await fetch(`/api/rmf-tracker/progress${systemParam}`);
      const progressData = await progressResponse.json();
      
      if (progressData.success) {
        setProgress(progressData.data);
      }

      // Load statistics
      const statsResponse = await fetch(`/api/rmf-tracker/statistics${systemParam}`);
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setStatistics(statsData.data);
      }

      // Load scan-managed controls
      const scanResponse = await fetch('/api/scap/scan-managed-controls');
      const scanData = await scanResponse.json();
      
      if (scanData.success) {
        setScanManagedControls(scanData.scan_managed_controls || []);
      }

    } catch (error) {
      console.error('Failed to load RMF data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (stageId, taskId, status, notes = '', assignedTo = '', dueDate = '') => {
    try {
      const formData = new FormData();
      formData.append('system_id', currentSystem.system_id);
      formData.append('status', status);
      formData.append('notes', notes);
      formData.append('assigned_to', assignedTo);
      if (dueDate) formData.append('due_date', dueDate);

      const response = await fetch(`/api/rmf-tracker/stages/${stageId}/tasks/${taskId}/update`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload data to reflect changes
        await loadRMFData();
      } else {
        console.error('Failed to update task status:', result.message);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Upload artifact for task
  const uploadArtifact = async (stageId, taskId, file, description = '') => {
    try {
      const formData = new FormData();
      formData.append('system_id', currentSystem.system_id);
      formData.append('file', file);
      formData.append('description', description);

      const response = await fetch(`/api/rmf-tracker/stages/${stageId}/tasks/${taskId}/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload data to reflect changes
        await loadRMFData();
        return true;
      } else {
        console.error('Failed to upload artifact:', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error uploading artifact:', error);
      return false;
    }
  };

  // Get filtered and searched tasks for active stage
  const getFilteredTasks = () => {
    if (!stages[activeStage] || !stages[activeStage].checklist) return [];
    
    return stages[activeStage].checklist.filter(task => {
      // Filter by status
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      
      // Filter by priority
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      
      // Filter by search term
      if (searchTerm && !task.task.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !task.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      return true;
    });
  };

  // Calculate stage completion percentage
  const getStageCompletion = (stageId) => {
    if (!stages[stageId] || !stages[stageId].checklist) return 0;
    
    const tasks = stages[stageId].checklist;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    
    return tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  };

  // Get stage status based on completion
  const getStageStatus = (stageId) => {
    const completion = getStageCompletion(stageId);
    if (completion === 100) return 'completed';
    if (completion > 0) return 'in_progress';
    return 'not_started';
  };

  // Toggle task expansion
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Handle file upload
  const handleFileUpload = (stageId, taskId) => {
    setUploadingArtifact({ stageId, taskId });
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && uploadingArtifact) {
      const success = await uploadArtifact(uploadingArtifact.stageId, uploadingArtifact.taskId, file);
      if (success) {
        console.log('Artifact uploaded successfully');
      }
      setUploadingArtifact(null);
    }
    event.target.value = ''; // Reset file input
  };

  // Render stage navigation
  const renderStageNavigation = () => {
    const stageOrder = ['prepare', 'categorize', 'select', 'implement', 'assess', 'authorize', 'monitor'];
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">RMF Stages Progress</h2>
        
        {/* Overall Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {statistics.overall_completion_percentage || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${statistics.overall_completion_percentage || 0}%` }}
            ></div>
          </div>
          {statistics.ready_for_authorization && (
            <div className="flex items-center mt-2 text-green-600">
              <Award className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Ready for Authorization!</span>
            </div>
          )}
        </div>

        {/* Stage Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {stageOrder.map((stageId, index) => {
            const stage = stages[stageId];
            if (!stage) return null;

            const completion = getStageCompletion(stageId);
            const status = getStageStatus(stageId);
            const isActive = activeStage === stageId;

            return (
              <button
                key={stageId}
                onClick={() => setActiveStage(stageId)}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-100 border-2 border-blue-500 text-blue-900' 
                    : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'in_progress' ? 'bg-blue-500 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="text-xs font-medium">{stage.name}</div>
                  <div className="text-xs text-gray-500">{completion}%</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render task filters
  const renderTaskFilters = () => {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {Object.entries(taskStatuses).map(([key, status]) => (
                <option key={key} value={key}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              {Object.entries(taskPriorities).map(([key, priority]) => (
                <option key={key} value={key}>{priority.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  // Render task item
  const renderTaskItem = (task) => {
    const isExpanded = expandedTasks[task.id];
    const StatusIcon = taskStatuses[task.status]?.icon || Circle;
    const statusColor = taskStatuses[task.status]?.color || 'gray';
    const priorityColor = taskPriorities[task.priority]?.color || 'gray';

    return (
      <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        {/* Task Header */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {/* Status Icon */}
              <div className={`mt-1 text-${statusColor}-500`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              
              {/* Task Content */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{task.task}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-800`}>
                    {taskPriorities[task.priority]?.label || task.priority}
                  </span>
                  {task.estimated_hours && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {task.estimated_hours}h
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                
                {/* Task Metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  {task.last_updated && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Updated: {new Date(task.last_updated).toLocaleDateString()}
                    </div>
                  )}
                  {task.assigned_to && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      Assigned: {task.assigned_to}
                    </div>
                  )}
                  {task.artifacts && task.artifacts.length > 0 && (
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {task.artifacts.length} artifact(s)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => handleFileUpload(activeStage, task.id)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Upload Artifact"
              >
                <Upload className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setEditingTask(task.id)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Edit Task"
              >
                <Edit3 className="h-4 w-4" />
              </button>

              <button
                onClick={() => toggleTaskExpansion(task.id)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Status Update Dropdown */}
          <div className="mt-3">
            <select
              value={task.status || 'not_started'}
              onChange={(e) => updateTaskStatus(activeStage, task.id, e.target.value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium border-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-${statusColor}-50 border-${statusColor}-200 text-${statusColor}-800`}
            >
              {Object.entries(taskStatuses).map(([key, status]) => (
                <option key={key} value={key}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {/* Notes */}
            {task.notes && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">{task.notes}</p>
              </div>
            )}

            {/* Required Artifact Info */}
            {task.artifact_required && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Required Artifact</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm text-blue-800">{task.artifact_name}</span>
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {task.artifact_type}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded Artifacts */}
            {task.artifacts && task.artifacts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Uploaded Artifacts</h4>
                <div className="space-y-2">
                  {task.artifacts.map((artifact) => (
                    <div key={artifact.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{artifact.original_filename}</div>
                          <div className="text-xs text-gray-500">
                            Uploaded {new Date(artifact.uploaded_at).toLocaleDateString()}
                            {artifact.description && ` • ${artifact.description}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => window.open(`/api/rmf-tracker/artifacts/${artifact.id}/download`, '_blank')}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render stage content
  const renderStageContent = () => {
    const stage = stages[activeStage];
    if (!stage) return null;

    const filteredTasks = getFilteredTasks();
    const completion = getStageCompletion(activeStage);

    return (
      <div className="bg-white rounded-lg shadow-lg">
        {/* Stage Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{stage.name}</h2>
              <p className="text-gray-600 mt-1">{stage.description}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{completion}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
          
          {/* Stage Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completion}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="p-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-500">No tasks match your current filters</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Tasks ({filteredTasks.length} of {stage.checklist.length})
                </h3>
              </div>
              
              {filteredTasks.map(renderTaskItem)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render statistics sidebar
  const renderStatistics = () => {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Statistics
        </h3>

        <div className="space-y-4">
          {/* Overall Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{statistics.total_tasks || 0}</div>
              <div className="text-xs text-blue-800">Total Tasks</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{statistics.completed_tasks || 0}</div>
              <div className="text-xs text-green-800">Completed</div>
            </div>
          </div>

          {/* Progress by Priority */}
          {statistics.tasks_by_priority && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Tasks by Priority</h4>
              <div className="space-y-2">
                {Object.entries(statistics.tasks_by_priority).map(([priority, count]) => (
                  <div key={priority} className="flex justify-between text-sm">
                    <span className="capitalize">{priority}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Hours */}
          {statistics.estimated_hours_total && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Estimated Hours</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-medium">{statistics.estimated_hours_total}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining</span>
                  <span className="font-medium">{statistics.estimated_hours_remaining}h</span>
                </div>
              </div>
            </div>
          )}

          {/* Authorization Readiness */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Authorization Ready</span>
              {statistics.ready_for_authorization ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${statistics.authorization_readiness_percentage || 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.authorization_readiness_percentage || 0}% complete
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Check if a control is scan-managed
  const isScanManagedControl = (controlId) => {
    return scanManagedControls.includes(controlId);
  };

  // Render scan-managed controls section
  const renderScanManagedControls = () => {
    if (scanManagedControls.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Bot className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Scan-Based Control Tracking</h2>
            </div>
          </div>
          <div className="text-center py-8">
            <Scan className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Scan-Managed Controls</h3>
            <p className="text-gray-600 mb-4">
              Upload SCAP scan results to automatically track control implementation status based on scan findings.
            </p>
            <button
              onClick={() => window.location.href = '#secure-scap-analysis'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Scan Results
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Bot className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Scan-Based Control Tracking</h2>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {scanManagedControls.length} Controls
            </span>
          </div>
          <button
            onClick={() => setShowScanControls(!showScanControls)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            {showScanControls ? 'Hide' : 'Show'} Details
            {showScanControls ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Shield className="h-4 w-4 mr-1" />
            <span>These controls are automatically updated based on SCAP scan results</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last scan update: Recently</span>
            <button
              onClick={() => window.location.href = '#secure-scap-analysis'}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Upload New Scan
            </button>
          </div>
        </div>

        {showScanControls && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {scanManagedControls.map(controlId => (
                <div key={controlId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="font-medium text-gray-900">{controlId}</span>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">AUTO</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-800 font-medium mb-1">Automatic Management Active</p>
                  <p className="text-yellow-700">
                    These controls are managed by scan results. Manual status changes may be overridden by future scans.
                    To switch a control to manual management, contact your system administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RMF Tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden file input for artifact uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">RMF Tracker</h1>
              <p className="text-gray-600">
                Track your progress through the 7 stages of the NIST Risk Management Framework
              </p>
            </div>
            {/* System Selector */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">System:</div>
              <SystemSelector onCreateSystem={() => window.location.href = '#system-manager'} />
            </div>
          </div>
        </div>

        {/* Stage Navigation */}
        {renderStageNavigation()}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {renderTaskFilters()}
            {renderStageContent()}
          </div>

          {/* Statistics Sidebar */}
          <div className="lg:col-span-1">
            {renderStatistics()}
          </div>
        </div>

        {/* Scan-Managed Controls */}
        {renderScanManagedControls()}
      </div>
    </div>
  );
};

export default RMFTracker; 