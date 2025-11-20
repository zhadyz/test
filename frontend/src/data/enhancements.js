// Demo enhancements for all controls
export const enhancements = {
  'AC-2': [
    {
      id: 'AC-2(1)',
      title: 'Automated Account Management',
      plain_english: 'Use automated tools to manage and review accounts.',
      implementation_tip: 'Deploy scripts or IAM tools to detect and disable unused accounts.',
      windows_script: `# PowerShell
Get-LocalUser | Where-Object { $_.Enabled -eq $true }`,
      linux_script: `# Bash
getent passwd | cut -d: -f1`,
      windows_steps: [
        'Open Active Directory Users and Computers (ADUC).',
        'Create a dedicated OU structure for service and user accounts.',
        'Link GPOs for password/lockout policies and account restrictions.',
        'Enable Advanced Auditing for User Account Management events.'
      ],
      linux_steps: [
        'Harden /etc/login.defs and PAM modules for account policies.',
        'Standardize home directory and shell settings in /etc/default/useradd.',
        'Create groups for roles and assign users accordingly.',
        'Enable logging for account changes with auditd/rsyslog.'
      ]
    },
    {
      id: 'AC-2(2)',
      title: 'Account Reviews',
      plain_english: 'Regularly review and update account access.',
      implementation_tip: 'Schedule quarterly account reviews with department managers.',
      windows_steps: [
        'Export AD user list with lastLogonTimestamp and manager attributes.',
        'Distribute review report to managers and track approvals.',
        'Disable or adjust access per sign-off and record in ticketing system.'
      ],
      linux_steps: [
        'Export /etc/passwd accounts and recent logins (last, lastlog).',
        'Verify sudoers and group memberships against approvals.',
        'Disable stale or unauthorized accounts and document changes.'
      ],
      windows_script: `# PowerShell - Quarterly review report
 Get-ADUser -Filter * -Properties DisplayName,LastLogonDate,Manager,Enabled |
   Select-Object DisplayName,SamAccountName,Enabled,LastLogonDate,Manager |
   Export-Csv -NoTypeInformation C:\\Temp\\ac2_reviews.csv`,
      linux_script: `# Bash - Quarterly review report
 getent passwd | cut -d: -f1,3,4,6,7 > /tmp/ac2_passwd_snapshot.txt
 last -F | head -n 200 > /tmp/ac2_recent_logins.txt`
    },
    {
      id: 'AC-2(3)',
      title: 'Disable Inactive Accounts',
      plain_english: 'Automatically disable inactive accounts after a set period.',
      implementation_tip: 'Typically 30–90 days of inactivity before disabling.',
      windows_steps: [
        'Decide inactivity threshold (e.g., 90 days) and approval workflow.',
        'Create a scheduled task that runs a PowerShell script daily.',
        'Disable and tag accounts; notify managers; log to SIEM.'
      ],
      linux_steps: [
        'Decide inactivity threshold and create a cron job.',
        'Use lastlog/faillog to detect inactivity and lock accounts with usermod -L.',
        'Notify owners and log actions centrally.'
      ],
      windows_script: `# PowerShell - Disable inactive AD users
 $InactiveDays = 90
 $Cutoff = (Get-Date).AddDays(-$InactiveDays)
 Get-ADUser -Filter {Enabled -eq $true -and LastLogonDate -lt $Cutoff} -Properties LastLogonDate |
   ForEach-Object {
     Disable-ADAccount -Identity $_.SamAccountName
     Write-EventLog -LogName Application -Source 'AC2' -EventId 9003 -EntryType Information -Message "Disabled inactive account $($_.SamAccountName)"
   }`,
      linux_script: `# Bash - Disable inactive users (>=90 days)
 THRESHOLD=90
 while read -r user; do
   lastlog -u "$user" | awk -v u="$user" -v t="$THRESHOLD" 'NR==2 { if ($0 ~ /Never logged in/) next; if ($4 ~ /\*\*\*/) next; }'
 done < <(awk -F: '$3>=1000 && $1!="nobody" {print $1}' /etc/passwd)
 # Example lock command:
 # sudo usermod -L someuser`
    },
    {
      id: 'AC-2(4)',
      title: 'Automated Audit Actions',
      plain_english: 'Generate audit records for account lifecycle actions.',
      implementation_tip: 'Log create/modify/disable/delete events to SIEM.',
      windows_steps: [
        'Enable Advanced Audit Policy: User Account Management.',
        'Forward Security logs (4720–4767) to your SIEM.'
      ],
      linux_steps: [
        'Configure auditd rules for /etc/passwd, /etc/shadow changes.',
        'Forward audit logs to SIEM using rsyslog or agent.'
      ],
      windows_script: `# PowerShell - Enable auditing
 auditpol /set /subcategory:"User Account Management" /success:enable /failure:enable`,
      linux_script: `# Bash - auditd rule example
 echo '-w /etc/passwd -p wa -k acct_mgmt' | sudo tee /etc/audit/rules.d/acct.rules && sudo systemctl restart auditd`
    },
    {
      id: 'AC-2(5)',
      title: 'Account Monitoring for Atypical Usage',
      plain_english: 'Detect and alert on unusual account behaviors.',
      implementation_tip: 'Use SIEM analytics and thresholds.',
      windows_steps: [
        'Create SIEM detection for off-hours logins and multiple failures.',
        'Alert and auto-disable pending investigation if policy allows.'
      ],
      linux_steps: [
        'Monitor auth.log and sudo logs for anomalies.',
        'Alert on impossible travel and brute-force attempts.'
      ],
      windows_script: `# PowerShell - Sample query (placeholder)
 Get-WinEvent -LogName Security | Where-Object {$_.Id -in 4624,4625} | Select TimeCreated,Id,Message -First 20`,
      linux_script: `# Bash - tail auth logs (placeholder)
 sudo tail -n 200 /var/log/auth.log`
    },
    {
      id: 'AC-2(6)',
      title: 'Dynamic Privilege Management',
      plain_english: 'Adjust privileges based on role and risk.',
      implementation_tip: 'Use RBAC and time-bound elevation.',
      windows_steps: [
        'Use AD groups for RBAC and Just-In-Time (JIT) elevation.',
        'Require approvals and auto-revoke after task completion.'
      ],
      linux_steps: [
        'Use sudoers with time-limited rules and logging.',
        'Rotate membership in privileged groups via workflow.'
      ],
      windows_script: `# PowerShell - Add user to role group (example)
 Add-ADGroupMember -Identity 'SecOps-Operators' -Members someuser`,
      linux_script: `# Bash - Add to sudoers group (example)
 sudo usermod -aG sudo someuser`
    },
    {
      id: 'AC-2(7)',
      title: 'Prohibit Shared/Group Credentials',
      plain_english: 'Require unique accounts; avoid shared credentials.',
      implementation_tip: 'If unavoidable, tightly control and monitor.',
      windows_steps: [
        'Search for accounts used by multiple users and remediate.',
        'Enforce unique credentials and privileged access workflows.'
      ],
      linux_steps: [
        'Disable shared accounts and require personal accounts.',
        'Audit SSH keys per user and rotate as needed.'
      ],
      windows_script: `# PowerShell - find enabled local accounts
 Get-LocalUser | Where-Object {$_.Enabled -eq $true} | Format-Table`,
      linux_script: `# Bash - List local users with shells
 awk -F: '$7 ~ /bash|zsh/ {print $1"\t"$7}' /etc/passwd`
    },
    {
      id: 'AC-2(8)',
      title: 'Dynamic Account Management',
      plain_english: 'Automate account lifecycle with HR triggers.',
      implementation_tip: 'Integrate identity system with HR events.',
      windows_steps: [
        'Integrate AD with HR system to trigger create/change/disable.',
        'Use scheduled workflows or IdP connectors.'
      ],
      linux_steps: [
        'Automate useradd/usermod/usermod -L flows via scripts.',
        'Sync SSH keys and group roles from source of truth.'
      ],
      windows_script: `# PowerShell - create user (example)
 New-ADUser -Name 'Jane Doe' -SamAccountName jdoe -Enabled $true -Path 'OU=Users,DC=example,DC=com'`,
      linux_script: `# Bash - create user (example)
 sudo useradd -m jdoe && echo 'jdoe:ChangeMe!' | sudo chpasswd`
    },
    {
      id: 'AC-2(9)',
      title: 'Restrictions on Shared/Group Accounts',
      plain_english: 'If shared accounts exist, tightly restrict usage.',
      implementation_tip: 'Limit time, scope, and log all actions.',
      windows_steps: [
        'Apply time-based restrictions and strong auditing.',
        'Rotate shared credentials and store in vault if used.'
      ],
      linux_steps: [
        'Limit tty access and enforce sudo logging for shared accounts.',
        'Rotate credentials and restrict from remote access.'
      ],
      windows_script: `# PowerShell - Disable logon outside business hours (placeholder)`,
      linux_script: `# Bash - Restrict shared account shell (placeholder)
 sudo usermod -s /usr/sbin/nologin sharedacct`
    }
  ],
  'AC-3': [
    {
      id: 'AC-3(1)',
      title: 'Automated Access Enforcement',
      plain_english: 'Use automated tools to enforce access controls.',
      implementation_tip: 'Implement role-based access control (RBAC) with automated enforcement.',
      steps: [
        'Define user roles and permissions.',
        'Configure automated enforcement rules.',
        'Test access controls regularly.',
        'Monitor for unauthorized access attempts.'
      ]
    }
  ],
  'AC-17': [
    {
      id: 'AC-17(1)',
      title: 'Automated Monitoring',
      plain_english: 'Monitor remote access automatically.',
      implementation_tip: 'Use SIEM tools to track and alert on remote access activities.',
      steps: [
        'Deploy monitoring tools.',
        'Configure alert rules.',
        'Review access logs regularly.',
        'Investigate suspicious activities.'
      ]
    }
  ],
  'AU-2': [
    {
      id: 'AU-2(1)',
      title: 'Comprehensive Auditing',
      plain_english: 'Audit all critical system events.',
      implementation_tip: 'Enable auditing for all security-relevant events across all systems.',
      steps: [
        'Identify auditable events.',
        'Configure system logging.',
        'Centralize log collection.',
        'Regularly review audit logs.'
      ]
    },
    {
      id: 'AU-2(2)',
      title: 'Reviews and Updates',
      plain_english: 'Regularly review and update auditable events.',
      implementation_tip: 'Schedule quarterly log review meetings.'
    }
  ],
  // ...add 1-2 demo enhancements for each control as needed...
};
