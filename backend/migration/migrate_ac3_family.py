#!/usr/bin/env python
"""
AC-3 Family Migration Script
Migrates AC-3 (base) and AC-3(3) - Access Control Configuration
Phase 3: First migration with new set_config_file macros
"""

import json
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from cac_explorer import CACExplorer
from template_processor import TemplateProcessor
from catalog_updater import CatalogUpdater
from rule_renderer import RuleRenderer

# Mapping: CAC naming (with parentheses) -> Catalog naming (with dots)
CAC_TO_CATALOG_MAPPING = {
    'ac-3': 'ac-3',      # Base control
    'ac-3(3)': 'ac-3.3'  # Enhancement 3
}

def main():
    print("="*80)
    print("AC-3 FAMILY MIGRATION - Access Control Configuration")
    print("="*80)
    print()

    # Initialize components
    cac_path = r'C:\Users\eclip\Desktop\cac'
    explorer = CACExplorer(cac_path)
    processor = TemplateProcessor(cac_path)
    renderer = RuleRenderer(processor)
    updater = CatalogUpdater()

    # Target controls from CAC
    cac_controls = ['ac-3', 'ac-3(3)']

    print("[STEP 1/7] Discovery Phase")
    print("-" * 80)

    # Discover controls in CAC
    control_data = {}
    for cac_id in cac_controls:
        print(f"\nDiscovering {cac_id.upper()} in CAC...")
        try:
            info = explorer.get_control_info(cac_id)
            if info:
                print(f"  [OK] Found: {info.get('title', 'No title')}")
                print(f"  [OK] Status: {info.get('status', 'unknown')}")
                print(f"  [OK] Rules: {len(info.get('rules', []))}")
                print(f"  [OK] Templates: {list(info.get('templates', {}).keys())}")
                control_data[cac_id] = info
            else:
                print(f"  [WARN] Control {cac_id} not found in CAC, skipping")
        except Exception as e:
            print(f"  [ERROR] Error discovering {cac_id}: {e}")

    if not control_data:
        print("\n[FAIL] No controls discovered")
        return False

    print(f"\n[OK] Discovery complete: {len(control_data)} controls found in CAC")

    print("\n[STEP 2/7] Per-Rule Template Rendering Phase")
    print("-" * 80)

    # Render templates for each control using per-rule rendering
    rendered_scripts = {}
    for cac_id, info in control_data.items():
        catalog_id = CAC_TO_CATALOG_MAPPING.get(cac_id, cac_id)
        print(f"\nRendering templates for {cac_id.upper()} (catalog: {catalog_id})...")

        rules = info.get('rules', [])
        if not rules:
            print(f"  [WARN] No rules found for {cac_id}, skipping")
            continue

        print(f"  Found {len(rules)} rules to render")

        # Render each rule individually with its own variables
        rendered_rules = []
        for rule_id in rules:
            print(f"\n  Rendering rule: {rule_id}")
            try:
                # Get rule details with template variables
                rule_details = explorer.get_rule_details(rule_id)

                # Check if rule has templates
                if not rule_details.get('templates'):
                    print(f"    [SKIP] No templates found for {rule_id}")
                    continue

                # Render rule with rule-specific variables
                rendered_rule = renderer.render_rule(rule_details, product='rhel8')

                # Validate rendering
                bash_valid = 'bash' in rendered_rule and '{{{' not in rendered_rule['bash']
                ansible_valid = 'ansible' in rendered_rule and '{{{' not in rendered_rule['ansible']

                if bash_valid:
                    print(f"    [OK] Bash: {len(rendered_rule['bash'])} bytes")
                else:
                    print(f"    [WARN] Bash rendering incomplete or missing")

                if ansible_valid:
                    print(f"    [OK] Ansible: {len(rendered_rule['ansible'])} bytes")
                else:
                    print(f"    [WARN] Ansible rendering incomplete or missing")

                if bash_valid or ansible_valid:
                    rendered_rules.append(rendered_rule)

            except Exception as e:
                print(f"    [ERROR] Failed to render {rule_id}: {e}")
                import traceback
                traceback.print_exc()
                continue

        if not rendered_rules:
            print(f"  [WARN] No rules successfully rendered for {cac_id}")
            continue

        # Combine rendered rules into single script per format
        scripts = {'linux': {}}

        try:
            # Combine bash scripts
            bash_rules = [r for r in rendered_rules if 'bash' in r]
            if bash_rules:
                if len(bash_rules) == 1:
                    scripts['linux']['bash'] = bash_rules[0]['bash']
                else:
                    scripts['linux']['bash'] = renderer.combine_rules(bash_rules, 'bash')
                print(f"  [OK] Combined {len(bash_rules)} bash scripts: {len(scripts['linux']['bash'])} bytes")

            # Combine ansible scripts
            ansible_rules = [r for r in rendered_rules if 'ansible' in r]
            if ansible_rules:
                if len(ansible_rules) == 1:
                    scripts['linux']['ansible'] = ansible_rules[0]['ansible']
                else:
                    scripts['linux']['ansible'] = renderer.combine_rules(ansible_rules, 'ansible')
                print(f"  [OK] Combined {len(ansible_rules)} ansible scripts: {len(scripts['linux']['ansible'])} bytes")

        except Exception as e:
            print(f"  [ERROR] Failed to combine rules: {e}")
            import traceback
            traceback.print_exc()
            return False

        rendered_scripts[catalog_id] = scripts

    print(f"\n[OK] Per-rule rendering complete: {len(rendered_scripts)} controls")

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
    for catalog_id in rendered_scripts.keys():
        found = any(c.get('control_id', '').lower() == catalog_id.lower() for c in catalog)
        if found:
            print(f"[OK] {catalog_id.upper()} exists in catalog")
        else:
            print(f"[FAIL] {catalog_id.upper()} NOT found in catalog")
            return False

    print("\n[STEP 4/7] Backup Creation")
    print("-" * 80)

    backup_dir = catalog_path.parent / 'backups'
    backup_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"controls_catalog_{timestamp}_pre_AC3_family.json"

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
    for catalog_id, scripts in rendered_scripts.items():
        print(f"\nUpdating {catalog_id.upper()}...")

        # Find control in catalog
        control = next((c for c in catalog if c.get('control_id', '').lower() == catalog_id.lower()), None)

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
        control['metadata']['migration_source'] = 'CAC_AC3_family_migration'

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
    for catalog_id in rendered_scripts.keys():
        control = next((c for c in updated_catalog if c.get('control_id', '').lower() == catalog_id.lower()), None)

        if not control:
            print(f"[FAIL] {catalog_id.upper()} missing from catalog")
            continue

        if 'implementation_scripts' not in control:
            print(f"[FAIL] {catalog_id.upper()} missing implementation_scripts")
            continue

        linux_scripts = control['implementation_scripts'].get('linux', {})
        if 'bash' in linux_scripts and 'ansible' in linux_scripts:
            print(f"[OK] {catalog_id.upper()}: bash + ansible present")
        else:
            print(f"[WARN] {catalog_id.upper()}: incomplete scripts")

    print("\n[STEP 7/7] Migration Summary")
    print("-" * 80)

    print(f"\n[SUCCESS] AC-3 Family Migration Complete")
    print(f"\nControls Migrated:")
    for catalog_id in rendered_scripts.keys():
        cac_id = next((k for k, v in CAC_TO_CATALOG_MAPPING.items() if v == catalog_id), catalog_id)
        print(f"  * {catalog_id.upper()} (CAC: {cac_id})")

    print(f"\nScripts Added:")
    total_bash = sum(1 for s in rendered_scripts.values() if 'linux' in s and 'bash' in s['linux'])
    total_ansible = sum(1 for s in rendered_scripts.values() if 'linux' in s and 'ansible' in s['linux'])
    print(f"  * Bash: {total_bash}")
    print(f"  * Ansible: {total_ansible}")

    print(f"\nBackup: {backup_path.name}")
    print(f"Catalog: {catalog_path.name}")

    print("\n" + "="*80)
    print("NEXT STEPS:")
    print("  1. Validate via API: python validate_migration.py --control ac-3")
    print("  2. Test frontend integration")
    print("  3. Proceed to AC-4 family migration")
    print("="*80)

    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
