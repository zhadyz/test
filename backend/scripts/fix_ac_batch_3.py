import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Mapping of Enhancement IDs to Rationale/Details (AC-20 to AC-25)
    # Sources: NIST SP 800-53 Rev 5
    enhancements_update = {
        'AC-20.1': "Limits the use of external information systems by organizational personnel to ensuring that terms of service and security policies are in place.",
        'AC-20.2': "Restricts the use of organization-controlled portable storage devices (e.g., USB drives) on external systems to prevent malware introduction.",
        'AC-20.3': "Prohibits the use of non-organizationally owned portable storage devices on organizational systems to maintain a secure perimeter.",
        'AC-21.1': "Automated information sharing helps ensure timely and accurate distribution of security-related information.",
        'AC-21.2': "Information sharing agreements must protect the confidentiality and privacy of shared data.",
        'AC-24.1': "Documenting access control decisions ensures accountability and provides an audit trail for authorization.",
        'AC-24.2': "Automated mechanisms for access control decisions reduce human error and improve the speed of authorization."
    }

    # Scripts for AC-20 (External Systems) - Policy Checks
    ac20_script = {
        'bash': r"""#!/bin/bash
# AC-20 Use of External Systems
# Description: Check for mounted external storage or unauthorized network connections.

echo "Checking for mounted external storage..."
mount | grep -E '/media|/mnt'

echo "Checking for established connections to known public DNS (example check)..."
netstat -ant | grep ':53'

echo "Manual Review: Ensure external system usage complies with organizational policy."
""",
        'ansible': r"""---
- name: AC-20 Use of External Systems Checks
  hosts: all
  tasks:
    - name: Check for mounted external media
      command: mount
      register: mounted_volumes
      changed_when: false

    - name: Warn if external media found
      debug:
        msg: "External media found mounted at {{ item }}"
      loop: "{{ mounted_volumes.stdout_lines }}"
      when: "'/media' in item or '/mnt' in item"
"""
    }

    # AC-21 Information Sharing - Configuration Check
    ac21_script = {
        'bash': r"""#!/bin/bash
# AC-21 Information Sharing
# Description: Verify configuration of information sharing services (e.g., NFS, Samba).

echo "Checking NFS exports..."
cat /etc/exports

echo "Checking Samba configuration..."
test -f /etc/samba/smb.conf && grep 'valid users' /etc/samba/smb.conf

echo "Ensure sharing is restricted to authorized domains."
""",
        'ansible': r"""---
- name: AC-21 Information Sharing Configuration
  hosts: all
  tasks:
    - name: Check NFS exports
      command: cat /etc/exports
      register: nfs_exports
      changed_when: false
      ignore_errors: yes

    - name: Display NFS exports
      debug:
        var: nfs_exports.stdout_lines
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
        
        # 2. Fix Scripts for missing AC controls
        if cid == 'AC-20':
            control['implementation_scripts']['linux'] = ac20_script
            control['implementation_scripts']['_note'] = "Added checks for external storage and network connections."
            updates_count += 1
            
        if cid == 'AC-21':
            control['implementation_scripts']['linux'] = ac21_script
            control['implementation_scripts']['_note'] = "Added verification for file sharing services."
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
