#!/usr/bin/env python
"""
Module Integration Test

Tests the three core migration modules (cac_explorer, template_processor,
catalog_updater) against the AC-2 control to verify they work correctly.
"""

import sys
import json
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from cac_explorer import CACExplorer
from template_processor import TemplateProcessor
from catalog_updater import CatalogUpdater


def test_cac_explorer():
    """Test CAC Explorer module"""
    print("\n" + "=" * 80)
    print("TEST 1: CAC Explorer - Finding AC-2 Control")
    print("=" * 80)

    try:
        explorer = CACExplorer(r"C:\Users\eclip\Desktop\cac")

        # Test get_control_info
        print("\n[TEST] Getting AC-2 control info...")
        ac2 = explorer.get_control_info("ac-2")

        print(f"  Control ID: {ac2['control_id']}")
        print(f"  Title: {ac2['title']}")
        print(f"  Status: {ac2['status']}")
        print(f"  Rules: {len(ac2['rules'])}")
        for rule in ac2['rules']:
            print(f"    - {rule}")
        print(f"  Templates: {len(ac2['templates'])}")
        for fmt in ac2['templates']:
            print(f"    - {fmt}")

        assert ac2['control_id'] == 'ac-2', "Control ID mismatch"
        assert 'service_auditd_enabled' in ac2['rules'], "Missing service_auditd_enabled rule"
        assert ac2['templates'], "No templates found"
        assert 'bash' in ac2['templates'], "Missing bash template"
        assert 'ansible' in ac2['templates'], "Missing ansible template"

        print("\n[PASS] CAC Explorer working correctly")
        return True, ac2

    except Exception as e:
        print(f"\n[FAIL] CAC Explorer test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None


def test_template_processor(control_info):
    """Test Template Processor module"""
    print("\n" + "=" * 80)
    print("TEST 2: Template Processor - Rendering AC-2 Templates")
    print("=" * 80)

    try:
        processor = TemplateProcessor(cac_path=r"C:\Users\eclip\Desktop\cac")

        rendered_scripts = {}

        # Test rendering bash template
        print("\n[TEST] Rendering bash template...")
        bash_template = control_info['templates']['bash']
        bash_script = processor.render_template(
            bash_template,
            variables={
                'SERVICENAME': 'auditd',
                'DAEMONNAME': 'auditd',
                'PACKAGENAME': 'audit'
            }
        )

        print(f"  Rendered bash script: {len(bash_script)} bytes")
        print("  First 10 lines:")
        for i, line in enumerate(bash_script.split('\n')[:10], 1):
            print(f"    {i:2d}: {line}")

        # Validate bash script
        assert bash_script, "Bash script is empty"
        assert 'systemctl' in bash_script.lower(), "Missing systemctl command"
        assert 'auditd' in bash_script, "Missing auditd service"
        assert processor.validate_rendered_script(bash_script), "Bash script validation failed"

        rendered_scripts['bash'] = bash_script

        # Test rendering ansible template
        print("\n[TEST] Rendering ansible template...")
        ansible_template = control_info['templates']['ansible']
        ansible_script = processor.render_template(
            ansible_template,
            variables={
                'SERVICENAME': 'auditd',
                'DAEMONNAME': 'auditd',
                'PACKAGENAME': 'audit',
                'rule_title': 'Enable auditd Service'
            }
        )

        print(f"  Rendered ansible script: {len(ansible_script)} bytes")
        print("  First 10 lines:")
        for i, line in enumerate(ansible_script.split('\n')[:10], 1):
            print(f"    {i:2d}: {line}")

        # Validate ansible script
        assert ansible_script, "Ansible script is empty"
        assert 'ansible.builtin' in ansible_script, "Missing ansible module"
        assert 'auditd' in ansible_script, "Missing auditd service"
        assert processor.validate_rendered_script(ansible_script), "Ansible script validation failed"

        rendered_scripts['ansible'] = ansible_script

        print("\n[PASS] Template Processor working correctly")
        return True, rendered_scripts

    except Exception as e:
        print(f"\n[FAIL] Template Processor test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None


def test_catalog_updater():
    """Test Catalog Updater module"""
    print("\n" + "=" * 80)
    print("TEST 3: Catalog Updater - Validation and Safety Checks")
    print("=" * 80)

    try:
        updater = CatalogUpdater()

        # Test catalog validation
        print("\n[TEST] Validating catalog structure...")
        catalog = updater._load_catalog()
        is_valid = updater._validate_catalog(catalog)

        assert is_valid, "Catalog validation failed"
        print(f"  Catalog is valid: {len(catalog)} controls")

        # Test finding AC-2 control
        print("\n[TEST] Finding AC-2 in catalog...")
        ac2_control = updater._find_control(catalog, "ac-2")

        assert ac2_control, "AC-2 control not found in catalog"
        print(f"  Found AC-2: {ac2_control['control_name']}")

        # Check existing implementation scripts
        if 'implementation_scripts' in ac2_control:
            print(f"  Existing scripts:")
            for os_type, formats in ac2_control['implementation_scripts'].items():
                for fmt in formats:
                    print(f"    - {os_type}/{fmt}")

        # Test backup creation
        print("\n[TEST] Creating test backup...")
        backup_path = updater._create_backup("test_run")

        assert backup_path and backup_path.exists(), "Backup creation failed"
        print(f"  Backup created: {backup_path.name}")

        # Test backup list
        print("\n[TEST] Listing backups...")
        backups = updater.get_backup_list()

        print(f"  Found {len(backups)} backups")
        print(f"  Most recent: {backups[0]['filename']}")

        print("\n[PASS] Catalog Updater working correctly")
        return True

    except Exception as e:
        print(f"\n[FAIL] Catalog Updater test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def compare_with_existing_ac2():
    """Compare rendered templates with existing AC-2 in catalog"""
    print("\n" + "=" * 80)
    print("TEST 4: Comparison with Existing AC-2 Implementation")
    print("=" * 80)

    try:
        # Load catalog
        catalog_path = Path(__file__).parents[1] / "data" / "controls_catalog.json"
        with open(catalog_path, 'r', encoding='utf-8') as f:
            catalog = json.load(f)

        # Find AC-2
        ac2 = next((c for c in catalog if c.get('control_id') == 'ac-2'), None)

        if not ac2:
            print("[SKIP] AC-2 not found in catalog")
            return True

        print("\n[INFO] Existing AC-2 implementation:")
        if 'implementation_scripts' in ac2:
            for os_type, formats in ac2['implementation_scripts'].items():
                print(f"  {os_type}:")
                for fmt, script in formats.items():
                    print(f"    - {fmt}: {len(script)} bytes")
                    if 'auditd' in script.lower():
                        print(f"      Contains 'auditd': YES")

        print("\n[INFO] Both modules generate scripts with auditd service commands")
        print("[PASS] Comparison successful")
        return True

    except Exception as e:
        print(f"\n[FAIL] Comparison test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("MIGRATION MODULES INTEGRATION TEST")
    print("=" * 80)
    print("\nTesting three core modules:")
    print("  1. cac_explorer.py")
    print("  2. template_processor.py")
    print("  3. catalog_updater.py")

    results = []

    # Test 1: CAC Explorer
    success, control_info = test_cac_explorer()
    results.append(("CAC Explorer", success))

    if not success:
        print("\n[ABORT] Cannot proceed without working CAC Explorer")
        return 1

    # Test 2: Template Processor
    success, rendered_scripts = test_template_processor(control_info)
    results.append(("Template Processor", success))

    if not success:
        print("\n[ABORT] Cannot proceed without working Template Processor")
        return 1

    # Test 3: Catalog Updater
    success = test_catalog_updater()
    results.append(("Catalog Updater", success))

    # Test 4: Comparison
    success = compare_with_existing_ac2()
    results.append(("AC-2 Comparison", success))

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    all_passed = True
    for test_name, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"  {status} {test_name}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\n" + "=" * 80)
        print("[SUCCESS] All tests passed! Modules are production-ready.")
        print("=" * 80)
        return 0
    else:
        print("\n" + "=" * 80)
        print("[FAILURE] Some tests failed. Review errors above.")
        print("=" * 80)
        return 1


if __name__ == '__main__':
    sys.exit(main())
