"""
Coverage Analysis Module

Analyzes implementation coverage for NIST 800-53 controls across multiple sources.
Provides detailed reports on OpenSCAP, ComplianceAsCode, and custom implementation availability.

Key Features:
- Tier 1 control coverage analysis (30 critical controls)
- Multi-source coverage comparison
- Gap analysis and recommendations
- Platform-specific coverage reports
- Export capabilities for compliance reporting

Author: THE_DIDACT
Component: Phase 3 - Coverage Analysis
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

from services.openscap_integration import get_openscap_integration
from services.complianceascode_integration import get_cac_integration
from services.compliance_strategy import get_compliance_strategy, ImplementationSource
from services.baseline_service import get_baseline_service


# Configure logging
logger = logging.getLogger(__name__)


# NIST 800-53 Tier 1 Controls (30 critical controls from CISA)
TIER_1_CONTROLS = [
    # Access Control
    "AC-2", "AC-3", "AC-17", "AC-18", "AC-19", "AC-20",

    # Awareness and Training
    "AT-2", "AT-3",

    # Audit and Accountability
    "AU-2", "AU-3", "AU-6", "AU-12",

    # Configuration Management
    "CM-2", "CM-6", "CM-7", "CM-8",

    # Identification and Authentication
    "IA-2", "IA-4", "IA-5",

    # Incident Response
    "IR-4", "IR-5", "IR-6",

    # System and Communications Protection
    "SC-7", "SC-8", "SC-13",

    # System and Information Integrity
    "SI-2", "SI-3", "SI-4", "SI-5",

    # Risk Assessment
    "RA-5"
]


class CoverageLevel(str, Enum):
    """Coverage level classification."""
    FULL = "full"              # Multiple sources available
    PARTIAL = "partial"        # Single source available
    TEMPLATE = "template"      # Only template available
    NONE = "none"              # No implementation available


@dataclass
class ControlCoverage:
    """Coverage information for a single control."""
    control_id: str
    control_name: str
    family: str
    tier: int
    has_openscap: bool
    has_cac: bool
    has_custom: bool
    coverage_level: CoverageLevel
    recommended_source: ImplementationSource
    platforms_covered: List[str]
    formats_available: List[str]
    gap_notes: str
    metadata: Dict[str, Any]


class CoverageAnalyzer:
    """
    Comprehensive coverage analyzer for NIST 800-53 controls.

    Analyzes implementation availability across OpenSCAP, ComplianceAsCode,
    and custom baseline sources.
    """

    def __init__(self):
        """Initialize coverage analyzer."""
        self.openscap = get_openscap_integration()
        self.cac = get_cac_integration()
        self.strategy = get_compliance_strategy()
        self.baseline_service = get_baseline_service()

    def analyze_control_coverage(
        self,
        control_ids: Optional[List[str]] = None,
        platform: str = "rhel8"
    ) -> Dict[str, Any]:
        """
        Analyze coverage for list of controls.

        Args:
            control_ids: Optional list of control IDs (defaults to Tier 1)
            platform: Target platform for analysis

        Returns:
            Comprehensive coverage analysis report
        """
        if control_ids is None:
            control_ids = TIER_1_CONTROLS

        logger.info(f"Analyzing coverage for {len(control_ids)} controls on {platform}")

        # Analyze each control
        control_coverage = []
        for control_id in control_ids:
            coverage = self._analyze_single_control(control_id, platform)
            if coverage:
                control_coverage.append(coverage)

        # Generate summary statistics
        summary = self._generate_summary(control_coverage)

        # Generate gap analysis
        gaps = self._analyze_gaps(control_coverage)

        # Generate recommendations
        recommendations = self._generate_recommendations(control_coverage)

        return {
            "analysis_timestamp": datetime.now().isoformat(),
            "platform": platform,
            "total_controls_analyzed": len(control_ids),
            "summary": summary,
            "gap_analysis": gaps,
            "recommendations": recommendations,
            "detailed_coverage": [asdict(c) for c in control_coverage],
            "framework_availability": {
                "openscap": self.openscap.is_available(),
                "complianceascode": self.cac.is_available(),
                "custom_baseline": True
            }
        }

    def _analyze_single_control(
        self,
        control_id: str,
        platform: str
    ) -> Optional[ControlCoverage]:
        """
        Analyze coverage for a single control.

        Args:
            control_id: NIST control ID
            platform: Target platform

        Returns:
            ControlCoverage dataclass
        """
        try:
            # Normalize control ID
            control_id = control_id.upper().strip()

            # Get control metadata
            control = self.baseline_service.get_control_by_id(control_id.lower())
            if not control:
                logger.warning(f"Control {control_id} not found in baseline")
                return None

            # Check OpenSCAP coverage
            has_openscap = False
            if self.openscap.is_available():
                scap_info = self.openscap.get_scap_content_for_control(control_id, platform)
                has_openscap = scap_info is not None and scap_info.has_content

            # Check CaC coverage
            has_cac = False
            if self.cac.is_available():
                cac_info = self.cac.get_cac_content_for_control(control_id, platform)
                has_cac = cac_info is not None and cac_info.has_content

            # Check custom coverage
            has_custom = self._check_custom_coverage(control_id, platform)

            # Determine coverage level
            coverage_level = self._determine_coverage_level(
                has_openscap, has_cac, has_custom
            )

            # Get recommended source
            strategy = self.strategy.get_implementation_strategy(control_id, platform)
            recommended_source = self._strategy_to_source(strategy.value)

            # Get available platforms and formats
            platforms_covered = self._get_platforms_covered(control)
            formats_available = self._get_formats_available(control, platform)

            # Generate gap notes
            gap_notes = self._generate_gap_notes(
                has_openscap, has_cac, has_custom, coverage_level
            )

            # Determine tier (1 for Tier 1 controls, 2 for others)
            tier = 1 if control_id in TIER_1_CONTROLS else 2

            return ControlCoverage(
                control_id=control_id,
                control_name=control.get('control_name', 'Unknown'),
                family=control.get('family', 'Unknown'),
                tier=tier,
                has_openscap=has_openscap,
                has_cac=has_cac,
                has_custom=has_custom,
                coverage_level=coverage_level,
                recommended_source=recommended_source,
                platforms_covered=platforms_covered,
                formats_available=formats_available,
                gap_notes=gap_notes,
                metadata={
                    "baselines": control.get('baselines', []),
                    "priority": "high" if tier == 1 else "medium"
                }
            )

        except Exception as e:
            logger.error(f"Error analyzing control {control_id}: {e}")
            return None

    def _check_custom_coverage(self, control_id: str, platform: str) -> bool:
        """Check if custom implementation exists."""
        try:
            control = self.baseline_service.get_control_by_id(control_id.lower())
            if not control:
                return False

            impl_scripts = control.get('implementation_scripts', {})
            platform_scripts = impl_scripts.get(platform, {})

            # Check if any real script exists
            for script in platform_scripts.values():
                if script and script != "Not applicable" and len(script) > 50:
                    return True

            return False

        except Exception as e:
            logger.error(f"Error checking custom coverage: {e}")
            return False

    def _determine_coverage_level(
        self,
        has_openscap: bool,
        has_cac: bool,
        has_custom: bool
    ) -> CoverageLevel:
        """Determine overall coverage level."""
        source_count = sum([has_openscap, has_cac, has_custom])

        if source_count >= 2:
            return CoverageLevel.FULL
        elif source_count == 1:
            return CoverageLevel.PARTIAL
        else:
            return CoverageLevel.NONE

    def _strategy_to_source(self, strategy: str) -> ImplementationSource:
        """Convert strategy decision to source enum."""
        mapping = {
            "use_custom": ImplementationSource.CUSTOM,
            "use_openscap": ImplementationSource.OPENSCAP,
            "use_cac": ImplementationSource.COMPLIANCEASCODE,
            "generate_template": ImplementationSource.TEMPLATE,
            "not_applicable": ImplementationSource.UNAVAILABLE
        }
        return mapping.get(strategy, ImplementationSource.TEMPLATE)

    def _get_platforms_covered(self, control: Dict[str, Any]) -> List[str]:
        """Get list of platforms with coverage."""
        impl_scripts = control.get('implementation_scripts', {})
        return list(impl_scripts.keys())

    def _get_formats_available(
        self,
        control: Dict[str, Any],
        platform: str
    ) -> List[str]:
        """Get list of available script formats."""
        impl_scripts = control.get('implementation_scripts', {})
        platform_scripts = impl_scripts.get(platform, {})

        formats = []
        for format_key, script in platform_scripts.items():
            if script and script != "Not applicable":
                formats.append(format_key)

        return formats

    def _generate_gap_notes(
        self,
        has_openscap: bool,
        has_cac: bool,
        has_custom: bool,
        coverage_level: CoverageLevel
    ) -> str:
        """Generate gap analysis notes."""
        if coverage_level == CoverageLevel.FULL:
            return "Multiple implementation sources available - excellent coverage"
        elif coverage_level == CoverageLevel.PARTIAL:
            sources = []
            if has_openscap:
                sources.append("OpenSCAP")
            if has_cac:
                sources.append("ComplianceAsCode")
            if has_custom:
                sources.append("Custom")
            return f"Single source available: {', '.join(sources)}"
        else:
            return "No automated implementation available - manual implementation required"

    def _generate_summary(self, coverage_list: List[ControlCoverage]) -> Dict[str, Any]:
        """Generate summary statistics."""
        total = len(coverage_list)
        if total == 0:
            return {"error": "No controls analyzed"}

        # Count by coverage level
        coverage_counts = {
            CoverageLevel.FULL: 0,
            CoverageLevel.PARTIAL: 0,
            CoverageLevel.TEMPLATE: 0,
            CoverageLevel.NONE: 0
        }

        # Count by source
        openscap_count = 0
        cac_count = 0
        custom_count = 0

        for coverage in coverage_list:
            coverage_counts[coverage.coverage_level] += 1
            if coverage.has_openscap:
                openscap_count += 1
            if coverage.has_cac:
                cac_count += 1
            if coverage.has_custom:
                custom_count += 1

        return {
            "total_controls": total,
            "coverage_distribution": {
                "full_coverage": coverage_counts[CoverageLevel.FULL],
                "partial_coverage": coverage_counts[CoverageLevel.PARTIAL],
                "template_only": coverage_counts[CoverageLevel.TEMPLATE],
                "no_coverage": coverage_counts[CoverageLevel.NONE]
            },
            "source_availability": {
                "openscap": openscap_count,
                "complianceascode": cac_count,
                "custom": custom_count
            },
            "percentages": {
                "openscap_coverage": round((openscap_count / total * 100), 2),
                "cac_coverage": round((cac_count / total * 100), 2),
                "custom_coverage": round((custom_count / total * 100), 2),
                "full_coverage": round((coverage_counts[CoverageLevel.FULL] / total * 100), 2)
            }
        }

    def _analyze_gaps(self, coverage_list: List[ControlCoverage]) -> Dict[str, Any]:
        """Analyze implementation gaps."""
        gaps = {
            "critical_gaps": [],
            "moderate_gaps": [],
            "low_priority_gaps": []
        }

        for coverage in coverage_list:
            if coverage.coverage_level == CoverageLevel.NONE:
                gap_info = {
                    "control_id": coverage.control_id,
                    "control_name": coverage.control_name,
                    "family": coverage.family,
                    "notes": coverage.gap_notes
                }

                if coverage.tier == 1:
                    gaps["critical_gaps"].append(gap_info)
                else:
                    gaps["moderate_gaps"].append(gap_info)

            elif coverage.coverage_level == CoverageLevel.PARTIAL:
                gap_info = {
                    "control_id": coverage.control_id,
                    "control_name": coverage.control_name,
                    "available_sources": [],
                    "notes": "Consider adding additional implementation sources"
                }

                if coverage.has_openscap:
                    gap_info["available_sources"].append("OpenSCAP")
                if coverage.has_cac:
                    gap_info["available_sources"].append("ComplianceAsCode")
                if coverage.has_custom:
                    gap_info["available_sources"].append("Custom")

                gaps["low_priority_gaps"].append(gap_info)

        return {
            "critical_gaps_count": len(gaps["critical_gaps"]),
            "moderate_gaps_count": len(gaps["moderate_gaps"]),
            "low_priority_gaps_count": len(gaps["low_priority_gaps"]),
            "details": gaps
        }

    def _generate_recommendations(
        self,
        coverage_list: List[ControlCoverage]
    ) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []

        # Count gaps
        no_coverage = sum(1 for c in coverage_list if c.coverage_level == CoverageLevel.NONE)
        partial_coverage = sum(1 for c in coverage_list if c.coverage_level == CoverageLevel.PARTIAL)

        # OpenSCAP recommendations
        if not self.openscap.is_available():
            recommendations.append(
                "Install OpenSCAP Security Guide to access ~60% of control implementations"
            )

        # CaC recommendations
        if not self.cac.is_available():
            recommendations.append(
                "Clone ComplianceAsCode repository to access community-maintained implementations"
            )

        # Gap recommendations
        if no_coverage > 0:
            recommendations.append(
                f"{no_coverage} controls have no automated implementation - prioritize custom development"
            )

        if partial_coverage > 5:
            recommendations.append(
                f"{partial_coverage} controls have single-source coverage - consider adding redundant implementations"
            )

        # Tier 1 specific
        tier1_gaps = [c for c in coverage_list if c.tier == 1 and c.coverage_level == CoverageLevel.NONE]
        if tier1_gaps:
            recommendations.append(
                f"CRITICAL: {len(tier1_gaps)} Tier 1 controls lack automated implementation - immediate action required"
            )

        return recommendations


# Singleton instance
_analyzer_instance: Optional[CoverageAnalyzer] = None


def get_coverage_analyzer() -> CoverageAnalyzer:
    """
    Get singleton coverage analyzer instance.

    Returns:
        CoverageAnalyzer instance
    """
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = CoverageAnalyzer()
    return _analyzer_instance


def analyze_tier1_coverage(platform: str = "rhel8") -> Dict[str, Any]:
    """
    Convenience function to analyze Tier 1 control coverage.

    Args:
        platform: Target platform

    Returns:
        Coverage analysis for 30 Tier 1 controls
    """
    analyzer = get_coverage_analyzer()
    return analyzer.analyze_control_coverage(TIER_1_CONTROLS, platform)
