#!/usr/bin/env python3
"""Validate AU.json data quality."""
import json
from pathlib import Path
from collections import Counter

def validate_au_json():
    """Validate AU.json structure and content."""
    au_file = Path(__file__).parent / 'AU.json'

    with open(au_file, encoding='utf-8') as f:
        data = json.load(f)

    print("=" * 60)
    print("AU.JSON DATA QUALITY VALIDATION")
    print("=" * 60)

    # Basic counts
    print(f"\n[1] Total controls: {len(data)}")
    print(f"    First: {data[0]['control_id']}")
    print(f"    Last: {data[-1]['control_id']}")

    # Check for duplicates
    control_ids = [c['control_id'] for c in data]
    duplicates = {k: v for k, v in Counter(control_ids).items() if v > 1}
    print(f"\n[2] Duplicate check: {'PASS' if not duplicates else f'FAIL - {duplicates}'}")

    # Check required fields
    required_fields = ['control_id', 'control_name', 'family', 'family_id', 'is_technical', 'metadata']
    missing_fields = []
    for control in data:
        for field in required_fields:
            if field not in control:
                missing_fields.append(f"{control['control_id']} missing {field}")
    print(f"\n[3] Required fields: {'PASS' if not missing_fields else f'FAIL - {len(missing_fields)} issues'}")
    if missing_fields[:3]:
        print(f"    Samples: {missing_fields[:3]}")

    # Technical controls analysis
    technical = [c for c in data if c.get('is_technical', False)]
    print(f"\n[4] Technical controls: {len(technical)}/{len(data)} ({len(technical)*100//len(data)}%)")

    # Check scripts for technical controls
    missing_scripts = []
    for control in technical:
        scripts = control.get('implementation_scripts', {})
        linux_bash = scripts.get('linux', {}).get('bash', '')
        windows_ps = scripts.get('windows', {}).get('powershell', '')
        has_linux = bool(linux_bash and len(linux_bash.strip()) > 10)
        has_windows = bool(windows_ps and len(windows_ps.strip()) > 10)
        if not (has_linux or has_windows):
            missing_scripts.append(control['control_id'])

    print(f"\n[5] Implementation scripts: {'PASS' if not missing_scripts else f'WARN - {len(missing_scripts)} technical controls missing scripts'}")
    if missing_scripts[:5]:
        print(f"    Missing scripts: {missing_scripts[:5]}")

    # Check STIG IDs for technical controls
    missing_stig = []
    for control in technical:
        stig = control.get('stig_id', '')
        if not stig or len(str(stig).strip()) == 0:
            missing_stig.append(control['control_id'])

    print(f"\n[6] STIG IDs: {len(technical) - len(missing_stig)}/{len(technical)} technical controls have STIG mappings")
    if missing_stig[:5]:
        print(f"    Missing STIG: {missing_stig[:5]}")

    # Natural sorting verification
    print(f"\n[7] Natural sorting verification:")
    print(f"    Base controls (first 16): {control_ids[:16]}")
    base_correct = control_ids[:16] == [f'au-{i}' for i in range(1, 17)]
    print(f"    Sequence: {'PASS' if base_correct else 'FAIL'}")

    # CAC metadata check
    has_cac = sum(1 for c in data if 'cac_metadata' in c)
    print(f"\n[8] CAC metadata: {has_cac}/{len(data)} controls ({has_cac*100//len(data)}%)")

    print("\n" + "=" * 60)
    print("VALIDATION COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    validate_au_json()
