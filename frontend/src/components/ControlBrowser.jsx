import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  TagIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * NIST 800-53 Control Browser with Pagination
 *
 * Features:
 * - Paginated controls loading (50 per page)
 * - Search by keyword
 * - Filter by control family
 * - Filter by baseline (Low, Moderate, High)
 * - Displays control details with enhancements
 */
const ControlBrowser = ({ onControlSelect }) => {
  const [controls, setControls] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 50,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });
  const [filters, setFilters] = useState({
    family: null,
    baseline: null,
    search: '',
  });
  const [families, setFamilies] = useState([]);
  const [baselines, setBaselines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedControl, setSelectedControl] = useState(null);
  const [selectedForExport, setSelectedForExport] = useState(new Set());

  // Load control families
  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/controls/families`);
        if (!response.ok) throw new Error('Failed to fetch families');
        const data = await response.json();
        setFamilies(data.families || []);
      } catch (err) {
        console.error('Error fetching families:', err);
      }
    };
    fetchFamilies();
  }, []);

  // Load baseline metadata with control counts
  useEffect(() => {
    const fetchBaselines = async () => {
      try {
        // Fetch summaries for all three baselines to get control counts
        const [lowRes, moderateRes, highRes] = await Promise.all([
          fetch(`${API_BASE}/api/baselines/low/summary`),
          fetch(`${API_BASE}/api/baselines/moderate/summary`),
          fetch(`${API_BASE}/api/baselines/high/summary`),
        ]);

        if (!lowRes.ok || !moderateRes.ok || !highRes.ok) {
          throw new Error('Failed to fetch baseline summaries');
        }

        const [low, moderate, high] = await Promise.all([
          lowRes.json(),
          moderateRes.json(),
          highRes.json(),
        ]);

        setBaselines([
          { name: 'low', display_name: 'Low Impact', total_controls: low.total_controls },
          { name: 'moderate', display_name: 'Moderate Impact', total_controls: moderate.total_controls },
          { name: 'high', display_name: 'High Impact', total_controls: high.total_controls },
        ]);
      } catch (err) {
        console.error('Error fetching baselines:', err);
      }
    };
    fetchBaselines();
  }, []);

  // Load controls with pagination
  useEffect(() => {
    const fetchControls = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          page_size: pagination.page_size.toString(),
        });

        if (filters.family) params.append('family', filters.family);
        if (filters.baseline) params.append('baseline', filters.baseline);
        if (filters.search) params.append('search', filters.search);

        const response = await fetch(`${API_BASE}/api/controls/paginated?${params}`);
        if (!response.ok) throw new Error('Failed to fetch controls');

        const data = await response.json();
        setControls(data.controls || []);
        setPagination(data.pagination);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching controls:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchControls();
  }, [pagination.page, filters.family, filters.baseline, filters.search]);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to page 1 when searching
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const clearFilters = () => {
    setFilters({ family: null, baseline: null, search: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleControlClick = (control) => {
    setSelectedControl(selectedControl?.control_id === control.control_id ? null : control);
    if (onControlSelect) {
      onControlSelect(control);
    }
  };

  const toggleControlSelection = (controlId, event) => {
    event.stopPropagation(); // Prevent card expansion
    setSelectedForExport((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(controlId)) {
        newSet.delete(controlId);
      } else {
        newSet.add(controlId);
      }
      return newSet;
    });
  };

  const selectAllControls = () => {
    setSelectedForExport(new Set(controls.map((c) => c.control_id)));
  };

  const clearSelection = () => {
    setSelectedForExport(new Set());
  };

  const exportToOSCAL = () => {
    if (selectedForExport.size === 0) {
      alert('Please select at least one control to export');
      return;
    }

    // Get selected controls with full data
    const selectedControls = controls.filter((c) => selectedForExport.has(c.control_id));

    // Generate OSCAL Profile JSON (NIST OSCAL 1.1.2 format)
    const oscalProfile = {
      profile: {
        uuid: crypto.randomUUID(),
        metadata: {
          title: 'Custom NIST 800-53 Control Selection',
          'last-modified': new Date().toISOString(),
          version: '1.0',
          'oscal-version': '1.1.2',
          parties: [
            {
              uuid: crypto.randomUUID(),
              type: 'organization',
              name: 'Generated by NIST Compliance Tool',
            },
          ],
        },
        imports: [
          {
            href: 'https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json',
            include: {
              'id-selectors': selectedControls.map((c) => ({
                'control-id': c.control_id.toLowerCase(),
              })),
            },
          },
        ],
        merge: {
          combine: {
            method: 'use-first',
          },
        },
        modify: {
          'set-parameters': selectedControls
            .filter((c) => c.parameters && c.parameters.length > 0)
            .flatMap((c) =>
              c.parameters.map((param) => ({
                'param-id': `${c.control_id.toLowerCase()}_${param.id}`,
                label: param.label,
                values: param.default ? [param.default] : [],
              }))
            ),
        },
      },
    };

    // Download JSON file
    const blob = new Blob([JSON.stringify(oscalProfile, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nist-800-53-profile-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              NIST 800-53 Control Browser
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse and search {pagination.total_items} NIST 800-53 security controls
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-3">
            {selectedForExport.size > 0 && (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedForExport.size} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={selectAllControls}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={exportToOSCAL}
              disabled={selectedForExport.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export to OSCAL
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search controls by ID, name, or description..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <FunnelIcon className="h-5 w-5" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Family Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <TagIcon className="h-4 w-4 inline mr-1" />
                Control Family
              </label>
              <select
                value={filters.family || ''}
                onChange={(e) => handleFilterChange('family', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Families</option>
                {families.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>
            </div>

            {/* Baseline Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Baseline
              </label>
              <select
                value={filters.baseline || ''}
                onChange={(e) => handleFilterChange('baseline', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Baselines</option>
                {baselines.map((baseline) => (
                  <option key={baseline.name} value={baseline.name}>
                    {baseline.name.toUpperCase()} ({baseline.total_controls} controls)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {(filters.family || filters.baseline || filters.search) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
            {filters.family && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                {filters.family}
              </span>
            )}
            {filters.baseline && (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                {filters.baseline.toUpperCase()}
              </span>
            )}
            {filters.search && (
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                Search: "{filters.search}"
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading controls...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      )}

      {/* Controls List */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 mb-6">
            {controls.map((control) => (
              <div
                key={control.control_id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleControlClick(control)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Selection Checkbox */}
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={(e) => toggleControlSelection(control.control_id, e)}
                        className="mt-1 flex-shrink-0"
                      >
                        {selectedForExport.has(control.control_id) ? (
                          <CheckCircleIconSolid className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <CheckCircleIcon className="h-6 w-6 text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-500" />
                        )}
                      </button>

                      <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                          {control.control_id?.toUpperCase()}
                        </span>
                        {control.family && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                            {control.family}
                          </span>
                        )}
                        {/* Baseline badges */}
                        {control.baselines && (
                          <>
                            {control.baselines.low && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                                LOW
                              </span>
                            )}
                            {control.baselines.moderate && (
                              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-xs font-medium">
                                MODERATE
                              </span>
                            )}
                            {control.baselines.high && (
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                                HIGH
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {control.control_name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                        {control.plain_english_explanation || control.official_text}
                      </p>

                      {/* Expanded Details */}
                      {selectedControl?.control_id === control.control_id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          {control.example_implementation && (
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Implementation Example
                              </h4>
                              <p className="text-gray-700 dark:text-gray-300">
                                {control.example_implementation}
                              </p>
                            </div>
                          )}

                          {control.enhancements && control.enhancements.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Enhancements ({control.enhancements.length})
                              </h4>
                              <div className="space-y-2">
                                {control.enhancements.slice(0, 5).map((enhancement, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                  >
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {enhancement.id}: {enhancement.title}
                                    </div>
                                    {enhancement.official_text && (
                                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {enhancement.official_text}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {control.enhancements.length > 5 && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    + {control.enhancements.length - 5} more enhancements
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {control.non_technical_guidance && (
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Non-Technical Guidance
                              </h4>
                              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                {control.non_technical_guidance}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      </div>

                      <BookOpenIcon className="h-6 w-6 text-gray-400 flex-shrink-0 ml-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total_items)} of{' '}
                {pagination.total_items} controls
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.has_prev}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.total_pages - 2) {
                      pageNum = pagination.total_pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded-lg ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.has_next}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {controls.length === 0 && (
            <div className="text-center py-12">
              <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                No controls found matching your filters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ControlBrowser;
