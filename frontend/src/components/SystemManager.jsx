import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  BuildingOfficeIcon, 
  ComputerDesktopIcon,
  ServerIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const SystemManager = () => {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [],
    environment: 'production',
    owner: '',
    business_unit: '',
    criticality: ''
  });

  const environments = [
    { value: 'production', label: 'Production', color: 'bg-red-100 text-red-800' },
    { value: 'staging', label: 'Staging', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'testing', label: 'Testing', color: 'bg-blue-100 text-blue-800' },
    { value: 'development', label: 'Development', color: 'bg-green-100 text-green-800' }
  ];

  const criticalityLevels = [
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' }
  ];

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    try {
      const response = await fetch('/api/systems');
      const data = await response.json();
      if (data.success) {
        setSystems(data.data);
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSystem = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/systems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.filter(tag => tag.trim() !== '')
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchSystems();
        setShowCreateModal(false);
        resetForm();
      } else {
        alert('Error creating system: ' + data.message);
      }
    } catch (error) {
      console.error('Error creating system:', error);
      alert('Error creating system');
    }
  };

  const handleUpdateSystem = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/systems/${selectedSystem.system_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.filter(tag => tag.trim() !== '')
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchSystems();
        setShowEditModal(false);
        setSelectedSystem(null);
        resetForm();
      } else {
        alert('Error updating system: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating system:', error);
      alert('Error updating system');
    }
  };

  const handleDeleteSystem = async (systemId) => {
    if (!confirm('Are you sure you want to archive this system?')) return;
    
    try {
      const response = await fetch(`/api/systems/${systemId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchSystems();
      } else {
        alert('Error archiving system: ' + data.message);
      }
    } catch (error) {
      console.error('Error archiving system:', error);
      alert('Error archiving system');
    }
  };

  const fetchSystemStats = async (systemId) => {
    try {
      const response = await fetch(`/api/systems/${systemId}/stats`);
      const data = await response.json();
      if (data.success) {
        setSelectedSystem({ ...selectedSystem, stats: data.data });
        setShowStatsModal(true);
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tags: [],
      environment: 'production',
      owner: '',
      business_unit: '',
      criticality: ''
    });
  };

  const openEditModal = (system) => {
    setSelectedSystem(system);
    setFormData({
      name: system.name,
      description: system.description,
      tags: system.tags,
      environment: system.environment,
      owner: system.owner || '',
      business_unit: system.business_unit || '',
      criticality: system.criticality || ''
    });
    setShowEditModal(true);
  };

  const handleTagInput = (value) => {
    const tags = value.split(',').map(tag => tag.trim());
    setFormData({ ...formData, tags });
  };

  const getSystemIcon = (tags) => {
    if (tags.includes('web') || tags.includes('website')) return ComputerDesktopIcon;
    if (tags.includes('server') || tags.includes('database')) return ServerIcon;
    if (tags.includes('mobile') || tags.includes('app')) return DevicePhoneMobileIcon;
    return BuildingOfficeIcon;
  };

  const getEnvironmentStyle = (env) => {
    const envObj = environments.find(e => e.value === env);
    return envObj ? envObj.color : 'bg-gray-100 text-gray-800';
  };

  const getCriticalityStyle = (criticality) => {
    const critObj = criticalityLevels.find(c => c.value === criticality);
    return critObj ? critObj.color : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Management</h1>
              <p className="mt-2 text-gray-600">
                Manage multiple systems and their compliance tracking environments
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New System
            </button>
          </div>
        </div>

        {/* Systems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systems.map((system) => {
            const IconComponent = getSystemIcon(system.tags);
            return (
              <div key={system.system_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <IconComponent className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{system.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{system.description}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => fetchSystemStats(system.system_id)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="View Statistics"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(system)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Edit System"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSystem(system.system_id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Archive System"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentStyle(system.environment)}`}>
                      {system.environment}
                    </span>
                    {system.criticality && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCriticalityStyle(system.criticality)}`}>
                        {system.criticality}
                      </span>
                    )}
                  </div>

                  {system.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {system.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                      {system.tags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          +{system.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {system.owner || 'Unassigned'}
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(system.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-blue-50 rounded p-2">
                      <div className="font-semibold text-blue-600">{system.control_count}</div>
                      <div className="text-xs text-gray-600">Controls</div>
                    </div>
                    <div className="bg-yellow-50 rounded p-2">
                      <div className="font-semibold text-yellow-600">{system.poam_count}</div>
                      <div className="text-xs text-gray-600">POA&Ms</div>
                    </div>
                    <div className="bg-green-50 rounded p-2">
                      <div className="font-semibold text-green-600">{Math.round(system.rmf_progress)}%</div>
                      <div className="text-xs text-gray-600">RMF</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {systems.length === 0 && (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No systems</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new system.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add New System
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create System Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New System</h3>
              <form onSubmit={handleCreateSystem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">System Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Environment</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {environments.map(env => (
                      <option key={env.value} value={env.value}>{env.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Unit</label>
                  <input
                    type="text"
                    value={formData.business_unit}
                    onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Criticality</label>
                  <select
                    value={formData.criticality}
                    onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select criticality...</option>
                    {criticalityLevels.map(crit => (
                      <option key={crit.value} value={crit.value}>{crit.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => handleTagInput(e.target.value)}
                    placeholder="web, linux, production, external-facing"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create System
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit System Modal */}
      {showEditModal && selectedSystem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit System</h3>
              <form onSubmit={handleUpdateSystem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">System Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Environment</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {environments.map(env => (
                      <option key={env.value} value={env.value}>{env.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Unit</label>
                  <input
                    type="text"
                    value={formData.business_unit}
                    onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Criticality</label>
                  <select
                    value={formData.criticality}
                    onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select criticality...</option>
                    {criticalityLevels.map(crit => (
                      <option key={crit.value} value={crit.value}>{crit.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => handleTagInput(e.target.value)}
                    placeholder="web, linux, production, external-facing"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedSystem(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Update System
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && selectedSystem && selectedSystem.stats && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">System Statistics: {selectedSystem.name}</h3>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">System Information</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Environment:</span> {selectedSystem.stats.system_info.environment}</div>
                    <div><span className="font-medium">Status:</span> {selectedSystem.stats.system_info.status}</div>
                    <div><span className="font-medium">Created:</span> {new Date(selectedSystem.stats.system_info.created_at).toLocaleDateString()}</div>
                    <div><span className="font-medium">Updated:</span> {new Date(selectedSystem.stats.system_info.last_updated).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Compliance Statistics</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Controls:</span> {selectedSystem.stats.compliance_stats.control_count}</div>
                    <div><span className="font-medium">POA&Ms:</span> {selectedSystem.stats.compliance_stats.poam_count}</div>
                    <div><span className="font-medium">RMF Progress:</span> {selectedSystem.stats.compliance_stats.rmf_progress}%</div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-900 mb-2">Metadata</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Owner:</span> {selectedSystem.stats.metadata.owner || 'Unassigned'}</div>
                    <div><span className="font-medium">Business Unit:</span> {selectedSystem.stats.metadata.business_unit || 'N/A'}</div>
                    <div><span className="font-medium">Criticality:</span> {selectedSystem.stats.metadata.criticality || 'N/A'}</div>
                    {selectedSystem.stats.metadata.tags && selectedSystem.stats.metadata.tags.length > 0 && (
                      <div><span className="font-medium">Tags:</span> {selectedSystem.stats.metadata.tags.join(', ')}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemManager; 