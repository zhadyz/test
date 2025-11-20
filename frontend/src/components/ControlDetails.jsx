import React, { useState, useEffect } from 'react';
import { StarIcon as StarIconSolid, StarIcon } from '@heroicons/react/24/solid';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon, BookOpenIcon, WrenchScrewdriverIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronRightIcon, ArrowDownTrayIcon, InformationCircleIcon, ClipboardIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
// import { enhancementsMap } from '../data/controls'; // No longer needed - using API data
import { useNavigate } from 'react-router-dom';
import { cleanNISTText, formatOfficialText, parseRichText } from '../utils/textFormatting';
import { getFamilyColors } from '../utils/colors';

// Function to get scripts from control data
const getControlScripts = (control) => {
  if (!control.scripts) return null;
  return control.scripts;
};

// Convert control data to platform implementation format
const getControlPlatformImplementation = (control) => {
  const newFormatScripts = control.implementation_scripts;
  const oldFormatScripts = control.scripts;

  if (!oldFormatScripts && !newFormatScripts) return null;

  const platforms = {};

  // NEW FORMAT: Phase 2 API structure
  if (newFormatScripts) {
    // Linux platform with Ansible and/or Bash
    if (newFormatScripts.linux) {
      if (newFormatScripts.linux.ansible) {
        platforms.Ansible = {
          steps: control.implementation_guidance ? [control.implementation_guidance] : ['Run the Ansible playbook below'],
          script: newFormatScripts.linux.ansible,
          scriptTitle: 'Ansible Playbook',
          recommended: { yaml: newFormatScripts.linux.ansible, title: 'Ansible Playbook', recommended: true },
          otherScripts: []
        };
      }
      if (newFormatScripts.linux.bash) {
        platforms.Linux = {
          steps: control.implementation_guidance ? [control.implementation_guidance] : ['Run the Bash script below'],
          script: newFormatScripts.linux.bash
        };
      }
    }

    // Windows platform with PowerShell
    if (newFormatScripts.windows && newFormatScripts.windows.powershell && !newFormatScripts.windows.powershell.includes("Not applicable")) {
      platforms.Windows = {
        steps: control.implementation_guidance ? [control.implementation_guidance] : ['Run the PowerShell script below'],
        script: newFormatScripts.windows.powershell
      };
    }
  }
  // OLD FORMAT: Legacy embedded data structure (fallback)
  else if (oldFormatScripts) {
    // Add Ansible platform if scripts exist (array)
    if (Array.isArray(oldFormatScripts.Ansible)) {
      const scripts = oldFormatScripts.Ansible;
      const recommended = scripts.find(s => s.recommended) || scripts[0];
      const others = scripts.filter(s => s !== recommended);
      platforms.Ansible = {
        steps: ['Run the Ansible playbook below'],
        script: recommended.yaml,
        scriptTitle: recommended.title,
        recommended,
        otherScripts: others
      };
    } else if (oldFormatScripts.Ansible) {
      // Fallback for single script string
      platforms.Ansible = {
        steps: ['Run the Ansible playbook below'],
        script: oldFormatScripts.Ansible,
        scriptTitle: 'Ansible Playbook',
        recommended: { yaml: oldFormatScripts.Ansible, title: 'Ansible Playbook', recommended: true },
        otherScripts: []
      };
    }

    // Add Windows platform if script exists
    if (oldFormatScripts.PowerShell) {
      platforms.Windows = {
        steps: ['Run the PowerShell script below'],
        script: oldFormatScripts.PowerShell
      };
    }

    // Add Linux platform if script exists
    if (oldFormatScripts.Bash) {
      platforms.Linux = {
        steps: ['Run the Bash script below'],
        script: oldFormatScripts.Bash
      };
    }
  }

  return Object.keys(platforms).length > 0 ? platforms : null;
};

// Extract STIG IDs from various formats
const getSTIGDisplay = (control) => {
  // Check simple string format (IA family)
  if (control.stig_id) {
    return control.stig_id;
  }

  // Check metadata format (AC/AU families)
  if (control.metadata?.stig_id) {
    return control.metadata.stig_id;
  }

  // Extract from stig_mappings (complex format)
  if (control.stig_mappings) {
    const mappings = control.stig_mappings;
    const stigIds = [];

    // Handle array format
    if (Array.isArray(mappings)) {
      mappings.forEach(item => {
        if (item.stig_id) stigIds.push(item.stig_id);
      });
    }
    // Handle object format (platform-specific)
    else if (typeof mappings === 'object') {
      Object.values(mappings).forEach(platformMappings => {
        if (Array.isArray(platformMappings)) {
          platformMappings.forEach(item => {
            if (typeof item === 'string') stigIds.push(item);
            else if (item.stig_id) stigIds.push(item.stig_id);
            else if (item.rule_id) stigIds.push(item.rule_id);
          });
        }
      });
    }

    if (stigIds.length > 0) {
      // Return first few STIG IDs (limit to 5 to avoid overwhelming display)
      const displayIds = stigIds.slice(0, 5);
      return displayIds.join(', ') + (stigIds.length > 5 ? ` (+${stigIds.length - 5} more)` : '');
    }
  }

  return 'N/A';
};

function PlatformTabs({ platforms, selectedPlatform, setSelectedPlatform, control }) {
  const platformNames = Object.keys(platforms);
  const activeTab = selectedPlatform || platformNames[0];
  const active = platforms[activeTab];
  const [copied, setCopied] = React.useState('');

  // Ensure selectedPlatform is synced with available platforms
  useEffect(() => {
    if (!selectedPlatform && platformNames.length > 0) {
      setSelectedPlatform(platformNames[0]);
    }
  }, [platformNames, selectedPlatform, setSelectedPlatform]);

  const handleCopy = (script, label) => {
    navigator.clipboard.writeText(script);
    setCopied(label);
    setTimeout(() => setCopied(''), 1200);
  };

  return (
    <div>
      <div className="flex space-x-2 mb-3">
        {platformNames.map(name => (
          <button
            key={name}
            onClick={() => setSelectedPlatform(name)}
            className={`px-4 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
              activeTab === name
                ? name === 'Ansible'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-400'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      
      <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-green-600" />
          Implementation Steps
        </div>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-900 dark:text-gray-100">
          {active && active.steps && active.steps.map((step, idx) => (
            <li key={idx} className="ml-2 pl-1">{step}</li>
          ))}
        </ol>
      </div>

      <div>
        {/* Ansible Script(s) */}
        {activeTab === 'Ansible' && active && active.recommended && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                  {active.scriptTitle || 'Ansible Playbook'}
                </div>
                <button
                  onClick={() => handleCopy(active.recommended.yaml, 'Ansible')}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center relative"
                >
                  <ClipboardIcon className="h-3.5 w-3.5 mr-1.5" />
                  {copied === 'Ansible' ? 'Copied!' : 'Copy Code'}
                </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto border border-gray-800 shadow-inner"><code>{active.recommended.yaml}</code></pre>
          </div>
        )}

        {/* Bash Script */}
        {activeTab === 'Linux' && active && active.script && (
          <div className="mb-4">
             <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm text-gray-700 dark:text-gray-200">Bash Script</div>
                 <button
                  onClick={() => handleCopy(active.script, 'Bash')}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center relative"
                >
                  <ClipboardIcon className="h-3.5 w-3.5 mr-1.5" />
                  {copied === 'Bash' ? 'Copied!' : 'Copy Code'}
                </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto border border-gray-800 shadow-inner"><code>{active.script}</code></pre>
          </div>
        )}

        {/* PowerShell Script */}
        {activeTab === 'Windows' && active && active.script && (
          <div className="mb-4">
             <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm text-gray-700 dark:text-gray-200">PowerShell Script</div>
                 <button
                  onClick={() => handleCopy(active.script, 'PowerShell')}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center relative"
                >
                  <ClipboardIcon className="h-3.5 w-3.5 mr-1.5" />
                  {copied === 'PowerShell' ? 'Copied!' : 'Copy Code'}
                </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto border border-gray-800 shadow-inner"><code>{active.script}</code></pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ControlDetails({ control, allControls = [], onBack, isFavorite, onToggleFavorite, embedded = false }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [expandedEnhancementId, setExpandedEnhancementId] = useState(null);

  // Get enhancements from API data instead of static enhancementsMap
  const apiEnhancements = allControls.filter(c => {
    if (!c.control_id || !control.control_id) return false;
    const parts = c.control_id.split('.');
    return parts.length > 1 && parts[0] === control.control_id;
  });
  const [baselineFilter, setBaselineFilter] = useState('All');

  // Fallback if no control prop
  if (!control) {
     return (
       <div className="p-10 text-center">
         <h2 className="text-xl font-bold text-gray-800">Control not found</h2>
         {!embedded && <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Go Back</button>}
       </div>
     );
  }

  // Determine if we have technical implementation
  // Priority: If scripts exist, it's technical. Metadata is secondary.
  const platformImpl = getControlPlatformImplementation(control);
  const isOrganizational = !platformImpl;

  const containerClasses = embedded 
    ? "mt-4 border-t border-slate-200 dark:border-slate-700 pt-4 animate-in fade-in slide-in-from-top-2 duration-300"
    : "max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-8";
    
  const cardClasses = embedded
    ? ""
    : "bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 px-0 py-0 relative overflow-hidden";

  return (
    <div className={containerClasses}>
      <div className={cardClasses}>
        
        {/* Header Background Accent - Only for full page */}
        {!embedded && (
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"></div>
        )}

        <div className={embedded ? "" : "p-6 md:p-8"}>
          {/* Full Page Header Controls */}
          {!embedded && (
            <>
              <button
                onClick={onToggleFavorite}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? (
                  <StarIconSolid className="h-6 w-6 text-yellow-400" />
                ) : (
                  <StarIcon className="h-6 w-6 text-gray-300 hover:text-yellow-400 transition-colors" />
                )}
              </button>

              <button
                onClick={onBack}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-6 group"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                Back to Explorer
              </button>

              <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                   <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                     <span className="text-blue-600 mr-3">{control.control_id}</span>
                     {control.control_name}
                   </h1>
                   {control.baselines && Object.keys(control.baselines).length > 0 && (
                     <div className="flex gap-2 mt-2 md:mt-0">
                       {Object.entries(control.baselines).filter(([_, v]) => v).map(([k]) => (
                         <span key={k} className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                           k === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                           k === 'moderate' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                           'bg-green-50 text-green-700 border-green-200'
                         }`}>
                           {k}
                         </span>
                       ))}
                     </div>
                   )}
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                  {cleanNISTText(control.plain_english_explanation || control.official_text)}
                </div>
              </div>
            </>
          )}

          {/* Navigation Tabs */}
          <div className={`flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto scrollbar-hide ${embedded ? 'justify-start' : ''}`}>
            {[
              { id: 'Overview', label: 'Overview', icon: BookOpenIcon },
              { id: 'Implementation', label: isOrganizational ? 'Policy' : 'Implement', icon: isOrganizational ? DocumentTextIcon : WrenchScrewdriverIcon },
              { id: 'Related', label: 'Related', icon: ChevronRightIcon },
              { id: 'Spud', label: 'Spud AI', icon: SparklesIcon, special: true }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
                className={`group flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${tab.special ? 'text-purple-500' : ''}`} />
                {tab.special ? (
                  <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent font-bold">
                    {tab.label}
                  </span>
                ) : tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === 'Overview' && (
              <div className="space-y-6 animate-in fade-in duration-300">

                <div className={`grid grid-cols-1 ${embedded ? '' : 'md:grid-cols-2'} gap-6`}>


                  <InfoCard title="Compliance Metadata" icon={CheckCircleIcon} accent="green">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-semibold text-xs uppercase text-gray-500 block mb-1">STIG ID</span>
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{getSTIGDisplay(control)}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-xs uppercase text-gray-500 block mb-1">CCI</span>
                        <span className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                          {Array.isArray(control.metadata?.cci) ? control.metadata.cci.join(', ') : (control.metadata?.cci || 'N/A')}
                        </span>
                      </div>
                    </div>
                  </InfoCard>
                  
                  {!embedded && (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                       <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                         <CheckCircleIcon className="w-5 h-5 text-green-500" />
                         Key Requirements
                       </h3>
                       <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                         {control.official_text ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                               {formatOfficialText(control.official_text)}
                            </div>
                         ) : "See NIST documentation for official text."}
                       </div>
                    </div>
                  )}
                </div>

                {/* Enhancements Section */}
                {(control.enhancements && control.enhancements.length > 0) || apiEnhancements.length > 0 ? (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Enhancements</h3>
                      
                      {/* Filter Buttons */}
                      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        {['All', 'Low', 'Moderate', 'High'].map(filter => (
                          <button
                            key={filter}
                            onClick={(e) => { e.stopPropagation(); setBaselineFilter(filter); }}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                              baselineFilter === filter
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(apiEnhancements.length > 0 ? apiEnhancements : control.enhancements || [])
                        .filter(eh => {
                          if (baselineFilter === 'All') return true;
                          const baselines = eh.baselines || {};
                          return baselines[baselineFilter.toLowerCase()] === true;
                        })
                        .map(eh => {
                          const isExpanded = expandedEnhancementId === (eh.id || eh.control_id);
                          const baselines = eh.baselines || {};
                          const familyId = (eh.id || eh.control_id).split('-')[0].toUpperCase();
                          const familyColors = getFamilyColors(familyId);
                          
                          return (
                            <div 
                              key={eh.id || eh.control_id}
                              className={`group border rounded-xl transition-all overflow-hidden ${
                                isExpanded 
                                  ? 'bg-white dark:bg-gray-800 shadow-md' 
                                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm'
                              }`}
                              style={{
                                borderColor: isExpanded ? familyColors.primary : undefined,
                                boxShadow: isExpanded ? `0 4px 6px -1px ${familyColors.primary}20` : undefined
                              }}
                            >
                              <div 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setExpandedEnhancementId(isExpanded ? null : (eh.id || eh.control_id)); 
                                }}
                                className="p-4 cursor-pointer flex items-start gap-4"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  <div 
                                    className="font-mono text-xs font-bold px-2 py-1 rounded-md border transition-colors"
                                    style={{
                                      backgroundColor: isExpanded ? familyColors.light : `${familyColors.primary}10`,
                                      color: familyColors.dark,
                                      borderColor: familyColors.primary
                                    }}
                                  >
                                    {(eh.id || eh.control_id).toUpperCase()}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 
                                      className="text-sm font-semibold transition-colors"
                                      style={{ color: isExpanded ? familyColors.dark : undefined }}
                                    >
                                      {eh.title || eh.control_name}
                                    </h4>
                                    
                                    {/* Baseline Badges */}
                                    {['low', 'moderate', 'high'].map(level => baselines[level] && (
                                      <span 
                                        key={level}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBaselineFilter(level.charAt(0).toUpperCase() + level.slice(1));
                                        }}
                                        className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border cursor-pointer transition-colors ${
                                          level === 'low' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                          level === 'moderate' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                                          'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                        }`}
                                      >
                                        {level}
                                      </span>
                                    ))}
                                  </div>
                                  
                                  {(eh.plain_english_explanation || eh.rationale) && !isExpanded && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                      {cleanNISTText(eh.plain_english_explanation || eh.rationale)}
                                    </p>
                                  )}
                                </div>

                                <div className="flex-shrink-0">
                                  {isExpanded ? (
                                    <ChevronDownIcon className="w-5 h-5" style={{ color: familyColors.primary }} />
                                  ) : (
                                    <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded Inline Details */}
                              {isExpanded && (
                                <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                  <div 
                                    className="pt-4 border-t"
                                    style={{ borderColor: `${familyColors.primary}30` }}
                                  >
                                    <ControlDetails 
                                      control={eh} 
                                      embedded={true}
                                      isFavorite={false} 
                                      onToggleFavorite={() => {}}
                                      onBack={() => {}}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : null}

                <InfoCard title="Intent & Rationale" icon={InformationCircleIcon} accent="blue">
                  <RichTextDisplay text={control.intent || control.rationale || "No rationale provided."} />
                </InfoCard>
              </div>
            )}

            {activeTab === 'Implementation' && (
              <div className="animate-in fade-in duration-300">
                {isOrganizational ? (
                  <div className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                      <div className="flex items-start gap-3">
                        <DocumentTextIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-amber-900 dark:text-amber-100 text-lg mb-2">Organizational Control</h3>
                          <p className="text-amber-800 dark:text-amber-200 text-sm">
                            This is an administrative control that requires policy, documentation, or human processes rather than technical automation.
                          </p>
                        </div>
                      </div>
                    </div>

                    {(control.non_technical_guidance || control.implementation_guidance) && (
                       <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <ClipboardIcon className="w-5 h-5 text-blue-500" />
                            Compliance Checklist
                          </h3>
                          <div className="max-w-none">
                             <RichTextDisplay text={control.non_technical_guidance || control.implementation_guidance} />
                          </div>
                       </div>
                    )}

                    {control.ai_guidance && (
                       <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
                          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Example Implementation</h3>
                          <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none markdown-content">
                            <ReactMarkdown
                              components={{
                                code: ({node, inline, className, children, ...props}) => {
                                  return inline ? (
                                    <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs font-mono text-blue-900 dark:text-blue-100" {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs font-mono my-2" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                pre: ({children}) => <div className="my-2">{children}</div>,
                                h1: ({children}) => <h1 className="text-lg font-bold mt-4 mb-2 text-blue-900 dark:text-blue-100">{children}</h1>,
                                h2: ({children}) => <h2 className="text-base font-bold mt-3 mb-2 text-blue-900 dark:text-blue-100">{children}</h2>,
                                h3: ({children}) => <h3 className="text-sm font-bold mt-2 mb-1 text-blue-900 dark:text-blue-100">{children}</h3>,
                                ul: ({children}) => <ul className="list-disc list-inside space-y-1 my-2 text-blue-800 dark:text-blue-200">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal list-inside space-y-1 my-2 text-blue-800 dark:text-blue-200">{children}</ol>,
                                li: ({children}) => <li className="ml-2 text-blue-800 dark:text-blue-200">{children}</li>,
                                p: ({children}) => <p className="my-2 text-blue-800 dark:text-blue-200">{children}</p>,
                                strong: ({children}) => <strong className="font-bold text-blue-900 dark:text-blue-100">{children}</strong>,
                              }}
                            >
                              {control.ai_guidance}
                            </ReactMarkdown>
                          </div>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                    <PlatformTabs
                      platforms={platformImpl}
                      selectedPlatform={selectedPlatform}
                      setSelectedPlatform={setSelectedPlatform}
                      control={control}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Related' && (
              <div className="animate-in fade-in duration-300">
                 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Related Controls</h3>
                    {control.related_controls && control.related_controls.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {control.related_controls.map(rc => (
                          <button
                            key={rc}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/controls/${rc}`);
                            }}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-blue-300"
                          >
                            {rc}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No related controls listed.</p>
                    )}
                    
                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
                       <h3 className="font-bold text-gray-900 dark:text-white mb-4">External Resources</h3>
                       <a 
                         href={control.nist_link || `https://csrc.nist.gov/glossary/term/${control.control_name.toLowerCase().replace(/ /g, '-')}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center gap-2 text-blue-600 hover:underline"
                       >
                         <BookOpenIcon className="w-4 h-4" />
                         View on NIST CSRC
                       </a>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'Spud' && (
              <div className="animate-in fade-in duration-300">
                 <div className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                         <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                       </div>
                       <div>
                         <h3 className="font-bold text-gray-900 dark:text-white">Ask Spud</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400">AI Assistant for NIST 800-53</p>
                       </div>
                    </div>
                    <SpudAIChat control={control} />
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RichTextDisplay({ text }) {
  if (!text) return null;
  // Ensure text is a string before parsing
  const textStr = typeof text === 'string' ? text : String(text);
  const blocks = parseRichText(textStr);
  
  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => (
        block.type === 'list' ? (
          <ul key={idx} className="list-disc list-inside space-y-2 ml-2 text-gray-700 dark:text-gray-300">
            {block.content.map((item, i) => <li key={i} className="text-sm leading-relaxed">{item}</li>)}
          </ul>
        ) : (
          <p key={idx} className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 text-justify">
            {block.content}
          </p>
        )
      ))}
    </div>
  );
}

function InfoCard({ title, children, icon: Icon, accent = 'blue' }) {
  const accents = {
    blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    amber: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${accents[accent]}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function SpudAIChat({ control }) {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      // Simulate AI delay for better UX feel
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          control_id: control.control_id || "UNKNOWN",
          context: {
            title: control.control_name || "Unknown Control",
            family: control.control_id ? control.control_id.split("-")[0] : "UNKNOWN",
            description: control.plain_english_explanation || control.intent || ""
          }
        })
      });
      if (!res.ok) throw new Error("AI service temporarily unavailable");
      const data = await res.json();
      setAnswer(data.response);
    } catch (err) {
      // Fallback for demo purposes if backend not running
      if (err.message.includes("unavailable") || err.message.includes("Failed to fetch")) {
         setAnswer(`I'm Spud, your NIST assistant! Currently I'm in offline mode, but I can tell you that ${control.control_id} is primarily about ${control.control_name.toLowerCase()}. In a real deployment, I would use the backend LLM to answer specific questions about implementation nuance.`);
      } else {
         setError(err.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={`Ask about ${control.control_id} compliance...`}
          className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          disabled={loading}
        />
        <button 
          type="submit" 
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm" 
          disabled={loading || !question.trim()}
        >
          {loading ? "Thinking..." : "Ask Spud"}
        </button>
      </form>
      {error && <div className="text-red-500 text-sm mb-2 bg-red-50 p-3 rounded-lg">{error}</div>}
      {answer && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-gray-800 dark:text-gray-200 text-sm leading-relaxed shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex gap-3">
             <SparklesIcon className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
             <div className="whitespace-pre-line">{answer}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export { getControlScripts };