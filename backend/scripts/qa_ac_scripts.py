import json
import re

def qa_ac_scripts():
    try:
        with open('backend/data/controls_catalog.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

    except Exception as e:
        print(f"Error loading catalog: {e}")
        return

    print(f"{'ID':<10} | {'OS':<8} | {'Format':<10} | {'Status':<15} | {'Quality Check / Issue'}")
    print("-" * 100)

    ac_controls = []
    for c in data:
        cid = c.get('control_id', '').upper()
        if cid.startswith('AC-'):
            # Sort helper
            parts = re.split(r'[.-]', cid)
            num = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
            sub = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
            ac_controls.append((num, sub, c))

    ac_controls.sort(key=lambda x: (x[0], x[1]))

    # Keywords expected for specific controls to verify relevance
    expected_keywords = {
        'AC-2': ['user', 'account', 'disable', 'lock'],
        'AC-3': ['permission', 'chmod', 'acl', 'group'],
        'AC-4': ['flow', 'iptables', 'firewall', 'route'],
        'AC-6': ['sudo', 'privilege', 'wheel', 'root'],
        'AC-7': ['lockout', 'faillock', 'tally'],
        'AC-8': ['banner', 'issue', 'message'],
        'AC-11': ['screen', 'lock', 'timeout', 'saver'],
        'AC-12': ['terminate', 'timeout', 'logout'],
        'AC-17': ['ssh', 'remote', 'vpn', 'rdp'],
        'AC-18': ['wireless', 'wifi', 'radio', 'bluetooth'],
        'AC-19': ['usb', 'mobile', 'storage', 'encrypt']
    }

    for num, sub, control in ac_controls:
        cid = control['control_id'].upper()
        base_id = f"AC-{num}"
        
        scripts = control.get('implementation_scripts', {})
        
        # Check for technical vs policy
        is_technical = control.get('is_technical', True) # Default to true if missing, to be safe
        
        # 1. Linux / Bash
        linux_bash = scripts.get('linux', {}).get('bash', '')
        analyze_script(cid, 'Linux', 'Bash', linux_bash, base_id, expected_keywords)

        # 2. Linux / Ansible
        linux_ansible = scripts.get('linux', {}).get('ansible', '')
        analyze_script(cid, 'Linux', 'Ansible', linux_ansible, base_id, expected_keywords)

        # 3. Windows / PowerShell
        win_ps = scripts.get('windows', {}).get('powershell', '')
        analyze_script(cid, 'Windows', 'PowerShell', win_ps, base_id, expected_keywords)

def analyze_script(cid, os_name, fmt, content, base_id, expected_keywords):
    status = "OK"
    issue = ""
    
    if not content:
        status = "MISSING"
    elif "Not applicable" in content or "Community contribution needed" in content:
        status = "PLACEHOLDER"
    elif len(content) < 50:
        status = "TOO SHORT"
        issue = f"Length: {len(content)} chars"
    elif len(content) > 5000:
        status = "TOO LONG"
        issue = f"Length: {len(content)} chars (Dump?)"
        if "JINJA" in content:
            issue += " + JINJA ERROR"
    else:
        # Quality check
        keywords = expected_keywords.get(base_id, [])
        if keywords:
            matches = [k for k in keywords if k in content.lower()]
            if not matches:
                status = "GENERIC?"
                issue = f"Missing keywords: {keywords}"
            else:
                status = "VERIFIED"
                issue = f"Found: {matches}"
        
        # Check for the specific generic script we hate
        if "Ensure no accounts have empty password" in content and base_id != "AC-2":
             status = "BAD COPY"
             issue = "Generic AC-2 script detected"

    if status != "VERIFIED" and status != "OK":
        print(f"{cid:<10} | {os_name:<8} | {fmt:<10} | {status:<15} | {issue}")

if __name__ == "__main__":
    qa_ac_scripts()
