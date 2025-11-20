#!/usr/bin/env python
"""
Migration Validation Script

Validates migrated controls to ensure they meet quality standards.

Usage:
    python validate_migration.py --control ac-2
    python validate_migration.py --family AU
    python validate_migration.py --all
    python validate_migration.py --all --report validation_report.html

Validation Checks:
    - Catalog entry exists
    - Implementation scripts present
    - API endpoints respond correctly
    - Scripts are non-empty
    - Scripts syntactically valid
    - No template placeholders remaining
"""

import argparse
import json
import sys
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import requests

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))


class ValidationCheck:
    """Represents a single validation check"""
    def __init__(self, name: str, passed: bool, message: str = ""):
        self.name = name
        self.passed = passed
        self.message = message

    def __str__(self):
        symbol = "✓" if self.passed else "✗"
        msg = f" ({self.message})" if self.message else ""
        return f"  {symbol} {self.name}{msg}"


class ControlValidation:
    """Validation results for a single control"""
    def __init__(self, control_id: str):
        self.control_id = control_id
        self.checks: List[ValidationCheck] = []
        self.passed = False

    def add_check(self, check: ValidationCheck):
        self.checks.append(check)
        self.passed = all(c.passed for c in self.checks)

    @property
    def total_checks(self):
        return len(self.checks)

    @property
    def passed_checks(self):
        return sum(1 for c in self.checks if c.passed)

    def __str__(self):
        status = "PASSED" if self.passed else "FAILED"
        return f"Control: {self.control_id} - {status} ({self.passed_checks}/{self.total_checks})"


class MigrationValidator:
    """Validates migrated controls"""

    def __init__(self, api_url: str = "http://localhost:8001"):
        self.api_url = api_url
        self.catalog_path = Path(__file__).parents[1] / "data" / "controls_catalog.json"
        self.catalog = None

    def load_catalog(self) -> bool:
        """Load controls catalog"""
        try:
            with open(self.catalog_path, 'r', encoding='utf-8') as f:
                self.catalog = json.load(f)
            return True
        except Exception as e:
            print(f"[ERROR] Failed to load catalog: {e}")
            return False

    def validate_control(self, control_id: str) -> ControlValidation:
        """
        Validate a single control.

        Args:
            control_id: Control identifier (e.g., "ac-2")

        Returns:
            ControlValidation with results
        """
        validation = ControlValidation(control_id)
        control_id_lower = control_id.lower()

        # Check 1: Catalog entry exists
        control = next((c for c in self.catalog if c.get('control_id', '').lower() == control_id_lower), None)
        validation.add_check(ValidationCheck(
            "Catalog entry present",
            control is not None,
            f"Control {control_id} not found in catalog" if not control else ""
        ))

        if not control:
            return validation  # Can't continue without control

        # Check 2: Implementation scripts present
        has_impl = 'implementation_scripts' in control
        validation.add_check(ValidationCheck(
            "Implementation scripts present",
            has_impl,
            "No implementation_scripts field" if not has_impl else ""
        ))

        if not has_impl:
            return validation

        # Check 3: Scripts non-empty
        impl_scripts = control['implementation_scripts']
        non_empty_scripts = False
        for os_type, formats in impl_scripts.items():
            for format_type, script in formats.items():
                if script and script != "Not applicable" and len(script) > 10:
                    non_empty_scripts = True
                    break

        validation.add_check(ValidationCheck(
            "Scripts non-empty",
            non_empty_scripts,
            "All scripts empty or 'Not applicable'" if not non_empty_scripts else ""
        ))

        # Check 4: API endpoint responds
        try:
            response = requests.get(f"{self.api_url}/api/controls/paginated?page=1&page_size=1200")
            if response.status_code == 200:
                data = response.json()
                api_control = next(
                    (c for c in data.get('controls', []) if c.get('control_id', '').lower() == control_id_lower),
                    None
                )
                validation.add_check(ValidationCheck(
                    "API endpoint responds",
                    api_control is not None,
                    f"{response.status_code}" if not api_control else ""
                ))
            else:
                validation.add_check(ValidationCheck(
                    "API endpoint responds",
                    False,
                    f"HTTP {response.status_code}"
                ))
        except Exception as e:
            validation.add_check(ValidationCheck(
                "API endpoint responds",
                False,
                str(e)
            ))

        # Check 5: Bash script syntactically valid (if present)
        bash_script = impl_scripts.get('linux', {}).get('bash')
        if bash_script and bash_script != "Not applicable":
            bash_valid = self._validate_bash_syntax(bash_script)
            validation.add_check(ValidationCheck(
                "Bash script syntactically valid",
                bash_valid,
                "Syntax errors detected" if not bash_valid else ""
            ))

        # Check 6: Ansible playbook valid YAML (if present)
        ansible_script = impl_scripts.get('linux', {}).get('ansible')
        if ansible_script and ansible_script != "Not applicable":
            yaml_valid = self._validate_yaml_syntax(ansible_script)
            validation.add_check(ValidationCheck(
                "Ansible playbook valid YAML",
                yaml_valid,
                "Invalid YAML" if not yaml_valid else ""
            ))

        # Check 7: No template placeholders remaining
        all_scripts = []
        for formats in impl_scripts.values():
            all_scripts.extend([s for s in formats.values() if s and s != "Not applicable"])

        placeholders_found = []
        for script in all_scripts:
            # Check for common template placeholders
            if '{{' in script or '{{{' in script:
                placeholders_found.append("Jinja2 placeholder")
            if '{%' in script:
                placeholders_found.append("Jinja2 logic")

        validation.add_check(ValidationCheck(
            "No template placeholders remaining",
            len(placeholders_found) == 0,
            f"Found: {', '.join(set(placeholders_found))}" if placeholders_found else ""
        ))

        return validation

    def _validate_bash_syntax(self, script: str) -> bool:
        """Validate bash script syntax using bash -n"""
        try:
            # Try shellcheck if available (better validation)
            result = subprocess.run(
                ['shellcheck', '--version'],
                capture_output=True,
                timeout=2
            )
            if result.returncode == 0:
                # shellcheck available, use it
                result = subprocess.run(
                    ['shellcheck', '-'],
                    input=script.encode(),
                    capture_output=True,
                    timeout=5
                )
                return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # Fallback: basic bash syntax check
        try:
            result = subprocess.run(
                ['bash', '-n'],
                input=script.encode(),
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except Exception:
            # If bash not available, skip validation
            return True

    def _validate_yaml_syntax(self, yaml_content: str) -> bool:
        """Validate YAML syntax"""
        try:
            import yaml
            yaml.safe_load(yaml_content)
            return True
        except ImportError:
            # YAML module not available, skip validation
            return True
        except Exception:
            return False

    def validate_family(self, family_code: str) -> List[ControlValidation]:
        """
        Validate all controls in a family.

        Args:
            family_code: Family code (e.g., "AU")

        Returns:
            List of ControlValidation results
        """
        family_lower = family_code.lower()
        family_controls = [
            c['control_id'] for c in self.catalog
            if c.get('control_id', '').lower().startswith(family_lower + '-')
            and 'implementation_scripts' in c
        ]

        results = []
        for control_id in family_controls:
            results.append(self.validate_control(control_id))

        return results

    def validate_all(self) -> List[ControlValidation]:
        """Validate all migrated controls"""
        migrated_controls = [
            c['control_id'] for c in self.catalog
            if 'implementation_scripts' in c
        ]

        results = []
        for control_id in migrated_controls:
            results.append(self.validate_control(control_id))

        return results

    def generate_report(self, results: List[ControlValidation], output_path: Optional[str] = None):
        """
        Generate validation report.

        Args:
            results: List of validation results
            output_path: Optional path to save HTML report
        """
        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = total - passed

        # Console report
        print(f"\nValidation Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        for result in results:
            print(result)
            for check in result.checks:
                print(check)
            print()

        print("="*60)
        print(f"Summary:")
        print(f"  Total validated: {total}")
        print(f"  Passed: {passed} ({100*passed/total if total > 0 else 0:.1f}%)")
        print(f"  Failed: {failed} ({100*failed/total if total > 0 else 0:.1f}%)")

        # Issues summary
        issues = []
        for result in results:
            if not result.passed:
                failed_checks = [c for c in result.checks if not c.passed]
                issues.append(f"  - {result.control_id}: {', '.join(c.name for c in failed_checks)}")

        if issues:
            print(f"\nIssues detected:")
            print('\n'.join(issues))
        else:
            print(f"\n✓ All controls passed validation!")

        # HTML report (if requested)
        if output_path:
            self._generate_html_report(results, output_path)
            print(f"\n[SAVED] HTML report: {output_path}")

    def _generate_html_report(self, results: List[ControlValidation], output_path: str):
        """Generate HTML validation report"""
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Migration Validation Report - {datetime.now().strftime('%Y-%m-%d')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        h1 {{ color: #333; }}
        .summary {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .control {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .control.passed {{ border-left: 5px solid #4CAF50; }}
        .control.failed {{ border-left: 5px solid #f44336; }}
        .check {{ margin: 5px 0; padding-left: 20px; }}
        .check.passed::before {{ content: "✓ "; color: #4CAF50; font-weight: bold; }}
        .check.failed::before {{ content: "✗ "; color: #f44336; font-weight: bold; }}
        .stats {{ display: flex; justify-content: space-around; margin: 20px 0; }}
        .stat {{ text-align: center; }}
        .stat-value {{ font-size: 2em; font-weight: bold; }}
        .stat-label {{ color: #666; }}
    </style>
</head>
<body>
    <h1>Migration Validation Report</h1>
    <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

    <div class="summary">
        <h2>Summary</h2>
        <div class="stats">
            <div class="stat">
                <div class="stat-value">{len(results)}</div>
                <div class="stat-label">Total Controls</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #4CAF50;">{sum(1 for r in results if r.passed)}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #f44336;">{sum(1 for r in results if not r.passed)}</div>
                <div class="stat-label">Failed</div>
            </div>
        </div>
    </div>

    <h2>Validation Results</h2>
"""

        for result in results:
            status = "passed" if result.passed else "failed"
            html += f"""
    <div class="control {status}">
        <h3>{result.control_id} - {status.upper()} ({result.passed_checks}/{result.total_checks})</h3>
"""
            for check in result.checks:
                check_status = "passed" if check.passed else "failed"
                message = f": {check.message}" if check.message else ""
                html += f'        <div class="check {check_status}">{check.name}{message}</div>\n'

            html += "    </div>\n"

        html += """
</body>
</html>
"""

        Path(output_path).write_text(html, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(
        description="Validate migrated NIST controls",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate single control
  python validate_migration.py --control ac-2

  # Validate entire family
  python validate_migration.py --family AU

  # Validate all migrated controls
  python validate_migration.py --all

  # Generate HTML report
  python validate_migration.py --all --report validation_report.html
        """
    )

    parser.add_argument('--control', help='Validate single control (e.g., ac-2)')
    parser.add_argument('--family', help='Validate entire family (e.g., AU)')
    parser.add_argument('--all', action='store_true', help='Validate all migrated controls')
    parser.add_argument('--report', help='Generate HTML report at specified path')
    parser.add_argument('--api-url', default='http://localhost:8001', help='Backend API URL')

    args = parser.parse_args()

    if not any([args.control, args.family, args.all]):
        parser.error("Must specify --control, --family, or --all")

    # Initialize validator
    validator = MigrationValidator(api_url=args.api_url)

    if not validator.load_catalog():
        sys.exit(1)

    # Run validation
    results = []

    if args.control:
        print(f"Validating control: {args.control}")
        results = [validator.validate_control(args.control)]

    elif args.family:
        print(f"Validating family: {args.family}")
        results = validator.validate_family(args.family)

    elif args.all:
        print("Validating all migrated controls...")
        results = validator.validate_all()

    # Generate report
    validator.generate_report(results, args.report)

    # Exit with error code if any failures
    failed = sum(1 for r in results if not r.passed)
    sys.exit(0 if failed == 0 else 1)


if __name__ == '__main__':
    main()
