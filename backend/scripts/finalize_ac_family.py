import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # --- AC-10 Concurrent Session Control ---
    ac10_linux_script = {
        'bash': r"""#!/bin/bash
# AC-10 Concurrent Session Control
# Description: Limit concurrent sessions in /etc/security/limits.conf

echo "Configuring concurrent session limits..."
if grep -q "hard maxlogins" /etc/security/limits.conf; then
    sed -i 's/.*hard maxlogins.*/\* hard maxlogins 10/' /etc/security/limits.conf
else
    echo "* hard maxlogins 10" >> /etc/security/limits.conf
fi
echo "Limit set to 10 sessions per user."
""",
        'ansible': r"""---
- name: AC-10 Concurrent Session Control
  hosts: all
  tasks:
    - name: Limit max logins
      pam_limits:
        domain: '*'
        limit_type: hard
        limit_item: maxlogins
        value: 10
"""
    }

    # --- AC-11.1 Pattern Hiding Displays ---
    ac11_1_windows_script = {
        'powershell': r"""# AC-11(1) Pattern-Hiding Displays
# Description: Ensure screen saver is secure and password protected

# Enable screen saver
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "ScreenSaveActive" -Value "1"

# Enable password protection
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "ScreenSaverIsSecure" -Value "1"

Write-Host "Screen saver security configured."
"""
    }

    # --- AC-14 Permitted Actions without ID/Auth ---
    # This is policy/config often web server related, but we can check for public read
    ac14_linux_script = {
        'bash': r"""#!/bin/bash
# AC-14 Permitted Actions without ID/Auth
# Description: Ensure no critical system files are world-writable (publicly accessible actions)

echo "Checking for world-writable files in /etc..."
find /etc -type f -perm -002 -ls

echo "If any files are listed above, they allow action without identification. Review immediately."
""",
        'ansible': r"""---
- name: AC-14 Check Public Write Access
  hosts: all
  tasks:
    - name: Find world-writable files in /etc
      command: find /etc -type f -perm -002
      register: world_writable
      changed_when: false
      failed_when: world_writable.stdout != ""
"""
    }

    updates_count = 0

    for control in data:
        cid = control['control_id'].upper()
        
        # Ensure implementation_scripts structure
        if 'implementation_scripts' not in control:
            control['implementation_scripts'] = {'linux': {}, 'windows': {}}
        if 'linux' not in control['implementation_scripts']:
            control['implementation_scripts']['linux'] = {}
        if 'windows' not in control['implementation_scripts']:
            control['implementation_scripts']['windows'] = {}

        # Apply specific scripts
        if cid == 'AC-10':
            control['implementation_scripts']['linux'] = ac10_linux_script
            updates_count += 1
        
        if cid == 'AC-11.1':
            control['implementation_scripts']['windows'] = ac11_1_windows_script
            updates_count += 1
            
        if cid == 'AC-14':
            control['implementation_scripts']['linux'] = ac14_linux_script
            updates_count += 1

        # Mark non-technical controls as 'administrative'
        # AC-4 (Flow), AC-5 (SoD), AC-16 (Attributes), AC-20+ (External/Sharing) are often policy/arch
        if cid in ['AC-4', 'AC-5', 'AC-9', 'AC-15', 'AC-16', 'AC-20', 'AC-21', 'AC-22', 'AC-23', 'AC-24', 'AC-25']:
            if 'cac_metadata' not in control: control['cac_metadata'] = {}
            control['cac_metadata']['implementation_type'] = 'administrative'
            control['implementation_guidance'] = "This control is implemented via organizational policy and architectural design. Refer to the Policy Guidance tab."
            updates_count += 1
            
        # Handle Enhancements for these families
        if 'enhancements' in control:
            for enh in control['enhancements']:
                eid = enh.get('id', '').upper()
                if eid.startswith(('AC-4.', 'AC-5.', 'AC-16.', 'AC-20.', 'AC-21.', 'AC-22.', 'AC-23.', 'AC-24.', 'AC-25.')):
                    if 'cac_metadata' not in enh: enh['cac_metadata'] = {}
                    enh['cac_metadata']['implementation_type'] = 'administrative'
                    enh['implementation_guidance'] = "This enhancement relies on policy enforcement."

    if updates_count > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully finalized {updates_count} AC controls/enhancements.")
        
        # Sync frontend
        try:
            with open('frontend/src/data/controls_catalog.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("Synced frontend catalog.")
        except Exception as e:
            print(f"Frontend sync failed: {e}")
    else:
        print("No updates needed.")

except Exception as e:
    print(f"Error: {e}")
