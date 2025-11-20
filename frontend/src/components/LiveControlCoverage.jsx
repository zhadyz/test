import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getToolsForControl, getAllTools, CONTROL_MATCH_STRENGTH } from '../data/toolMappings';

const LiveControlCoverage = ({ selectedTools = [], onControlClick }) => {
  const [hiddenControls, setHiddenControls] = useState([]);
  const [showHidden, setShowHidden] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, covered, gaps

  // Add state for custom dropdowns
  const [familyDropdownOpen, setFamilyDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const familyDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  // Add state for sorting by match strength
  const [selectedStrengthSort, setSelectedStrengthSort] = useState(null); // 'strong', 'partial', 'supportive', or null

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (familyDropdownRef.current && !familyDropdownRef.current.contains(event.target)) setFamilyDropdownOpen(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) setStatusDropdownOpen(false);
    }
    if (familyDropdownOpen || statusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [familyDropdownOpen, statusDropdownOpen]);

  // Define control families and their colors
  const CONTROL_FAMILIES = {
    'AC': { name: 'Access Control', color: 'bg-pink-500', count: 0 },
    'AT': { name: 'Awareness and Training', color: 'bg-blue-500', count: 0 },
    'AU': { name: 'Audit and Accountability', color: 'bg-purple-500', count: 0 },
    'CA': { name: 'Assessment, Authorization, and Monitoring', color: 'bg-cyan-500', count: 0 },
    'CM': { name: 'Configuration Management', color: 'bg-teal-500', count: 0 },
    'CP': { name: 'Contingency Planning', color: 'bg-green-500', count: 0 },
    'IA': { name: 'Identification and Authentication', color: 'bg-emerald-500', count: 0 },
    'IR': { name: 'Incident Response', color: 'bg-red-500', count: 0 },
    'MA': { name: 'Maintenance', color: 'bg-yellow-500', count: 0 },
    'MP': { name: 'Media Protection', color: 'bg-orange-500', count: 0 },
    'PE': { name: 'Physical and Environmental Protection', color: 'bg-indigo-500', count: 0 },
    'PL': { name: 'Planning', color: 'bg-violet-500', count: 0 },
    'PS': { name: 'Personnel Security', color: 'bg-rose-500', count: 0 },
    'RA': { name: 'Risk Assessment', color: 'bg-pink-600', count: 0 },
    'SA': { name: 'System and Services Acquisition', color: 'bg-sky-500', count: 0 },
    'SC': { name: 'System and Communications Protection', color: 'bg-cyan-600', count: 0 },
    'SI': { name: 'System and Information Integrity', color: 'bg-teal-600', count: 0 }
  };

  // Common controls for baseline assessment
  const BASELINE_CONTROLS = [
    'AC-1', 'AC-2', 'AC-3', 'AC-6', 'AC-7', 'AC-17', 'AC-18', 'AC-19', 'AC-20',
    'AT-1', 'AT-2', 'AT-3', 'AT-4',
    'AU-1', 'AU-2', 'AU-3', 'AU-6', 'AU-7', 'AU-8', 'AU-9', 'AU-11', 'AU-12',
    'CA-1', 'CA-2', 'CA-3', 'CA-5', 'CA-6', 'CA-7', 'CA-9',
    'CM-1', 'CM-2', 'CM-4', 'CM-5', 'CM-6', 'CM-7', 'CM-8', 'CM-10', 'CM-11',
    'CP-1', 'CP-2', 'CP-3', 'CP-4', 'CP-9', 'CP-10',
    'IA-1', 'IA-2', 'IA-3', 'IA-4', 'IA-5', 'IA-6', 'IA-7', 'IA-8',
    'IR-1', 'IR-2', 'IR-4', 'IR-5', 'IR-6', 'IR-7', 'IR-8',
    'MA-1', 'MA-2', 'MA-4', 'MA-5',
    'MP-1', 'MP-2', 'MP-6', 'MP-7',
    'PE-1', 'PE-2', 'PE-3', 'PE-6', 'PE-8', 'PE-12', 'PE-13', 'PE-14', 'PE-15', 'PE-16',
    'PL-1', 'PL-2', 'PL-4', 'PL-8',
    'PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5', 'PS-6', 'PS-7', 'PS-8',
    'RA-1', 'RA-2', 'RA-3', 'RA-5',
    'SA-1', 'SA-2', 'SA-3', 'SA-4', 'SA-5', 'SA-8', 'SA-9', 'SA-10', 'SA-11',
    'SC-1', 'SC-2', 'SC-3', 'SC-4', 'SC-5', 'SC-7', 'SC-8', 'SC-12', 'SC-13', 'SC-15', 'SC-17', 'SC-18', 'SC-19', 'SC-20', 'SC-21', 'SC-22', 'SC-23', 'SC-28', 'SC-39',
    'SI-1', 'SI-2', 'SI-3', 'SI-4', 'SI-5', 'SI-7', 'SI-8', 'SI-10', 'SI-11', 'SI-12', 'SI-16'
  ];

  // Calculate control coverage from selected tools
  const controlCoverage = useMemo(() => {
    if (selectedTools.length === 0) {
      return BASELINE_CONTROLS.map(controlId => ({
        controlId,
        family: controlId.split('-')[0],
        status: 'gap',
        tools: [],
        strongestMatch: null
      }));
    }

    const coverageMap = new Map();
    
    // Initialize all baseline controls as gaps
    BASELINE_CONTROLS.forEach(controlId => {
      coverageMap.set(controlId, {
        controlId,
        family: controlId.split('-')[0],
        status: 'gap',
        tools: [],
        strongestMatch: null
      });
    });

    // Add coverage from selected tools
    selectedTools.forEach(tool => {
      if (tool.supports_controls) {
        Object.entries(tool.supports_controls).forEach(([controlId, controlInfo]) => {
          if (BASELINE_CONTROLS.includes(controlId)) {
            const existing = coverageMap.get(controlId);
            const toolCoverage = {
              tool,
              matchInfo: controlInfo
            };

            if (existing) {
              existing.tools.push(toolCoverage);
              existing.status = 'covered';
              
              // Determine strongest match
              const strengthOrder = { 'strong': 3, 'partial': 2, 'supportive': 1 };
              const currentStrength = strengthOrder[existing.strongestMatch] || 0;
              const newStrength = strengthOrder[controlInfo.strength] || 0;
              
              if (newStrength > currentStrength) {
                existing.strongestMatch = controlInfo.strength;
              }
            }
          }
        });
      }
    });

    return Array.from(coverageMap.values());
  }, [selectedTools]);

  // Filter controls based on search and filters
  const filteredControls = useMemo(() => {
    let filtered = controlCoverage;

    // Apply search filter
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(control => 
        control.controlId.toLowerCase().includes(search) ||
        control.family.toLowerCase().includes(search) ||
        control.tools.some(t => t.tool.name.toLowerCase().includes(search))
      );
    }

    // Apply family filter
    if (familyFilter !== 'all') {
      filtered = filtered.filter(control => control.family === familyFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(control => control.status === statusFilter);
    }

    return filtered;
  }, [controlCoverage, searchFilter, familyFilter, statusFilter]);

  // Filter out hidden controls from the grid
  const visibleControls = filteredControls.filter(control => !hiddenControls.includes(control.controlId || control.control_id));

  // Calculate stats for the selected family (if filtered), but only for visible controls
  const filteredControlsForStats = visibleControls;
  const coveredCount = filteredControlsForStats.filter(c => c.status === 'covered').length;
  const totalCount = filteredControlsForStats.length;
  const percentage = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

  // Calculate statistics
  const stats = useMemo(() => {
    const covered = controlCoverage.filter(c => c.status === 'covered').length;
    const gaps = controlCoverage.filter(c => c.status === 'gap').length;
    const total = controlCoverage.length;
    const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

    // Count by family
    const familyStats = { ...CONTROL_FAMILIES };
    controlCoverage.forEach(control => {
      if (familyStats[control.family]) {
        familyStats[control.family].count++;
      }
    });

    // Count covered by strength
    const strengthStats = {
      strong: controlCoverage.filter(c => c.strongestMatch === 'strong').length,
      partial: controlCoverage.filter(c => c.strongestMatch === 'partial').length,
      supportive: controlCoverage.filter(c => c.strongestMatch === 'supportive').length
    };

    return {
      covered,
      gaps,
      total,
      percentage,
      familyStats,
      strengthStats
    };
  }, [controlCoverage]);

  // Sort visible controls by selected match strength if set
  let sortedVisibleControls = visibleControls;
  if (selectedStrengthSort) {
    sortedVisibleControls = [...visibleControls].sort((a, b) => {
      const aMatch = a.strongestMatch === selectedStrengthSort ? 1 : 0;
      const bMatch = b.strongestMatch === selectedStrengthSort ? 1 : 0;
      // Sort selected strength to top, then by controlId
      if (bMatch !== aMatch) return bMatch - aMatch;
      return (a.controlId || a.control_id).localeCompare(b.controlId || b.control_id);
    });
  }

  // If sorting by 'gap', sort gap controls to the top
  if (selectedStrengthSort === 'gap') {
    sortedVisibleControls = [...visibleControls].sort((a, b) => {
      const aGap = a.status === 'gap' ? 1 : 0;
      const bGap = b.status === 'gap' ? 1 : 0;
      if (bGap !== aGap) return bGap - aGap;
      return (a.controlId || a.control_id).localeCompare(b.controlId || b.control_id);
    });
  }

  const getControlStatusIcon = (control) => {
    if (control.status === 'covered') {
      switch (control.strongestMatch) {
        case 'strong':
          return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
        case 'partial':
          return <ClockIcon className="w-4 h-4 text-yellow-600" />;
        case 'supportive':
          return <InformationCircleIcon className="w-4 h-4 text-blue-600" />;
        default:
          return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      }
    }
    return <XCircleIcon className="w-4 h-4 text-red-600" />;
  };

  const getControlStatusColor = (control) => {
    if (control.status === 'covered') {
      switch (control.strongestMatch) {
        case 'strong':
          return 'border-green-400 bg-green-50 hover:bg-green-100';
        case 'partial':
          return 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100';
        case 'supportive':
          return 'border-blue-400 bg-blue-50 hover:bg-blue-100';
        default:
          return 'border-green-400 bg-green-50 hover:bg-green-100';
      }
    }
    return 'border-red-400 bg-red-50 hover:bg-red-100';
  };

  // Hide a control
  const handleHideControl = (controlId) => {
    setHiddenControls(prev => [...prev, controlId]);
  };

  // Restore a control
  const handleRestoreControl = (controlId) => {
    setHiddenControls(prev => prev.filter(id => id !== controlId));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        {/* Header with Stats */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <ChartBarIcon className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Live Control Coverage
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {coveredCount} of {totalCount} controls covered ({percentage}%)
                {familyFilter !== 'all' && (
                  <span className="ml-2 text-xs text-blue-500 font-medium">({familyFilter} family)</span>
                )}
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.covered}</div>
              <div className="text-xs text-gray-500">Covered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.gaps}</div>
              <div className="text-xs text-gray-500">Gaps</div>
            </div>
          </div>
        </div>

        {/* Filters - custom dropdowns */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          {/* Family Filter Dropdown */}
          <div className="relative" ref={familyDropdownRef}>
            <button
              type="button"
              className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setFamilyDropdownOpen(open => !open)}
              aria-haspopup="listbox"
              aria-expanded={familyDropdownOpen}
            >
              <span className="mr-2">
                {familyFilter === 'all' ? 'All Families' : `${familyFilter} - ${CONTROL_FAMILIES[familyFilter]?.name || familyFilter}`}
              </span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${familyDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {familyDropdownOpen && (
              <div className="absolute z-20 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 max-h-60 overflow-y-auto">
                <button
                  className={`block w-full text-left px-4 py-2 text-sm ${familyFilter === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                  onClick={() => { setFamilyFilter('all'); setFamilyDropdownOpen(false); }}
                >
                  All Families
                </button>
                {Object.entries(CONTROL_FAMILIES).map(([code, info]) => (
                  <button
                    key={code}
                    className={`block w-full text-left px-4 py-2 text-sm ${familyFilter === code ? 'bg-blue-100 dark:bg-blue-900/30 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                    onClick={() => { setFamilyFilter(code); setFamilyDropdownOpen(false); }}
                  >
                    {code} - {info.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setStatusDropdownOpen(open => !open)}
              aria-haspopup="listbox"
              aria-expanded={statusDropdownOpen}
            >
              <span className="mr-2">
                {statusFilter === 'all' ? 'All Status' : statusFilter === 'covered' ? 'Covered Only' : 'Gaps Only'}
              </span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {statusDropdownOpen && (
              <div className="absolute z-20 mt-2 w-44 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1">
                <button
                  className={`block w-full text-left px-4 py-2 text-sm ${statusFilter === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                  onClick={() => { setStatusFilter('all'); setStatusDropdownOpen(false); }}
                >
                  All Status
                </button>
                <button
                  className={`block w-full text-left px-4 py-2 text-sm ${statusFilter === 'covered' ? 'bg-blue-100 dark:bg-blue-900/30 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                  onClick={() => { setStatusFilter('covered'); setStatusDropdownOpen(false); }}
                >
                  Covered Only
                </button>
                <button
                  className={`block w-full text-left px-4 py-2 text-sm ${statusFilter === 'gap' ? 'bg-blue-100 dark:bg-blue-900/30 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                  onClick={() => { setStatusFilter('gap'); setStatusDropdownOpen(false); }}
                >
                  Gaps Only
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Coverage Progress</span>
            <span className="font-medium text-gray-900 dark:text-white">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Strength Breakdown */}
        {selectedTools.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              className={`text-center p-3 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none shadow-md hover:shadow-xl ${selectedStrengthSort === 'strong' ? 'ring-2 ring-green-400 bg-green-50' : 'bg-green-50'} hover:bg-green-100`}
              onClick={() => setSelectedStrengthSort(selectedStrengthSort === 'strong' ? null : 'strong')}
            >
              <div className="text-lg font-bold text-green-600">{stats.strengthStats.strong}</div>
              <div className="text-xs text-green-700">Strong Match</div>
            </button>
            <button
              className={`text-center p-3 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none shadow-md hover:shadow-xl ${selectedStrengthSort === 'partial' ? 'ring-2 ring-yellow-400 bg-yellow-50' : 'bg-yellow-50'} hover:bg-yellow-100`}
              onClick={() => setSelectedStrengthSort(selectedStrengthSort === 'partial' ? null : 'partial')}
            >
              <div className="text-lg font-bold text-yellow-600">{stats.strengthStats.partial}</div>
              <div className="text-xs text-yellow-700">Partial Match</div>
            </button>
            <button
              className={`text-center p-3 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none shadow-md hover:shadow-xl ${selectedStrengthSort === 'gap' ? 'ring-2 ring-red-400 bg-red-50' : 'bg-red-50'} hover:bg-red-100`}
              onClick={() => setSelectedStrengthSort(selectedStrengthSort === 'gap' ? null : 'gap')}
            >
              <div className="text-lg font-bold text-red-600">{stats.gaps}</div>
              <div className="text-xs text-red-700">No Coverage</div>
            </button>
          </div>
        )}

        {/* Show Hidden Controls Button and List */}
        {hiddenControls.length > 0 && (
          <div className="mb-4">
            <button
              className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200"
              onClick={() => setShowHidden(show => !show)}
            >
              {showHidden ? 'Hide Removed Controls' : `Show Removed Controls (${hiddenControls.length})`}
            </button>
            {showHidden && (
              <div className="mt-2 bg-gray-50 dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                <div className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-200">Removed Controls</div>
                {hiddenControls.map(controlId => (
                  <div key={controlId} className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-800 dark:text-gray-100 font-mono">{controlId}</span>
                    <button
                      className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200"
                      onClick={() => handleRestoreControl(controlId)}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Control Grid */}
        <div className="max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedVisibleControls.map((control) => (
              <div
                key={control.controlId}
                className={`p-3 border rounded-lg cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl ${getControlStatusColor(control)} relative hover:border-blue-400 dark:hover:border-blue-500 group`}
                tabIndex={0}
                role="button"
                onClick={() => {
                  console.log('LiveControlCoverage: Control card clicked', control.controlId || control.control_id);
                  if (typeof onControlClick === 'function') {
                    onControlClick(control.controlId || control.control_id, control.tools || []);
                  } else {
                    console.log('LiveControlCoverage: onControlClick is not a function');
                  }
                }}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && typeof onControlClick === 'function') {
                    onControlClick(control.controlId || control.control_id, control.tools || []);
                  }
                }}
                aria-label={`View details for control ${control.controlId}`}
              >
                {/* X button to hide control */}
                <button
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-red-200 hover:text-red-700 focus:outline-none"
                  onClick={e => { e.stopPropagation(); handleHideControl(control.controlId || control.control_id); }}
                  title="Remove this control from view"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${CONTROL_FAMILIES[control.family]?.color || 'bg-gray-400'}`} />
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {control.controlId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click for details
                    </span>
                    {getControlStatusIcon(control)}
                  </div>
                </div>

                {/* Tools Section - visually enhanced for covered controls */}
                {control.status === 'covered' && control.tools.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                      {control.tools.length} tool{control.tools.length !== 1 ? 's' : ''} satisfy this control:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {control.tools.map((toolInfo, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all text-xs font-medium"
                          title={toolInfo.tool.description || toolInfo.tool.name}
                        >
                          {toolInfo.tool.logo && (
                            <img src={toolInfo.tool.logo} alt={toolInfo.tool.name} className="w-4 h-4 rounded-full mr-1" />
                          )}
                          <span className="text-gray-800 dark:text-gray-100 font-semibold">{toolInfo.tool.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools Section - visually enhanced for gap controls (suggested tools) */}
                {control.status === 'gap' && (() => {
                  const possibleTools = getToolsForControl(control.controlId || control.control_id || '');
                  if (possibleTools && possibleTools.length > 0) {
                    return (
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                          Suggested tool{possibleTools.length !== 1 ? 's' : ''} for this control:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {possibleTools.map((tool, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all text-xs font-medium"
                              title={tool.description || tool.name}
                            >
                              {tool.logo && (
                                <img src={tool.logo} alt={tool.name} className="w-4 h-4 rounded-full mr-1" />
                              )}
                              <span className="text-gray-800 dark:text-gray-100 font-semibold">{tool.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-2 text-xs text-gray-400 italic">
                        No suggestions available
                      </div>
                    );
                  }
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {selectedTools.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Select Tools to See Coverage
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Choose platforms and tools above to see which NIST 800-53 controls they help satisfy
            </p>
          </div>
        )}

        {/* No Results */}
        {selectedTools.length > 0 && filteredControls.length === 0 && (
          <div className="text-center py-8">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Controls Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveControlCoverage; 