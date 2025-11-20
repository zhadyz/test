"""
Hybrid Compliance Strategy Module

Intelligent routing between OpenSCAP, ComplianceAsCode, and custom implementations.
Provides adaptive selection of optimal implementation source based on availability,
quality, and control characteristics.

Key Features:
- Multi-source strategy selection (OpenSCAP > ComplianceAsCode > Custom)
- Intelligent fallback mechanisms
- Quality scoring for implementation sources
- Performance caching for strategy decisions
- Comprehensive audit logging

Author: THE_DIDACT
Component: Phase 3 - Hybrid Strategy Integration
"""

import logging
from typing import Optional, Dict, List, Any, Tuple
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

from services.openscap_integration import (
    get_openscap_integration,
    OpenSCAPIntegration,
    SCAPContentInfo
)
from services.complianceascode_integration import (
    get_cac_integration,
    ComplianceAsCodeIntegration,
    CaCContentInfo
)
from services.baseline_service import get_baseline_service


# Configure logging
logger = logging.getLogger(__name__)


class ImplementationSource(str, Enum):
    """Source of implementation content."""
    OPENSCAP = "openscap"
    COMPLIANCEASCODE = "complianceascode"
    CUSTOM = "custom"
    TEMPLATE = "template"
    UNAVAILABLE = "unavailable"


class StrategyDecision(str, Enum):
    """Strategy selection decision."""
    USE_OPENSCAP = "use_openscap"
    USE_CAC = "use_cac"
    USE_CUSTOM = "use_custom"
    GENERATE_TEMPLATE = "generate_template"
    NOT_APPLICABLE = "not_applicable"


@dataclass
class ImplementationResult:
    """Result of hybrid implementation strategy."""
    control_id: str
    platform: str
    format: str
    script: str
    source: ImplementationSource
    strategy: StrategyDecision
    quality_score: float
    metadata: Dict[str, Any]
    fallback_used: bool = False
    generation_time_ms: int = 0


class ComplianceStrategy:
    """
    Hybrid compliance strategy with intelligent source selection.

    Implements adaptive routing between multiple implementation sources
    with quality scoring, caching, and comprehensive fallback mechanisms.
    """

    # Quality weights for scoring
    QUALITY_WEIGHTS = {
        "framework_authority": 0.4,    # OpenSCAP/CaC are authoritative
        "completeness": 0.3,            # Full vs partial implementation
        "platform_specificity": 0.2,    # Platform-optimized content
        "recency": 0.1,                 # Updated content preferred
    }

    # Priority order for sources
    SOURCE_PRIORITY = [
        ImplementationSource.CUSTOM,           # User-customized highest priority
        ImplementationSource.OPENSCAP,         # SCAP content second
        ImplementationSource.COMPLIANCEASCODE, # CaC third
        ImplementationSource.TEMPLATE,         # Generated fallback
    ]

    # Control families unlikely to have technical implementations
    POLICY_ONLY_FAMILIES = {
        'PL', 'PS', 'PM', 'AT', 'CP', 'IR', 'MA', 'PE', 'RA', 'CA', 'SA'
    }

    def __init__(self):
        """Initialize hybrid compliance strategy."""
        self.openscap = get_openscap_integration()
        self.cac = get_cac_integration()
        self.baseline_service = get_baseline_service()
        self.strategy_cache = {}
        self.audit_log = []

    def _is_technical_control(self, control_id: str) -> bool:
        """
        Determine if control is technical (has automated implementation).

        Args:
            control_id: NIST control ID

        Returns:
            True if technical control
        """
        family = control_id.split('-')[0].upper()
        return family not in self.POLICY_ONLY_FAMILIES

    def _is_policy_only_control(self, control_id: str) -> bool:
        """Check if control is policy/administrative only."""
        return not self._is_technical_control(control_id)

    def get_implementation_strategy(
        self,
        control_id: str,
        platform: str = "rhel8"
    ) -> StrategyDecision:
        """
        Determine optimal implementation source for control.

        Priority hierarchy:
        1. Check if custom implementation exists
        2. Check OpenSCAP content availability
        3. Check ComplianceAsCode availability
        4. Fall back to template generation

        Args:
            control_id: NIST control ID
            platform: Target platform

        Returns:
            StrategyDecision enum value
        """
        # Normalize control ID
        control_id = control_id.upper().strip()

        # Cache check
        cache_key = f"{control_id}:{platform}"
        if cache_key in self.strategy_cache:
            return self.strategy_cache[cache_key]

        # Check if policy-only control (no technical implementation)
        if self._is_policy_only_control(control_id):
            strategy = StrategyDecision.NOT_APPLICABLE
            self.strategy_cache[cache_key] = strategy
            return strategy

        # 1. Check custom implementation
        if self._custom_impl_exists(control_id, platform):
            strategy = StrategyDecision.USE_CUSTOM
            logger.debug(f"{control_id}: Using custom implementation")
        # 2. Check OpenSCAP
        elif self._openscap_has_content(control_id, platform):
            strategy = StrategyDecision.USE_OPENSCAP
            logger.debug(f"{control_id}: Using OpenSCAP content")
        # 3. Check ComplianceAsCode
        elif self._cac_has_content(control_id, platform):
            strategy = StrategyDecision.USE_CAC
            logger.debug(f"{control_id}: Using ComplianceAsCode")
        # 4. Fallback to template
        else:
            strategy = StrategyDecision.GENERATE_TEMPLATE
            logger.debug(f"{control_id}: Falling back to template generation")

        # Cache strategy
        self.strategy_cache[cache_key] = strategy
        return strategy

    def _custom_impl_exists(self, control_id: str, platform: str) -> bool:
        """
        Check if custom implementation exists in baseline service.

        Args:
            control_id: NIST control ID
            platform: Target platform

        Returns:
            True if custom implementation available
        """
        try:
            control = self.baseline_service.get_control_by_id(control_id.lower())
            if not control:
                return False

            impl_scripts = control.get('implementation_scripts', {})
            platform_scripts = impl_scripts.get(platform, {})

            # Check if any real script exists (not "Not applicable")
            for format_key, script in platform_scripts.items():
                if script and script != "Not applicable" and len(script) > 50:
                    return True

            return False

        except Exception as e:
            logger.error(f"Error checking custom implementation: {e}")
            return False

    def _openscap_has_content(self, control_id: str, platform: str) -> bool:
        """
        Check if OpenSCAP has content for control.

        Args:
            control_id: NIST control ID
            platform: Target platform

        Returns:
            True if OpenSCAP content available
        """
        try:
            content_info = self.openscap.get_scap_content_for_control(
                control_id, platform
            )
            return content_info is not None and content_info.has_content
        except Exception as e:
            logger.error(f"Error checking OpenSCAP content: {e}")
            return False

    def _cac_has_content(self, control_id: str, platform: str = "rhel8") -> bool:
        """
        Check if ComplianceAsCode has content for control.

        Args:
            control_id: NIST control ID
            platform: Target platform

        Returns:
            True if CaC content available
        """
        try:
            content_info = self.cac.get_cac_content_for_control(
                control_id, platform
            )
            return content_info is not None and content_info.has_content
        except Exception as e:
            logger.error(f"Error checking CaC content: {e}")
            return False

    def generate_script_hybrid(
        self,
        control_id: str,
        platform: str = "rhel8",
        format: str = "bash"
    ) -> ImplementationResult:
        """
        Generate implementation script using optimal hybrid strategy.

        Args:
            control_id: NIST control ID
            platform: Target platform (rhel8, ubuntu2004, etc.)
            format: Script format (bash, ansible, etc.)

        Returns:
            ImplementationResult with script and metadata
        """
        start_time = datetime.now()

        # Normalize inputs
        control_id = control_id.upper().strip()

        # Determine strategy
        strategy = self.get_implementation_strategy(control_id, platform)

        # Execute strategy
        result = None
        fallback_used = False

        try:
            if strategy == StrategyDecision.USE_CUSTOM:
                result = self._generate_from_custom(control_id, platform, format)

            elif strategy == StrategyDecision.USE_OPENSCAP:
                result = self._generate_from_openscap(control_id, platform, format)
                if not result:
                    # Fallback to CaC
                    logger.info(f"{control_id}: OpenSCAP failed, trying CaC")
                    result = self._generate_from_cac(control_id, platform, format)
                    fallback_used = True

            elif strategy == StrategyDecision.USE_CAC:
                result = self._generate_from_cac(control_id, platform, format)
                if not result:
                    # Fallback to template
                    logger.info(f"{control_id}: CaC failed, using template")
                    result = self._generate_from_template(control_id, platform, format)
                    fallback_used = True

            elif strategy == StrategyDecision.GENERATE_TEMPLATE:
                result = self._generate_from_template(control_id, platform, format)

            else:  # NOT_APPLICABLE
                result = self._generate_not_applicable(control_id, platform, format)

        except Exception as e:
            logger.error(f"Error generating script for {control_id}: {e}")
            # Ultimate fallback
            result = self._generate_from_template(control_id, platform, format)
            fallback_used = True

        # Calculate generation time
        end_time = datetime.now()
        generation_time_ms = int((end_time - start_time).total_seconds() * 1000)

        if result:
            result.generation_time_ms = generation_time_ms
            result.fallback_used = fallback_used

            # Audit log
            self._log_generation(result)

        return result

    def _generate_from_custom(
        self,
        control_id: str,
        platform: str,
        format: str
    ) -> Optional[ImplementationResult]:
        """Generate from custom baseline service implementation."""
        try:
            control = self.baseline_service.get_control_by_id(control_id.lower())
            if not control:
                return None

            impl_scripts = control.get('implementation_scripts', {})
            platform_scripts = impl_scripts.get(platform, {})
            script = platform_scripts.get(format)

            if not script or script == "Not applicable":
                return None

            return ImplementationResult(
                control_id=control_id,
                platform=platform,
                format=format,
                script=script,
                source=ImplementationSource.CUSTOM,
                strategy=StrategyDecision.USE_CUSTOM,
                quality_score=0.95,  # Custom implementations highest quality
                metadata={
                    "control_name": control.get('control_name'),
                    "family": control.get('family'),
                    "source_type": "baseline_service"
                }
            )

        except Exception as e:
            logger.error(f"Error generating from custom: {e}")
            return None

    def _generate_from_openscap(
        self,
        control_id: str,
        platform: str,
        format: str
    ) -> Optional[ImplementationResult]:
        """Generate from OpenSCAP SCAP content."""
        try:
            script = self.openscap.generate_remediation_from_scap(
                control_id, platform, format
            )

            if not script:
                return None

            content_info = self.openscap.get_scap_content_for_control(
                control_id, platform
            )

            return ImplementationResult(
                control_id=control_id,
                platform=platform,
                format=format,
                script=script,
                source=ImplementationSource.OPENSCAP,
                strategy=StrategyDecision.USE_OPENSCAP,
                quality_score=0.85,  # High authority, standardized
                metadata={
                    "rule_count": len(content_info.rule_ids) if content_info else 0,
                    "scap_rules": content_info.rule_ids[:3] if content_info else [],
                    "framework": "OpenSCAP Security Guide"
                }
            )

        except Exception as e:
            logger.error(f"Error generating from OpenSCAP: {e}")
            return None

    def _generate_from_cac(
        self,
        control_id: str,
        platform: str,
        format: str
    ) -> Optional[ImplementationResult]:
        """Generate from ComplianceAsCode content."""
        try:
            content_info = self.cac.get_cac_content_for_control(control_id, platform)
            if not content_info or not content_info.has_content:
                return None

            # Adapt CaC content to script format
            cac_content = {
                "control_id": control_id,
                "rule_id": content_info.rule_ids[0] if content_info.rule_ids else None
            }

            script = self.cac.adapt_cac_to_script(cac_content, platform, format)
            if not script:
                return None

            return ImplementationResult(
                control_id=control_id,
                platform=platform,
                format=format,
                script=script,
                source=ImplementationSource.COMPLIANCEASCODE,
                strategy=StrategyDecision.USE_CAC,
                quality_score=0.80,  # High quality, community-maintained
                metadata={
                    "rule_count": len(content_info.rule_ids),
                    "cac_rules": content_info.rule_ids[:3],
                    "remediation_formats": content_info.remediation_available,
                    "framework": "ComplianceAsCode"
                }
            )

        except Exception as e:
            logger.error(f"Error generating from CaC: {e}")
            return None

    def _generate_from_template(
        self,
        control_id: str,
        platform: str,
        format: str
    ) -> ImplementationResult:
        """Generate generic template when no framework content available."""
        # Get control metadata
        control = self.baseline_service.get_control_by_id(control_id.lower())

        control_name = control.get('control_name', 'Unknown') if control else 'Unknown'

        # Generate placeholder script
        if format == "ansible":
            script = f"""---
# Generic Implementation Template
# Control: {control_id} - {control_name}
# Platform: {platform}
# NOTE: This is a template - requires customization

- name: Implement {control_id} - {control_name}
  block:
    - name: Placeholder task
      debug:
        msg: "Manual implementation required for {control_id}"

    # TODO: Add specific implementation tasks
"""
        else:  # bash
            script = f"""#!/bin/bash
# Generic Implementation Template
# Control: {control_id} - {control_name}
# Platform: {platform}
# NOTE: This is a template - requires customization

echo "Manual implementation required for {control_id}"

# TODO: Add specific implementation steps
"""

        return ImplementationResult(
            control_id=control_id,
            platform=platform,
            format=format,
            script=script,
            source=ImplementationSource.TEMPLATE,
            strategy=StrategyDecision.GENERATE_TEMPLATE,
            quality_score=0.20,  # Low quality - manual work needed
            metadata={
                "control_name": control_name,
                "warning": "Template requires manual customization",
                "framework": "generated_template"
            }
        )

    def _generate_not_applicable(
        self,
        control_id: str,
        platform: str,
        format: str
    ) -> ImplementationResult:
        """Generate response for policy-only controls."""
        control = self.baseline_service.get_control_by_id(control_id.lower())
        control_name = control.get('control_name', 'Unknown') if control else 'Unknown'

        message = f"""
# Control {control_id} - {control_name}
# Status: Not Applicable for Technical Implementation

This control requires organizational policy and procedures
rather than automated technical implementation.

Recommended Actions:
1. Develop organizational policy documents
2. Establish procedures and workflows
3. Conduct training and awareness programs
4. Document compliance evidence

Refer to NIST SP 800-53 for detailed guidance.
"""

        return ImplementationResult(
            control_id=control_id,
            platform=platform,
            format=format,
            script=message,
            source=ImplementationSource.UNAVAILABLE,
            strategy=StrategyDecision.NOT_APPLICABLE,
            quality_score=0.0,
            metadata={
                "control_name": control_name,
                "category": "policy-only",
                "reason": "Requires organizational procedures, not technical implementation"
            }
        )

    def _log_generation(self, result: ImplementationResult):
        """Log generation event for analytics."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "control_id": result.control_id,
            "source": result.source.value,
            "strategy": result.strategy.value,
            "quality_score": result.quality_score,
            "generation_time_ms": result.generation_time_ms,
            "fallback_used": result.fallback_used
        }
        self.audit_log.append(log_entry)

        # Keep only last 1000 entries
        if len(self.audit_log) > 1000:
            self.audit_log = self.audit_log[-1000:]

    def get_analytics(self) -> Dict[str, Any]:
        """Get strategy analytics from audit log."""
        if not self.audit_log:
            return {"message": "No analytics data available"}

        total = len(self.audit_log)
        source_counts = {}
        avg_time = 0
        fallback_count = 0

        for entry in self.audit_log:
            source = entry["source"]
            source_counts[source] = source_counts.get(source, 0) + 1
            avg_time += entry["generation_time_ms"]
            if entry["fallback_used"]:
                fallback_count += 1

        avg_time = avg_time / total if total > 0 else 0

        return {
            "total_generations": total,
            "source_distribution": source_counts,
            "average_generation_time_ms": round(avg_time, 2),
            "fallback_usage_count": fallback_count,
            "fallback_percentage": round((fallback_count / total * 100), 2) if total > 0 else 0
        }


# Singleton instance
_strategy_instance: Optional[ComplianceStrategy] = None


def get_compliance_strategy() -> ComplianceStrategy:
    """
    Get singleton compliance strategy instance.

    Returns:
        ComplianceStrategy instance
    """
    global _strategy_instance
    if _strategy_instance is None:
        _strategy_instance = ComplianceStrategy()
    return _strategy_instance
