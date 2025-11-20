import React, { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * ControlSpine - Vertical navigation timeline for NIST control families
 *
 * Sleek Design: Apple/Scale.ai inspired minimal elegance
 * Features:
 * - Clean, refined sidebar with subtle family colors
 * - Active section indicator using Intersection Observer
 * - Click to smooth scroll to family section
 * - Minimal badges and refined typography
 * - Hidden on mobile, replaced by dropdown
 * - Professional, elegant aesthetic
 */
const ControlSpine = ({ controls = [], activeFamily, onFamilyClick }) => {
  const [localActiveFamily, setLocalActiveFamily] = useState('');

  // Family color gradients matching ControlExplorer design
  const getFamilyGradient = useCallback((familyId) => {
    const gradients = {
      AC: 'from-blue-500 to-blue-600',
      AU: 'from-emerald-500 to-emerald-600',
      AT: 'from-orange-400 to-orange-500',
      CM: 'from-fuchsia-600 to-fuchsia-700',
      CP: 'from-rose-500 to-rose-600',
      IA: 'from-sky-500 to-sky-600',
      IR: 'from-rose-400 to-rose-500',
      MA: 'from-indigo-500 to-indigo-600',
      MP: 'from-amber-400 to-amber-500',
      PE: 'from-emerald-400 to-emerald-500',
      PL: 'from-violet-500 to-violet-600',
      PS: 'from-yellow-500 to-yellow-600',
      RA: 'from-violet-600 to-violet-700',
      SA: 'from-blue-400 to-blue-500',
      SC: 'from-teal-600 to-teal-700',
      SI: 'from-pink-600 to-pink-700',
      SR: 'from-red-400 to-red-500',
      PM: 'from-slate-500 to-slate-600',
      CA: 'from-pink-400 to-pink-500',
      PT: 'from-cyan-500 to-cyan-600',
    };
    return gradients[familyId] || 'from-slate-500 to-slate-600';
  }, []);

  // Extract unique families with counts from controls
  const families = useMemo(() => {
    const familyMap = new Map();

    controls.forEach(control => {
      // Extract family ID from control_id (e.g., "AC" from "ac-1")
      const family = control.control_id.split('-')[0].toUpperCase().trim();

      if (!familyMap.has(family)) {
        familyMap.set(family, {
          id: family,
          name: getFamilyName(family),
          count: 0
        });
      }

      familyMap.get(family).count++;
    });

    // Sort alphabetically by family ID
    return Array.from(familyMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [controls]);

  // Family names mapping
  function getFamilyName(familyId) {
    const familyNames = {
      'AC': 'Access Control',
      'AT': 'Awareness and Training',
      'AU': 'Audit and Accountability',
      'CA': 'Security Assessment and Authorization',
      'CM': 'Configuration Management',
      'CP': 'Contingency Planning',
      'IA': 'Identification and Authentication',
      'IR': 'Incident Response',
      'MA': 'Maintenance',
      'MP': 'Media Protection',
      'PE': 'Physical and Environmental Protection',
      'PL': 'Planning',
      'PM': 'Program Management',
      'PS': 'Personnel Security',
      'PT': 'PII Processing and Transparency',
      'RA': 'Risk Assessment',
      'SA': 'System and Services Acquisition',
      'SC': 'System and Communications Protection',
      'SI': 'System and Information Integrity',
      'SR': 'Supply Chain Risk Management'
    };
    return familyNames[familyId] || familyId;
  }

  // Use prop activeFamily if provided, otherwise use local state
  const currentActiveFamily = activeFamily || localActiveFamily;

  // Setup Intersection Observer to detect visible sections
  useEffect(() => {
    // Only observe if we're not controlling from parent
    if (activeFamily !== undefined) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const family = entry.target.getAttribute('data-family');
            if (family) {
              setLocalActiveFamily(family);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      }
    );

    // Observe all family sections
    const sections = document.querySelectorAll('[data-family]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [activeFamily]);

  // Handle family click - scroll to section
  const handleFamilyClick = (familyId) => {
    if (onFamilyClick) {
      onFamilyClick(familyId);
    } else {
      // Default scroll behavior
      const section = document.querySelector(`[data-family="${familyId}"]`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  if (families.length === 0) return null;

  return (
    <nav
      className="fixed left-0 top-0 h-screen w-20 bg-black
                 border-r border-white/5 z-50 hidden md:flex flex-col"
      aria-label="Control family navigation"
    >
      {/* Family nodes - scrollable container */}
      <div className="relative flex flex-col items-center gap-6 py-6 overflow-y-auto overflow-x-hidden flex-1 overscroll-contain
                      [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {families.map((family, index) => {
          const isActive = currentActiveFamily === family.id;
          const gradientClass = getFamilyGradient(family.id);

          return (
            <div key={family.id} className="relative flex flex-col items-center">
              {/* Connecting line segment BEFORE this node (except for first node) */}
              {index > 0 && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-full w-1 bg-white/90"
                  style={{ height: '24px' }}
                  aria-hidden="true"
                />
              )}

              <button
                onClick={() => handleFamilyClick(family.id)}
                className="relative group flex flex-col items-center transition-all duration-200 ease-out"
                aria-label={`Navigate to ${family.name} (${family.count} controls)`}
                aria-current={isActive ? 'location' : undefined}
                title={`${family.id}: ${family.name} (${family.count})`}
              >
                {/* Node container - circular minimal design with family colors */}
                <div className={`
                  relative flex items-center justify-center
                  w-8 h-8 rounded-full transition-all duration-200 ease-out
                  bg-gradient-to-br ${gradientClass} shadow-lg
                  ${isActive
                    ? 'opacity-100 border-transparent scale-105'
                    : 'opacity-40 hover:opacity-70 border border-white/10 hover:border-white/20'
                  }
                `}>
                  {/* Family ID text - clean and minimal */}
                  <div className="text-[11px] font-semibold tracking-wider pointer-events-none text-white">
                    {family.id}
                  </div>
                </div>

                {/* Tooltip on hover - refined */}
                <div className="
                  absolute left-full ml-3 px-3 py-2 bg-black/90
                  border border-white/10 rounded-md shadow-2xl
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-150 whitespace-nowrap z-50
                ">
                  <div className="text-[11px] font-medium text-white/90">{family.name}</div>
                  <div className="text-[10px] text-white/50 mt-1">{family.count} controls</div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default ControlSpine;
