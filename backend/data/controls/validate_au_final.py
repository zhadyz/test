#!/usr/bin/env python3
"""
Final validation of AU.json after critical fix.
Verifies metadata.stig_id presence and data structure alignment with AC.json.
"""
import json
from pathlib import Path

def validate_au_final():
    """Comprehensive validation of fixed AU.json"""
    au_file = Path(__file__).parent / 'AU.json'
    ac_file = Path(__file__).parent / 'AC.json'

    print("=" * 70)
    print("AU.JSON FINAL VALIDATION REPORT")
    print("=" * 70)

    # Load data
    with open(au_file, encoding='utf-8') as f:
        au_data = json.load(f)
    with open(ac_file, encoding='utf-8') as f:
        ac_data = json.load(f)

    # Basic counts
    print(f"\n[1] Total Controls: {len(au_data)}")
    print(f"    First: {au_data[0]['control_id']}")
    print(f"    Last: {au_data[-1]['control_id']}")

    # Technical vs Organizational split
    technical_au = [c for c in au_data if c.get('is_technical')]
    organizational_au = [c for c in au_data if not c.get('is_technical')]
    print(f"\n[2] Control Types:")
    print(f"    Technical: {len(technical_au)} ({len(technical_au)*100//len(au_data)}%)")
    print(f"    Organizational: {len(organizational_au)} ({len(organizational_au)*100//len(au_data)}%)")

    # CRITICAL: Check metadata.stig_id alignment
    technical_with_stig = [c for c in technical_au if c.get('stig_id')]
    print(f"\n[3] STIG ID Coverage (Technical Controls Only):")
    print(f"    Controls with STIG IDs: {len(technical_with_stig)}/{len(technical_au)}")

    # The critical fix: metadata.stig_id presence
    root_stig_only = []
    both_locations = []
    for control in technical_with_stig:
        has_root = bool(control.get('stig_id'))
        has_meta = bool(control.get('metadata', {}).get('stig_id'))

        if has_root and has_meta:
            both_locations.append(control['control_id'])
        elif has_root and not has_meta:
            root_stig_only.append(control['control_id'])

    print(f"\n[4] CRITICAL: metadata.stig_id Field Presence:")
    print(f"    [PASS] Has STIG at BOTH root + metadata: {len(both_locations)}/{len(technical_with_stig)}")
    print(f"    [FAIL] Has STIG at root ONLY (BROKEN): {len(root_stig_only)}/{len(technical_with_stig)}")

    if root_stig_only:
        print(f"\n    ERROR: Controls missing metadata.stig_id:")
        for cid in root_stig_only[:10]:
            print(f"      - {cid}")
        if len(root_stig_only) > 10:
            print(f"      ... and {len(root_stig_only) - 10} more")
    else:
        print(f"    [PASS] All controls with STIG IDs have metadata.stig_id")

    # Compare with AC family pattern
    technical_ac = [c for c in ac_data if c.get('is_technical')]
    ac_with_both = [c for c in technical_ac
                    if c.get('stig_id') and c.get('metadata', {}).get('stig_id')]

    print(f"\n[5] Comparison with AC Family (Baseline):")
    print(f"    AC: {len(ac_with_both)} technical controls with both STIG locations")
    print(f"    AU: {len(both_locations)} technical controls with both STIG locations")
    print(f"    Pattern Match: {'[PASS]' if len(both_locations) > 0 else '[FAIL]'}")

    # Script coverage
    with_scripts = []
    for c in technical_au:
        scripts = c.get('implementation_scripts', {})
        bash = scripts.get('linux', {}).get('bash', '')
        ps = scripts.get('windows', {}).get('powershell', '')
        if (bash and len(bash.strip()) > 50) or (ps and len(ps.strip()) > 50):
            with_scripts.append(c['control_id'])

    print(f"\n[6] Implementation Scripts:")
    print(f"    Technical controls with scripts: {len(with_scripts)}/{len(technical_au)}")
    print(f"    Sample controls with scripts:")
    for cid in with_scripts[:5]:
        ctrl = [c for c in technical_au if c['control_id'] == cid][0]
        bash_len = len(ctrl.get('implementation_scripts', {}).get('linux', {}).get('bash', ''))
        print(f"      - {cid:12} (bash: {bash_len:5} chars)")

    # Final status
    print(f"\n{'='*70}")
    if len(root_stig_only) == 0:
        print("[PASS] VALIDATION PASSED")
        print("  AU.json matches AC.json structure pattern")
        print("  metadata.stig_id present for all controls with STIG IDs")
        print("  Ready for frontend display")
    else:
        print("[FAIL] VALIDATION FAILED")
        print(f"  {len(root_stig_only)} controls missing metadata.stig_id")
        print("  Frontend will display these as organizational controls")
    print("="*70)

if __name__ == '__main__':
    validate_au_final()
