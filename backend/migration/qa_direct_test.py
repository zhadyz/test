#!/usr/bin/env python
"""
Direct QA Test - Test specific AC controls directly

Bypasses slow control discovery, directly tests known AC controls.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from cac_explorer import CACExplorer
from template_processor import TemplateProcessor


def test_single_control(explorer, processor, control_id):
    """Test a single control"""
    print(f"\n{'='*80}")
    print(f"TESTING: {control_id.upper()}")
    print('='*80)

    try:
        # Get control info
        control = explorer.get_control_info(control_id)

        print(f"Title: {control.get('title', 'No title')}")
        print(f"Status: {control['status']}")
        print(f"Rules: {len(control.get('rules', []))}")

        if not control.get('templates'):
            print("[SKIP] No templates available")
            return None

        print(f"Templates: {list(control['templates'].keys())}")

        # Test rendering each template
        results = {
            'control_id': control_id.upper(),
            'title': control.get('title', ''),
            'success': True,
            'errors': []
        }

        for template_format, template_path in control['templates'].items():
            print(f"\n  [TESTING] {template_format} template...")

            try:
                rendered = processor.render_template(
                    template_path,
                    variables={
                        'SERVICENAME': 'auditd',
                        'DAEMONNAME': 'auditd',
                        'PACKAGENAME': 'audit',
                        'PATH': '/etc/test.conf',
                        'KEY': 'test_key',
                        'VALUE': 'test_value',
                        'SEP': '=',
                        'TEXT': 'test_line',
                        'rule_title': control.get('title', ''),
                    },
                    product="rhel8"
                )

                if "JINJA TEMPLATE ERROR" in rendered:
                    print(f"  [FAIL] Jinja2 error in rendered output")
                    results['success'] = False
                    results['errors'].append(f"{template_format}: Jinja2 error")
                elif not processor.validate_rendered_script(rendered):
                    print(f"  [FAIL] Script validation failed")
                    results['success'] = False
                    results['errors'].append(f"{template_format}: Validation failed")
                else:
                    print(f"  [PASS] Rendered successfully ({len(rendered)} bytes)")
                    # Show first few lines
                    lines = rendered.split('\n')[:3]
                    for line in lines:
                        if line.strip():
                            print(f"    {line[:70]}")

            except Exception as e:
                error_msg = str(e)
                print(f"  [FAIL] {error_msg[:100]}")
                results['success'] = False
                results['errors'].append(f"{template_format}: {error_msg[:80]}")

        return results

    except Exception as e:
        print(f"[ERROR] Failed to get control: {e}")
        return None


def main():
    print("\n" + "="*80)
    print("LOVELESS QA: DIRECT AC CONTROLS TEST")
    print("="*80)

    # Initialize
    print("\n[INFO] Initializing frameworks...")
    explorer = CACExplorer(r"C:\Users\eclip\Desktop\cac")
    processor = TemplateProcessor(cac_path=r"C:\Users\eclip\Desktop\cac")

    # Test specific AC controls (manually curated list)
    test_controls = [
        'ac-2',   # Account Management - KNOWN WORKING
        'ac-3',   # Access Enforcement
        'ac-6',   # Least Privilege
        'ac-7',   # Unsuccessful Logon Attempts
        'ac-8',   # System Use Notification
        'ac-11',  # Device Lock
        'ac-12',  # Session Termination
        'ac-17',  # Remote Access
        'ac-18',  # Wireless Access
        'ac-19',  # Access Control for Mobile Devices
    ]

    results = []

    for control_id in test_controls:
        result = test_single_control(explorer, processor, control_id)
        if result:
            results.append(result)

    # Summary
    print("\n\n" + "="*80)
    print("TEST RESULTS SUMMARY")
    print("="*80)

    green_list = [r for r in results if r['success']]
    red_list = [r for r in results if not r['success']]

    print(f"\n[PASS] GREEN LIST: {len(green_list)} controls ready")
    print("-"*80)
    for r in green_list:
        print(f"  {r['control_id']:8} - {r['title'][:60]}")

    print(f"\n[FAIL] RED LIST: {len(red_list)} controls blocked")
    print("-"*80)
    for r in red_list:
        print(f"  {r['control_id']:8} - {r['title'][:60]}")
        for error in r['errors']:
            print(f"    - {error}")

    # Recommendation
    print("\n\n" + "="*80)
    print("PHASE 2 RECOMMENDATION")
    print("="*80)

    if green_list:
        best = green_list[0]
        print(f"\n[RECOMMENDED] {best['control_id']}")
        print(f"Title: {best['title']}")
        print(f"\nRationale: First AC control in GREEN list, all templates render successfully")
        print("\n[VERDICT] GO FOR PHASE 2 MIGRATION")
        return 0
    else:
        print("\n[CRITICAL] No controls ready for migration")
        print("\n[VERDICT] NO-GO - Implement missing macros first")
        return 1


if __name__ == '__main__':
    sys.exit(main())
