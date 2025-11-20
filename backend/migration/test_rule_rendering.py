#!/usr/bin/env python
"""
Test Script for Per-Rule Template Rendering

This script demonstrates and validates the new per-rule rendering infrastructure
for AC-3 controls with multiple rules having different template variables.

Tests:
1. Single rule rendering with rule-specific variables
2. Multi-rule combination into cohesive scripts
3. Variable validation (no unrendered {{{ }}} markers)
4. Real AC-3 control migration
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from cac_explorer import CACExplorer
from template_processor import TemplateProcessor
from rule_renderer import RuleRenderer


def test_single_rule_rendering():
    """Test rendering a single rule with its specific variables"""
    print("\n" + "="*80)
    print("TEST 1: Single Rule Rendering")
    print("="*80)

    explorer = CACExplorer(r'C:\Users\eclip\Desktop\cac')
    processor = TemplateProcessor(r'C:\Users\eclip\Desktop\cac')
    renderer = RuleRenderer(processor)

    rule_id = 'selinux_policytype'
    print(f"\nRendering rule: {rule_id}")

    # Get rule details
    rule_details = explorer.get_rule_details(rule_id)

    print(f"  Template: {rule_details['template']['name']}")
    print(f"  Variables:")
    for key, value in rule_details['template']['vars'].items():
        print(f"    {key}: {value}")

    # Render
    rendered = renderer.render_rule(rule_details)

    # Validate bash
    bash = rendered['bash']
    print(f"\n  Bash Script: {len(bash)} bytes")

    if '{{{' in bash:
        print("  [FAIL] Unrendered variables found in bash")
        print(f"  Content: {bash[:300]}")
        return False
    else:
        print("  [PASS] No unrendered variables")

    # Check that rule-specific variables were used
    if 'SELINUXTYPE' in bash and '/etc/selinux/config' in bash:
        print("  [PASS] Rule-specific variables correctly applied")
    else:
        print("  [FAIL] Rule-specific variables not found")
        return False

    return True


def test_multi_rule_combination():
    """Test combining multiple rules with different variables"""
    print("\n" + "="*80)
    print("TEST 2: Multi-Rule Combination")
    print("="*80)

    explorer = CACExplorer(r'C:\Users\eclip\Desktop\cac')
    processor = TemplateProcessor(r'C:\Users\eclip\Desktop\cac')
    renderer = RuleRenderer(processor)

    # Two rules with different template variables
    test_rules = [
        'selinux_policytype',  # PATH=/etc/selinux/config, KEY=SELINUXTYPE
        'configure_usbguard_auditbackend'  # PATH=/etc/usbguard/..., KEY=AuditBackend
    ]

    print(f"\nCombining {len(test_rules)} rules:")

    rendered_rules = []
    for rule_id in test_rules:
        print(f"\n  Rendering: {rule_id}")
        rule_details = explorer.get_rule_details(rule_id)

        vars = rule_details['template']['vars']
        print(f"    PATH: {vars.get('PATH', 'N/A')}")
        print(f"    KEY: {vars.get('KEY', 'N/A')}")

        rendered = renderer.render_rule(rule_details)
        rendered_rules.append(rendered)
        print(f"    [OK] Rendered {len(rendered.get('bash', ''))} bytes")

    # Combine
    print(f"\n  Combining bash scripts...")
    combined = renderer.combine_rules(rendered_rules, 'bash')

    print(f"  Combined Script: {len(combined)} bytes")

    # Validate
    if '{{{' in combined:
        print("  [FAIL] Unrendered variables in combined script")
        return False

    # Check both rules' variables are present
    if 'SELINUXTYPE' in combined and 'AuditBackend' in combined:
        print("  [PASS] Both rules' variables present in combined script")
    else:
        print("  [FAIL] Missing rule variables")
        return False

    if '/etc/selinux/config' in combined and '/etc/usbguard/' in combined:
        print("  [PASS] Both rules' paths present in combined script")
    else:
        print("  [FAIL] Missing rule paths")
        return False

    # Check structure
    if '# Rule 1' in combined and '# Rule 2' in combined:
        print("  [PASS] Proper multi-rule structure")
    else:
        print("  [FAIL] Missing rule separators")
        return False

    print("\n  Sample of combined script:")
    print("  " + "-"*70)
    for line in combined.split('\n')[:30]:
        print(f"  {line}")
    print("  ...")

    return True


def test_ac3_control_migration():
    """Test full AC-3 control with multiple rules"""
    print("\n" + "="*80)
    print("TEST 3: AC-3 Control Migration")
    print("="*80)

    explorer = CACExplorer(r'C:\Users\eclip\Desktop\cac')
    processor = TemplateProcessor(r'C:\Users\eclip\Desktop\cac')
    renderer = RuleRenderer(processor)

    control_info = explorer.get_control_info('ac-3')

    print(f"\nControl: AC-3")
    print(f"  Status: {control_info['status']}")
    print(f"  Rules: {len(control_info['rules'])}")

    # Render all rules
    rendered_rules = []
    for rule_id in control_info['rules']:
        try:
            rule_details = explorer.get_rule_details(rule_id)
            if not rule_details.get('templates'):
                continue

            rendered = renderer.render_rule(rule_details)
            rendered_rules.append(rendered)
            print(f"    [OK] {rule_id}")

        except Exception as e:
            print(f"    [SKIP] {rule_id}: {e}")

    print(f"\n  Successfully rendered: {len(rendered_rules)} rules")

    if not rendered_rules:
        print("  [FAIL] No rules rendered")
        return False

    # Combine bash scripts
    bash_scripts = [r for r in rendered_rules if 'bash' in r]
    if bash_scripts:
        combined_bash = renderer.combine_rules(bash_scripts, 'bash')
        print(f"  Combined bash: {len(combined_bash)} bytes")

        if '{{{' in combined_bash:
            print("  [FAIL] Unrendered variables in bash")
            return False
        else:
            print("  [PASS] No unrendered variables in bash")

    # Combine ansible scripts
    ansible_scripts = [r for r in rendered_rules if 'ansible' in r]
    if ansible_scripts:
        combined_ansible = renderer.combine_rules(ansible_scripts, 'ansible')
        print(f"  Combined ansible: {len(combined_ansible)} bytes")

        if '{{{' in combined_ansible:
            print("  [FAIL] Unrendered variables in ansible")
            return False
        else:
            print("  [PASS] No unrendered variables in ansible")

    return True


def test_catalog_validation():
    """Validate that AC-3 was properly migrated to catalog"""
    print("\n" + "="*80)
    print("TEST 4: Catalog Validation")
    print("="*80)

    import json

    catalog_path = Path(__file__).parents[1] / 'data' / 'controls_catalog.json'

    if not catalog_path.exists():
        print(f"  [FAIL] Catalog not found: {catalog_path}")
        return False

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    print(f"\n  Catalog loaded: {len(catalog)} controls")

    # Find AC-3
    ac3 = next((c for c in catalog if c.get('control_id', '').lower() == 'ac-3'), None)

    if not ac3:
        print("  [FAIL] AC-3 not found in catalog")
        return False

    print("  [PASS] AC-3 found in catalog")

    # Check implementation_scripts
    scripts = ac3.get('implementation_scripts', {})
    if 'linux' not in scripts:
        print("  [FAIL] No linux scripts in AC-3")
        return False

    linux = scripts['linux']

    if 'bash' in linux:
        bash = linux['bash']
        print(f"  [PASS] Bash script present: {len(bash)} bytes")

        if '{{{' in bash:
            print("  [FAIL] Unrendered variables in catalog bash script")
            return False
    else:
        print("  [FAIL] No bash script in AC-3")
        return False

    if 'ansible' in linux:
        ansible = linux['ansible']
        print(f"  [PASS] Ansible script present: {len(ansible)} bytes")

        if '{{{' in ansible:
            print("  [FAIL] Unrendered variables in catalog ansible script")
            return False
    else:
        print("  [FAIL] No ansible script in AC-3")
        return False

    # Check metadata
    metadata = ac3.get('metadata', {})
    if metadata.get('has_scripts'):
        print("  [PASS] Metadata: has_scripts=True")
    else:
        print("  [FAIL] Metadata missing or incorrect")
        return False

    if 'CAC_AC3_family_migration' in metadata.get('migration_source', ''):
        print("  [PASS] Migration source recorded")
    else:
        print("  [FAIL] Migration source not recorded")
        return False

    return True


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("PER-RULE TEMPLATE RENDERING TEST SUITE")
    print("="*80)
    print("\nValidating AC-3 control migration with per-rule rendering")

    tests = [
        ("Single Rule Rendering", test_single_rule_rendering),
        ("Multi-Rule Combination", test_multi_rule_combination),
        ("AC-3 Control Migration", test_ac3_control_migration),
        ("Catalog Validation", test_catalog_validation)
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n  [ERROR] Test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status} {test_name}")

    print(f"\nResults: {passed}/{total} tests passed")

    if passed == total:
        print("\n[SUCCESS] All tests passed!")
        return 0
    else:
        print(f"\n[FAILURE] {total - passed} test(s) failed")
        return 1


if __name__ == '__main__':
    sys.exit(main())
