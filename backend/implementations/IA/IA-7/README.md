# NIST 800-53 IA-7: Cryptographic Module Authentication

## Control Overview

**Control ID:** IA-7
**Control Name:** Cryptographic Module Authentication
**Family:** Identification and Authentication (IA)
**Baselines:** Low, Moderate, High

### Control Statement

Implement mechanisms for authentication to a cryptographic module that meet the requirements of applicable laws, executive orders, directives, policies, regulations, standards, and guidelines for such authentication.

### Purpose

This control ensures cryptographic modules (libraries, hardware security modules, smart cards) require proper authentication before operators can use them. Authentication must meet Federal Information Processing Standards (FIPS) 140-2 or FIPS 140-3 validation requirements.

## Implementation Files

This directory contains comprehensive, platform-specific validation scripts and orchestration playbooks:

| File | Platform | Description |
|------|----------|-------------|
| `ia-7_windows_server_2019_powershell.ps1` | Windows Server 2019/2022 | PowerShell validation script for FIPS 140-2/140-3 compliance |
| `ia-7_rhel8_bash.sh` | RHEL 8, CentOS 8, Rocky Linux 8, AlmaLinux 8 | Bash validation script for FIPS mode and crypto-policies |
| `ia-7_ubuntu2204_bash.sh` | Ubuntu 22.04 LTS, Ubuntu 24.04 LTS | Bash validation script with Ubuntu Advantage FIPS support |
| `ia-7_ansible.yml` | Multi-platform | Ansible playbook for cross-platform orchestration |
| `README.md` | Documentation | This file |

## Script Characteristics

- **Read-only:** No system modifications
- **Idempotent:** Safe to run multiple times
- **Exit Codes:** 0 = compliant, 1 = non-compliant, 2 = error
- **Output Format:** Structured JSON compliance reports
- **Zero Hallucination:** All checks verify actual system state

## Usage

### Windows Server (PowerShell)

```powershell
# Run with default output location
.\ia-7_windows_server_2019_powershell.ps1

# Specify custom output path
.\ia-7_windows_server_2019_powershell.ps1 -OutputPath "C:\compliance\ia7_report.json"
```

**Requirements:**
- Administrator privileges
- Windows Server 2019 or 2022
- PowerShell 5.1 or later

**Checks Performed:**
1. FIPS mode enablement (registry)
2. Schannel protocol restrictions (TLS 1.2/1.3 enforcement)
3. FIPS-compliant cipher suites
4. BitLocker cryptographic algorithm validation
5. EFS (Encrypting File System) algorithm validation
6. IPsec cryptographic settings
7. RDP cryptographic configuration
8. Active cryptographic providers (CNG/CSP)
9. Certificate store validation
10. Windows Hello for Business crypto settings

### RHEL 8 (Bash)

```bash
# Run with default output location
sudo ./ia-7_rhel8_bash.sh

# Specify custom output path
sudo ./ia-7_rhel8_bash.sh /var/log/ia7_compliance.json
```

**Requirements:**
- Root or sudo privileges
- RHEL 8, CentOS 8, Rocky Linux 8, or AlmaLinux 8

**Checks Performed:**
1. FIPS mode kernel enablement (`/proc/sys/crypto/fips_enabled`)
2. dracut-fips package installation
3. SSH cryptographic algorithms (FIPS-approved ciphers, MACs, KexAlgorithms)
4. PAM authentication modules (sha512 hashing)
5. OpenSSL FIPS module validation
6. System-wide crypto-policies (FIPS policy active)
7. NSS FIPS mode (Network Security Services)
8. GnuTLS FIPS mode
9. Libgcrypt FIPS mode
10. SELinux cryptographic policy enforcement

### Ubuntu 22.04 (Bash)

```bash
# Run with default output location
sudo ./ia-7_ubuntu2204_bash.sh

# Specify custom output path
sudo ./ia-7_ubuntu2204_bash.sh /tmp/ia7_ubuntu_report.json
```

**Requirements:**
- Root or sudo privileges
- Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- **Note:** Full FIPS 140-2 validation requires Ubuntu Advantage (UA) subscription

**Checks Performed:**
1. Ubuntu Advantage FIPS status
2. FIPS kernel module loading (if UA FIPS enabled)
3. SSH cryptographic algorithms
4. PAM authentication modules (sha512 hashing)
5. OpenSSL configuration and FIPS provider
6. GnuTLS cryptographic settings
7. Libgcrypt configuration
8. StrongSwan/IPsec cryptographic algorithms
9. AppArmor cryptographic policy enforcement
10. Certificate store validation (weak algorithms)
11. Kernel cryptographic API configuration

### Ansible (Multi-Platform)

```bash
# Run against all hosts in inventory
ansible-playbook -i inventory.ini ia-7_ansible.yml

# Dry run (check mode)
ansible-playbook -i inventory.ini ia-7_ansible.yml --check

# Specify custom output directory
ansible-playbook -i inventory.ini ia-7_ansible.yml -e "output_dir=/tmp/ia7_reports"
```

**Requirements:**
- Ansible 2.9 or later
- SSH access to target hosts (Linux)
- WinRM access to target hosts (Windows)
- Appropriate privileges (sudo/Administrator)

**Supported Platforms:**
- Windows Server 2019/2022
- RHEL 8, CentOS 8, Rocky Linux 8, AlmaLinux 8
- Ubuntu 22.04 LTS, Ubuntu 24.04 LTS

## STIG Mappings

This implementation addresses the following DISA Security Technical Implementation Guide (STIG) requirements:

### Windows Server

| STIG ID | Rule ID | Version | Severity | Requirement |
|---------|---------|---------|----------|-------------|
| V-205842 | WN19-SO-000360 | Windows Server 2019 STIG v2r5 | CAT II | Windows Server 2019 must be configured to use FIPS-compliant algorithms for encryption, hashing, and signing. |
| V-254480 | - | Windows Server 2022 STIG v1r2 | CAT II | Windows Server 2022 must be configured to use FIPS-compliant algorithms for encryption, hashing, and signing. |

### RHEL/CentOS

| STIG ID | Version | Severity | Requirement |
|---------|---------|----------|-------------|
| RHEL-07-040110 | RHEL 7 STIG v3r15 | CAT II | The Red Hat Enterprise Linux operating system must implement cryptography to protect the integrity of LDAP authentication communications. |
| RHEL-08-010160 | RHEL 8 STIG v1r6 | CAT II | RHEL 8 pam_unix.so module must be configured in the password-auth file to use a FIPS 140-2 approved cryptographic hashing algorithm for system authentication. |

## Output Format

All scripts generate structured JSON compliance reports:

```json
{
  "control_id": "IA-7",
  "control_name": "Cryptographic Module Authentication",
  "timestamp": "2025-11-20T12:00:00Z",
  "hostname": "server01",
  "os_version": "Windows Server 2019",
  "compliant": false,
  "findings": [
    {
      "check": "FIPS Mode Enablement",
      "status": "FAIL",
      "severity": "HIGH",
      "finding": "FIPS mode is not enabled. Registry key not set to 1.",
      "remediation": "Enable via GPO: System cryptography: Use FIPS compliant algorithms = Enabled",
      "stig_id": "V-205842",
      "evidence": "Registry value: 0"
    }
  ],
  "errors": [],
  "evidence": {
    "tls_12": "Enabled",
    "cipher_suites": {
      "total": 42,
      "non_fips_detected": 0,
      "fips_compliant_present": 6
    }
  },
  "summary": {
    "total_checks": 9,
    "findings_count": 1,
    "errors_count": 0,
    "compliance_status": "NON-COMPLIANT"
  }
}
```

## Remediation Guidance

### Enabling FIPS Mode

#### Windows Server

1. **Via Group Policy:**
   - Open Group Policy Editor: `gpedit.msc`
   - Navigate to: Computer Configuration >> Windows Settings >> Security Settings >> Local Policies >> Security Options
   - Enable: "System cryptography: Use FIPS compliant algorithms for encryption, hashing, and signing"
   - Reboot the system

2. **Via Registry (Alternative):**
   ```powershell
   Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Lsa\FipsAlgorithmPolicy" -Name "Enabled" -Value 1 -Type DWord
   Restart-Computer
   ```

#### RHEL 8

```bash
# Enable FIPS mode
sudo fips-mode-setup --enable

# Verify fips=1 in kernel command line
sudo grubby --update-kernel=ALL --args="fips=1"

# Regenerate initramfs
sudo dracut -f

# Reboot
sudo reboot

# Verify FIPS mode after reboot
cat /proc/sys/crypto/fips_enabled  # Should output: 1
```

#### Ubuntu 22.04

Ubuntu requires Ubuntu Advantage (UA) subscription for FIPS 140-2 validated modules:

```bash
# Attach UA subscription
sudo ua attach <your-token>

# Enable FIPS
sudo ua enable fips

# Reboot
sudo reboot

# Verify FIPS kernel loaded
uname -r  # Should include "fips"
```

### Configuring FIPS-Compliant SSH

Add to `/etc/ssh/sshd_config`:

```
Ciphers aes256-ctr,aes192-ctr,aes128-ctr,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-256,hmac-sha2-512
KexAlgorithms ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group14-sha256
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

## Related Controls

- **AC-3:** Access Enforcement
- **IA-5:** Authenticator Management
- **SA-4:** Acquisition Process
- **SC-12:** Cryptographic Key Establishment and Management
- **SC-13:** Cryptographic Protection

## References

### NIST Publications

- [FIPS 140-2: Security Requirements for Cryptographic Modules](https://csrc.nist.gov/pubs/fips/140-2/upd2/final)
- [FIPS 140-3: Security Requirements for Cryptographic Modules](https://csrc.nist.gov/pubs/fips/140-3/final)
- [NIST SP 800-53 Rev 5: Security and Privacy Controls](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [Cryptographic Module Validation Program (CMVP)](https://csrc.nist.gov/projects/cryptographic-module-validation-program)

### DISA STIGs

- [Windows Server 2019 STIG](https://cyber.mil/stigs/)
- [Windows Server 2022 STIG](https://cyber.mil/stigs/)
- [Red Hat Enterprise Linux 7 STIG](https://cyber.mil/stigs/)
- [Red Hat Enterprise Linux 8 STIG](https://cyber.mil/stigs/)

### ComplianceAsCode

- [ComplianceAsCode GitHub Repository](https://github.com/ComplianceAsCode/content)
- [IA-7 Cryptographic Module Authentication Issue](https://github.com/ComplianceAsCode/redhat-identity-management/issues/81)

## Security Considerations

1. **Impact on Interoperability:** Enabling FIPS mode may break compatibility with legacy systems using non-FIPS cryptographic algorithms. Test thoroughly before production deployment.

2. **Performance:** FIPS-validated cryptographic operations may have performance overhead compared to non-validated implementations. Benchmark critical systems.

3. **Validation Expiration:** CMVP validation certificates expire after 5 years. Monitor validation status at [NIST CMVP](https://csrc.nist.gov/projects/cryptographic-module-validation-program).

4. **Algorithm Transitions:** NIST periodically deprecates weak algorithms (e.g., Triple-DES deprecated January 2024). Stay informed of cryptographic transitions.

5. **Ubuntu Subscription Requirement:** Ubuntu's FIPS 140-2 validated modules require an active Ubuntu Advantage subscription. Without UA, systems cannot achieve full FIPS validation.

## Troubleshooting

### Windows: FIPS Mode Enabled but Applications Failing

**Symptom:** Applications crash or report cryptographic errors after enabling FIPS mode.

**Cause:** Application uses non-FIPS algorithms (MD5, RC4, DES).

**Resolution:**
- Update application to use FIPS-compliant algorithms
- Check application vendor for FIPS-compliant version
- For .NET applications, review [FIPS Compliance in .NET](https://learn.microsoft.com/en-us/dotnet/standard/security/fips-compliance)

### RHEL: FIPS Mode Not Persisting After Reboot

**Symptom:** `/proc/sys/crypto/fips_enabled` shows 0 after reboot.

**Cause:** `fips=1` not in kernel command line or dracut-fips not installed.

**Resolution:**
```bash
# Verify dracut-fips installed
rpm -q dracut-fips

# Check kernel command line
cat /proc/cmdline | grep fips

# Re-enable if missing
sudo fips-mode-setup --enable
sudo grubby --update-kernel=ALL --args="fips=1"
sudo dracut -f
sudo reboot
```

### Ubuntu: UA FIPS Enablement Fails

**Symptom:** `ua enable fips` returns error.

**Cause:** Missing UA subscription or incompatible kernel.

**Resolution:**
```bash
# Check UA status
sudo ua status

# Attach subscription if needed
sudo ua attach <token>

# Ensure system is up to date
sudo apt update && sudo apt upgrade -y

# Try enabling FIPS again
sudo ua enable fips
```

## License

This implementation is provided as-is for compliance validation purposes. Scripts are read-only and make no system modifications.

## Author

**LOVELESS (QA Specialist)**
Elite QA with augmented MCP capabilities for security validation.

## Version History

- **1.0** (2025-11-20): Initial comprehensive implementation
  - Windows Server 2019/2022 PowerShell validation
  - RHEL 8 Bash validation
  - Ubuntu 22.04 Bash validation
  - Ansible multi-platform orchestration
  - STIG mapping integration
  - Zero hallucination enforcement
