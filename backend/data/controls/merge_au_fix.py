#!/usr/bin/env python3
"""
Fix and re-merge AU family controls from temp_au/ directory.
Issue: Previous merge lost scripts and STIG IDs from source files.
"""
import json
from pathlib import Path
from typing import List, Dict, Any

def natural_sort_key(control_id: str) -> tuple:
    """Generate natural sort key for control IDs (AU-1, AU-2, ..., AU-10, AU-11)."""
    # Handle both "AU-12.1" and "AU-12(1)" formats
    normalized = control_id.upper().replace('AU-', '').replace('(', '.').replace(')', '')
    parts = normalized.split('.')
    base_num = int(parts[0])
    enhancement_num = int(parts[1]) if len(parts) > 1 else -1
    return (base_num, enhancement_num)

def merge_au_controls():
    """Merge all AU-*.json files from temp_au/ into single AU.json."""
    script_dir = Path(__file__).parent
    temp_dir = script_dir / 'temp_au'
    output_file = script_dir / 'AU.json'

    print(f"Scanning {temp_dir} for AU-*.json files...")

    # Find all AU-*.json files
    au_files = sorted(temp_dir.glob('AU-*.json'))
    au_files = [f for f in au_files if not f.name.endswith('_QA_REPORT.json')]

    print(f"Found {len(au_files)} AU control files")

    all_controls = []
    file_count = 0
    control_count = 0

    # Load all controls from each file
    for json_file in au_files:
        try:
            with open(json_file, encoding='utf-8') as f:
                data = json.load(f)

            if isinstance(data, list):
                all_controls.extend(data)
                control_count += len(data)
                file_count += 1
                print(f"  Loaded {len(data):2d} controls from {json_file.name}")
            else:
                print(f"  WARNING: {json_file.name} is not a list, skipping")
        except Exception as e:
            print(f"  ERROR loading {json_file.name}: {e}")

    print(f"\nTotal: {control_count} controls from {file_count} files")

    # Normalize control IDs to lowercase
    for control in all_controls:
        if 'control_id' in control:
            control['control_id'] = control['control_id'].lower()

    # Deduplicate by control_id (keep first occurrence)
    seen = set()
    unique_controls = []
    for control in all_controls:
        cid = control.get('control_id', '')
        if cid and cid not in seen:
            seen.add(cid)
            unique_controls.append(control)
        elif cid:
            print(f"  Skipping duplicate: {cid}")

    print(f"After deduplication: {len(unique_controls)} unique controls")

    # Natural sort
    unique_controls.sort(key=lambda c: natural_sort_key(c['control_id']))

    # Write merged file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(unique_controls, f, indent=2, ensure_ascii=False)

    print(f"\nMerge complete: {output_file}")
    print(f"Total controls: {len(unique_controls)}")
    print(f"First: {unique_controls[0]['control_id']}")
    print(f"Last: {unique_controls[-1]['control_id']}")

    # Validate key fields
    technical = [c for c in unique_controls if c.get('is_technical', False)]
    with_stig = [c for c in unique_controls if c.get('stig_id')]
    with_scripts = []
    for c in technical:
        scripts = c.get('implementation_scripts', {})
        bash = scripts.get('linux', {}).get('bash', '')
        ps = scripts.get('windows', {}).get('powershell', '')
        if (bash and len(bash.strip()) > 10) or (ps and len(ps.strip()) > 10):
            with_scripts.append(c['control_id'])

    print(f"\nData Quality Check:")
    print(f"  Technical controls: {len(technical)}")
    print(f"  Controls with STIG IDs: {len(with_stig)}")
    print(f"  Technical with scripts: {len(with_scripts)}")

    if len(with_scripts) < len(technical):
        print(f"  WARNING: {len(technical) - len(with_scripts)} technical controls missing scripts!")

if __name__ == '__main__':
    merge_au_controls()
