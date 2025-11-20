import React, { useState, useRef, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

function Landing({ onNavigate, onControlSelect, controls = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredControls, setFilteredControls] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const searchRef = useRef(null);
  const searchContainerRef = useRef(null);


  // Rotating search hints
  const searchHints = [
    'Try "AC-2"',
    'Try "encryption"', 
    'Try "baseline configuration"',
    'Try "remote access"',
    'Try "MFA" or "multi-factor"',
    'Try "CM-7"',
    'Try "access enforcement"'
  ];

  // Rotate hints every 4 seconds with smooth transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setHintVisible(false);
      setTimeout(() => {
        setCurrentHintIndex((prev) => (prev + 1) % searchHints.length);
        setHintVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filter controls based on search query
  useEffect(() => {
    if (searchQuery.trim() && controls.length > 0) {
      const filtered = controls
        .filter(control => {
          const searchTerm = searchQuery.toLowerCase();
          return (
            (control.control_id && control.control_id.toLowerCase().includes(searchTerm)) ||
            (control.control_name && control.control_name.toLowerCase().includes(searchTerm)) ||
            (control.plain_english_explanation && control.plain_english_explanation.toLowerCase().includes(searchTerm))
          );
        })
        .slice(0, 8);
      
      setFilteredControls(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredControls([]);
      setShowSuggestions(false);
    }
    setSelectedIndex(-1);
  }, [searchQuery, controls]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredControls.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredControls[selectedIndex]) {
        handleControlSelect(filteredControls[selectedIndex]);
      } else if (searchQuery.trim()) {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleControlSelect = (control) => {
    setSearchQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onNavigate) {
      // Go directly to the Control Details page
      window.location.href = `/controls/${control.control_id}`;
    } else if (onControlSelect) {
      onControlSelect(control);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      onNavigate('control-explorer', { search: searchQuery.trim() });
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    searchRef.current?.focus();
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-black overflow-hidden">
      {/* Main Content */}
      <div className="relative flex flex-col items-center px-4 pt-16">
        <div className="w-full max-w-4xl mx-auto text-center">

          {/* Header Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
              <SparklesIcon className="w-4 h-4 mr-2" />
              AI-Powered NIST 800-53 Compliance Platform
            </div>
          </div>

          {/* Spud Logo */}
          <div className="space-y-4 mb-8 mt-4">
            <div className="flex justify-center">
              <span className="text-6xl font-bold text-gray-900 dark:text-white tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                Spud.
              </span>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 font-normal max-w-2xl mx-auto">
              Transform complex NIST 800-53 security controls into clear, actionable guidance with AI-powered explanations
            </p>
          </div>

          {/* Enhanced Search Section */}
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Search Container with Premium Effects */}
            <div
              ref={searchContainerRef}
              className="relative"
            >
              {/* Search Glow Background */}
              <div className={`absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl transition-all duration-500 ${
                isFocused ? 'opacity-100 scale-[1.02]' : 'opacity-0 scale-100'
              }`}></div>
              
              {/* Main Search Bar */}
              <div className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all duration-300 shadow-lg ${
                isFocused
                  ? 'border-purple-300 shadow-2xl shadow-purple-500/25 scale-[1.02]'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xl'
              }`}>
                
                
                <div className="flex items-center p-4">
                  <MagnifyingGlassIcon className={`w-6 h-6 transition-colors duration-200 ${
                    isFocused ? 'text-purple-500' : 'text-gray-400'
                  }`} />
                  
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                      setTimeout(() => setIsFocused(false), 150);
                      setTimeout(() => setShowSuggestions(false), 150);
                    }}
                    placeholder="Search NIST controls (e.g., AC-1, SI-2, CM-8)..."
                    className="flex-1 ml-3 text-lg bg-transparent border-none outline-none placeholder-gray-400 text-gray-900 dark:text-white"
                  />

                  {searchQuery ? (
                    <button
                      onClick={clearSearch}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSearch}
                      className="ml-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                    >
                      Search
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm z-50 max-h-80 overflow-y-auto">
                    {filteredControls.map((control, index) => (
                      <button
                        key={control.control_id}
                        onClick={() => handleControlSelect(control)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                          index === selectedIndex
                            ? 'bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 dark:text-white">{control.control_id}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{control.control_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => onNavigate('control-explorer')}
                className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md flex items-center"
              >
                Explore All Controls
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                className="px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-sky-400 text-white rounded-lg font-medium hover:from-fuchsia-600 hover:to-sky-500 transition-all duration-200 shadow-sm hover:shadow-md flex items-center"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                AI Assistant
              </button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
            {/* AI Explanations */}
            <div className="text-center px-8 py-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-pink-500 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI Explanations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Complex controls translated into clear, actionable language everyone can understand.
              </p>
            </div>

            {/* Complete Coverage */}
            <div className="text-center px-8 py-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Complete Coverage</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Every NIST 800-53 control with detailed implementation guidance and examples.
              </p>
            </div>

            {/* Tailored Implementation */}
            <div className="text-center px-8 py-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tailored Implementation</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Personalized implementation guidance with step-by-step instructions tailored to your environment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
