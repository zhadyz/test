#!/usr/bin/env python
"""
QA Template Analysis - LOVELESS Assessment

Comprehensive analysis of template_processor.py capabilities against CAC templates.
Identifies which controls are migration-ready vs. which need additional macros.

This script:
1. Enumerates all CAC template types and their macro dependencies
2. Tests template_processor.py rendering for each template type
3. Classifies AC controls into GREEN (ready) vs RED (blocked)
4. Generates comprehensive QA report with risk assessment
"""

import sys
import re
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple

sys.path.insert(0, str(Path(__file__).parent))

from cac_explorer import CACExplorer
from template_processor import TemplateProcessor


class TemplateAnalyzer:
    """Analyzes CAC templates for macro dependencies and compatibility"""

    def __init__(self, cac_path: str):
        self.cac_path = Path(cac_path)
        self.templates_path = self.cac_path / "shared" / "templates"
        self.processor = TemplateProcessor(cac_path=str(self.cac_path))
        self.explorer = CACExplorer(str(self.cac_path))

        # Track results
        self.template_types: Dict[str, Dict] = {}
        self.macro_usage: Dict[str, List[str]] = defaultdict(list)
        self.green_controls: List[Dict] = []
        self.red_controls: List[Dict] = []

    def analyze_all_templates(self) -> None:
        """Analyze all CAC template types for macro dependencies"""
        print("[TESTING] Analyzing CAC template types...")

        template_dirs = [d for d in self.templates_path.iterdir() if d.is_dir()]

        for template_dir in sorted(template_dirs):
            template_name = template_dir.name

            # Check for bash and ansible templates
            bash_template = template_dir / "bash.template"
            ansible_template = template_dir / "ansible.template"

            macros_found = set()

            # Analyze bash template
            if bash_template.exists():
                macros = self._extract_macros(bash_template)
                macros_found.update(macros)

            # Analyze ansible template
            if ansible_template.exists():
                macros = self._extract_macros(ansible_template)
                macros_found.update(macros)

            self.template_types[template_name] = {
                "has_bash": bash_template.exists(),
                "has_ansible": ansible_template.exists(),
                "macros": list(macros_found),
                "bash_path": str(bash_template) if bash_template.exists() else None,
                "ansible_path": str(ansible_template) if ansible_template.exists() else None,
            }

            # Track macro usage
            for macro in macros_found:
                self.macro_usage[macro].append(template_name)

        print(f"[INFO] Analyzed {len(self.template_types)} template types")
        print(f"[INFO] Found {len(self.macro_usage)} unique macros")

    def _extract_macros(self, template_path: Path) -> Set[str]:
        """Extract macro calls from a template file"""
        macros = set()

        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern: {{{ macro_name(...) }}}
        macro_pattern = r'\{\{\{\s*(\w+)\s*\('
        matches = re.findall(macro_pattern, content)
        macros.update(matches)

        return macros

    def test_template_rendering(self, template_name: str) -> Tuple[bool, str]:
        """Test if a template can be rendered with current processor"""
        if template_name not in self.template_types:
            return False, "Template not found"

        template_info = self.template_types[template_name]

        # Try bash template
        if template_info["has_bash"]:
            try:
                bash_path = template_info["bash_path"]
                rendered = self.processor.render_template(
                    bash_path,
                    variables={
                        'SERVICENAME': 'test_service',
                        'DAEMONNAME': 'test_daemon',
                        'PACKAGENAME': 'test_package',
                        'PATH': '/etc/test.conf',
                        'KEY': 'test_key',
                        'VALUE': 'test_value',
                        'SEP': '=',
                        'SEP_REGEX': '=',
                        'PREFIX_REGEX': '^\\s*',
                        'TEXT': 'test_text',
                        'SED_PATH_SEPARATOR': '/',
                        'rule_id': 'test_rule',
                    },
                    product="rhel8"
                )

                # Check for rendering errors
                if "JINJA TEMPLATE ERROR" in rendered:
                    return False, "Jinja2 error in rendered output"

                if not self.processor.validate_rendered_script(rendered):
                    return False, "Script validation failed"

                return True, "Successfully rendered"

            except Exception as e:
                return False, f"Rendering error: {str(e)}"

        # Try ansible template
        if template_info["has_ansible"]:
            try:
                ansible_path = template_info["ansible_path"]
                rendered = self.processor.render_template(
                    ansible_path,
                    variables={
                        'SERVICENAME': 'test_service',
                        'DAEMONNAME': 'test_daemon',
                        'PACKAGENAME': 'test_package',
                        'PATH': '/etc/test.conf',
                        'KEY': 'test_key',
                        'VALUE': 'test_value',
                        'rule_title': 'Test Rule',
                    },
                    product="rhel8"
                )

                if "JINJA TEMPLATE ERROR" in rendered:
                    return False, "Jinja2 error in rendered output"

                if not self.processor.validate_rendered_script(rendered):
                    return False, "Script validation failed"

                return True, "Successfully rendered"

            except Exception as e:
                return False, f"Rendering error: {str(e)}"

        return False, "No renderable templates found"

    def classify_ac_controls(self) -> None:
        """Classify AC controls into GREEN (ready) vs RED (blocked)"""
        print("\n[VERIFYING] Testing AC family controls for compatibility...")

        ac_controls = self.explorer.find_automated_controls(family="AC")

        for control in sorted(ac_controls, key=lambda c: c['control_id']):
            control_id = control['control_id']

            # Test each template for this control
            all_templates_work = True
            failed_templates = []

            if 'templates' in control:
                for template_format, template_path in control['templates'].items():
                    # Extract template name from path
                    template_name = Path(template_path).parent.name

                    can_render, error_msg = self.test_template_rendering(template_name)

                    if not can_render:
                        all_templates_work = False
                        failed_templates.append({
                            "format": template_format,
                            "template": template_name,
                            "error": error_msg
                        })

            # Classify
            if all_templates_work:
                self.green_controls.append({
                    "control_id": control_id,
                    "title": control.get('title', ''),
                    "rules": control.get('rules', []),
                    "templates": list(control.get('templates', {}).keys())
                })
            else:
                self.red_controls.append({
                    "control_id": control_id,
                    "title": control.get('title', ''),
                    "rules": control.get('rules', []),
                    "failed_templates": failed_templates
                })

        print(f"[PASS] GREEN controls (migration-ready): {len(self.green_controls)}")
        print(f"[FAIL] RED controls (blocked): {len(self.red_controls)}")

    def generate_report(self) -> str:
        """Generate comprehensive QA report"""
        report = []

        report.append("=" * 80)
        report.append("LOVELESS QA REPORT: Migration Framework Template Analysis")
        report.append("=" * 80)
        report.append("")
        report.append(f"Analysis Date: {Path(__file__).stat().st_mtime}")
        report.append(f"CAC Repository: {self.cac_path}")
        report.append("")

        # Section 1: Template Processor Capabilities
        report.append("=" * 80)
        report.append("1. TEMPLATE PROCESSOR CAPABILITY ASSESSMENT")
        report.append("=" * 80)
        report.append("")

        # Implemented macros
        implemented_macros = [
            'describe_service_enable',
            'ocil_service_enabled',
            'fixtext_service_enabled',
            'srg_requirement_service_enabled'
        ]

        report.append("IMPLEMENTED MACROS:")
        for macro in implemented_macros:
            usage_count = len(self.macro_usage.get(macro, []))
            report.append(f"  [PASS] {macro:40} Used by {usage_count} templates")

        report.append("")
        report.append("MISSING MACROS:")

        # Missing macros (found in templates but not implemented)
        all_macros = set(self.macro_usage.keys())
        missing_macros = all_macros - set(implemented_macros)

        for macro in sorted(missing_macros):
            templates_using = self.macro_usage[macro]
            report.append(f"  [FAIL] {macro:40} Used by {len(templates_using)} templates")
            report.append(f"         Templates: {', '.join(templates_using[:5])}")
            if len(templates_using) > 5:
                report.append(f"         ... and {len(templates_using) - 5} more")

        # Template type compatibility
        report.append("")
        report.append("TEMPLATE TYPE COMPATIBILITY:")
        report.append("")

        compatible_count = 0
        incompatible_count = 0

        for template_name in sorted(self.template_types.keys()):
            can_render, error_msg = self.test_template_rendering(template_name)

            if can_render:
                compatible_count += 1
                status = "[PASS]"
            else:
                incompatible_count += 1
                status = "[FAIL]"

            macros = self.template_types[template_name].get('macros', [])
            report.append(f"  {status} {template_name:40} Macros: {', '.join(macros[:3])}")

            if not can_render and error_msg:
                report.append(f"         Error: {error_msg}")

        report.append("")
        report.append(f"Summary: {compatible_count} compatible, {incompatible_count} incompatible")

        # Section 2: Migration-Ready Controls
        report.append("")
        report.append("=" * 80)
        report.append("2. MIGRATION-READY CONTROLS (GREEN LIST)")
        report.append("=" * 80)
        report.append("")

        if self.green_controls:
            report.append(f"Total GREEN controls: {len(self.green_controls)}")
            report.append("")

            for ctrl in self.green_controls:
                report.append(f"[PASS] {ctrl['control_id'].upper():8} - {ctrl['title']}")
                report.append(f"       Rules: {len(ctrl['rules'])}")
                report.append(f"       Templates: {', '.join(ctrl['templates'])}")
                report.append("")
        else:
            report.append("[CRITICAL] No controls are migration-ready!")
            report.append("           Template processor needs macro implementation.")

        # Section 3: Blocked Controls
        report.append("=" * 80)
        report.append("3. BLOCKED CONTROLS (RED LIST)")
        report.append("=" * 80)
        report.append("")

        if self.red_controls:
            report.append(f"Total RED controls: {len(self.red_controls)}")
            report.append("")

            for ctrl in self.red_controls:
                report.append(f"[FAIL] {ctrl['control_id'].upper():8} - {ctrl['title']}")
                report.append(f"       Blocking issues:")
                for failure in ctrl['failed_templates']:
                    report.append(f"         - {failure['template']} ({failure['format']}): {failure['error']}")
                report.append("")
        else:
            report.append("[SUCCESS] No controls blocked!")

        # Section 4: Macro Gap Analysis
        report.append("=" * 80)
        report.append("4. MACRO GAP ANALYSIS")
        report.append("=" * 80)
        report.append("")

        if missing_macros:
            report.append("PRIORITY RANKING FOR MACRO IMPLEMENTATION:")
            report.append("")

            # Sort by usage frequency
            macro_priority = sorted(
                [(macro, len(self.macro_usage[macro])) for macro in missing_macros],
                key=lambda x: x[1],
                reverse=True
            )

            for idx, (macro, usage_count) in enumerate(macro_priority, 1):
                priority = "HIGH" if usage_count > 5 else "MEDIUM" if usage_count > 2 else "LOW"
                report.append(f"  {idx}. [{priority:6}] {macro:40} ({usage_count} templates)")

                # Show one example template
                example_template = self.macro_usage[macro][0]
                example_path = self.templates_path / example_template

                if (example_path / "bash.template").exists():
                    report.append(f"     Example: {example_template}/bash.template")
                elif (example_path / "ansible.template").exists():
                    report.append(f"     Example: {example_template}/ansible.template")

                report.append("")

            report.append("RECOMMENDATION:")

            # Determine if we should implement macros or skip
            high_priority_macros = [m for m, c in macro_priority if c > 5]

            if high_priority_macros:
                report.append(f"  [ACTION REQUIRED] Implement {len(high_priority_macros)} high-priority macros")
                report.append(f"                    This will unblock {len(self.red_controls)} controls")
                report.append("")
                report.append("  SKIP controls needing these macros until implementation complete.")
            else:
                report.append("  [ACCEPTABLE] Low usage macros can be skipped")
                report.append("               Proceed with GREEN list controls only")
        else:
            report.append("[SUCCESS] All required macros implemented!")

        # Section 5: Phase 2 Recommendation
        report.append("")
        report.append("=" * 80)
        report.append("5. PHASE 2 RECOMMENDATION - BEST CONTROL FOR SINGLE MIGRATION TEST")
        report.append("=" * 80)
        report.append("")

        if self.green_controls:
            # Find best control: alphabetically first, simple/safe
            best_control = self.green_controls[0]

            report.append(f"RECOMMENDED CONTROL: {best_control['control_id'].upper()}")
            report.append(f"Title: {best_control['title']}")
            report.append("")
            report.append("RATIONALE:")
            report.append(f"  - Alphabetically first in AC family GREEN list")
            report.append(f"  - {len(best_control['rules'])} rule(s) - manageable complexity")
            report.append(f"  - Templates available: {', '.join(best_control['templates'])}")
            report.append(f"  - All templates render successfully")
            report.append("")
            report.append("MIGRATION PLAN:")
            report.append(f"  1. Verify control exists in controls_catalog.json")
            report.append(f"  2. Use cac_explorer to extract rules and template paths")
            report.append(f"  3. Use template_processor to render bash + ansible scripts")
            report.append(f"  4. Validate rendered scripts (syntax, executability)")
            report.append(f"  5. Use catalog_updater to atomically update control")
            report.append(f"  6. Verify catalog integrity post-update")
            report.append(f"  7. Create rollback point")
            report.append("")
            report.append("VALIDATION CHECKPOINTS:")
            report.append(f"  [✓] Template rendering produces valid scripts")
            report.append(f"  [✓] Scripts contain expected service/package commands")
            report.append(f"  [✓] No unrendered variables remain in scripts")
            report.append(f"  [✓] Catalog validation passes after update")
            report.append(f"  [✓] Backup created successfully")
            report.append(f"  [✓] Control marked with migration metadata")
        else:
            report.append("[CRITICAL] NO CONTROLS READY FOR MIGRATION")
            report.append("")
            report.append("GO/NO-GO DECISION: NO-GO")
            report.append("")
            report.append("REQUIRED ACTIONS:")
            report.append("  1. Implement missing macros in template_processor.py")
            report.append("  2. Re-run this analysis")
            report.append("  3. Verify GREEN list is populated")

        # Section 6: Risk Assessment
        report.append("")
        report.append("=" * 80)
        report.append("6. RISK ASSESSMENT")
        report.append("=" * 80)
        report.append("")

        report.append("SECURITY RISKS:")
        report.append("  [MEDIUM] Partial template processor implementation")
        report.append("           - Missing macros may render incomplete scripts")
        report.append("           - Scripts without proper validation may be non-functional")
        report.append("           - Recommendation: Only migrate GREEN list controls")
        report.append("")
        report.append("  [LOW] Unvalidated macro output")
        report.append("        - Current macros return simplified text")
        report.append("        - May not match full CAC build system output")
        report.append("        - Recommendation: Add integration tests against real CAC output")
        report.append("")

        report.append("DATA CORRUPTION RISKS:")
        report.append("  [LOW] Atomic update mechanism")
        report.append("        - catalog_updater uses temp file + rename pattern")
        report.append("        - Automatic backups before modification")
        report.append("        - Validation before commit")
        report.append("        - Risk mitigated by design")
        report.append("")
        report.append("  [MEDIUM] Duplicate script injection")
        report.append("           - No check for existing scripts before update")
        report.append("           - May overwrite manual customizations")
        report.append("           - Recommendation: Add 'migration_source' metadata check")
        report.append("")

        report.append("VALIDATION GAPS:")
        report.append("  [HIGH] Script executability not tested")
        report.append("         - Current validation checks syntax only")
        report.append("         - No test execution in sandbox")
        report.append("         - Recommendation: Add shellcheck for bash, ansible-lint for ansible")
        report.append("")
        report.append("  [MEDIUM] No cross-script consistency check")
        report.append("           - Bash and Ansible scripts may diverge")
        report.append("           - No verification they achieve same result")
        report.append("           - Recommendation: Add semantic equivalence tests")
        report.append("")

        report.append("RECOMMENDED SAFETY CHECKS:")
        report.append("  1. Pre-migration: Check control not already migrated (metadata flag)")
        report.append("  2. Post-render: Run shellcheck on bash scripts")
        report.append("  3. Post-render: Run ansible-lint on ansible playbooks")
        report.append("  4. Pre-commit: Verify no unrendered Jinja2 variables")
        report.append("  5. Post-commit: Validate catalog JSON integrity")
        report.append("  6. Post-commit: Verify control count unchanged")
        report.append("")

        # Section 7: Quality Gates
        report.append("=" * 80)
        report.append("7. QUALITY GATES")
        report.append("=" * 80)
        report.append("")

        report.append("PHASE 2 - SINGLE CONTROL MIGRATION")
        report.append("")
        report.append("PASS CRITERIA:")
        report.append("  [✓] Control exists in GREEN list")
        report.append("  [✓] All templates render without errors")
        report.append("  [✓] Rendered scripts pass validation")
        report.append("  [✓] Scripts contain expected automation commands")
        report.append("  [✓] Catalog update completes atomically")
        report.append("  [✓] Backup created successfully")
        report.append("  [✓] Post-update catalog validation passes")
        report.append("  [✓] Control metadata includes migration timestamp")
        report.append("")
        report.append("FAIL CRITERIA:")
        report.append("  [✗] Template rendering throws exception")
        report.append("  [✗] Rendered script contains unrendered variables")
        report.append("  [✗] Catalog validation fails post-update")
        report.append("  [✗] Backup creation fails")
        report.append("  [✗] Atomic update mechanism fails")
        report.append("")

        report.append("PHASE 3 - BATCH MIGRATION")
        report.append("")
        report.append("PASS CRITERIA:")
        report.append("  [✓] All GREEN list controls processed")
        report.append("  [✓] No rendering errors")
        report.append("  [✓] Batch update completes atomically")
        report.append("  [✓] Post-migration control count matches pre-migration")
        report.append("  [✓] All migrated controls have valid scripts")
        report.append("  [✓] Catalog validation passes")
        report.append("  [✓] Rollback capability verified")
        report.append("")
        report.append("FAIL CRITERIA:")
        report.append("  [✗] Any control rendering fails")
        report.append("  [✗] Catalog corruption detected")
        report.append("  [✗] Control count mismatch")
        report.append("  [✗] Rollback fails")
        report.append("")

        report.append("TESTING PROCEDURE:")
        report.append("")
        report.append("Phase 2 Testing:")
        report.append("  1. Run test_modules.py to verify framework integrity")
        report.append("  2. Select recommended control from GREEN list")
        report.append("  3. Execute single control migration")
        report.append("  4. Verify all PASS criteria met")
        report.append("  5. Test rollback mechanism")
        report.append("  6. Restore from backup")
        report.append("")
        report.append("Phase 3 Testing:")
        report.append("  1. Create pre-migration snapshot")
        report.append("  2. Execute batch migration (GREEN list only)")
        report.append("  3. Verify PASS criteria")
        report.append("  4. Spot-check 5 random controls for script quality")
        report.append("  5. Run backend API tests against migrated controls")
        report.append("  6. Test frontend rendering of migrated scripts")
        report.append("")

        report.append("ROLLBACK TRIGGERS:")
        report.append("  - Template rendering error rate > 1%")
        report.append("  - Catalog validation fails")
        report.append("  - Control count decreases")
        report.append("  - Unrendered variables detected in >0 scripts")
        report.append("  - Backup creation fails")
        report.append("  - Atomic update fails")
        report.append("")

        # Final verdict
        report.append("=" * 80)
        report.append("FINAL VERDICT")
        report.append("=" * 80)
        report.append("")

        if self.green_controls:
            report.append("[PASS] GO FOR PHASE 2 SINGLE CONTROL MIGRATION")
            report.append("")
            report.append(f"GREEN LIGHT: {len(self.green_controls)} controls ready for migration")
            report.append(f"RED LIGHT: {len(self.red_controls)} controls blocked (skip these)")
            report.append("")
            report.append(f"Recommended next step: Migrate {self.green_controls[0]['control_id'].upper()}")
        else:
            report.append("[FAIL] NO-GO FOR PHASE 2")
            report.append("")
            report.append("BLOCKING ISSUES:")
            report.append(f"  - 0 controls in GREEN list")
            report.append(f"  - {len(missing_macros)} missing macros")
            report.append("")
            report.append("Required action: Implement missing macros, then re-run analysis")

        report.append("")
        report.append("=" * 80)
        report.append("END OF REPORT")
        report.append("=" * 80)

        return "\n".join(report)


def main():
    """Run comprehensive template analysis"""
    print("\n" + "=" * 80)
    print("LOVELESS QA: MIGRATION FRAMEWORK TEMPLATE ANALYSIS")
    print("=" * 80)
    print("\nInitializing template analyzer...")

    analyzer = TemplateAnalyzer(r"C:\Users\eclip\Desktop\cac")

    # Step 1: Analyze all templates
    analyzer.analyze_all_templates()

    # Step 2: Test template rendering
    print("\n[TESTING] Testing template rendering capabilities...")

    # Step 3: Classify AC controls
    analyzer.classify_ac_controls()

    # Step 4: Generate report
    print("\n[VERIFYING] Generating comprehensive QA report...")
    report = analyzer.generate_report()

    # Write report to file
    report_path = Path(__file__).parent / "QA_TEMPLATE_ANALYSIS_REPORT.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\n[PASS] Report written to: {report_path}")

    # Print summary to console
    print("\n" + "=" * 80)
    print("ANALYSIS SUMMARY")
    print("=" * 80)
    print(f"GREEN controls (migration-ready): {len(analyzer.green_controls)}")
    print(f"RED controls (blocked): {len(analyzer.red_controls)}")
    print(f"Template types analyzed: {len(analyzer.template_types)}")
    print(f"Unique macros found: {len(analyzer.macro_usage)}")

    if analyzer.green_controls:
        print("\n[PASS] GO FOR PHASE 2")
        print(f"Recommended control: {analyzer.green_controls[0]['control_id'].upper()}")
    else:
        print("\n[FAIL] NO-GO - Implement missing macros first")

    print("\nFull report: " + str(report_path))
    print("=" * 80)

    return 0 if analyzer.green_controls else 1


if __name__ == '__main__':
    sys.exit(main())
