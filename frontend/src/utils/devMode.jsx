// Development mode utilities for auto-populating data
import { DEV_AUTO_POPULATE, DEV_SAMPLE_DATA } from '../config/features.js';

/**
 * Check if dev mode auto-population is enabled
 */
export const isDevModeEnabled = () => {
  return DEV_AUTO_POPULATE.ENABLED;
};

/**
 * Auto-populate form data if dev mode is enabled
 */
export const useDevAutoPopulate = (formData, setFormData, dataType = 'FORM_DATA') => {
  if (!isDevModeEnabled() || !DEV_AUTO_POPULATE.FORMS) {
    return formData;
  }

  // Only auto-populate if form is empty or mostly empty
  const isEmpty = !formData || Object.keys(formData).length === 0 || 
    Object.values(formData).every(value => !value || value === '');

  if (isEmpty && DEV_SAMPLE_DATA[dataType]) {
    console.log('🔧 Dev Mode: Auto-populating form data');
    if (setFormData) {
      setFormData(DEV_SAMPLE_DATA[dataType]);
    }
    return DEV_SAMPLE_DATA[dataType];
  }

  return formData;
};

/**
 * Auto-populate control selection if dev mode is enabled
 */
export const useDevControlSelection = (selectedControls, setSelectedControls) => {
  if (!isDevModeEnabled() || !DEV_AUTO_POPULATE.CONTROLS) {
    return selectedControls;
  }

  if ((!selectedControls || selectedControls.length === 0) && setSelectedControls) {
    console.log('🔧 Dev Mode: Auto-selecting controls');
    setSelectedControls(DEV_SAMPLE_DATA.SELECTED_CONTROLS);
    return DEV_SAMPLE_DATA.SELECTED_CONTROLS;
  }

  return selectedControls;
};

/**
 * Auto-populate report data if dev mode is enabled
 */
export const useDevReportData = (reportData, setReportData) => {
  if (!isDevModeEnabled() || !DEV_AUTO_POPULATE.REPORTS) {
    return reportData;
  }

  const isEmpty = !reportData || Object.keys(reportData).length === 0;
  
  if (isEmpty && setReportData) {
    console.log('🔧 Dev Mode: Auto-populating report data');
    setReportData(DEV_SAMPLE_DATA.REPORT_DATA);
    return DEV_SAMPLE_DATA.REPORT_DATA;
  }

  return reportData;
};

/**
 * Auto-populate tracker data if dev mode is enabled
 */
export const useDevTrackerData = (trackerData, setTrackerData) => {
  if (!isDevModeEnabled() || !DEV_AUTO_POPULATE.TRACKER) {
    return trackerData;
  }

  const isEmpty = !trackerData || trackerData.length === 0;
  
  if (isEmpty && setTrackerData) {
    console.log('🔧 Dev Mode: Auto-populating tracker data');
    setTrackerData(DEV_SAMPLE_DATA.TRACKER_DATA.controls);
    return DEV_SAMPLE_DATA.TRACKER_DATA.controls;
  }

  return trackerData;
};

/**
 * Auto-populate POAM data if dev mode is enabled
 */
export const useDevPOAMData = (poamData, setPOAMData) => {
  if (!isDevModeEnabled() || !DEV_AUTO_POPULATE.POAM) {
    return poamData;
  }

  const isEmpty = !poamData || poamData.length === 0;
  
  if (isEmpty && setPOAMData) {
    console.log('🔧 Dev Mode: Auto-populating POAM data');
    setPOAMData(DEV_SAMPLE_DATA.POAM_DATA.weaknesses);
    return DEV_SAMPLE_DATA.POAM_DATA.weaknesses;
  }

  return poamData;
};

/**
 * Get sample data for a specific type
 */
export const getDevSampleData = (dataType) => {
  if (!isDevModeEnabled()) {
    return null;
  }
  
  return DEV_SAMPLE_DATA[dataType] || null;
};

/**
 * Dev mode indicator component
 */
export const DevModeIndicator = () => {
  if (!isDevModeEnabled()) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
      🔧 DEV MODE
    </div>
  );
};

/**
 * Auto-populate button for manual triggering
 */
export const DevAutoPopulateButton = ({ onPopulate, dataType, label = "Auto-fill" }) => {
  if (!isDevModeEnabled()) {
    return null;
  }

  const handleClick = () => {
    const sampleData = getDevSampleData(dataType);
    if (sampleData && onPopulate) {
      console.log(`🔧 Dev Mode: Manual auto-populate triggered for ${dataType}`);
      onPopulate(sampleData);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="ml-2 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold rounded transition-colors"
      title="Development mode: Auto-populate with sample data"
    >
      🔧 {label}
    </button>
  );
}; 