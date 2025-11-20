import React, { useState, useMemo, useCallback } from 'react';
import { Search, Star, ChevronDown, Filter, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import ControlCard from './ControlCard';
import ImplementationModal from './ImplementationModal';
import { getFamilyName, getFamilyColors } from '../utils/colors';

const ControlExplorer = ({ controls = [], onControlSelect, handleDetails }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [baselineFilter, setBaselineFilter] = useState(null);
  const [scriptableFilter, setScriptableFilter] = useState(null);
  const [showMoreFamilies, setShowMoreFamilies] = useState(false);
  const [implControl, setImplControl] = useState(null);
  const [expandedControls, setExpandedControls] = useState(new Set());

  const handleImplement = (control) => setImplControl(control);
  const closeImplement = () => setImplControl(null);

  const controlFamilies = useMemo(() => {
    const familyMap = new Map();
    controls.forEach(control => {
      const family = control.control_id.split('-')[0].toUpperCase().trim();
      if (!familyMap.has(family)) {
        familyMap.set(family, {
          id: family,
          name: getFamilyName(family),
          count: 0,
          colors: getFamilyColors(family)
        });
      }
      familyMap.get(family).count++;
    });
    return Array.from(familyMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [controls]);


  const filteredControls = useMemo(() => {
    // Filter out ALL enhancements - only show base controls
    let filtered = controls.filter(control => {
      const controlId = control.control_id.toLowerCase();
      // Enhancements use either dots (ac-2.1) or parentheses (au-2(1))
      return !controlId.includes('.') && !controlId.includes('(') && !controlId.includes(')');
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(control =>
        control.control_id.toLowerCase().includes(query) ||
        control.control_name.toLowerCase().includes(query) ||
        (control.plain_english_explanation && control.plain_english_explanation.toLowerCase().includes(query)) ||
        (control.description && control.description.toLowerCase().includes(query))
      );
    }

    if (selectedFamilies.size > 0) {
      filtered = filtered.filter(control => {
        const family = control.control_id.split('-')[0].toUpperCase().trim();
        return selectedFamilies.has(family);
      });
    }

    if (baselineFilter) {
      filtered = filtered.filter(control => {
        const baselines = control.baselines || {};
        if (baselineFilter === 'low') return baselines.low === true;
        if (baselineFilter === 'moderate') return baselines.moderate === true;
        if (baselineFilter === 'high') return baselines.high === true;
        return true;
      });
    }

    if (scriptableFilter !== null) {
      filtered = filtered.filter(control => {
        const hasScripts = control.implementation_scripts &&
          Object.keys(control.implementation_scripts).length > 0;
        return scriptableFilter ? hasScripts : !hasScripts;
      });
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(control => favorites.has(control.control_id));
    }

    return filtered;
  }, [controls, searchQuery, selectedFamilies, showFavoritesOnly, favorites, baselineFilter, scriptableFilter]);

  const toggleFavorite = (controlId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(controlId)) {
      newFavorites.delete(controlId);
    } else {
      newFavorites.add(controlId);
    }
    setFavorites(newFavorites);
  };

  const toggleFamily = (familyId) => {
    const newSet = new Set(selectedFamilies);
    if (newSet.has(familyId)) {
      newSet.delete(familyId);
    } else {
      newSet.add(familyId);
    }
    setSelectedFamilies(newSet);
  };

  const toggleControlExpansion = (controlId) => {
    const newSet = new Set(expandedControls);
    if (newSet.has(controlId)) {
      newSet.delete(controlId);
    } else {
      newSet.add(controlId);
    }
    setExpandedControls(newSet);
  };

  const getEnhancements = useCallback((baseControlId) => {
    // Get all enhancements for a base control (e.g., AU-2 -> AU-2.1, AU-2(1), etc.)
    const baseId = baseControlId.toLowerCase();
    return controls.filter(control => {
      const controlId = control.control_id.toLowerCase();
      // Check if this is an enhancement of the base control
      // Matches both dots (ac-2.1) and parentheses (au-2(1))
      return (
        (controlId.startsWith(baseId + '.')) ||
        (controlId.startsWith(baseId + '('))
      );
    });
  }, [controls]);

  if (!controls || controls.length === 0) {
    return (
      <>
        <ImplementationModal control={implControl} isOpen={!!implControl} onClose={closeImplement} />
        <div className="flex h-screen bg-background items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h3 className="text-lg font-medium">Loading Controls...</h3>
            <p className="text-sm text-muted-foreground">Fetching NIST 800-53 controls from server...</p>
          </div>
        </div>
      </>
    );
  }

  const visibleFamilies = showMoreFamilies ? controlFamilies : controlFamilies.slice(0, 6);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Left Sidebar */}
      <div className="relative z-10 w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 flex-shrink-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-8">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-slate-100 dark:via-purple-100 dark:to-slate-100 bg-clip-text text-transparent">
                  Control Explorer
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">NIST SP 800-53 Rev 5</p>
            </div>

            <Separator />

            {/* Family Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Family
              </h3>
              <div className="space-y-1">
                {visibleFamilies.map(family => (
                  <button
                    key={family.id}
                    onClick={() => toggleFamily(family.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden border-l-4",
                      selectedFamilies.has(family.id)
                        ? "text-white dark:text-slate-900 shadow-lg"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                    )}
                    style={{
                      borderLeftColor: family.colors.primary,
                      ...(selectedFamilies.has(family.id) ? {
                        backgroundColor: family.colors.primary
                      } : {})
                    }}
                  >
                    {selectedFamilies.has(family.id) && (
                      <div className="absolute inset-0 opacity-20 animate-pulse" style={{ backgroundColor: family.colors.light }} />
                    )}
                    <span className="relative flex items-center justify-between">
                      <span className="font-mono font-bold flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: family.colors.primary }}
                        />
                        {family.id}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                        style={selectedFamilies.has(family.id) ? {
                          backgroundColor: family.colors.dark,
                          color: 'white'
                        } : {
                          backgroundColor: family.colors.light,
                          color: family.colors.dark,
                          border: `1px solid ${family.colors.primary}`
                        }}
                      >
                        {family.count}
                      </Badge>
                    </span>
                  </button>
                ))}
                {controlFamilies.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMoreFamilies(!showMoreFamilies)}
                    className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn("h-4 w-4 mr-2 transition-transform", showMoreFamilies && "rotate-180")} />
                    {showMoreFamilies ? 'Show less' : 'Show more'}
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Baseline Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80">Baseline</h3>
              <div className="space-y-1">
                {['low', 'moderate', 'high'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setBaselineFilter(baselineFilter === level ? null : level)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      baselineFilter === level
                        ? "bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-900 dark:text-amber-100 shadow-md"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <span className="capitalize">{level}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Scriptable Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80">Scriptable</h3>
              <div className="space-y-1">
                {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setScriptableFilter(scriptableFilter === option.value ? null : option.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      scriptableFilter === option.value
                        ? "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-900 dark:text-green-100 shadow-md"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Favorites Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80">Favorites</h3>
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  showFavoritesOnly
                    ? "bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-900 dark:text-yellow-100 shadow-md"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                )}
              >
                <Star className="h-4 w-4" fill={showFavoritesOnly ? "currentColor" : "none"} />
                Show favorites only
              </button>
              <div className="px-3 py-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                <p className="text-xs text-muted-foreground">
                  {favorites.size === 0 ? 'No favorites yet' : `${favorites.size} favorite${favorites.size !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1">
        <ScrollArea className="h-full">
          <div className="max-w-6xl mx-auto p-8 space-y-6">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search controls by ID, name, or description..."
                  className="pl-12 pr-4 py-6 text-base bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-slate-200 dark:border-slate-800 focus-visible:ring-purple-600 dark:focus-visible:ring-purple-400 rounded-xl shadow-lg shadow-slate-900/5"
                />
              </div>

              {/* Active Filters */}
              {(baselineFilter || scriptableFilter !== null || showFavoritesOnly || selectedFamilies.size > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {baselineFilter && (
                    <Badge variant="secondary" className="capitalize">
                      {baselineFilter} baseline
                    </Badge>
                  )}
                  {scriptableFilter !== null && (
                    <Badge variant="secondary">
                      Scriptable: {scriptableFilter ? 'Yes' : 'No'}
                    </Badge>
                  )}
                  {showFavoritesOnly && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3" fill="currentColor" />
                      Favorites
                    </Badge>
                  )}
                  {selectedFamilies.size > 0 && (
                    <Badge variant="secondary">
                      {selectedFamilies.size} {selectedFamilies.size === 1 ? 'family' : 'families'}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Results Count */}
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-slate-100 dark:via-purple-100 dark:to-slate-100 bg-clip-text text-transparent">
                {filteredControls.length} {filteredControls.length === 1 ? 'control' : 'controls'} found
              </h2>
            </div>

            {/* Controls List */}
            <div className="space-y-4">
              {filteredControls.map(control => (
                <ControlCard
                  key={control.control_id}
                  control={control}
                  allControls={controls}
                  isFavorite={favorites.has(control.control_id)}
                  onToggleFavorite={toggleFavorite}
                  expandedDescriptions={expandedDescriptions}
                  setExpandedDescriptions={setExpandedDescriptions}
                  handleDetails={handleDetails}
                  handleImplement={handleImplement}
                  getFamilyColors={getFamilyColors}
                  enhancements={getEnhancements(control.control_id)}
                  isControlExpanded={expandedControls.has(control.control_id)}
                  onToggleExpansion={toggleControlExpansion}
                />
              ))}
            </div>

            {/* Empty State */}
            {filteredControls.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl flex items-center justify-center">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">No controls found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search or filters to find what you're looking for
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFamilies(new Set());
                    setBaselineFilter(null);
                    setScriptableFilter(null);
                    setShowFavoritesOnly(false);
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <ImplementationModal control={implControl} isOpen={!!implControl} onClose={closeImplement} />
    </div>
  );
};

export default ControlExplorer;
