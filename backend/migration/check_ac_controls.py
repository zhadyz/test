#!/usr/bin/env python
"""Quick script to check AC family automated controls"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cac_explorer import CACExplorer

# Initialize explorer
explorer = CACExplorer(r'C:\Users\eclip\Desktop\cac')

# Find automated AC controls
controls = explorer.find_automated_controls(family='AC')

print(f"\nTotal automated AC controls: {len(controls)}\n")
print("="*80)

for ctrl in controls:
    print(f"\n{ctrl['control_id'].upper()}: {ctrl.get('title', 'No title')}")
    print(f"  Status: {ctrl['status']}")
    print(f"  Rules: {len(ctrl.get('rules', []))}")
    if 'templates' in ctrl:
        print(f"  Templates: {list(ctrl['templates'].keys())}")
