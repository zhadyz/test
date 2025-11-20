import React, { useState } from 'react';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { useLocation, useNavigate } from 'react-router-dom';

const Navigation = ({ currentView, onNavigate }) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (path) => {
    navigate(path);
    if (onNavigate) {
      if (path === '/') onNavigate('landing');
      else if (path === '/control-explorer') onNavigate('control-explorer');
      else if (path === '/controls') onNavigate('control-browser');
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and main nav */}
          <div className="flex items-center space-x-8">
            <div
              className="flex-shrink-0 flex items-center cursor-pointer group transition-all duration-300"
              onClick={() => handleNavClick('/')}
              style={{
                filter: 'drop-shadow(0 0 0px rgba(0,0,0,0))'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 0 6px rgba(255,20,147,0.4)) drop-shadow(0 0 6px rgba(59,130,246,0.4))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 0 0px rgba(0,0,0,0))';
              }}
            >
              <img
                src="/unified-logo.png"
                alt="Spud Logo"
                className="h-6 w-auto mr-2 transition-all duration-300 group-hover:brightness-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight transition-all duration-300 group-hover:text-pink-500 dark:group-hover:text-pink-500">
                Spud.
              </span>
            </div>

            {/* Main navigation items */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleNavClick('/')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <ViewColumnsIcon className="h-4 w-4 mr-2" />
                Home
              </button>

              <button
                onClick={() => handleNavClick('/control-explorer')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/control-explorer'
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                Control Explorer
              </button>

              <button
                onClick={() => handleNavClick('/controls')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/controls'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <BookOpenIcon className="h-4 w-4 mr-2" />
                Control Browser
              </button>

            </div>
          </div>

          {/* Right side - Just theme toggle now */}
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 