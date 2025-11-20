#!/usr/bin/env python
"""
AC Family Validation Script
Validates all AC controls in the catalog and generates migration status report
"""

import json
import sys
from pathlib import Path
from datetime import datetime

def main():
    print("="*80)
    print("AC FAMILY MIGRATION VALIDATION")
    print("="*80)
    print()

    # Load catalog
    catalog_path = Path(__file__).parents[1] / 'data' / 'controls_catalog.json'

    if not catalog_path.exists():
        print(f"[FAIL] Catalog not found: {catalog_path}")
        return False

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    print(f"[OK] Catalog loaded: {len(catalog)} total controls")
    print()

    # Expected AC controls based on migration
    expected_ac_controls = [
        'ac-2', 'ac-2.4', 'ac-2.5',
        'ac-3', 'ac-3.3',
        'ac-6', 'ac-6.1', 'ac-6.9',
        'ac-7',
        'ac-12',
        'ac-17',  # AC-17.1 not migrated (no templates)
        'ac-18', 'ac-18.3', 'ac-18.4'
    ]

    # Find AC controls in catalog
    ac_controls = [c for c in catalog if c.get('control_id', '').lower().startswith('ac-')]
    ac_controls_sorted = sorted(ac_controls, key=lambda x: x.get('control_id', ''))

    print(f"Total AC controls in catalog: {len(ac_controls)}")
    print()

    # Validation results
    print("="*80)
    print("MIGRATION STATUS BY CONTROL")
    print("="*80)
    print()

    total_migrated = 0
    total_with_bash = 0
    total_with_ansible = 0
    total_complete = 0

    for control_id in expected_ac_controls:
        control = next((c for c in catalog if c.get('control_id', '').lower() == control_id.lower()), None)

        if not control:
            print(f"[FAIL] {control_id.upper()}: NOT FOUND IN CATALOG")
            continue

        print(f"{control_id.upper()}: {control.get('title', 'No title')}")

        # Check implementation_scripts
        impl_scripts = control.get('implementation_scripts', {})
        linux_scripts = impl_scripts.get('linux', {})

        has_bash = 'bash' in linux_scripts and len(linux_scripts['bash']) > 0
        has_ansible = 'ansible' in linux_scripts and len(linux_scripts['ansible']) > 0

        if has_bash:
            bash_size = len(linux_scripts['bash'])
            print(f"  [OK] Bash: {bash_size:,} bytes")
            total_with_bash += 1
        else:
            print(f"  [WARN] Bash: NOT PRESENT")

        if has_ansible:
            ansible_size = len(linux_scripts['ansible'])
            print(f"  [OK] Ansible: {ansible_size:,} bytes")
            total_with_ansible += 1
        else:
            print(f"  [WARN] Ansible: NOT PRESENT")

        # Check metadata
        metadata = control.get('metadata', {})
        migration_source = metadata.get('migration_source', 'Unknown')
        last_updated = metadata.get('last_updated', 'Unknown')

        print(f"  Source: {migration_source}")
        print(f"  Updated: {last_updated}")

        if has_bash and has_ansible:
            print(f"  Status: [OK] COMPLETE")
            total_complete += 1
        elif has_bash or has_ansible:
            print(f"  Status: [WARN] PARTIAL")
        else:
            print(f"  Status: [FAIL] NO SCRIPTS")

        total_migrated += 1
        print()

    # Summary
    print("="*80)
    print("SUMMARY")
    print("="*80)
    print()
    print(f"Expected controls: {len(expected_ac_controls)}")
    print(f"Found in catalog: {total_migrated}")
    print(f"With bash scripts: {total_with_bash}")
    print(f"With ansible scripts: {total_with_ansible}")
    print(f"Complete (bash + ansible): {total_complete}")
    print()

    # Calculate percentages
    if total_migrated > 0:
        complete_pct = (total_complete / total_migrated) * 100
        bash_pct = (total_with_bash / total_migrated) * 100
        ansible_pct = (total_with_ansible / total_migrated) * 100

        print(f"Completion rate: {complete_pct:.1f}%")
        print(f"Bash coverage: {bash_pct:.1f}%")
        print(f"Ansible coverage: {ansible_pct:.1f}%")

    print()

    # Overall status
    if total_complete == total_migrated:
        print("[SUCCESS] ALL CONTROLS FULLY MIGRATED")
        return True
    elif total_migrated == len(expected_ac_controls):
        print("[WARN] ALL CONTROLS PRESENT, SOME PARTIAL")
        return True
    else:
        print("[FAIL] SOME CONTROLS MISSING")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
