import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    target_id = 'ac-2.4'
    
    # Clean, targeted Ansible playbook for AC-2(4)
    # Focuses strictly on auditing account creation/modification/removal files
    clean_ansible = """---
# AC-2(4) Automated Audit Actions
# Description: Automatically audit account creation, modification, enabling, disabling, and removal actions.
# Strategy: Monitor changes to user/group databases and authentication logs.

- name: Configure Account Modification Auditing
  hosts: all
  become: yes
  tasks:
    - name: Ensure audit rules for user/group modification exist
      ansible.builtin.lineinfile:
        path: /etc/audit/rules.d/30-ospp-v42-1-create-modify-user-group-information.rules
        line: "{{ item }}"
        create: yes
        mode: '0600'
      loop:
        - "-w /etc/group -p wa -k identity"
        - "-w /etc/passwd -p wa -k identity"
        - "-w /etc/gshadow -p wa -k identity"
        - "-w /etc/shadow -p wa -k identity"
        - "-w /etc/security/opasswd -p wa -k identity"
      notify: Reload Auditd

    - name: Ensure audit rules for user/group modification are loaded
      command: augenrules --load
      changed_when: false

  handlers:
    - name: Reload Auditd
      service:
        name: auditd
        state: restarted
"""

    # Clean Bash script
    clean_bash = """#!/bin/bash
# AC-2(4) Automated Audit Actions
# Description: Configure auditd to watch user/group modification files

AUDIT_RULE_FILE="/etc/audit/rules.d/30-ac-2-4-account-actions.rules"

echo "Configuring audit rules for account actions..."

# Watch identity files for write/attribute changes
{
  echo "-w /etc/group -p wa -k identity"
  echo "-w /etc/passwd -p wa -k identity"
  echo "-w /etc/gshadow -p wa -k identity"
  echo "-w /etc/shadow -p wa -k identity"
  echo "-w /etc/security/opasswd -p wa -k identity"
} > "$AUDIT_RULE_FILE"

chmod 0600 "$AUDIT_RULE_FILE"

# Reload audit rules
echo "Reloading audit rules..."
augenrules --load

echo "AC-2(4) Implementation Complete."
"""

    count = 0
    for control in data:
        if control['control_id'] == target_id:
            # Initialize implementation_scripts if missing
            if 'implementation_scripts' not in control:
                control['implementation_scripts'] = {'linux': {}, 'windows': {}}
            
            if 'linux' not in control['implementation_scripts']:
                control['implementation_scripts']['linux'] = {}

            # Overwrite the "cluster fuck" with clean scripts
            control['implementation_scripts']['linux']['ansible'] = clean_ansible
            control['implementation_scripts']['linux']['bash'] = clean_bash
            
            # Add explanation metadata
            control['implementation_scripts']['linux']['_note'] = "Cleaned up migration artifacts. Focused on identity file auditing."
            
            count += 1
            print(f"Cleaned up scripts for {target_id}")

    if count > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Successfully updated catalog.")
        
        # Sync frontend
        try:
            with open('frontend/src/data/controls_catalog.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("Synced frontend catalog.")
        except Exception as e:
            print(f"Frontend sync failed: {e}")
            
    else:
        print(f"Control {target_id} not found.")

except Exception as e:
    print(f"Error: {e}")
