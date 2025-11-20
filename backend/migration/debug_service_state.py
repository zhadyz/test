#!/usr/bin/env python
"""
Debug script to check what the BaselineService singleton is actually loading
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parents[1]
sys.path.insert(0, str(backend_path))

from services.baseline_service import get_baseline_service, reset_baseline_service

def main():
    print("="*80)
    print("BASELINE SERVICE STATE DEBUG")
    print("="*80)
    print()

    # Force reset to ensure fresh load
    print("[STEP 1] Resetting baseline service singleton...")
    reset_baseline_service()
    print("[OK] Singleton reset")
    print()

    # Get fresh service instance
    print("[STEP 2] Loading baseline service...")
    service = get_baseline_service()
    print("[OK] Service loaded")
    print()

    # Test AC controls
    test_controls = ['ac-2', 'ac-2.4', 'ac-2.5', 'ac-3', 'ac-6.9', 'ac-12', 'ac-17']

    print("[STEP 3] Checking AC control script availability...")
    print("-" * 80)
    print()

    for control_id in test_controls:
        print(f"{control_id.upper()}:")

        # Get control from service
        control = service.get_control_by_id(control_id)

        if not control:
            print(f"  [FAIL] Control not found in service")
            continue

        # Check implementation_scripts
        impl_scripts = control.get('implementation_scripts', {})

        if not impl_scripts:
            print(f"  [FAIL] No implementation_scripts field")
            continue

        print(f"  [OK] implementation_scripts present")
        print(f"  [OK] OS platforms: {list(impl_scripts.keys())}")

        # Check linux scripts
        linux_scripts = impl_scripts.get('linux', {})

        if not linux_scripts:
            print(f"  [WARN] No linux scripts")
            continue

        print(f"  [OK] Linux formats: {list(linux_scripts.keys())}")

        # Check bash
        bash = linux_scripts.get('bash', '')
        if bash and bash != "Not applicable":
            print(f"  [OK] Bash: {len(bash)} bytes")
        else:
            print(f"  [WARN] Bash: MISSING or N/A")

        # Check ansible
        ansible = linux_scripts.get('ansible', '')
        if ansible and ansible != "Not applicable":
            print(f"  [OK] Ansible: {len(ansible)} bytes")
        else:
            print(f"  [WARN] Ansible: MISSING or N/A")

        # Test get_available_formats method
        available = service.get_available_formats(control_id)
        print(f"  [OK] Available formats (via service): {available}")

        print()

    print("="*80)
    print("DEBUG COMPLETE")
    print("="*80)

if __name__ == '__main__':
    main()
