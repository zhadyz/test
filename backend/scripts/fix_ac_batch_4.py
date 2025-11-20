import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. AC-3 (Access Enforcement) Scripts
    ac3_linux_script = {
        'bash': r"""#!/bin/bash
# AC-3 Access Enforcement (Linux)
# Description: Verify permissions on critical system files and ensure discretionary access control is enforced.

echo "Verifying permissions on /etc/shadow..."
if [ "$(stat -c %a /etc/shadow)" -ne "000" ]; then
    echo "Fixing /etc/shadow permissions..."
    chmod 000 /etc/shadow
fi

echo "Verifying permissions on /etc/gshadow..."
if [ "$(stat -c %a /etc/gshadow)" -ne "000" ]; then
    echo "Fixing /etc/gshadow permissions..."
    chmod 000 /etc/gshadow
fi

echo "Verifying permissions on /etc/passwd..."
if [ "$(stat -c %a /etc/passwd)" -ne "644" ]; then
    echo "Fixing /etc/passwd permissions..."
    chmod 644 /etc/passwd
fi

echo "Access enforcement verification complete."
""",
        'ansible': r"""---
- name: AC-3 Access Enforcement
  hosts: all
  tasks:
    - name: Ensure permissions on /etc/shadow are configured
      file:
        path: /etc/shadow
        mode: '0000'
        owner: root
        group: root

    - name: Ensure permissions on /etc/gshadow are configured
      file:
        path: /etc/gshadow
        mode: '0000'
        owner: root
        group: root

    - name: Ensure permissions on /etc/passwd are configured
      file:
        path: /etc/passwd
        mode: '0644'
        owner: root
        group: root
"""
    }

    # 2. AC-7 (Unsuccessful Logon Attempts) Scripts
    ac7_linux_script = {
        'bash': r"""#!/bin/bash
# AC-7 Unsuccessful Logon Attempts (Linux)
# Description: Configure faillock to lock accounts after 3 failed attempts for 15 minutes.

AUTH_FILE="/etc/pam.d/system-auth"
PASSWORD_FILE="/etc/pam.d/password-auth"

echo "Configuring faillock in PAM..."

# Check if faillock is installed
if ! rpm -q pam >/dev/null 2>&1; then
    echo "PAM not installed. Please install PAM."
    exit 1
fi

# Configure faillock settings in /etc/security/faillock.conf
sed -i 's/^#\?deny =.*/deny = 3/' /etc/security/faillock.conf
sed -i 's/^#\?unlock_time =.*/unlock_time = 900/' /etc/security/faillock.conf
sed -i 's/^#\?fail_interval =.*/fail_interval = 900/' /etc/security/faillock.conf

echo "Account lockout policy configured: 3 attempts, 15 minute lockout."
""",
        'ansible': r"""---
- name: AC-7 Unsuccessful Logon Attempts
  hosts: all
  tasks:
    - name: Configure faillock settings
      lineinfile:
        path: /etc/security/faillock.conf
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?deny =', line: 'deny = 3' }
        - { regexp: '^#?unlock_time =', line: 'unlock_time = 900' }
        - { regexp: '^#?fail_interval =', line: 'fail_interval = 900' }
"""
    }

    ac7_windows_script = {
        'powershell': r"""# AC-7 Unsuccessful Logon Attempts (Windows)
# Description: Configure Account Lockout Policy.

Write-Host "Configuring Account Lockout Policy..."

# Set Lockout Threshold to 3 invalid attempts
net accounts /lockoutthreshold:3

# Set Lockout Duration to 15 minutes (30 minutes is default, but 15 is requested)
net accounts /lockoutduration:15

# Set Reset Lockout Counter After 15 minutes
net accounts /lockoutwindow:15

Get-ADDefaultDomainPasswordPolicy
Write-Host "Account Lockout Policy configured."
"""
    }

    # 3. AC-8 (System Use Notification) Scripts
    ac8_linux_script = {
        'bash': r"""#!/bin/bash
# AC-8 System Use Notification (Linux)
# Description: Set standard warning banner in /etc/issue and /etc/motd.

BANNER_TEXT="You are accessing a U.S. Government information system. Unauthorized use is prohibited and subject to criminal and civil penalties."

echo "$BANNER_TEXT" > /etc/issue
echo "$BANNER_TEXT" > /etc/issue.net
echo "$BANNER_TEXT" > /etc/motd

echo "System banners updated."
""",
        'ansible': r"""---
- name: AC-8 System Use Notification
  hosts: all
  vars:
    banner_text: "You are accessing a U.S. Government information system. Unauthorized use is prohibited."
  tasks:
    - name: Set /etc/issue
      copy:
        content: "{{ banner_text }}"
        dest: /etc/issue

    - name: Set /etc/issue.net
      copy:
        content: "{{ banner_text }}"
        dest: /etc/issue.net
"""
    }

    # 4. AC-11 (Session Lock) Scripts
    ac11_windows_script = {
        'powershell': r"""# AC-11 Session Lock (Windows)
# Description: Configure screen saver timeout to 15 minutes (900 seconds) and require password.

$Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
$Name = "InactivityTimeoutSecs"
$Value = 900

if (!(Test-Path $Path)) {
    New-Item -Path $Path -Force
}

Set-ItemProperty -Path $Path -Name $Name -Value $Value -Force

Write-Host "Session lock timeout set to $Value seconds."
"""
    }

    # 5. AC-12 (Session Termination) Scripts
    ac12_linux_script = {
        'bash': r"""#!/bin/bash
# AC-12 Session Termination (Linux)
# Description: Configure shell timeout (TMOUT) to 15 minutes.

PROFILE_D_FILE="/etc/profile.d/tmout.sh"

echo "Configuring TMOUT..."

echo "readonly TMOUT=900" > "$PROFILE_D_FILE"
echo "export TMOUT" >> "$PROFILE_D_FILE"
chmod 644 "$PROFILE_D_FILE"

echo "Session termination configured."
""",
        'ansible': r"""---
- name: AC-12 Session Termination
  hosts: all
  tasks:
    - name: Configure TMOUT in /etc/profile.d
      copy:
        dest: /etc/profile.d/tmout.sh
        content: |
          readonly TMOUT=900
          export TMOUT
        mode: '0644'
"""
    }

    updates_count = 0

    for control in data:
        cid = control['control_id'].upper()
        
        # Ensure implementation_scripts dict exists
        if 'implementation_scripts' not in control:
            control['implementation_scripts'] = {'linux': {}, 'windows': {}}
        
        if 'linux' not in control['implementation_scripts']:
            control['implementation_scripts']['linux'] = {}
        if 'windows' not in control['implementation_scripts']:
            control['implementation_scripts']['windows'] = {}

        # Apply scripts
        if cid == 'AC-3':
            control['implementation_scripts']['linux'] = ac3_linux_script
            control['implementation_scripts']['_note'] = "Added file permission checks."
            updates_count += 1
        
        if cid == 'AC-7':
            control['implementation_scripts']['linux'] = ac7_linux_script
            control['implementation_scripts']['windows'] = ac7_windows_script
            control['implementation_scripts']['_note'] = "Added faillock and net accounts config."
            updates_count += 1
            
        if cid == 'AC-8':
            control['implementation_scripts']['linux'] = ac8_linux_script
            control['implementation_scripts']['_note'] = "Added banner configuration."
            updates_count += 1
            
        if cid == 'AC-11':
            control['implementation_scripts']['windows'] = ac11_windows_script
            control['implementation_scripts']['_note'] = "Added screen lock registry config."
            updates_count += 1
            
        if cid == 'AC-12':
            control['implementation_scripts']['linux'] = ac12_linux_script
            control['implementation_scripts']['_note'] = "Added TMOUT configuration."
            updates_count += 1

    if updates_count > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully updated {updates_count} high-priority AC controls in catalog.")
        
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
