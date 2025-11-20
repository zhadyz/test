import json

try:
    with open('backend/data/controls_catalog.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    for control in data:
        # Update AC-1
        if control['control_id'] == 'ac-1':
            control['rationale'] = "Access control policy and procedures address the controls in the AC family that are implemented within systems and organizations. The risk management strategy is an important factor in establishing such policies and procedures. Policies and procedures contribute to security and privacy assurance. Therefore, it is important that security and privacy programs collaborate on the development of access control policy and procedures. Security and privacy program policies and procedures at the organization level are preferable, in general, and may obviate the need for mission- or system-specific policies and procedures. The policy can be included as part of the general security and privacy policy or be represented by multiple policies reflecting the complex nature of organizations.\n\nProcedures can be established for security and privacy programs, for mission or business processes, and for systems, if needed. Procedures describe how the policies or controls are implemented and can be directed at the individual or role that is the object of the procedure. Procedures can be documented in system security and privacy plans or in one or more separate documents. Events that may precipitate an update to access control policy and procedures include assessment or audit findings, security incidents or breaches, or changes in laws, executive orders, directives, regulations, policies, standards, and guidelines. Simply restating controls does not constitute an organizational policy or procedure."
            control['related_controls'] = ['IA-1', 'PM-9', 'PM-24', 'PS-8', 'SI-12']

        # Update AC-2
        if control['control_id'] == 'ac-2':
            control['rationale'] = "Examples of system account types include individual, shared, group, system, guest, anonymous, emergency, developer, temporary, and service. Identification of authorized system users and the specification of access privileges reflect the requirements in other controls in the security plan. Users requiring administrative privileges on system accounts receive additional scrutiny by organizational personnel responsible for approving such accounts and privileged access, including system owner, mission or business owner, senior agency information security officer, or senior agency official for privacy.\n\nTypes of accounts that organizations may wish to prohibit due to increased risk include shared, group, emergency, anonymous, temporary, and guest accounts. Where access involves personally identifiable information, security programs collaborate with the senior agency official for privacy to establish the specific conditions for group and role membership; specify authorized users, group and role membership, and access authorizations for each account; and create, adjust, or remove system accounts in accordance with organizational policies.\n\nTemporary and emergency accounts are intended for short-term use. Organizations establish temporary accounts as part of normal account activation procedures when there is a need for short-term accounts without the demand for immediacy in account activation. Organizations establish emergency accounts in response to crisis situations and with the need for rapid account activation."
            
            # Ensure metadata exists
            if 'metadata' not in control:
                control['metadata'] = {}
            
            # Add STIG/CCI info
            control['metadata']['stig_id'] = 'GEN000290'
            control['metadata']['cci'] = ['CCI-000015', 'CCI-000016', 'CCI-002145']
            
            # Add Windows script if missing or placeholder
            if 'implementation_scripts' not in control:
                control['implementation_scripts'] = {}
            
            if 'windows' not in control['implementation_scripts'] or 'Not applicable' in str(control['implementation_scripts'].get('windows', '')):
                control['implementation_scripts']['windows'] = {
                    'powershell': "# Windows Account Management\n# 1. List all local users\nGet-LocalUser\n\n# 2. Disable Guest account if active\nDisable-LocalUser -Name 'Guest' -ErrorAction SilentlyContinue\n\n# 3. Check for inactive accounts (e.g., 90 days)\n$threshold = (Get-Date).AddDays(-90)\nGet-LocalUser | Where-Object { $_.LastLogon -lt $threshold -and $_.Enabled } | Select-Object Name, LastLogon\n\n# 4. Create a new user (example)\n# New-LocalUser -Name 'NewUser' -Description 'Description' -NoPassword\n",
                    'ansible': "---\n- name: Windows Account Management\n  hosts: windows\n  tasks:\n    - name: Disable Guest account\n      win_user:\n        name: Guest\n        account_disabled: yes\n"
                }

            # Update Enhancements Rationale
            enhancements_map = {
                'ac-2.1': 'Automated mechanisms help ensure consistency and reduce administrative burden. This enhancement supports the management of system accounts using organization-defined automated mechanisms.',
                'ac-2.2': 'Ensures temporary access does not become permanent vulnerabilities. Automatically remove or disable temporary and emergency accounts after a defined time period.',
                'ac-2.3': 'Reduces the attack surface by removing dormant accounts. Disable accounts within a defined time period when they expire, are no longer associated with a user, or have been inactive.',
                'ac-2.4': 'Provides accountability for account changes. Automatically audit account creation, modification, enabling, disabling, and removal actions.',
                'ac-2.5': 'Prevents unauthorized access to unattended sessions. Require that users log out when a defined time period of expected inactivity is reached.'
            }
            
            for enh in control.get('enhancements', []):
                eid = enh.get('id')
                if eid in enhancements_map:
                    enh['rationale'] = enhancements_map[eid]

    with open('backend/data/controls_catalog.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        print("Successfully updated AC-1 and AC-2 data.")

except Exception as e:
    print(f'Error: {e}')
