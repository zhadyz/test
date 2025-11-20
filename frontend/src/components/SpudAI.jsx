import React, { useState, useRef, useEffect } from 'react';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const SpudAI = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([
    'AC-2 Account Management',
    'AU-2 Audit Events', 
    'SC-28 Protection of Information at Rest',
    'IA-2 Identification and Authentication'
  ]);
  const searchInputRef = useRef(null);

  useEffect(() => {
    // Auto-focus search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const quickSuggestions = [
    { 
      id: 'explain-control', 
      icon: ShieldCheckIcon, 
      text: 'Explain NIST control AC-2',
      description: 'Get detailed explanation of Account Management control'
    },
    { 
      id: 'implementation-guide', 
      icon: DocumentTextIcon, 
      text: 'How to implement SC-28 on AWS',
      description: 'Implementation guidance for cloud environments'
    },
    { 
      id: 'best-practices', 
      icon: LightBulbIcon, 
      text: 'Security best practices for IA-2',
      description: 'Current authentication best practices'
    },
    { 
      id: 'compliance-mapping', 
      icon: ClipboardDocumentIcon, 
      text: 'Map controls to Kubernetes',
      description: 'Platform-specific control mappings'
    }
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Add to recent searches
    setRecentSearches(prev => {
      const newSearches = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 4);
      return newSearches;
    });

    // Navigate to control search with the query
    onNavigate('search', { query: searchQuery });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.text);
    searchInputRef.current?.focus();
  };

  const handleRecentSearchClick = (search) => {
    setSearchQuery(search);
    searchInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center pt-16 pb-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <SparklesIcon className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-4xl font-light text-gray-900 dark:text-white mb-2">
            <span className="font-normal">Spud</span>
            <span className="text-blue-500">AI</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Search NIST controls with AI-powered insights
          </p>
        </div>
      </div>

      {/* Main Search */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4">
        <div className="relative mb-8">
          <div className={`relative transition-all duration-300 ${
            isSearchFocused ? 'transform scale-105' : ''
          }`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search NIST controls, ask questions, or get implementation guidance..."
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-lg hover:shadow-xl transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-12 flex items-center pr-2"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              className="absolute inset-y-0 right-0 flex items-center pr-4 disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                <ArrowRightIcon className="h-4 w-4 text-white" />
              </div>
            </button>
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
            Try these searches
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickSuggestions.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex items-start space-x-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-left hover:shadow-md group"
                >
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Icon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {suggestion.text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {suggestion.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
              Recent searches
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
        <p>
          Powered by AI • Search{' '}
          <span className="font-medium">800+ NIST controls</span> • Get implementation guidance
        </p>
        <div className="flex items-center justify-center space-x-6 mt-4">
          <button
            onClick={() => onNavigate('control-explorer')}
            className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            Browse Controls
          </button>
          <button
            onClick={() => onNavigate('tool-mapper')}
            className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            Platform Mapper
          </button>
          <button
            onClick={() => onNavigate('search')}
            className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            Advanced Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpudAI; 