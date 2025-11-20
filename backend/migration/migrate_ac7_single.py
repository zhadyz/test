#!/usr/bin/env python
"""
AC-7 Single Control Migration Script
Migrates AC-7 (base) - Ensure the audit Subsystem is Installed
Phase 5: Continuing alphabetical migration (skipping blocked controls)
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

def main():
    print("="*80)
    print("AC-7 MIGRATION - Ensure Audit Subsystem Installed")
    print("="*80)
    print()

    # Initialize components
    cac_path = r'C:\Users\eclip\Desktop\cac'
    explorer = CACExplorer(cac_path)
    processor = TemplateProcessor(cac_path)
    renderer = RuleRenderer(processor)
    updater = CatalogUpdater()

    # Target control
    cac_id = 'ac-7'
    catalog_id = 'ac-7'

    print("[STEP 1/7] Discovery Phase")
    print("-" * 80)

    # Discover control in CAC
    print(f"\nDiscovering {cac_id.upper()} in CAC...")
    try:
        info = explorer.get_control_info(cac_id)
        if not info:
            print(f"  [FAIL] Control {cac_id} not found in CAC")
            return False

        print(f"  [OK] Found: {info.get('title', 'No title')}")
        print(f"  [OK] Status: {info.get('status', 'unknown')}")
        print(f"  [OK] Rules: {len(info.get('rules', []))}")
        print(f"  [OK] Templates: {list(info.get('templates', {}).keys())}")
    except Exception as e:
        print(f"  [ERROR] Error discovering {cac_id}: {e}")
        return False

    print(f"\n[OK] Discovery complete")

    print("\n[STEP 2/7] Per-Rule Template Rendering Phase")
    print("-" * 80)

    rules = info.get('rules', [])
    if not rules:
        print(f"  [WARN] No rules found for {cac_id}")
        return False

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
            continue

    if not rendered_rules:
        print(f"\n  [FAIL] No rules successfully rendered for {cac_id}")
        return False

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
        return False

    print(f"\n[OK] Per-rule rendering complete")

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

    # Check if control exists in catalog
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
    backup_path = backup_dir / f"controls_catalog_{timestamp}_pre_AC7.json"

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
    print(f"\nUpdating {catalog_id.upper()}...")

    # Find control in catalog
    control = next((c for c in catalog if c.get('control_id', '').lower() == catalog_id.lower()), None)

    if not control:
        print(f"  [FAIL] Control not found in catalog")
        return False

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
    control['metadata']['migration_source'] = 'CAC_AC7_single_migration'

    print(f"\n[OK] Applied updates to in-memory catalog")

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

    # Verify control has scripts
    control = next((c for c in updated_catalog if c.get('control_id', '').lower() == catalog_id.lower()), None)

    if not control:
        print(f"[FAIL] {catalog_id.upper()} missing from catalog")
        return False

    if 'implementation_scripts' not in control:
        print(f"[FAIL] {catalog_id.upper()} missing implementation_scripts")
        return False

    linux_scripts = control['implementation_scripts'].get('linux', {})
    if 'bash' in linux_scripts and 'ansible' in linux_scripts:
        print(f"[OK] {catalog_id.upper()}: bash + ansible present")
    else:
        print(f"[WARN] {catalog_id.upper()}: incomplete scripts")

    print("\n[STEP 7/7] Migration Summary")
    print("-" * 80)

    print(f"\n[SUCCESS] AC-7 Migration Complete")
    print(f"\nControl Migrated: {catalog_id.upper()}")

    total_bash = 1 if 'bash' in scripts['linux'] else 0
    total_ansible = 1 if 'ansible' in scripts['linux'] else 0
    print(f"\nScripts Added:")
    print(f"  * Bash: {total_bash}")
    print(f"  * Ansible: {total_ansible}")

    print(f"\nBackup: {backup_path.name}")
    print(f"Catalog: {catalog_path.name}")

    print("\n" + "="*80)
    print("NEXT STEPS:")
    print("  1. Validate via API: python validate_migration.py --control ac-7")
    print("  2. Test frontend integration")
    print("  3. Continue to next migration-ready control")
    print("="*80)

    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
