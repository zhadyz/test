import React, { useState } from 'react';
import { DevModeIndicator, DevAutoPopulateButton, useDevAutoPopulate, isDevModeEnabled } from '../utils/devMode.jsx';

const DevModeDemo = () => {
  const [formData, setFormData] = useState({});
  const [selectedControls, setSelectedControls] = useState([]);
  const [reportData, setReportData] = useState({});

  // Auto-populate form data in dev mode
  useDevAutoPopulate(formData, setFormData, 'FORM_DATA');

  const handleFormAutoPopulate = (sampleData) => {
    setFormData(sampleData);
  };

  const handleControlsAutoPopulate = (sampleData) => {
    setSelectedControls(sampleData);
  };

  const handleReportAutoPopulate = (sampleData) => {
    setReportData(sampleData);
  };

  if (!isDevModeEnabled()) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Dev Mode Demo</h1>
          <p className="text-gray-600">
            This demo is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <DevModeIndicator />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Dev Mode Demo</h1>
        <p className="text-gray-600">
          This page demonstrates the auto-population features available in development mode.
        </p>
      </div>

      {/* Form Data Demo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Form Data Auto-Population</h2>
          <DevAutoPopulateButton 
            onPopulate={handleFormAutoPopulate} 
            dataType="FORM_DATA" 
            label="Fill Form" 
          />
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Name</label>
            <input
              type="text"
              value={formData.systemName || ''}
              onChange={(e) => setFormData({...formData, systemName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter system name..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input
              type="text"
              value={formData.organizationName || ''}
              onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter organization..."
            />
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 How to Use Dev Mode</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Automatic Population:</strong> Some forms will auto-populate when they're empty in dev mode.
          </p>
          <p>
            <strong>Manual Population:</strong> Click the 🔧 buttons to manually populate sections with sample data.
          </p>
          <p>
            <strong>Real Testing:</strong> Use this feature to quickly test report generation, form validation, and data flow.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevModeDemo;
