import React from 'react';
import { Star, FileText, Wrench, ArrowRight, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ControlDetails from './ControlDetails';

const ControlCard = ({
  control,
  allControls = [],
  isFavorite,
  onToggleFavorite,
  expandedDescriptions,
  setExpandedDescriptions,
  handleDetails,
  handleImplement,
  getFamilyColors,
  enhancements = [],
  isControlExpanded = false,
  onToggleExpansion
}) => {
  const family = control.control_id.split('-')[0].toUpperCase();
  const familyColors = getFamilyColors(family);

  const hasScripts = control.implementation_scripts &&
    Object.keys(control.implementation_scripts).length > 0;

  const getScriptFormats = () => {
    if (!hasScripts) return [];
    const formats = [];
    const scripts = control.implementation_scripts;

    if (scripts.linux) {
      if (scripts.linux.bash) formats.push({ name: 'Bash', color: 'hsl(142 71% 45%)' });
      if (scripts.linux.ansible) formats.push({ name: 'Ansible', color: 'hsl(0 72% 51%)' });
    }
    if (scripts.windows) {
      if (scripts.windows.powershell) formats.push({ name: 'PowerShell', color: 'hsl(217 91% 60%)' });
    }

    return formats;
  };

  const scriptFormats = getScriptFormats();

  const getBaselineLevels = () => {
    const baselines = control.baselines || {};
    const levels = [];
    if (baselines.low) levels.push('Low');
    if (baselines.moderate) levels.push('Moderate');
    if (baselines.high) levels.push('High');
    return levels;
  };

  const baselineLevels = getBaselineLevels();
  const description = control.plain_english_explanation || control.intent || control.description || 'No description available for this control.';
  const isLongDescription = description.length > 200;
  const isExpanded = expandedDescriptions[control.control_id];
  const displayDescription = (isLongDescription && !isExpanded) ? description.slice(0, 200) + '...' : description;

  const toggleExpand = (e) => {
    e.stopPropagation();
    onToggleExpansion && onToggleExpansion(control.control_id);
  };

  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-slate-200/50 dark:border-slate-800/50 ${isControlExpanded ? 'ring-2 ring-purple-500/20 shadow-2xl' : 'hover:shadow-xl'}`}>
      {/* Decorative gradient bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ color: familyColors.primary }}
      />

      <div className="p-6 cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-start gap-4">
          {/* Left side - Content */}
          <div className="flex-1 space-y-4">
            {/* Top badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Control ID Badge */}
              <Badge
                className="font-mono font-bold text-white shadow-lg"
                style={{ backgroundColor: familyColors.primary }}
              >
                {control.control_id.toUpperCase()}
              </Badge>

              {/* Family Badge */}
              <Badge
                variant="secondary"
                className="font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {family}
              </Badge>

              {/* Baseline Badges */}
              {baselineLevels.map((level, idx) => (
                <Badge
                  key={idx}
                  className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800"
                >
                  {level}
                </Badge>
              ))}

              {/* Scriptable indicator */}
              {hasScripts && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100/50 dark:bg-emerald-900/20">
                  <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Automated</span>
                </div>
              )}

              {/* Enhancements Badge */}
              {enhancements.length > 0 && (
                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                  {enhancements.length} Enhancements
                </Badge>
              )}
            </div>

            {/* Control Title */}
            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent leading-tight">
              {control.control_name}
            </h3>

            {/* Description */}
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {displayDescription}
              </p>
              {isLongDescription && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedDescriptions(prev => ({ ...prev, [control.control_id]: !isExpanded }));
                  }}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            {/* Action Links and Script Badges */}
            <div className="flex items-center gap-4 flex-wrap pt-2">
              {/* Action Buttons */}
              <Button
                variant={isControlExpanded ? "secondary" : "ghost"}
                size="sm"
                onClick={toggleExpand}
                className="h-8 px-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                {isControlExpanded ? 'Hide Details' : 'Details'}
              </Button>

              {!isControlExpanded && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleImplement && handleImplement(control); }}
                    className="h-8 px-3 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/20"
                  >
                    <Wrench className="h-3.5 w-3.5 mr-1.5" />
                    How to implement?
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDetails && handleDetails(control); }}
                    className="h-8 px-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Learn More
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </>
              )}

              {/* Script Format Badges */}
              {scriptFormats.length > 0 && <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />}
              {scriptFormats.map((format, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: `${format.color}15`,
                    color: format.color,
                  }}
                >
                  <Circle className="h-1.5 w-1.5" fill="currentColor" />
                  {format.name}
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(control.control_id); }}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                isFavorite
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-yellow-500 dark:hover:text-yellow-400"
              )}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={cn("h-5 w-5 transition-transform duration-200", isFavorite && "scale-110")}
                fill={isFavorite ? "currentColor" : "none"}
              />
            </button>

            <button
              onClick={toggleExpand}
              className={cn(
                "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200",
                isControlExpanded && "bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400"
              )}
              title={isControlExpanded ? 'Collapse' : 'Expand'}
            >
              {isControlExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-blue-500/0 to-indigo-500/0 group-hover:from-purple-500/5 group-hover:via-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-300 pointer-events-none rounded-xl" />

      {/* Expanded Details & Enhancements */}
      {isControlExpanded && (
        <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-200">
          
          {/* Embedded Control Details */}
          <ControlDetails
            control={control}
            allControls={allControls}
            embedded={true}
            isFavorite={isFavorite}
            onToggleFavorite={() => onToggleFavorite(control.control_id)}
          />
        </div>
      )}
    </Card>
  );
};

export default ControlCard;