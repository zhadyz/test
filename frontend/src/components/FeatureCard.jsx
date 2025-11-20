import React from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import ProBadge from './ProBadge';
import { isFeaturePremium, isFeatureAccessible } from '../config/features';

const FeatureCard = ({ 
  feature, 
  onClick, 
  className = '',
  showBadgeInCorner = true,
  showPremiumText = true,
  variant = 'default' // 'default', 'compact', 'simple'
}) => {
  const isPremium = isFeaturePremium(feature.id);
  const isAccessible = isFeatureAccessible(feature.id);
  const IconComponent = feature.icon;

  const handleClick = () => {
    if (isAccessible && onClick) {
      onClick(feature);
    } else if (!isAccessible) {
      // Future: Show upgrade prompt or login modal
      console.log(`Feature ${feature.id} requires premium access`);
    }
  };

  const baseClasses = `
    group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
    transition-all duration-300 transform
    ${isAccessible 
      ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-500' 
      : 'cursor-not-allowed opacity-75'
    }
  `;

  if (variant === 'compact') {
    return (
      <div
        onClick={handleClick}
        className={`${baseClasses} p-4 ${className}`}
      >
        {/* Premium badge */}
        {isPremium && showBadgeInCorner && (
          <div className="absolute top-2 right-2">
            <ProBadge size="xs" variant="subtle" showIcon={false} />
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          {feature.count && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {feature.count}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {feature.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {feature.description}
        </p>
        {isPremium && showPremiumText && (
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
            Premium Feature
          </p>
        )}
      </div>
    );
  }

  if (variant === 'simple') {
    return (
      <button
        onClick={handleClick}
        disabled={!isAccessible}
        className={`w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-md ${
          isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
        } ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-8 h-8 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mr-3`}>
              <IconComponent className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            {isPremium && (
              <ProBadge size="xs" variant="subtle" showIcon={false} className="mr-2" />
            )}
            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </button>
    );
  }

  // Default variant - full card
  return (
    <div
      onClick={handleClick}
      className={`${baseClasses} shadow-lg ${className}`}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
      
      {/* Premium badge in top-right corner */}
      {isPremium && showBadgeInCorner && (
        <div className="absolute top-4 right-4 z-10">
          <ProBadge size="sm" variant="default" tooltip="This will be part of Spud Pro in the future" />
        </div>
      )}
      
      <div className="relative p-8">
        {/* Icon */}
        <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <IconComponent className="w-8 h-8 text-white" />
        </div>

        {/* Content */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1 pr-2">
            {feature.title}
          </h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          {feature.description}
          {isPremium && showPremiumText && (
            <span className="block text-sm text-purple-600 dark:text-purple-400 mt-2 font-medium">
              Premium Feature
            </span>
          )}
        </p>

        {/* Status and Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {feature.status && (
              <>
                {feature.status === 'active' ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                ) : (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                )}
                <span className={`text-sm font-medium ${
                  feature.status === 'active' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {feature.status === 'active' ? 'Ready' : 'Coming Soon'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center">
            {isPremium && !showBadgeInCorner && (
              <ProBadge size="xs" variant="subtle" showIcon={false} className="mr-2" />
            )}
            <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard; 