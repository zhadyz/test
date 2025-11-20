import React from 'react';

const DebugControlExplorer = ({ controls }) => {
  console.log('DebugControlExplorer rendered with controls:', controls);
  
  if (!controls) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4">Debug Control Explorer</h1>
        <p className="text-red-600">Controls is null or undefined</p>
      </div>
    );
  }

  if (controls.length === 0) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4">Debug Control Explorer</h1>
        <p className="text-yellow-600">Controls array is empty (length: {controls.length})</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4">Debug Control Explorer</h1>
      <p className="text-green-600 mb-4">
        Successfully loaded {controls.length} controls!
      </p>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">First 5 Controls:</h2>
        {controls.slice(0, 5).map((control, index) => (
          <div key={control.control_id || index} className="border p-4 rounded">
            <h3 className="font-medium text-blue-600">
              {control.control_id}: {control.control_name}
            </h3>
            <p className="text-gray-600 text-sm mt-2">
              {control.plain_english_explanation?.substring(0, 150)}...
            </p>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-medium mb-2">Debug Info:</h3>
        <ul className="text-sm text-gray-600">
          <li>Controls type: {typeof controls}</li>
          <li>Controls length: {controls.length}</li>
          <li>First control keys: {controls[0] ? Object.keys(controls[0]).join(', ') : 'N/A'}</li>
        </ul>
      </div>
    </div>
  );
};

export default DebugControlExplorer; 