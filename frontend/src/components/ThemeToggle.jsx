import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = "" }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center
        w-10 h-10 rounded-lg
        bg-gray-100 hover:bg-gray-200 
        dark:bg-dark-200 dark:hover:bg-dark-300
        border border-gray-200 dark:border-dark-300
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:focus:ring-offset-dark-100
        group
        ${className}
      `}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        {/* Sun Icon */}
        <SunIcon 
          className={`
            absolute inset-0 w-5 h-5 
            text-amber-500 
            transition-all duration-300 ease-in-out
            transform
            ${isDarkMode 
              ? 'opacity-0 scale-0 rotate-90' 
              : 'opacity-100 scale-100 rotate-0'
            }
          `}
        />
        
        {/* Moon Icon */}
        <MoonIcon 
          className={`
            absolute inset-0 w-5 h-5 
            text-slate-700 dark:text-slate-300
            transition-all duration-300 ease-in-out
            transform
            ${isDarkMode 
              ? 'opacity-100 scale-100 rotate-0' 
              : 'opacity-0 scale-0 -rotate-90'
            }
          `}
        />
      </div>
      
      {/* Hover effect */}
      <div className="
        absolute inset-0 rounded-lg 
        bg-gradient-to-r from-amber-400/20 to-orange-400/20
        dark:from-blue-400/20 dark:to-purple-400/20
        opacity-0 group-hover:opacity-100
        transition-opacity duration-300
      " />
    </button>
  );
};

export default ThemeToggle; 