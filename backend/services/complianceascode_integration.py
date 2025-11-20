"""
ComplianceAsCode Integration Module

Integrates ComplianceAsCode (CaC) framework for NIST 800-53 control implementations.
Provides YAML content parsing, Jinja2 template extraction, and control mapping.

Key Features:
- Query CaC repository for control implementations
- Extract Jinja2 templates from CaC rules
- Parse YAML rule definitions
- Adapt CaC content to application format
- Support multiple platforms and compliance frameworks

Author: THE_DIDACT
Component: Phase 3 - ComplianceAsCode Integration
"""

import os
import yaml
import re
import logging
from typing import Optional, Dict, List, Any
from pathlib import Path
from dataclasses import dataclass
import subprocess
from datetime import datetime


# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class CaCContentInfo:
    """Metadata about ComplianceAsCode content for a control."""
    control_id: str
    has_content: bool
    rule_ids: List[str]
    platform: str
    templates: List[str]
    remediation_available: Dict[str, bool]  # {ansible: True, bash: False, etc.}
    metadata: Dict[str, Any] = None


class ComplianceAsCodeIntegration:
    """
    ComplianceAsCode (CaC) integration for NIST 800-53 implementations.

    Provides intelligent querying of CaC repository content, template extraction,
    and adaptation to application format.
    """

    # Default CaC repository paths
    CAC_REPO_PATHS = [
        Path.home() / "scap-security-guide",                      # User clone
        Path("/opt/complianceascode/content"),                    # System install
        Path("/usr/share/complianceascode/content"),              # Package install
        Path("./complianceascode-content"),                       # Local dev
        Path.home() / ".local/share/complianceascode/content",   # User install
    ]

    # CaC rule directory structure patterns
    RULE_DIR_PATTERNS = [
        "linux_os/guide/system/*/rules",
        "applications/*/rules",
        "shared/rules",
    ]

    # Platform-specific paths within CaC
    PLATFORM_PATHS = {
        "rhel8": "products/rhel8",
        "rhel9": "products/rhel9",
        "ubuntu2004": "products/ubuntu2004",
        "ubuntu2204": "products/ubuntu2204",
        "fedora": "products/fedora",
    }

    def __init__(self, cac_repo_path: Optional[str] = None, auto_clone: bool = False):
        """
        Initialize ComplianceAsCode integration.

        Args:
            cac_repo_path: Optional custom CaC repository path
            auto_clone: Whether to auto-clone CaC repo if not found
        """
        self.cac_repo_path = self._locate_cac_repo(cac_repo_path)
        self.auto_clone = auto_clone
        self.cache = {}  # In-memory cache

        if self.cac_repo_path:
            logger.info(f"ComplianceAsCode content found at: {self.cac_repo_path}")
        elif auto_clone:
            logger.info("CaC repository not found - attempting auto-clone")
            self._clone_cac_repository()
        else:
            logger.warning("ComplianceAsCode content not found - operating in fallback mode")

    def _locate_cac_repo(self, custom_path: Optional[str] = None) -> Optional[Path]:
        """
        Locate ComplianceAsCode repository.

        Args:
            custom_path: Optional custom repository path

        Returns:
            Path to CaC repository if found
        """
        if custom_path:
            path = Path(custom_path)
            if path.exists() and (path / ".git").exists():
                return path

        for path in self.CAC_REPO_PATHS:
            if path.exists() and (path / ".git").exists():
                return path

        return None

    def _clone_cac_repository(self) -> bool:
        """
        Clone ComplianceAsCode repository from GitHub.

        Returns:
            True if successful, False otherwise
        """
        try:
            clone_path = Path.home() / "scap-security-guide"

            if clone_path.exists():
                logger.info("Repository path exists, attempting pull")
                return self._update_cac_repository(clone_path)

            logger.info(f"Cloning ComplianceAsCode to {clone_path}")

            result = subprocess.run(
                [
                    "git", "clone",
                    "https://github.com/ComplianceAsCode/content.git",
                    str(clone_path)
                ],
                capture_output=True,
                text=True,
                timeout=300
            )

            if result.returncode == 0:
                self.cac_repo_path = clone_path
                logger.info("ComplianceAsCode repository cloned successfully")
                return True
            else:
                logger.error(f"Failed to clone CaC repository: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            logger.error("Repository clone timed out")
            return False
        except Exception as e:
            logger.error(f"Error cloning CaC repository: {e}")
            return False

    def _update_cac_repository(self, repo_path: Path) -> bool:
        """
        Update existing CaC repository.

        Args:
            repo_path: Path to repository

        Returns:
            True if successful
        """
        try:
            result = subprocess.run(
                ["git", "-C", str(repo_path), "pull"],
                capture_output=True,
                text=True,
                timeout=60
            )
            return result.returncode == 0
        except Exception as e:
            logger.error(f"Error updating CaC repository: {e}")
            return False

    def is_available(self) -> bool:
        """Check if ComplianceAsCode content is available."""
        return self.cac_repo_path is not None

    def get_cac_content_for_control(
        self,
        control_id: str,
        platform: str = "rhel8"
    ) -> Optional[CaCContentInfo]:
        """
        Query ComplianceAsCode for control implementation.

        Args:
            control_id: NIST control ID (e.g., "AC-2")
            platform: Target platform

        Returns:
            CaCContentInfo if content found, None otherwise
        """
        # Normalize control ID
        control_id = control_id.upper().strip()

        # Cache check
        cache_key = f"{control_id}:{platform}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        # Check if CaC available
        if not self.is_available():
            return None

        # Search for rules referencing this control
        rule_ids = self._search_rules_for_control(control_id, platform)

        if not rule_ids:
            logger.debug(f"No CaC rules found for {control_id}")
            return None

        # Extract templates and remediation info
        templates = []
        remediation_available = {"ansible": False, "bash": False, "puppet": False}

        for rule_id in rule_ids[:5]:  # Limit to first 5 rules
            rule_templates = self._get_rule_templates(rule_id)
            templates.extend(rule_templates)

            # Check remediation availability
            remediations = self._check_remediation_availability(rule_id)
            for format, available in remediations.items():
                if available:
                    remediation_available[format] = True

        info = CaCContentInfo(
            control_id=control_id,
            has_content=True,
            rule_ids=rule_ids,
            platform=platform,
            templates=templates,
            remediation_available=remediation_available,
            metadata={
                "rule_count": len(rule_ids),
                "template_count": len(templates),
                "repository_path": str(self.cac_repo_path)
            }
        )

        # Cache result
        self.cache[cache_key] = info
        return info

    def _search_rules_for_control(self, control_id: str, platform: str) -> List[str]:
        """
        Search CaC repository for rules referencing control.

        Args:
            control_id: NIST control ID
            platform: Target platform

        Returns:
            List of rule IDs
        """
        if not self.cac_repo_path:
            return []

        rule_ids = []

        try:
            # Search in product-specific profiles
            platform_path = self.cac_repo_path / self.PLATFORM_PATHS.get(platform, "")
            if not platform_path.exists():
                platform_path = self.cac_repo_path / "linux_os"

            # Search YAML files for control references
            for yaml_file in platform_path.rglob("*.yml"):
                try:
                    with open(yaml_file, 'r', encoding='utf-8') as f:
                        content = yaml.safe_load(f)

                    # Check if control is referenced
                    if self._yaml_contains_control(content, control_id):
                        # Extract rule ID from filename or content
                        rule_id = yaml_file.stem
                        rule_ids.append(rule_id)

                except Exception as e:
                    logger.debug(f"Error parsing {yaml_file}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error searching CaC rules: {e}")

        return rule_ids[:10]  # Limit to 10 rules

    def _yaml_contains_control(self, yaml_content: Any, control_id: str) -> bool:
        """
        Check if YAML content references NIST control.

        Args:
            yaml_content: Parsed YAML content
            control_id: NIST control ID

        Returns:
            True if control referenced
        """
        if not isinstance(yaml_content, dict):
            return False

        # Check common fields
        references = yaml_content.get("references", {})
        if isinstance(references, dict):
            nist_refs = references.get("nist", []) or references.get("nist-csf", [])
            if control_id in str(nist_refs):
                return True

        # Check identifiers
        identifiers = yaml_content.get("identifiers", {})
        if control_id in str(identifiers):
            return True

        # Check title/description
        title = yaml_content.get("title", "")
        description = yaml_content.get("description", "")
        if control_id in title or control_id in description:
            return True

        return False

    def _get_rule_templates(self, rule_id: str) -> List[str]:
        """
        Get Jinja2 templates for a rule.

        Args:
            rule_id: CaC rule ID

        Returns:
            List of template names
        """
        if not self.cac_repo_path:
            return []

        templates = []

        # Search for template files
        template_patterns = [
            f"shared/templates/*/{rule_id}",
            f"linux_os/guide/*/templates/{rule_id}",
        ]

        for pattern in template_patterns:
            for template_file in self.cac_repo_path.glob(pattern):
                templates.append(template_file.stem)

        return templates

    def _check_remediation_availability(self, rule_id: str) -> Dict[str, bool]:
        """
        Check available remediation formats for a rule.

        Args:
            rule_id: CaC rule ID

        Returns:
            Dict mapping format to availability
        """
        availability = {"ansible": False, "bash": False, "puppet": False}

        if not self.cac_repo_path:
            return availability

        # Search for remediation files
        remediation_patterns = {
            "ansible": f"**/ansible/{rule_id}.yml",
            "bash": f"**/bash/{rule_id}.sh",
            "puppet": f"**/puppet/{rule_id}.pp",
        }

        for format, pattern in remediation_patterns.items():
            matches = list(self.cac_repo_path.glob(pattern))
            availability[format] = len(matches) > 0

        return availability

    def extract_cac_template(self, rule_id: str) -> Optional[str]:
        """
        Extract Jinja2 template content from CaC.

        Args:
            rule_id: CaC rule ID

        Returns:
            Template content as string, or None
        """
        if not self.cac_repo_path:
            return None

        try:
            # Search for template file
            for template_file in self.cac_repo_path.glob(f"**/templates/**/{rule_id}*"):
                with open(template_file, 'r', encoding='utf-8') as f:
                    return f.read()

        except Exception as e:
            logger.error(f"Error extracting template for {rule_id}: {e}")

        return None

    def adapt_cac_to_script(
        self,
        cac_content: Dict[str, Any],
        platform: str,
        format: str
    ) -> Optional[str]:
        """
        Adapt CaC content to application script format.

        Args:
            cac_content: CaC content dictionary
            platform: Target platform
            format: Script format (ansible, bash, etc.)

        Returns:
            Adapted script as string
        """
        try:
            # Extract rule ID
            rule_id = cac_content.get("rule_id") or cac_content.get("id")
            if not rule_id:
                return None

            # Get remediation content
            remediation_path = self._find_remediation_file(rule_id, format)
            if not remediation_path:
                return None

            # Read remediation content
            with open(remediation_path, 'r', encoding='utf-8') as f:
                script_content = f.read()

            # Add header with metadata
            header = self._generate_script_header(cac_content, platform, format)

            return f"{header}\n\n{script_content}"

        except Exception as e:
            logger.error(f"Error adapting CaC content: {e}")
            return None

    def _find_remediation_file(self, rule_id: str, format: str) -> Optional[Path]:
        """
        Find remediation file for rule and format.

        Args:
            rule_id: CaC rule ID
            format: Remediation format

        Returns:
            Path to remediation file
        """
        if not self.cac_repo_path:
            return None

        extensions = {
            "ansible": ".yml",
            "bash": ".sh",
            "puppet": ".pp",
        }

        ext = extensions.get(format, ".yml")
        pattern = f"**/{format}/{rule_id}{ext}"

        matches = list(self.cac_repo_path.glob(pattern))
        return matches[0] if matches else None

    def _generate_script_header(
        self,
        cac_content: Dict[str, Any],
        platform: str,
        format: str
    ) -> str:
        """
        Generate script header with metadata.

        Args:
            cac_content: CaC content metadata
            platform: Target platform
            format: Script format

        Returns:
            Header comment block
        """
        control_id = cac_content.get("control_id", "Unknown")
        rule_id = cac_content.get("rule_id") or cac_content.get("id", "Unknown")
        title = cac_content.get("title", "")

        if format == "ansible":
            return f"""---
# ComplianceAsCode Remediation
# Control: {control_id}
# Rule: {rule_id}
# Title: {title}
# Platform: {platform}
# Generated: {datetime.now().isoformat()}
# Source: ComplianceAsCode/content"""
        else:
            return f"""#!/bin/bash
# ComplianceAsCode Remediation
# Control: {control_id}
# Rule: {rule_id}
# Title: {title}
# Platform: {platform}
# Generated: {datetime.now().isoformat()}
# Source: ComplianceAsCode/content"""

    def get_coverage_summary(self, control_ids: List[str]) -> Dict[str, Any]:
        """
        Analyze CaC coverage for controls.

        Args:
            control_ids: List of NIST control IDs

        Returns:
            Coverage summary
        """
        covered = []
        not_covered = []

        for control_id in control_ids:
            content_info = self.get_cac_content_for_control(control_id)
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
            "cac_available": self.is_available()
        }


# Singleton instance
_cac_instance: Optional[ComplianceAsCodeIntegration] = None


def get_cac_integration(cac_repo: Optional[str] = None) -> ComplianceAsCodeIntegration:
    """
    Get singleton ComplianceAsCode integration instance.

    Args:
        cac_repo: Optional CaC repository path

    Returns:
        ComplianceAsCodeIntegration instance
    """
    global _cac_instance
    if _cac_instance is None:
        _cac_instance = ComplianceAsCodeIntegration(cac_repo)
    return _cac_instance
