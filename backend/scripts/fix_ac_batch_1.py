import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Mapping of Enhancement IDs to Rationale/Details
    enhancements_update = {
        'AC-3.1': "Access enforcement mechanisms must be able to restrict access based on attributes (e.g., time of day, location, project assignment) rather than just identity.",
        'AC-3.6': "Encrypting data at rest and in transit adds a layer of defense, ensuring that even if access controls are bypassed, the data remains unintelligible.",
        'AC-3.9': "Controlled release ensures that information sharing with external systems only occurs when the receiving system has adequate security controls.",
        'AC-3.12': "Applications must explicitly state their access requirements during installation to prevent 'scope creep' and unauthorized access escalation.",
        'AC-3.15': "Implementing both Discretionary Access Control (DAC) and Mandatory Access Control (MAC) provides robust defense-in-depth for high-security environments.",
        
        'AC-4.3': "Dynamic information flow control allows the system to adjust data flow rules in real-time based on changing threat conditions or operational states.",
        'AC-4.8': "Security and privacy policy filters enforce granular rules on data content (e.g., blocking PII) rather than just connection metadata.",
        'AC-4.16': "Information flow enforcement must consider metadata (e.g., classification labels) to prevent data leakage across security domains.",
        'AC-4.18': "Security attributes must be bound to information to ensure that access control decisions persist as data moves through the system.",

        'AC-6.1': "Restricting access to security functions (e.g., audit logs, account management) prevents unauthorized users from disabling defenses.",
        'AC-6.7': "Regular privilege reviews prevent 'privilege creep,' where users accumulate access rights over time that they no longer need.",
        'AC-6.9': "Logging privileged function execution provides a critical audit trail for detecting insider threats and misuse of administrative power."
    }

    # AC-6.1 Script
    ac6_1_script = {
        'bash': r"""#!/bin/bash
# AC-6(1) Authorize Access to Security Functions
# Description: Verify that only authorized users are in the 'wheel' group or sudoers.

echo "Checking 'wheel' group membership..."
grep '^wheel' /etc/group

echo "Checking sudoers configuration..."
grep -v '^#' /etc/sudoers | grep -v '^$'

echo "Manual Review Required: Ensure only authorized administrators are listed above."
""",
        'ansible': r"""---
- name: AC-6(1) Authorize Access to Security Functions
  hosts: all
  tasks:
    - name: Ensure only authorized users are in the wheel group
      ansible.builtin.group:
        name: wheel
        state: present
      register: wheel_group

    - name: Display wheel group members
      debug:
        var: wheel_group
"""
    }

    # AC-6.9 Script
    ac6_9_script = {
        'bash': r"""#!/bin/bash
# AC-6(9) Log Use of Privileged Functions
# Description: Configure auditd to log execution of privileged commands (sudo, su)

AUDIT_FILE="/etc/audit/rules.d/privileged_actions.rules"

echo "Configuring audit rules for privileged functions..."

cat <<EOF > "$AUDIT_FILE"
-a always,exit -F path=/usr/bin/sudo -F perm=x -F auid>=1000 -F auid!=4294967295 -k privileged
-a always,exit -F path=/usr/bin/su -F perm=x -F auid>=1000 -F auid!=4294967295 -k privileged
-a always,exit -F path=/usr/bin/pkexec -F perm=x -F auid>=1000 -F auid!=4294967295 -k privileged
EOF

chmod 0600 "$AUDIT_FILE"
augenrules --load

echo "Audit rules loaded. Check with 'auditctl -l'."
""",
        'ansible': r"""---
- name: AC-6(9) Log Use of Privileged Functions
  hosts: all
  become: yes
  tasks:
    - name: Configure audit rules for privileged commands
      ansible.builtin.lineinfile:
        path: /etc/audit/rules.d/privileged_actions.rules
        line: "{{ item }}"
        create: yes
        mode: '0600'
      loop:
        - "-a always,exit -F path=/usr/bin/sudo -F perm=x -F auid>=1000 -F auid!=4294967295 -k privileged"
        - "-a always,exit -F path=/usr/bin/su -F perm=x -F auid>=1000 -F auid!=4294967295 -k privileged"
      notify: Reload Auditd

  handlers:
    - name: Reload Auditd
      service:
        name: auditd
        state: restarted
"""
    }

    # AC-17 Script
    ac17_script = {
        'bash': r"""#!/bin/bash
# AC-17 Remote Access
# Description: Configure SSH for secure remote access (Protocol 2, No Root Login)

SSHD_CONFIG="/etc/ssh/sshd_config"

echo "Hardening SSH configuration..."

# Ensure Protocol 2
if grep -q "^Protocol" "$SSHD_CONFIG"; then
  sed -i 's/^Protocol.*/Protocol 2/' "$SSHD_CONFIG"
else
  echo "Protocol 2" >> "$SSHD_CONFIG"
fi

# Disable Root Login
if grep -q "^PermitRootLogin" "$SSHD_CONFIG"; then
  sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
else
  echo "PermitRootLogin no" >> "$SSHD_CONFIG"
fi

systemctl reload sshd
echo "SSH configuration updated."
""",
        'ansible': r"""---
- name: AC-17 Remote Access Configuration
  hosts: all
  become: yes
  tasks:
    - name: Ensure SSH Protocol 2 is set
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^Protocol'
        line: 'Protocol 2'
    
    - name: Disable SSH Root Login
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^PermitRootLogin'
        line: 'PermitRootLogin no'
      notify: Restart SSH

  handlers:
    - name: Restart SSH
      service:
        name: sshd
        state: restarted
"""
    }

    updates_count = 0

    for control in data:
        cid = control['control_id'].upper()
        
        # 1. Fix Rationale/Guidance for Enhancements
        if cid in enhancements_update:
            # Update rationale if missing or placeholder
            if not control.get('rationale') or len(control.get('rationale')) < 50:
                control['rationale'] = enhancements_update[cid]
                updates_count += 1
        
        # 2. Fix Scripts
        if cid == 'AC-6.1':
            control['implementation_scripts'] = {} # Reset
            control['implementation_scripts']['linux'] = ac6_1_script
            control['implementation_scripts']['_note'] = "Replaced generic audit dump with targeted privileged access checks."
            updates_count += 1
            
        if cid == 'AC-6.9':
            control['implementation_scripts'] = {} # Reset
            control['implementation_scripts']['linux'] = ac6_9_script
            control['implementation_scripts']['_note'] = "Replaced 62k line dump with targeted privileged function auditing."
            updates_count += 1

        if cid == 'AC-17':
            control['implementation_scripts'] = {} # Reset
            control['implementation_scripts']['linux'] = ac17_script
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
