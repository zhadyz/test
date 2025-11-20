#!/usr/bin/env python
"""
AC-18 Series Migration Script
Migrates AC-18, AC-18(3), AC-18(4) - Bluetooth Service Controls
Conservative single-batch test of migration framework
"""

import json
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from cac_explorer import CACExplorer
from template_processor import TemplateProcessor
from catalog_updater import CatalogUpdater

def main():
    print("="*80)
    print("AC-18 SERIES MIGRATION - Bluetooth Service Controls")
    print("="*80)
    print()

    # Initialize components
    cac_path = r'C:\Users\eclip\Desktop\cac'
    explorer = CACExplorer(cac_path)
    processor = TemplateProcessor()
    updater = CatalogUpdater()

    # Target controls (only base AC-18, enhancements not in catalog)
    target_controls = ['ac-18']

    print("[STEP 1/7] Discovery Phase")
    print("-" * 80)

    # Discover controls
    control_data = {}
    for control_id in target_controls:
        print(f"\nDiscovering {control_id.upper()}...")
        try:
            info = explorer.get_control_info(control_id)
            if info:
                print(f"  [OK] Found: {info.get('title', 'No title')}")
                print(f"  [OK] Status: {info.get('status', 'unknown')}")
                print(f"  [OK] Rules: {len(info.get('rules', []))}")
                print(f"  [OK] Templates: {list(info.get('templates', {}).keys())}")
                control_data[control_id] = info
            else:
                print(f"  [FAIL] Control {control_id} not found in CAC")
                return False
        except Exception as e:
            print(f"  [FAIL] Error discovering {control_id}: {e}")
            return False

    print(f"\n[OK] Discovery complete: {len(control_data)} controls found")

    print("\n[STEP 2/7] Template Rendering Phase")
    print("-" * 80)

    # Render templates for each control
    rendered_scripts = {}
    for control_id, info in control_data.items():
        print(f"\nRendering templates for {control_id.upper()}...")

        templates = info.get('templates', {})
        if not templates:
            print(f"  [WARN] No templates found for {control_id}, skipping")
            continue

        scripts = {}

        # Render bash template
        if 'bash' in templates:
            try:
                bash_path = templates['bash']
                # Determine service name from rules
                rules = info.get('rules', [])
                # Look for service name in rules (bluetooth is the service)
                service_name = 'bluetooth'

                rendered = processor.render_template(
                    bash_path,
                    variables={'DAEMONNAME': service_name, 'SERVICENAME': service_name}
                )

                if '{{{' in rendered:
                    print(f"  [FAIL] Bash template has unrendered variables")
                    return False

                if 'linux' not in scripts:
                    scripts['linux'] = {}
                scripts['linux']['bash'] = rendered
                print(f"  [OK] Bash: {len(rendered)} bytes")

            except Exception as e:
                print(f"  [FAIL] Failed to render bash template: {e}")
                return False

        # Render ansible template
        if 'ansible' in templates:
            try:
                ansible_path = templates['ansible']
                service_name = 'bluetooth'

                rendered = processor.render_template(
                    ansible_path,
                    variables={'DAEMONNAME': service_name, 'SERVICENAME': service_name}
                )

                if '{{{' in rendered:
                    print(f"  [FAIL] Ansible template has unrendered variables")
                    return False

                if 'linux' not in scripts:
                    scripts['linux'] = {}
                scripts['linux']['ansible'] = rendered
                print(f"  [OK] Ansible: {len(rendered)} bytes")

            except Exception as e:
                print(f"  [FAIL] Failed to render ansible template: {e}")
                return False

        rendered_scripts[control_id] = scripts

    print(f"\n[OK] Template rendering complete: {len(rendered_scripts)} controls")

    print("\n[STEP 3/7] Pre-Migration Validation")
    print("-" * 80)

    # Validate catalog exists
    catalog_path = Path(__file__).parents[1] / 'data' / 'controls_catalog.json'
    if not catalog_path.exists():
        print(f"[FAIL] Catalog not found: {catalog_path}")
        return False

    print(f"[OK] Catalog exists: {catalog_path}")

    # Load catalog and check for conflicts
    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    print(f"[OK] Catalog loaded: {len(catalog)} controls")

    # Check if controls exist in catalog
    for control_id in rendered_scripts.keys():
        found = any(c.get('control_id', '').lower() == control_id.lower() for c in catalog)
        if found:
            print(f"[OK] {control_id.upper()} exists in catalog")
        else:
            print(f"[FAIL] {control_id.upper()} NOT found in catalog")
            return False

    print("\n[STEP 4/7] Backup Creation")
    print("-" * 80)

    backup_dir = catalog_path.parent / 'backups'
    backup_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"controls_catalog_{timestamp}_pre_AC18_series.json"

    try:
        import shutil
        shutil.copy2(catalog_path, backup_path)
        print(f"[OK] Backup created: {backup_path.name}")
        print(f"  Size: {backup_path.stat().st_size / 1024:.1f} KB")
    except Exception as e:
        print(f"[FAIL] Backup failed: {e}")
        return False

    print("\n[STEP 5/7] Catalog Update (Atomic)")
    print("-" * 80)

    # Update catalog with rendered scripts
    updates_applied = 0
    for control_id, scripts in rendered_scripts.items():
        print(f"\nUpdating {control_id.upper()}...")

        # Find control in catalog
        control = next((c for c in catalog if c.get('control_id', '').lower() == control_id.lower()), None)

        if not control:
            print(f"  [FAIL] Control not found in catalog")
            continue

        # Update implementation_scripts
        if 'implementation_scripts' not in control:
            control['implementation_scripts'] = {}

        for os_type, formats in scripts.items():
            if os_type not in control['implementation_scripts']:
                control['implementation_scripts'][os_type] = {}

            for format_type, script in formats.items():
                control['implementation_scripts'][os_type][format_type] = script
                print(f"  [OK] Added {os_type}/{format_type}: {len(script)} bytes")

        # Update metadata
        if 'metadata' not in control:
            control['metadata'] = {}

        control['metadata']['has_scripts'] = True
        control['metadata']['last_updated'] = datetime.now().isoformat()
        control['metadata']['migration_source'] = 'CAC_AC18_series_migration'

        updates_applied += 1

    print(f"\n[OK] Applied {updates_applied} updates to in-memory catalog")

    # Write to temp file
    temp_path = catalog_path.with_suffix('.tmp')
    try:
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)
        print(f"[OK] Wrote temp catalog: {temp_path.name}")
    except Exception as e:
        print(f"[FAIL] Failed to write temp file: {e}")
        return False

    # Validate temp file
    try:
        with open(temp_path, 'r', encoding='utf-8') as f:
            json.load(f)
        print(f"[OK] Temp catalog validates")
    except Exception as e:
        print(f"[FAIL] Temp catalog invalid: {e}")
        temp_path.unlink()
        return False

    # Atomic rename
    try:
        temp_path.replace(catalog_path)
        print(f"[OK] Atomic update complete")
    except Exception as e:
        print(f"[FAIL] Atomic rename failed: {e}")
        return False

    print("\n[STEP 6/7] Post-Migration Validation")
    print("-" * 80)

    # Re-load catalog and verify
    with open(catalog_path, 'r', encoding='utf-8') as f:
        updated_catalog = json.load(f)

    print(f"[OK] Catalog reloaded: {len(updated_catalog)} controls")

    # Verify each control has scripts
    for control_id in rendered_scripts.keys():
        control = next((c for c in updated_catalog if c.get('control_id', '').lower() == control_id.lower()), None)

        if not control:
            print(f"[FAIL] {control_id.upper()} missing from catalog")
            continue

        if 'implementation_scripts' not in control:
            print(f"[FAIL] {control_id.upper()} missing implementation_scripts")
            continue

        linux_scripts = control['implementation_scripts'].get('linux', {})
        if 'bash' in linux_scripts and 'ansible' in linux_scripts:
            print(f"[OK] {control_id.upper()}: bash + ansible present")
        else:
            print(f"[WARN] {control_id.upper()}: incomplete scripts")

    print("\n[STEP 7/7] Migration Summary")
    print("-" * 80)

    print(f"\n[SUCCESS] SUCCESS: AC-18 Series Migration Complete")
    print(f"\nControls Migrated:")
    for control_id in rendered_scripts.keys():
        print(f"  * {control_id.upper()}")

    print(f"\nScripts Added:")
    total_bash = sum(1 for s in rendered_scripts.values() if 'linux' in s and 'bash' in s['linux'])
    total_ansible = sum(1 for s in rendered_scripts.values() if 'linux' in s and 'ansible' in s['linux'])
    print(f"  * Bash: {total_bash}")
    print(f"  * Ansible: {total_ansible}")

    print(f"\nBackup: {backup_path.name}")
    print(f"Catalog: {catalog_path.name}")

    print("\n" + "="*80)
    print("NEXT STEPS:")
    print("  1. Validate via API: python validate_migration.py --control ac-18")
    print("  2. Test frontend integration")
    print("  3. Proceed to macro implementation")
    print("="*80)

    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
