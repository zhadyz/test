#!/usr/bin/env python
"""
Rule Renderer Module

This module handles per-rule template rendering for controls with multiple rules.
Each rule may have its own template variables (PATH, KEY, VALUE, etc.), so rendering
must happen at the rule level, not control level.

Usage:
    from rule_renderer import RuleRenderer
    from template_processor import TemplateProcessor
    from cac_explorer import CACExplorer

    explorer = CACExplorer("C:/path/to/cac")
    processor = TemplateProcessor()
    renderer = RuleRenderer(processor)

    # Get rule details
    rule_details = explorer.get_rule_details("selinux_policytype")

    # Render the rule
    rendered = renderer.render_rule(rule_details, product="rhel8")

    # Combine multiple rules
    combined_bash = renderer.combine_rules([rendered1, rendered2], "bash")
"""

import logging
from typing import Dict, List, Optional
from template_processor import TemplateProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class RuleRenderer:
    """
    Renderer for individual CAC rules with rule-specific template variables.

    Handles rendering templates at the rule level where each rule may define
    different template variables (e.g., PATH, KEY, VALUE for config file rules).

    Attributes:
        processor: TemplateProcessor instance for Jinja2 rendering
    """

    def __init__(self, processor: TemplateProcessor):
        """
        Initialize Rule Renderer.

        Args:
            processor: TemplateProcessor instance
        """
        self.processor = processor

    def render_rule(self, rule_details: Dict, product: str = 'rhel8') -> Dict:
        """
        Render bash and ansible templates for a single rule.

        Args:
            rule_details: Rule details from CACExplorer.get_rule_details()
                {
                    'id': str,
                    'title': str,
                    'template': {
                        'name': str,
                        'vars': Dict
                    },
                    'templates': {
                        'bash': str,
                        'ansible': str
                    }
                }
            product: Target product (default: rhel8)

        Returns:
            Dictionary with rendered scripts:
            {
                'bash': str,  # rendered bash script
                'ansible': str  # rendered ansible playbook
            }

        Raises:
            ValueError: If rule_details is invalid or templates missing
        """
        rule_id = rule_details.get('id', 'unknown')
        rule_title = rule_details.get('title', rule_id)
        template_info = rule_details.get('template', {})
        template_paths = rule_details.get('templates', {})

        if not template_paths:
            raise ValueError(f"No templates found for rule {rule_id}")

        # Get template variables from rule
        template_vars = template_info.get('vars', {})

        logger.info(f"Rendering rule: {rule_id}")
        logger.debug(f"  Template: {template_info.get('name', 'unknown')}")
        logger.debug(f"  Variables: {template_vars}")

        # Prepare rendering context
        context = self.processor.get_default_variables(product=product)
        context['rule_title'] = rule_title
        context['rule_id'] = rule_id

        # Add rule-specific template variables
        # Map lowercase vars from rule.yml to uppercase template vars
        var_mapping = self._build_variable_mapping(template_vars)
        context.update(var_mapping)

        rendered = {}

        # Render bash template
        if 'bash' in template_paths:
            try:
                bash_script = self.processor.render_template(
                    template_paths['bash'],
                    variables=context,
                    product=product
                )

                # Validate no unrendered variables
                if '{{{' in bash_script:
                    logger.warning(f"Unrendered variables in bash template for {rule_id}")
                    logger.debug(f"  First 500 chars: {bash_script[:500]}")
                else:
                    rendered['bash'] = bash_script
                    logger.debug(f"  [OK] Bash rendered: {len(bash_script)} bytes")

            except Exception as e:
                logger.error(f"Failed to render bash template for {rule_id}: {e}")

        # Render ansible template
        if 'ansible' in template_paths:
            try:
                ansible_script = self.processor.render_template(
                    template_paths['ansible'],
                    variables=context,
                    product=product
                )

                # Validate no unrendered variables
                if '{{{' in ansible_script:
                    logger.warning(f"Unrendered variables in ansible template for {rule_id}")
                    logger.debug(f"  First 500 chars: {ansible_script[:500]}")
                else:
                    rendered['ansible'] = ansible_script
                    logger.debug(f"  [OK] Ansible rendered: {len(ansible_script)} bytes")

            except Exception as e:
                logger.error(f"Failed to render ansible template for {rule_id}: {e}")

        if not rendered:
            raise ValueError(f"Failed to render any templates for rule {rule_id}")

        return rendered

    def _build_variable_mapping(self, template_vars: Dict) -> Dict:
        """
        Build variable mapping from rule.yml vars to template variables.

        CAC templates expect uppercase variables like PATH, KEY, VALUE.
        Rule.yml defines lowercase like path, key, sep.

        Args:
            template_vars: Variables from rule.yml template.vars section

        Returns:
            Dictionary with properly mapped variables
        """
        mapping = {}

        # Common variable mappings
        var_map = {
            'PATH': 'path',
            'KEY': 'key',
            'VALUE': 'value',
            'SEP': 'sep',
            'SEP_REGEX': 'sep_regex',
            'PREFIX_REGEX': 'prefix_regex',
            'XCCDF_VARIABLE': 'xccdf_variable',
        }

        # Apply mappings
        for upper_name, lower_name in var_map.items():
            # Check both uppercase and lowercase keys
            if lower_name in template_vars:
                mapping[upper_name] = template_vars[lower_name]
            elif lower_name.upper() in template_vars:
                mapping[upper_name] = template_vars[lower_name.upper()]

        # Also include any already-uppercase vars
        for key, value in template_vars.items():
            if key.isupper() and key not in mapping:
                mapping[key] = value

        return mapping

    def combine_rules(self, rendered_rules: List[Dict], format_type: str) -> str:
        """
        Combine multiple rendered rule scripts into single script.

        Args:
            rendered_rules: List of rendered rule dictionaries
            format_type: 'bash' or 'ansible'

        Returns:
            Combined script as string

        Raises:
            ValueError: If format_type invalid or no rules to combine
        """
        if format_type not in ['bash', 'ansible']:
            raise ValueError(f"Invalid format_type: {format_type}")

        if not rendered_rules:
            raise ValueError("No rules to combine")

        # Extract scripts of the specified format
        scripts = []
        for rule_dict in rendered_rules:
            if format_type in rule_dict:
                scripts.append(rule_dict[format_type])

        if not scripts:
            raise ValueError(f"No {format_type} scripts found in rendered rules")

        logger.info(f"Combining {len(scripts)} {format_type} scripts")

        if format_type == 'bash':
            return self._combine_bash_scripts(scripts)
        else:
            return self._combine_ansible_playbooks(scripts)

    def _combine_bash_scripts(self, scripts: List[str]) -> str:
        """
        Combine multiple bash scripts into one.

        Args:
            scripts: List of bash script strings

        Returns:
            Combined bash script
        """
        # Extract shebang and headers from first script
        first_script = scripts[0]
        lines = first_script.split('\n')

        header_lines = []
        script_lines = []

        in_header = True
        for line in lines:
            if in_header and (line.startswith('#!') or line.startswith('#')):
                if not any(line in s for s in header_lines):
                    header_lines.append(line)
            else:
                in_header = False
                script_lines.append(line)

        # Start with header
        combined = '\n'.join(header_lines) + '\n\n'
        combined += '# Combined remediation script for multiple rules\n'
        combined += '# Generated by NIST Compliance Migration System\n\n'

        # Add first script body
        combined += '# Rule 1\n'
        combined += '\n'.join(script_lines).strip() + '\n\n'

        # Add remaining scripts
        for i, script in enumerate(scripts[1:], start=2):
            # Strip header from subsequent scripts
            script_body = self._strip_bash_header(script)
            combined += f'# Rule {i}\n'
            combined += script_body.strip() + '\n\n'

        combined += '# End of combined remediation\n'

        return combined

    def _strip_bash_header(self, script: str) -> str:
        """
        Strip shebang and header comments from bash script.

        Args:
            script: Bash script with header

        Returns:
            Script body without header
        """
        lines = script.split('\n')
        body_lines = []

        in_header = True
        for line in lines:
            if in_header and (line.startswith('#!') or line.startswith('#')):
                continue
            else:
                in_header = False
                body_lines.append(line)

        # Remove leading blank lines
        while body_lines and not body_lines[0].strip():
            body_lines.pop(0)

        return '\n'.join(body_lines)

    def _combine_ansible_playbooks(self, playbooks: List[str]) -> str:
        """
        Combine multiple ansible playbooks into one.

        Args:
            playbooks: List of ansible playbook strings

        Returns:
            Combined ansible playbook
        """
        # Parse each playbook to extract tasks
        all_tasks = []

        for i, playbook in enumerate(playbooks, start=1):
            tasks = self._extract_ansible_tasks(playbook)
            if tasks:
                # Add comment task to separate rules
                all_tasks.append(f'# Tasks from Rule {i}')
                all_tasks.extend(tasks)

        # Build combined playbook
        combined = '---\n'
        combined += '# Source: ComplianceAsCode/content\n'
        combined += '# Combined remediation playbook for multiple rules\n'
        combined += '# Generated by NIST Compliance Migration System\n\n'

        # Add all tasks
        combined += '\n'.join(all_tasks)

        return combined

    def _extract_ansible_tasks(self, playbook: str) -> List[str]:
        """
        Extract task lines from ansible playbook.

        Args:
            playbook: Ansible playbook string

        Returns:
            List of task lines (preserving indentation)
        """
        lines = playbook.split('\n')
        tasks = []

        in_tasks = False
        for line in lines:
            # Skip header lines
            if line.startswith('---') or line.startswith('#'):
                continue

            # Include task lines
            if line.strip().startswith('- name:') or in_tasks:
                in_tasks = True
                tasks.append(line)

                # End of task block detection (next task or end)
                if line.strip() and not line.startswith(' ') and not line.startswith('-'):
                    in_tasks = False

        return tasks


def main():
    """CLI interface for Rule Renderer"""
    import argparse
    import json
    import sys
    from pathlib import Path
    from cac_explorer import CACExplorer

    parser = argparse.ArgumentParser(
        description="Render individual CAC rules with rule-specific variables",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Render a single rule
  python rule_renderer.py --rule selinux_policytype

  # Render and combine multiple rules
  python rule_renderer.py --rule selinux_policytype sshd_limit_user_access
        """
    )

    parser.add_argument(
        '--rule',
        nargs='+',
        required=True,
        help='Rule ID(s) to render'
    )
    parser.add_argument(
        '--product',
        default='rhel8',
        help='Target product (default: rhel8)'
    )
    parser.add_argument(
        '--format',
        choices=['bash', 'ansible', 'both'],
        default='both',
        help='Output format (default: both)'
    )
    parser.add_argument(
        '--cac-path',
        default=r"C:\Users\eclip\Desktop\cac",
        help='Path to CAC repository'
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
        # Initialize components
        explorer = CACExplorer(args.cac_path)
        processor = TemplateProcessor(args.cac_path)
        renderer = RuleRenderer(processor)

        # Render each rule
        rendered_rules = []
        for rule_id in args.rule:
            print(f"\n{'='*60}")
            print(f"Rendering rule: {rule_id}")
            print('='*60)

            rule_details = explorer.get_rule_details(rule_id)
            rendered = renderer.render_rule(rule_details, product=args.product)
            rendered_rules.append(rendered)

            print(f"[OK] Rendered {len(rendered)} format(s)")

        # If multiple rules, combine them
        if len(args.rule) > 1:
            print(f"\n{'='*60}")
            print(f"Combining {len(args.rule)} rules")
            print('='*60)

            if args.format in ['bash', 'both']:
                combined_bash = renderer.combine_rules(rendered_rules, 'bash')
                print(f"\n--- COMBINED BASH ({len(combined_bash)} bytes) ---")
                print(combined_bash[:500])
                print("...")

            if args.format in ['ansible', 'both']:
                combined_ansible = renderer.combine_rules(rendered_rules, 'ansible')
                print(f"\n--- COMBINED ANSIBLE ({len(combined_ansible)} bytes) ---")
                print(combined_ansible[:500])
                print("...")

        else:
            # Single rule - just print it
            rendered = rendered_rules[0]

            if args.format in ['bash', 'both'] and 'bash' in rendered:
                print(f"\n--- BASH ({len(rendered['bash'])} bytes) ---")
                print(rendered['bash'])

            if args.format in ['ansible', 'both'] and 'ansible' in rendered:
                print(f"\n--- ANSIBLE ({len(rendered['ansible'])} bytes) ---")
                print(rendered['ansible'])

        return 0

    except Exception as e:
        logger.error(f"Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
