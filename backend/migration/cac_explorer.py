#!/usr/bin/env python
"""
CAC Explorer Module

This module provides functionality to explore and query the ComplianceAsCode (CAC)
repository structure to identify NIST controls, their automation status, and
available implementation templates.

The CAC repository structure:
- linux_os/guide/<family>/<rule_name>/rule.yml - Rule definitions
- shared/templates/<template_name>/*.template - Jinja2 templates for automation
- controls/*.yml - Control-to-rule mappings

Usage:
    from cac_explorer import CACExplorer

    explorer = CACExplorer("C:/path/to/cac")

    # Get all controls
    all_controls = explorer.list_all_controls()

    # Get specific control info
    control = explorer.get_control_info("ac-2")

    # Find only automated controls
    automated = explorer.find_automated_controls()

    # Filter by family
    au_controls = explorer.find_automated_controls(family="au")
"""

import os
import yaml
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set
from dataclasses import dataclass


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class ControlMetadata:
    """Metadata about a control from CAC repository"""
    control_id: str
    title: str
    status: str  # 'automated', 'partial', 'manual', 'pending'
    rules: List[str]
    templates: Dict[str, str]  # {template_type: path}
    platforms: List[str]  # rhel8, rhel9, ubuntu2204, etc.
    severity: str
    references: Dict[str, str]


class CACExplorer:
    """
    Explorer for ComplianceAsCode repository structure.

    Provides methods to query controls, rules, and automation templates
    from a local CAC repository clone.

    Attributes:
        cac_path (Path): Root path to CAC repository
        controls_path (Path): Path to controls directory
        linux_guide_path (Path): Path to linux_os/guide
        shared_templates_path (Path): Path to shared/templates
    """

    def __init__(self, cac_path: str):
        """
        Initialize CAC Explorer.

        Args:
            cac_path: Path to CAC repository root

        Raises:
            ValueError: If CAC path doesn't exist or is invalid
        """
        self.cac_path = Path(cac_path)

        # Validate CAC repository structure
        if not self.cac_path.exists():
            raise ValueError(f"CAC path does not exist: {cac_path}")

        self.controls_path = self.cac_path / "controls"
        self.linux_guide_path = self.cac_path / "linux_os" / "guide"
        self.shared_templates_path = self.cac_path / "shared" / "templates"

        # Validate critical paths
        if not self.controls_path.exists():
            raise ValueError(f"Controls directory not found: {self.controls_path}")
        if not self.linux_guide_path.exists():
            raise ValueError(f"Linux guide directory not found: {self.linux_guide_path}")
        if not self.shared_templates_path.exists():
            raise ValueError(f"Templates directory not found: {self.shared_templates_path}")

        logger.info(f"CAC Explorer initialized: {self.cac_path}")

        # Cache for control-to-rule mappings
        self._control_rule_cache: Optional[Dict[str, List[str]]] = None
        self._rule_metadata_cache: Dict[str, Dict] = {}

    def list_all_controls(self, include_pending: bool = False) -> List[Dict]:
        """
        List all controls found in CAC repository.

        Args:
            include_pending: Include controls with pending/no automation

        Returns:
            List of control dictionaries with basic metadata
        """
        controls = []
        control_rule_map = self._build_control_rule_mapping()

        for control_id, rules in control_rule_map.items():
            try:
                control_info = self.get_control_info(control_id)

                if not include_pending and control_info['status'] in ['manual', 'pending']:
                    continue

                controls.append(control_info)

            except Exception as e:
                logger.warning(f"Failed to get info for {control_id}: {e}")
                continue

        logger.info(f"Found {len(controls)} controls in CAC")
        return controls

    def get_control_info(self, control_id: str) -> Dict:
        """
        Get detailed information about a specific control.

        Args:
            control_id: Control identifier (e.g., "ac-2", "AU-2")

        Returns:
            Dictionary with control metadata:
            {
                'control_id': 'ac-2',
                'title': 'Account Management',
                'status': 'automated',
                'rules': ['service_auditd_enabled', ...],
                'templates': {'bash': '/path/to/template', ...},
                'platforms': ['rhel8', 'rhel9', ...],
                'severity': 'medium',
                'references': {'nist': '...', 'cis': '...'}
            }

        Raises:
            ValueError: If control not found
        """
        control_id_lower = control_id.lower()
        control_rule_map = self._build_control_rule_mapping()

        if control_id_lower not in control_rule_map:
            raise ValueError(f"Control {control_id} not found in CAC repository")

        rules = control_rule_map[control_id_lower]

        # Aggregate metadata from all rules
        all_templates = {}
        all_platforms = set()
        severity = "unknown"
        title = ""
        references = {}

        for rule_name in rules:
            try:
                rule_meta = self._get_rule_metadata(rule_name)

                if not title and 'title' in rule_meta:
                    title = rule_meta['title']

                if 'severity' in rule_meta:
                    severity = rule_meta['severity']

                if 'references' in rule_meta:
                    references.update(rule_meta['references'])

                # Get templates for this rule
                if 'template' in rule_meta:
                    template_name = rule_meta['template'].get('name')
                    if template_name:
                        template_paths = self._find_template_files(template_name)
                        all_templates.update(template_paths)

                # Get platforms
                if 'platform' in rule_meta:
                    all_platforms.add(rule_meta['platform'])

            except Exception as e:
                logger.debug(f"Could not get metadata for rule {rule_name}: {e}")
                continue

        # Determine automation status
        status = self._determine_automation_status(rules, all_templates)

        return {
            'control_id': control_id_lower,
            'title': title or f"Control {control_id}",
            'status': status,
            'rules': rules,
            'templates': all_templates,
            'platforms': list(all_platforms),
            'severity': severity,
            'references': references
        }

    def find_automated_controls(self, family: Optional[str] = None) -> List[Dict]:
        """
        Find controls that have automation templates available.

        Args:
            family: Optional family filter (e.g., "AC", "AU", "IA")

        Returns:
            List of control dictionaries with 'automated' or 'partial' status
        """
        all_controls = self.list_all_controls(include_pending=False)

        # Filter by automation status
        automated = [
            c for c in all_controls
            if c['status'] in ['automated', 'partial'] and c['templates']
        ]

        # Filter by family if specified
        if family:
            family_lower = family.lower()
            automated = [
                c for c in automated
                if c['control_id'].startswith(family_lower + '-')
            ]

        logger.info(f"Found {len(automated)} automated controls" +
                   (f" in {family.upper()} family" if family else ""))
        return automated

    def _build_control_rule_mapping(self) -> Dict[str, List[str]]:
        """
        Build mapping of control IDs to rule names.

        Parses control YAML files to extract which rules implement each control.

        Returns:
            {control_id: [rule_name1, rule_name2, ...]}
        """
        if self._control_rule_cache is not None:
            return self._control_rule_cache

        logger.info("Building control-to-rule mapping...")
        mapping = {}

        # Parse all control YAML files
        control_files = list(self.controls_path.glob("*.yml"))

        for control_file in control_files:
            try:
                with open(control_file, 'r', encoding='utf-8') as f:
                    control_data = yaml.safe_load(f)

                if not control_data or 'controls' not in control_data:
                    continue

                # Extract control-to-rule mappings
                for control in control_data.get('controls', []):
                    control_id = control.get('id', '').lower()
                    if not control_id:
                        continue

                    rules = control.get('rules', [])
                    if not rules:
                        continue

                    if control_id not in mapping:
                        mapping[control_id] = []

                    mapping[control_id].extend(rules)

            except Exception as e:
                logger.warning(f"Failed to parse {control_file.name}: {e}")
                continue

        # Remove duplicates
        for control_id in mapping:
            mapping[control_id] = list(set(mapping[control_id]))

        self._control_rule_cache = mapping
        logger.info(f"Built mapping for {len(mapping)} controls")
        return mapping

    def _get_rule_metadata(self, rule_name: str) -> Dict:
        """
        Get metadata for a specific rule.

        Args:
            rule_name: Name of the rule (e.g., "service_auditd_enabled")

        Returns:
            Dictionary with rule metadata from rule.yml
        """
        if rule_name in self._rule_metadata_cache:
            return self._rule_metadata_cache[rule_name]

        # Find rule.yml file
        rule_file = self._find_rule_file(rule_name)

        if not rule_file or not rule_file.exists():
            logger.debug(f"Rule file not found for: {rule_name}")
            return {}

        try:
            with open(rule_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Parse YAML with Jinja2 syntax - use safe loading
            # We only need the top-level metadata, not to render Jinja2
            metadata = self._parse_yaml_with_jinja(content)

            self._rule_metadata_cache[rule_name] = metadata or {}
            return metadata or {}

        except Exception as e:
            logger.debug(f"Failed to parse rule {rule_name}: {e}")
            return {}

    def _parse_yaml_with_jinja(self, content: str) -> Dict:
        """
        Parse YAML content that contains Jinja2 syntax.

        CAC rule.yml files often contain Jinja2 templates within YAML.
        We need to extract the parseable metadata without rendering.

        Args:
            content: Raw YAML content with Jinja2

        Returns:
            Dictionary of parsed metadata
        """
        import re

        # Extract the basic fields we need without full Jinja2 rendering
        metadata = {}

        # Extract simple key-value pairs (non-nested)
        for line in content.split('\n'):
            # Skip Jinja2 control structures
            if line.strip().startswith('{%') or line.strip().startswith('{{'):
                continue

            # Match "key: value" patterns
            match = re.match(r'^(\w+):\s*(.+)$', line)
            if match:
                key, value = match.groups()

                # Clean value
                value = value.strip()
                if value.startswith("'") or value.startswith('"'):
                    value = value.strip("'\"")

                # Handle special cases
                if key == 'template':
                    # template is a nested structure, need special handling
                    continue
                elif key == 'severity':
                    metadata['severity'] = value
                elif key == 'title':
                    metadata['title'] = value
                elif key == 'platform':
                    metadata['platform'] = value

        # Try to parse template section
        template_match = re.search(
            r'template:\s*\n\s*name:\s*(\w+)',
            content,
            re.MULTILINE
        )
        if template_match:
            metadata['template'] = {'name': template_match.group(1)}

        # Try to parse references section
        ref_match = re.search(
            r'references:\s*\n((?:\s+\w+:.*\n)+)',
            content,
            re.MULTILINE
        )
        if ref_match:
            refs = {}
            for ref_line in ref_match.group(1).split('\n'):
                ref_kv = re.match(r'\s+(\w+):\s*(.+)', ref_line)
                if ref_kv:
                    refs[ref_kv.group(1)] = ref_kv.group(2).strip()
            metadata['references'] = refs

        return metadata

    def _find_rule_file(self, rule_name: str) -> Optional[Path]:
        """
        Find the rule.yml file for a given rule name.

        Args:
            rule_name: Name of the rule

        Returns:
            Path to rule.yml or None if not found
        """
        # Search in linux_os/guide directory tree
        for rule_yml in self.linux_guide_path.rglob(f"{rule_name}/rule.yml"):
            return rule_yml

        return None

    def _find_template_files(self, template_name: str) -> Dict[str, str]:
        """
        Find all template files for a given template name.

        Args:
            template_name: Name of template (e.g., "service_enabled")

        Returns:
            Dictionary mapping format to template path:
            {'bash': '/path/to/bash.template', 'ansible': '/path/to/ansible.template'}
        """
        template_dir = self.shared_templates_path / template_name

        if not template_dir.exists():
            return {}

        templates = {}

        # Common template formats
        formats = ['bash', 'ansible', 'puppet', 'oval', 'kickstart', 'blueprint']

        for fmt in formats:
            template_file = template_dir / f"{fmt}.template"
            if template_file.exists():
                templates[fmt] = str(template_file)

        return templates

    def _determine_automation_status(
        self,
        rules: List[str],
        templates: Dict[str, str]
    ) -> str:
        """
        Determine automation status based on rules and templates.

        Args:
            rules: List of rule names
            templates: Dictionary of available templates

        Returns:
            Status string: 'automated', 'partial', 'manual', or 'pending'
        """
        if not rules:
            return 'pending'

        if not templates:
            return 'manual'

        # Check if all rules have templates
        rules_with_templates = 0
        for rule_name in rules:
            rule_meta = self._get_rule_metadata(rule_name)
            if 'template' in rule_meta:
                rules_with_templates += 1

        if rules_with_templates == 0:
            return 'manual'
        elif rules_with_templates == len(rules):
            return 'automated'
        else:
            return 'partial'

    def get_rule_details(self, rule_id: str) -> Dict:
        """
        Get detailed rule information including template variables.

        Args:
            rule_id: Rule identifier (e.g., "selinux_policytype")

        Returns:
            Dictionary with rule details:
            {
                'id': str,
                'title': str,
                'template': {
                    'name': str,  # e.g., 'key_value_pair_in_file'
                    'vars': Dict  # e.g., {'PATH': '/etc/selinux/config', ...}
                },
                'templates': {
                    'bash': str,  # path to bash template
                    'ansible': str,  # path to ansible template
                }
            }

        Raises:
            ValueError: If rule not found
        """
        # Find rule.yml file
        rule_file = self._find_rule_file(rule_id)

        if not rule_file or not rule_file.exists():
            raise ValueError(f"Rule {rule_id} not found in CAC repository")

        # Parse rule.yml to extract template information
        try:
            with open(rule_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Use existing metadata parser
            rule_meta = self._parse_yaml_with_jinja(content)

            # Parse template section more carefully
            template_info = self._parse_template_section(content)

            # Find template files
            template_paths = {}

            if template_info and 'name' in template_info:
                template_name = template_info['name']

                # First check for rule-specific templates
                rule_dir = rule_file.parent

                # Check for rule-specific bash template
                bash_specific = rule_dir / 'bash' / 'shared.sh'
                if bash_specific.exists():
                    template_paths['bash'] = str(bash_specific)
                else:
                    # Fall back to shared template
                    shared_bash = self.shared_templates_path / template_name / 'bash.template'
                    if shared_bash.exists():
                        template_paths['bash'] = str(shared_bash)

                # Check for rule-specific ansible template
                ansible_specific = rule_dir / 'ansible' / 'shared.yml'
                if ansible_specific.exists():
                    template_paths['ansible'] = str(ansible_specific)
                else:
                    # Fall back to shared template
                    shared_ansible = self.shared_templates_path / template_name / 'ansible.template'
                    if shared_ansible.exists():
                        template_paths['ansible'] = str(shared_ansible)

            return {
                'id': rule_id,
                'title': rule_meta.get('title', rule_id),
                'template': template_info or {},
                'templates': template_paths
            }

        except Exception as e:
            logger.error(f"Failed to get rule details for {rule_id}: {e}")
            raise

    def _parse_template_section(self, content: str) -> Optional[Dict]:
        """
        Parse the template section from rule.yml content.

        Extracts template name and variables from YAML.

        Args:
            content: Raw YAML content

        Returns:
            Dictionary with 'name' and 'vars', or None if no template
        """
        import re

        # Find template section
        template_match = re.search(
            r'template:\s*\n\s*name:\s*(\w+)\s*\n\s*vars:\s*\n((?:\s+\w+:.*\n)+)',
            content,
            re.MULTILINE
        )

        if not template_match:
            # Try simpler pattern without vars
            template_match = re.search(
                r'template:\s*\n\s*name:\s*(\w+)',
                content,
                re.MULTILINE
            )
            if template_match:
                return {'name': template_match.group(1), 'vars': {}}
            return None

        template_name = template_match.group(1)
        vars_section = template_match.group(2) if len(template_match.groups()) > 1 else ""

        # Parse variables
        variables = {}
        if vars_section:
            for line in vars_section.split('\n'):
                var_match = re.match(r'\s+(\w+):\s*["\']?([^"\']+)["\']?', line)
                if var_match:
                    key, value = var_match.groups()
                    # Clean value
                    value = value.strip().strip("'\"")
                    # Convert to uppercase for template rendering
                    variables[key.upper()] = value

        return {
            'name': template_name,
            'vars': variables
        }


def main():
    """CLI interface for CAC Explorer"""
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="Explore ComplianceAsCode repository",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # List all automated controls
  python cac_explorer.py --list-automated

  # Get info for specific control
  python cac_explorer.py --control ac-2

  # Find automated controls in AU family
  python cac_explorer.py --list-automated --family AU
        """
    )

    parser.add_argument(
        '--cac-path',
        default=r"C:\Users\eclip\Desktop\cac",
        help='Path to CAC repository'
    )
    parser.add_argument(
        '--list-automated',
        action='store_true',
        help='List all automated controls'
    )
    parser.add_argument(
        '--control',
        help='Get info for specific control'
    )
    parser.add_argument(
        '--family',
        help='Filter by control family (e.g., AU, AC)'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output in JSON format'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    try:
        explorer = CACExplorer(args.cac_path)

        if args.control:
            # Get specific control
            control = explorer.get_control_info(args.control)

            if args.json:
                print(json.dumps(control, indent=2))
            else:
                print(f"\nControl: {control['control_id'].upper()}")
                print(f"Title: {control['title']}")
                print(f"Status: {control['status']}")
                print(f"Severity: {control['severity']}")
                print(f"Rules: {len(control['rules'])}")
                for rule in control['rules']:
                    print(f"  - {rule}")
                print(f"Templates: {len(control['templates'])}")
                for fmt, path in control['templates'].items():
                    print(f"  - {fmt}: {path}")

        elif args.list_automated:
            # List automated controls
            controls = explorer.find_automated_controls(family=args.family)

            if args.json:
                print(json.dumps(controls, indent=2))
            else:
                print(f"\nFound {len(controls)} automated controls" +
                     (f" in {args.family.upper()} family" if args.family else ""))
                print("-" * 80)
                for control in controls:
                    print(f"{control['control_id'].upper():8} | {control['title']:40} | "
                          f"{len(control['templates'])} templates | {control['status']}")

        else:
            print("Use --list-automated or --control <id>. See --help for usage.")
            return 1

        return 0

    except Exception as e:
        logger.error(f"Error: {e}")
        if args.verbose:
            raise
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
