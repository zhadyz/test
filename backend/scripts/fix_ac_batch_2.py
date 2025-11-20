import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Mapping of Enhancement IDs to Rationale/Details
    enhancements_update = {
        # AC-7
        'AC-7.1': "Automatic account lockout prevents indefinite brute-force attacks by temporarily disabling the account after a threshold of failures.",
        'AC-7.4': "Using an alternate authentication factor (e.g., a token or biometric) after failures allows legitimate users to recover access while blocking automated attacks.",

        # AC-17
        'AC-17.4': "Privileged remote access is a high-risk activity. Requiring assessable evidence (recordings, detailed logs) ensures accountability.",
        'AC-17.5': "Monitoring and controlling remote access sessions allows security operations to detect and terminate suspicious activities in real-time.",
        'AC-17.7': "Additional protection mechanisms (e.g., bastion hosts, jump servers) provide a choke point to inspect and secure remote administrative traffic.",
        'AC-17.8': "Disabling remote access capabilities when not operationally required reduces the attack surface.",

        # AC-18
        'AC-18.2': "Continuous monitoring for unauthorized wireless signals identifies rogue access points or ad-hoc networks that could bypass perimeter defenses.",
        'AC-18.3': "Disabling wireless hardware on servers and sensitive endpoints prevents accidental or unauthorized bridging of air gaps.",
        'AC-18.4': "Restricting who can configure wireless settings prevents users from accidentally connecting to insecure networks or creating rogue access points.",

        # AC-19
        'AC-19.1': "Full device encryption protects organizational data on mobile devices even if the device is lost or stolen.",
        'AC-19.2': "Containerization separates organizational data from personal data/apps, preventing data leakage and malware cross-contamination.",
        'AC-19.3': "Disabling high-risk features (e.g., camera, microphone, Bluetooth) reduces surveillance and data exfiltration risks.",
        'AC-19.4': "Classified environments require strict prohibitions on unclassified mobile devices to prevent electronic eavesdropping and emissions capturing."
    }

    # AC-18.3: Disable Wireless Networking
    ac18_3_script = {
        'bash': r"""#!/bin/bash
# AC-18(3) Disable Wireless Networking
# Description: Disable wireless interfaces using rfkill or nmcli.

echo "Checking for wireless interfaces..."

if command -v rfkill &> /dev/null; then
    echo "Blocking wireless devices via rfkill..."
    rfkill block wifi
    rfkill list
elif command -v nmcli &> /dev/null; then
    echo "Disabling wifi via NetworkManager..."
    nmcli radio wifi off
    nmcli radio
else
    echo "No wireless management tools found. Checking ip link..."
    ip link show | grep -i wlan
    echo "Manual disabling required if interfaces exist."
fi
""",
        'ansible': r"""---
- name: AC-18(3) Disable Wireless Networking
  hosts: all
  tasks:
    - name: Block wireless via rfkill
      command: rfkill block wifi
      ignore_errors: yes

    - name: Disable wireless via NetworkManager
      command: nmcli radio wifi off
      ignore_errors: yes
      when: "'NetworkManager' in ansible_facts.packages"
"""
    }

    # AC-18.4: Restrict Configurations by Users
    # Fix: Ensure PolicyKit limits NetworkManager access or similar
    ac18_4_script = {
        'bash': r"""#!/bin/bash
# AC-18(4) Restrict Configurations by Users
# Description: Verify that standard users cannot modify network settings.

echo "Checking PolicyKit rules for NetworkManager..."

# Look for "yes" permissions for general users in Polkit
if grep -r "org.freedesktop.NetworkManager" /usr/share/polkit-1/actions/ | grep "yes"; then
    echo "WARNING: Found permissive NetworkManager policies. Review Polkit configuration."
else
    echo "Standard Polkit restrictions appear to be in place."
fi
""",
        'ansible': r"""---
- name: AC-18(4) Restrict Wireless Configuration
  hosts: all
  tasks:
    - name: Verify NetworkManager Polkit restrictions
      command: grep "org.freedesktop.NetworkManager" /usr/share/polkit-1/actions/org.freedesktop.NetworkManager.policy
      register: polkit_check
      changed_when: false
      ignore_errors: yes
"""
    }

    updates_count = 0

    for control in data:
        cid = control['control_id'].upper()
        
        # 1. Fix Rationale
        if cid in enhancements_update:
            if not control.get('rationale') or len(control.get('rationale')) < 50:
                control['rationale'] = enhancements_update[cid]
                updates_count += 1
        
        # 2. Fix Scripts
        if cid == 'AC-18.3':
            control['implementation_scripts']['linux'] = ac18_3_script
            control['implementation_scripts']['_note'] = "Replaced generic audit dump with targeted wireless disable scripts."
            updates_count += 1
            
        if cid == 'AC-18.4':
            control['implementation_scripts']['linux'] = ac18_4_script
            control['implementation_scripts']['_note'] = "Replaced generic audit dump with configuration restriction checks."
            updates_count += 1

        # Also check embedded enhancements array
        if 'enhancements' in control:
            for enh in control['enhancements']:
                eid = enh.get('id', '').upper()
                if eid in enhancements_update:
                    enh['rationale'] = enhancements_update[eid]

    if updates_count > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully updated {updates_count} controls/enhancements in catalog.")
        
        # Sync frontend
        try:
            with open('frontend/src/data/controls_catalog.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("Synced frontend catalog.")
        except Exception as e:
            print(f"Frontend sync failed: {e}")
    else:
        print("No updates required.")

except Exception as e:
    print(f"Error: {e}")
