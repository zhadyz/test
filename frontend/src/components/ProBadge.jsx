import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

const ProBadge = ({ 
  size = 'sm', 
  variant = 'default', 
  showIcon = true, 
  className = '',
  tooltip = 'This will be part of Spud Pro in the future'
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  };

  const variantClasses = {
    default: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    outline: 'border-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-transparent',
    subtle: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
    gold: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="relative inline-block group">
      <span 
        className={`
          inline-flex items-center font-bold rounded-full shadow-sm
          ${sizeClasses[size]} 
          ${variantClasses[variant]} 
          ${className}
        `}
      >
        {showIcon && (
          <SparklesIcon className={`${iconSizes[size]} mr-1`} />
        )}
        PRO
      </span>
      
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
};

export default ProBadge; 