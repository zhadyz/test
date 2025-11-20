import React, { useState } from 'react';
import { 
  ExclamationTriangleIcon, 
  PlusIcon, 
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { autoGeneratePOAM, checkExistingPOAM } from '../utils/poamGenerator';

const POAMIntegration = ({ control, onPOAMCreated, className = '' }) => {
  const [loading, setLoading] = useState(false);
  const [hasPOAM, setHasPOAM] = useState(null);
  const [error, setError] = useState(null);

  // Check if POA&M exists for this control
  const checkPOAMStatus = async () => {
    try {
      const exists = await checkExistingPOAM(control.control_id);
      setHasPOAM(exists);
    } catch (err) {
      console.error('Error checking POA&M status:', err);
    }
  };

  // Auto-generate POA&M for this control
  const handleGeneratePOAM = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await autoGeneratePOAM(
        control,
        control.status || 'Needs Review',
        control.notes || '',
        control.owner || ''
      );

      if (result) {
        setHasPOAM(true);
        if (onPOAMCreated) {
          onPOAMCreated(result);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check POA&M status on mount
  React.useEffect(() => {
    if (control?.control_id) {
      checkPOAMStatus();
    }
  }, [control?.control_id]);

  // Don't show for compliant controls
  const nonCompliantStatuses = ['Deferred', 'Needs Review', 'Not Started'];
  if (control?.status && !nonCompliantStatuses.includes(control.status)) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* POA&M Status Indicator */}
      {hasPOAM !== null && (
        <div className="flex items-center space-x-1">
          {hasPOAM ? (
            <>
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">
                POA&M exists
              </span>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-orange-600 dark:text-orange-400">
                No POA&M
              </span>
            </>
          )}
        </div>
      )}

      {/* Generate POA&M Button */}
      {!hasPOAM && (
        <button
          onClick={handleGeneratePOAM}
          disabled={loading}
          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <ClockIcon className="h-3 w-3 mr-1 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusIcon className="h-3 w-3 mr-1" />
              Create POA&M
            </>
          )}
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default POAMIntegration; 