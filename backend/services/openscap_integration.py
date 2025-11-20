"""
OpenSCAP Integration Module

Integrates OpenSCAP Security Guide (SSG) SCAP content for NIST 800-53 control implementations.
Provides query capabilities, remediation script generation, and control-to-rule mapping.

Key Features:
- Query SCAP content for specific controls
- Generate remediation scripts (Ansible/Bash) from SCAP profiles
- Map NIST controls to SCAP rule IDs
- Support multiple security profiles (CUI, MODERATE, HIGH)
- Graceful fallback when SCAP content unavailable

Author: THE_DIDACT
Component: Phase 3 - OpenSCAP Integration
"""

import os
import subprocess
import json
import re
import logging
from typing import Optional, Dict, List, Any
from pathlib import Path
from dataclasses import dataclass
from enum import Enum


# Configure logging
logger = logging.getLogger(__name__)


class SCAPProfile(str, Enum):
    """SCAP Security Profiles aligned with NIST 800-171 and FISMA."""
    CUI = "cui"                    # NIST 800-171 CUI
    MODERATE = "moderate"           # FISMA Moderate (NIST 800-53)
    HIGH = "high"                   # FISMA High
    OSPP = "ospp"                   # OS Protection Profile


class Platform(str, Enum):
    """Supported platforms for SCAP content."""
    RHEL8 = "rhel8"
    RHEL9 = "rhel9"
    UBUNTU20 = "ubuntu2004"
    UBUNTU22 = "ubuntu2204"
    FEDORA = "fedora"
    DEBIAN = "debian"
    WINDOWS = "windows"
    MACOS = "macos"


@dataclass
class SCAPContentInfo:
    """Metadata about available SCAP content for a control."""
    control_id: str
    platform: str
    has_content: bool
    rule_ids: List[str]
    profile_applicability: List[str]
    content_path: Optional[str] = None
    metadata: Dict[str, Any] = None


class OpenSCAPIntegration:
    """
    OpenSCAP integration for NIST 800-53 control implementations.

    Provides intelligent querying of SCAP Security Guide content,
    remediation script generation, and control-to-rule mapping.
    """

    # Common SCAP content locations (standard installations)
    SCAP_CONTENT_PATHS = [
        Path("/usr/share/xml/scap/ssg/content"),           # RHEL/Fedora
        Path("/usr/share/scap-security-guide/content"),    # Ubuntu/Debian
        Path("C:/Program Files/SCAP/content"),             # Windows
        Path.home() / ".local/share/scap/content",         # User install
        Path("./scap_content"),                             # Local development
    ]

    # NIST control family prefixes for intelligent categorization
    TECHNICAL_FAMILIES = {
        'AC', 'AU', 'IA', 'SC', 'SI', 'CM'
    }

    def __init__(self, scap_content_dir: Optional[str] = None):
        """
        Initialize OpenSCAP integration.

        Args:
            scap_content_dir: Optional custom SCAP content directory path
        """
        self.scap_content_dir = self._locate_scap_content(scap_content_dir)
        self.cache = {}  # Simple in-memory cache for content queries

        if self.scap_content_dir:
            logger.info(f"OpenSCAP content found at: {self.scap_content_dir}")
        else:
            logger.warning("OpenSCAP content not found - operating in fallback mode")

    def _locate_scap_content(self, custom_path: Optional[str] = None) -> Optional[Path]:
        """
        Locate SCAP content directory.

        Args:
            custom_path: Optional custom directory path

        Returns:
            Path to SCAP content directory if found, None otherwise
        """
        if custom_path:
            path = Path(custom_path)
            if path.exists():
                return path

        for path in self.SCAP_CONTENT_PATHS:
            if path.exists() and path.is_dir():
                return path

        return None

    def is_available(self) -> bool:
        """Check if OpenSCAP content is available."""
        return self.scap_content_dir is not None

    def _is_technical_control(self, control_id: str) -> bool:
        """
        Determine if control is technical (likely to have SCAP content).

        Args:
            control_id: NIST control ID (e.g., "AC-2", "PL-1")

        Returns:
            True if control is technical, False if policy/administrative
        """
        family = control_id.split('-')[0].upper()
        return family in self.TECHNICAL_FAMILIES

    def get_scap_content_for_control(
        self,
        control_id: str,
        platform: str = "rhel8"
    ) -> Optional[SCAPContentInfo]:
        """
        Query available SCAP content for a specific control.

        Args:
            control_id: NIST control ID (e.g., "AC-2", "au-2")
            platform: Target platform (rhel8, ubuntu2004, etc.)

        Returns:
            SCAPContentInfo if content found, None otherwise
        """
        # Normalize control ID
        control_id = control_id.upper().strip()

        # Cache check
        cache_key = f"{control_id}:{platform}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        # Quick check: Non-technical controls unlikely to have SCAP content
        if not self._is_technical_control(control_id):
            logger.debug(f"{control_id} is policy/administrative - no SCAP content expected")
            return None

        # If SCAP content not available, return None
        if not self.is_available():
            return None

        # Search for platform-specific content file
        content_file = self._find_platform_content_file(platform)
        if not content_file:
            logger.warning(f"No SCAP content file found for platform: {platform}")
            return None

        # Parse XCCDF to find rules for this control
        rule_ids = self._extract_rules_for_control(content_file, control_id)

        if not rule_ids:
            logger.debug(f"No SCAP rules found for {control_id} on {platform}")
            return None

        # Determine applicable profiles
        profiles = self._determine_applicable_profiles(content_file, rule_ids)

        info = SCAPContentInfo(
            control_id=control_id,
            platform=platform,
            has_content=True,
            rule_ids=rule_ids,
            profile_applicability=profiles,
            content_path=str(content_file),
            metadata={
                "rule_count": len(rule_ids),
                "content_file": content_file.name
            }
        )

        # Cache result
        self.cache[cache_key] = info
        return info

    def _find_platform_content_file(self, platform: str) -> Optional[Path]:
        """
        Find XCCDF content file for platform.

        Args:
            platform: Target platform string

        Returns:
            Path to content file if found
        """
        if not self.scap_content_dir:
            return None

        # Common naming patterns for SSG content files
        patterns = [
            f"ssg-{platform}-ds.xml",
            f"ssg-{platform}-xccdf.xml",
            f"{platform}-ds.xml",
        ]

        for pattern in patterns:
            content_file = self.scap_content_dir / pattern
            if content_file.exists():
                return content_file

        return None

    def _extract_rules_for_control(
        self,
        content_file: Path,
        control_id: str
    ) -> List[str]:
        """
        Extract SCAP rule IDs for a NIST control from XCCDF.

        This is a simplified extraction - production would use XML parsing.

        Args:
            content_file: Path to XCCDF file
            control_id: NIST control ID

        Returns:
            List of SCAP rule IDs
        """
        try:
            # Simple text search for control references
            # Production implementation would use defusedxml
            with open(content_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Search for control references in XCCDF
            # Pattern: <reference href="...NIST-800-53">AC-2</reference>
            pattern = rf'<Rule[^>]+id="([^"]+)"[^>]*>.*?<reference[^>]*>.*?{control_id}.*?</reference>'
            matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)

            # Alternative pattern for different XCCDF formats
            if not matches:
                pattern2 = rf'id="([^"]+)"[^>]*>.*?{control_id}'
                matches = re.findall(pattern2, content, re.IGNORECASE)

            return list(set(matches))[:10]  # Limit to 10 rules

        except Exception as e:
            logger.error(f"Error extracting rules from {content_file}: {e}")
            return []

    def _determine_applicable_profiles(
        self,
        content_file: Path,
        rule_ids: List[str]
    ) -> List[str]:
        """
        Determine which SCAP profiles include these rules.

        Args:
            content_file: XCCDF file path
            rule_ids: List of rule IDs

        Returns:
            List of applicable profile names
        """
        # Simplified - would parse XCCDF Profile sections
        # For now, return common profiles
        return ["cui", "moderate", "high"]

    def generate_remediation_from_scap(
        self,
        control_id: str,
        platform: str = "rhel8",
        format: str = "bash",
        profile: str = "cui"
    ) -> Optional[str]:
        """
        Generate remediation script using OpenSCAP.

        Executes: oscap xccdf generate fix --profile {profile} --fix-type {format}

        Args:
            control_id: NIST control ID
            platform: Target platform
            format: Script format ('bash' or 'ansible')
            profile: SCAP profile (cui, moderate, high)

        Returns:
            Generated remediation script as string, or None if unavailable
        """
        # Check if content exists
        content_info = self.get_scap_content_for_control(control_id, platform)
        if not content_info or not content_info.has_content:
            return None

        # Verify oscap command available
        if not self._check_oscap_command():
            logger.warning("oscap command not found - cannot generate remediation")
            return None

        try:
            # Build oscap command
            content_file = Path(content_info.content_path)

            # Map format to oscap fix-type
            fix_type_map = {
                'bash': 'bash',
                'ansible': 'ansible'
            }
            fix_type = fix_type_map.get(format, 'bash')

            # For demonstration, we'll generate for first rule
            # Production would aggregate all rules for the control
            rule_id = content_info.rule_ids[0] if content_info.rule_ids else None
            if not rule_id:
                return None

            # Execute oscap (simplified - production would use proper subprocess handling)
            cmd = [
                "oscap", "xccdf", "generate", "fix",
                "--profile", profile,
                "--fix-type", fix_type,
                "--rule", rule_id,
                str(content_file)
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                return result.stdout
            else:
                logger.error(f"oscap command failed: {result.stderr}")
                return None

        except subprocess.TimeoutExpired:
            logger.error("oscap command timed out")
            return None
        except Exception as e:
            logger.error(f"Error generating remediation: {e}")
            return None

    def _check_oscap_command(self) -> bool:
        """Check if oscap command is available."""
        try:
            subprocess.run(
                ["oscap", "--version"],
                capture_output=True,
                timeout=5
            )
            return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False

    def map_nist_to_scap_rules(self, control_id: str) -> List[str]:
        """
        Map NIST control to SCAP rule IDs across all platforms.

        Args:
            control_id: NIST control ID

        Returns:
            List of SCAP rule IDs
        """
        all_rules = []

        # Check all available platforms
        for platform in ["rhel8", "rhel9", "ubuntu2004"]:
            content_info = self.get_scap_content_for_control(control_id, platform)
            if content_info and content_info.has_content:
                all_rules.extend(content_info.rule_ids)

        # Return unique rule IDs
        return list(set(all_rules))

    def get_coverage_summary(self, control_ids: List[str]) -> Dict[str, Any]:
        """
        Analyze SCAP coverage for a list of controls.

        Args:
            control_ids: List of NIST control IDs

        Returns:
            Coverage summary statistics
        """
        covered = []
        not_covered = []

        for control_id in control_ids:
            content_info = self.get_scap_content_for_control(control_id)
            if content_info and content_info.has_content:
                covered.append(control_id)
            else:
                not_covered.append(control_id)

        return {
            "total_controls": len(control_ids),
            "covered_count": len(covered),
            "not_covered_count": len(not_covered),
            "coverage_percentage": (len(covered) / len(control_ids) * 100) if control_ids else 0,
            "covered_controls": covered,
            "not_covered_controls": not_covered,
            "scap_available": self.is_available()
        }


# Singleton instance
_openscap_instance: Optional[OpenSCAPIntegration] = None


def get_openscap_integration(scap_dir: Optional[str] = None) -> OpenSCAPIntegration:
    """
    Get singleton OpenSCAP integration instance.

    Args:
        scap_dir: Optional SCAP content directory

    Returns:
        OpenSCAPIntegration instance
    """
    global _openscap_instance
    if _openscap_instance is None:
        _openscap_instance = OpenSCAPIntegration(scap_dir)
    return _openscap_instance
