import json
import re

def analyze_ac_controls():
    try:
        with open('backend/data/controls_catalog.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        ac_controls = {}
        
        # Index all AC controls and their enhancements
        for c in data:
            cid = c.get('control_id', '').upper()
            if cid.startswith('AC-'):
                # Parse number to filter AC-1 to AC-25
                try:
                    # Handle AC-2.1 vs AC-2
                    parts = cid.split('.')
                    base_id = parts[0] # AC-2
                    num = int(base_id.split('-')[1])
                    
                    if 1 <= num <= 25:
                        ac_controls[cid] = c
                except (IndexError, ValueError):
                    continue

        print(f"{'ID':<10} | {'Type':<15} | {'Rationale?':<10} | {'Scripts?':<10} | {'Issues'}")
        print("-" * 100)

        sorted_ids = sorted(ac_controls.keys(), key=lambda x: [int(y) if y.isdigit() else y for y in re.split(r'(\d+)', x)])

        for cid in sorted_ids:
            control = ac_controls[cid]
            
            # 1. Content Quality
            has_rationale = bool(control.get('rationale') or control.get('plain_english_explanation'))
            rationale_len = len(control.get('rationale', '') or control.get('plain_english_explanation', '') or '')
            
            # 2. Scripts Analysis
            scripts = control.get('implementation_scripts', {})
            has_scripts = False
            script_issues = []
            
            # Check Linux
            linux_scripts = scripts.get('linux', {})
            if linux_scripts:
                has_scripts = True
                ansible = linux_scripts.get('ansible', '')
                bash = linux_scripts.get('bash', '')
                
                if len(ansible) > 3000:
                    script_issues.append(f"Ansible too long ({len(ansible)})")
                if len(bash) > 3000:
                    script_issues.append(f"Bash too long ({len(bash)})")
                
                if "JINJA TEMPLATE ERROR" in ansible or "JINJA TEMPLATE ERROR" in bash:
                    script_issues.append("JINJA ERROR")
            
            # Check Windows
            windows_scripts = scripts.get('windows', {})
            if windows_scripts:
                has_scripts = True
                # Check if it's just a placeholder
                if "Not applicable" in str(windows_scripts):
                    # Not necessarily an issue, but note it
                    pass
            
            # Determine Type (Base vs Enhancement)
            ctype = "Enhancement" if "." in cid or "(" in cid else "Control"
            
            # Rationale Warning
            rationale_status = "OK" if rationale_len > 50 else "MISSING/SHORT"
            
            issues_str = ", ".join(script_issues)
            
            # Special Check: CAC "Dump" detection (keywords from other families)
            if has_scripts:
                script_text = str(scripts).lower()
                # If AC control mentions audit rules excessively but isn't AC-2(4)
                if 'audit' in script_text and cid != 'AC-2.4' and script_text.count('audit') > 10:
                     script_issues.append("Suspicious Audit Content")
            
            print(f"{cid:<10} | {ctype:<15} | {rationale_status:<10} | {str(has_scripts):<10} | {', '.join(script_issues)}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_ac_controls()
