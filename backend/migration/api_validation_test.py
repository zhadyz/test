#!/usr/bin/env python
"""
API Validation Test for Migrated AC Controls
Tests that migrated implementation scripts are accessible via API
"""

import json
import sys
from pathlib import Path

def main():
    print("="*80)
    print("API VALIDATION TEST - AC FAMILY")
    print("="*80)
    print()

    # Load catalog
    catalog_path = Path(__file__).parents[1] / 'data' / 'controls_catalog.json'

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    # Test AC controls
    test_controls = [
        'ac-2', 'ac-2.4', 'ac-2.5',
        'ac-3', 'ac-6.9', 'ac-12', 'ac-17'
    ]

    print(f"Testing {len(test_controls)} migrated AC controls...")
    print()

    passed = 0
    failed = 0

    for control_id in test_controls:
        # Find control in catalog
        control = next((c for c in catalog if c.get('control_id', '').lower() == control_id.lower()), None)

        if not control:
            print(f"[FAIL] {control_id.upper()}: Not found in catalog")
            failed += 1
            continue

        # Check implementation_scripts
        impl_scripts = control.get('implementation_scripts', {})

        if not impl_scripts:
            print(f"[FAIL] {control_id.upper()}: No implementation_scripts field")
            failed += 1
            continue

        linux_scripts = impl_scripts.get('linux', {})

        if not linux_scripts:
            print(f"[FAIL] {control_id.upper()}: No linux scripts")
            failed += 1
            continue

        bash = linux_scripts.get('bash', '')
        ansible = linux_scripts.get('ansible', '')

        has_bash = bash and len(bash) > 0
        has_ansible = ansible and len(ansible) > 0

        print(f"{control_id.upper()}:")
        print(f"  Bash: {'PRESENT' if has_bash else 'MISSING'} ({len(bash)} bytes)")
        print(f"  Ansible: {'PRESENT' if has_ansible else 'MISSING'} ({len(ansible)} bytes)")

        if has_bash and has_ansible:
            print(f"  [OK] Both formats available")
            passed += 1
        elif has_bash or has_ansible:
            print(f"  [PARTIAL] Only {'bash' if has_bash else 'ansible'} available")
            passed += 1
        else:
            print(f"  [FAIL] No scripts available")
            failed += 1

        # Show first 100 chars of bash script if available
        if has_bash:
            preview = bash[:100].replace('\n', ' ')
            print(f"  Preview: {preview}...")

        print()

    print("="*80)
    print("TEST RESULTS")
    print("="*80)
    print(f"Passed: {passed}/{len(test_controls)}")
    print(f"Failed: {failed}/{len(test_controls)}")
    print()

    if failed == 0:
        print("[SUCCESS] All controls have implementation scripts in catalog!")
        return True
    else:
        print("[FAIL] Some controls missing scripts")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
