import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const BASELINES = [
  {
    value: 'nist_800_53_moderate',
    name: 'NIST 800-53 Moderate',
    icon: ShieldCheckIcon,
    color: 'blue',
    description: 'Moderate-impact baseline for federal information systems. Balances security and operational flexibility.',
    controls: 325,
    recommendedFor: 'Most federal and commercial systems',
    level: 'Moderate',
    frameworks: ['FISMA', 'FedRAMP', 'NIST']
  },
  {
    value: 'nist_800_53_high',
    name: 'NIST 800-53 High',
    icon: ExclamationTriangleIcon,
    color: 'red',
    description: 'High-impact baseline for critical systems. Maximum security, strictest requirements.',
    controls: 370,
    recommendedFor: 'Critical infrastructure, sensitive data',
    level: 'High',
    frameworks: ['FISMA', 'FedRAMP', 'NIST']
  },
  {
    value: 'cis_level_1',
    name: 'CIS Level 1',
    icon: SparklesIcon,
    color: 'green',
    description: 'CIS Benchmarks Level 1. Essential security hygiene, easy to implement.',
    controls: 120,
    recommendedFor: 'General use, quick wins',
    level: 'Basic',
    frameworks: ['CIS']
  },
  {
    value: 'cis_level_2',
    name: 'CIS Level 2',
    icon: AdjustmentsHorizontalIcon,
    color: 'purple',
    description: 'CIS Benchmarks Level 2. Defense-in-depth, more complex controls.',
    controls: 180,
    recommendedFor: 'Enterprises, regulated industries',
    level: 'Advanced',
    frameworks: ['CIS']
  },
  {
    value: 'custom',
    name: 'Custom Baseline',
    icon: SparklesIcon,
    color: 'yellow',
    description: 'User-defined baseline. Tailor controls to your unique requirements.',
    controls: 'Variable',
    recommendedFor: 'Organizations with custom needs',
    level: 'Custom',
    frameworks: ['Custom']
  }
];

const colorMap = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    ring: 'ring-blue-500 dark:ring-blue-400'
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    ring: 'ring-red-500 dark:ring-red-400'
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    ring: 'ring-green-500 dark:ring-green-400'
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    ring: 'ring-purple-500 dark:ring-purple-400'
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    text: 'text-yellow-800 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700',
    ring: 'ring-yellow-500 dark:ring-yellow-400'
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-900/20',
    text: 'text-gray-800 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-700',
    ring: 'ring-gray-500 dark:ring-gray-400'
  }
};

const BaselineSelector = ({ selectedBaseline, onBaselineChange, showDetails = true, className = '' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const baseline = BASELINES.find(b => b.value === selectedBaseline) || BASELINES[0];
  const colorClasses = colorMap[baseline.color] || colorMap.gray;
  const IconComponent = baseline.icon;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Baseline Selector Dropdown */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 transition-colors duration-300">
          Baseline *
        </label>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full px-4 py-3 text-left border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${colorClasses.border} ${colorClasses.ring} bg-white dark:bg-dark-50 hover:bg-gray-50 dark:hover:bg-dark-100`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
                <IconComponent className={`h-5 w-5 ${colorClasses.text}`} />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-dark-900">
                  {baseline.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-dark-500">
                  {baseline.level} • {Array.isArray(baseline.controls) ? baseline.controls.length : baseline.controls} controls
                </div>
              </div>
            </div>
            <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-dark-50 border border-gray-200 dark:border-dark-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
            {BASELINES.map((b) => {
              const BIcon = b.icon;
              const bColor = colorMap[b.color] || colorMap.gray;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => {
                    onBaselineChange(b.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors duration-200 border-b border-gray-100 dark:border-dark-200 last:border-b-0 ${selectedBaseline === b.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${bColor.bg}`}>
                      <BIcon className={`h-5 w-5 ${bColor.text}`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-dark-900">{b.name}</div>
                      <div className="text-sm text-gray-500 dark:text-dark-500">{b.level} • {Array.isArray(b.controls) ? b.controls.length : b.controls} controls</div>
                    </div>
                  </div>
                  {selectedBaseline === b.value && (
                    <CheckCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* Baseline Details Panel */}
      {showDetails && baseline && (
        <div className={`p-4 rounded-lg border ${colorClasses.bg} ${colorClasses.border}`}>
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-white dark:bg-dark-50 ${colorClasses.border} border`}>
              <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${colorClasses.text}`}>{baseline.name}</h4>
              <p className="text-sm text-gray-600 dark:text-dark-600 mt-1">{baseline.description}</p>
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-dark-700">Level:</span>
                  <span className={`ml-1 ${colorClasses.text}`}>{baseline.level}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-dark-700">Controls:</span>
                  <span className={`ml-1 ${colorClasses.text}`}>{Array.isArray(baseline.controls) ? baseline.controls.length : baseline.controls}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {baseline.frameworks.map(fw => (
                  <span key={fw} className="px-2 py-1 text-xs font-medium bg-white dark:bg-dark-50 rounded border border-gray-200 dark:border-dark-300">{fw}</span>
                ))}
              </div>
              <div className="mt-3">
                <span className="font-medium text-gray-700 dark:text-dark-700">Recommended for:</span>
                <span className="ml-1 text-gray-600 dark:text-dark-600">{baseline.recommendedFor}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaselineSelector; 