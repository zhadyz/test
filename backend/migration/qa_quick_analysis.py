#!/usr/bin/env python
"""
Quick QA Template Analysis - Focused on AC Controls

Faster version that directly tests AC controls against template processor.
"""

import sys
import re
from pathlib import Path
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent))

from cac_explorer import CACExplorer
from template_processor import TemplateProcessor


def extract_macros_from_file(file_path):
    """Extract macro calls from template file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern: {{{ macro_name(...) }}}
        macro_pattern = r'\{\{\{\s*(\w+)\s*\('
        return set(re.findall(macro_pattern, content))
    except:
        return set()


def test_control_rendering(processor, control_info):
    """Test if a control's templates can be rendered"""
    errors = []

    for template_format, template_path in control_info.get('templates', {}).items():
        try:
            # Get template name from path
            template_name = Path(template_path).parent.name

            # Try rendering
            rendered = processor.render_template(
                template_path,
                variables={
                    'SERVICENAME': 'test',
                    'DAEMONNAME': 'test',
                    'PACKAGENAME': 'test',
                    'PATH': '/etc/test.conf',
                    'KEY': 'test_key',
                    'VALUE': 'test_value',
                    'SEP': '=',
                    'TEXT': 'test',
                },
                product="rhel8"
            )

            # Check for errors
            if "JINJA TEMPLATE ERROR" in rendered:
                errors.append(f"{template_format}: Jinja2 error in output")
            elif not processor.validate_rendered_script(rendered):
                errors.append(f"{template_format}: Validation failed")

        except Exception as e:
            error_msg = str(e)
            if "No template named" in error_msg or "is undefined" in error_msg:
                # Extract macro name from error
                if "has no attribute" in error_msg:
                    macro_name = error_msg.split("'")[1] if "'" in error_msg else "unknown"
                    errors.append(f"{template_format}: Missing macro/function: {macro_name}")
                else:
                    errors.append(f"{template_format}: {error_msg[:80]}")
            else:
                errors.append(f"{template_format}: {error_msg[:80]}")

    return len(errors) == 0, errors


def main():
    print("\n" + "=" * 80)
    print("LOVELESS QA: QUICK AC CONTROLS ANALYSIS")
    print("=" * 80)

    # Initialize
    print("\n[TESTING] Initializing frameworks...")
    explorer = CACExplorer(r"C:\Users\eclip\Desktop\cac")
    processor = TemplateProcessor(cac_path=r"C:\Users\eclip\Desktop\cac")

    # Get AC controls
    print("[TESTING] Finding automated AC controls...")
    ac_controls = explorer.find_automated_controls(family="AC")
    print(f"[INFO] Found {len(ac_controls)} AC controls with automation\n")

    # Test each control
    green_list = []
    red_list = []

    print("=" * 80)
    print("TESTING INDIVIDUAL CONTROLS")
    print("=" * 80)

    for control in sorted(ac_controls, key=lambda c: c['control_id']):
        control_id = control['control_id'].upper()

        print(f"\n[TESTING] {control_id}: {control.get('title', 'No title')[:50]}")

        # Test rendering
        success, errors = test_control_rendering(processor, control)

        if success:
            print(f"  [PASS] All templates render successfully")
            print(f"  Templates: {', '.join(control.get('templates', {}).keys())}")
            green_list.append(control)
        else:
            print(f"  [FAIL] Rendering errors:")
            for error in errors:
                print(f"    - {error}")
            red_list.append({
                'control': control,
                'errors': errors
            })

    # Generate report
    print("\n\n" + "=" * 80)
    print("ANALYSIS RESULTS")
    print("=" * 80)

    print(f"\n[PASS] GREEN LIST (Migration-Ready): {len(green_list)} controls")
    print("-" * 80)

    if green_list:
        for ctrl in green_list:
            cid = ctrl['control_id'].upper()
            title = ctrl.get('title', 'No title')[:50]
            templates = ', '.join(ctrl.get('templates', {}).keys())
            print(f"  {cid:8} - {title:50} [{templates}]")
    else:
        print("  [CRITICAL] No controls ready for migration!")

    print(f"\n[FAIL] RED LIST (Blocked): {len(red_list)} controls")
    print("-" * 80)

    if red_list:
        # Collect unique error types
        error_types = defaultdict(list)

        for item in red_list:
            ctrl = item['control']
            cid = ctrl['control_id'].upper()

            for error in item['errors']:
                error_types[error].append(cid)

        # Show controls grouped by error
        for error, controls in sorted(error_types.items()):
            print(f"\n  Error: {error}")
            print(f"  Affects: {', '.join(controls)}")

    # Macro analysis
    print("\n\n" + "=" * 80)
    print("MACRO ANALYSIS")
    print("=" * 80)

    implemented_macros = [
        'describe_service_enable',
        'ocil_service_enabled',
        'fixtext_service_enabled',
        'srg_requirement_service_enabled'
    ]

    print("\nIMPLEMENTED MACROS:")
    for macro in implemented_macros:
        print(f"  [PASS] {macro}")

    # Analyze templates used by AC controls
    all_macros_used = set()
    template_paths = set()

    for ctrl in ac_controls:
        for template_format, template_path in ctrl.get('templates', {}).items():
            if Path(template_path).exists():
                template_paths.add(template_path)
                macros = extract_macros_from_file(template_path)
                all_macros_used.update(macros)

    missing_macros = all_macros_used - set(implemented_macros)

    print(f"\nMISSING MACROS (found in AC control templates):")
    if missing_macros:
        for macro in sorted(missing_macros):
            # Count how many AC templates use it
            count = sum(1 for path in template_paths if macro in str(extract_macros_from_file(path)))
            print(f"  [FAIL] {macro:40} (used in {count} AC templates)")
    else:
        print("  [SUCCESS] All macros implemented!")

    # Phase 2 recommendation
    print("\n\n" + "=" * 80)
    print("PHASE 2 RECOMMENDATION")
    print("=" * 80)

    if green_list:
        best_control = green_list[0]
        cid = best_control['control_id'].upper()
        title = best_control.get('title', 'No title')

        print(f"\n[RECOMMENDED] {cid}")
        print(f"Title: {title}")
        print(f"Rules: {len(best_control.get('rules', []))}")
        print(f"Templates: {', '.join(best_control.get('templates', {}).keys())}")
        print("\nRationale:")
        print(f"  - Alphabetically first AC control in GREEN list")
        print(f"  - All templates render successfully")
        print(f"  - Ready for Phase 2 single-control migration test")
        print("\n[VERDICT] GO FOR PHASE 2 MIGRATION")
    else:
        print("\n[CRITICAL] NO CONTROLS READY")
        print("\n[VERDICT] NO-GO - Implement missing macros first")

        if missing_macros:
            print(f"\nRequired actions:")
            print(f"  1. Implement {len(missing_macros)} missing macros in template_processor.py")
            print(f"  2. Re-run this analysis")

    # Summary
    print("\n\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"\nTotal AC controls tested: {len(ac_controls)}")
    print(f"GREEN (ready): {len(green_list)}")
    print(f"RED (blocked): {len(red_list)}")

    if green_list:
        print(f"\n[PASS] {len(green_list)} controls ready for migration")
        print(f"Next step: Migrate {green_list[0]['control_id'].upper()}")
        return 0
    else:
        print(f"\n[FAIL] 0 controls ready for migration")
        print("Next step: Implement missing macros")
        return 1


if __name__ == '__main__':
    sys.exit(main())
