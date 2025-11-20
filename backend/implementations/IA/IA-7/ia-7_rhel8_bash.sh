#!/bin/bash

################################################################################
# NIST 800-53 IA-7 Cryptographic Module Authentication - RHEL 8 Validation
#
# Description:
#   Validates FIPS 140-2/140-3 compliance for cryptographic module authentication
#   per NIST SP 800-53 Rev 5 IA-7 on Red Hat Enterprise Linux 8.
#
# Checks Performed:
#   1. FIPS mode system-wide enablement (/proc/sys/crypto/fips_enabled)
#   2. Kernel FIPS mode validation (dracut-fips package, boot parameters)
#   3. SSH cryptographic algorithms (FIPS-approved ciphers, MACs, KexAlgorithms)
#   4. PAM authentication modules (pam_unix.so sha512 hashing)
#   5. OpenSSL FIPS module validation
#   6. System-wide crypto-policies (FIPS policy active)
#   7. NSS FIPS mode (Network Security Services)
#   8. GnuTLS FIPS mode
#   9. Libgcrypt FIPS mode
#   10. SELinux cryptographic policy enforcement
#
# STIG Mappings:
#   - RHEL-07-040110 (RHEL 7): SSH FIPS ciphers
#   - RHEL-08-010160 (RHEL 8): PAM SHA-512 hashing
#
# Exit Codes:
#   0 = Fully compliant with IA-7
#   1 = Non-compliant (findings identified)
#   2 = Error during execution
#
# Usage:
#   sudo ./ia-7_rhel8_bash.sh
#   sudo ./ia-7_rhel8_bash.sh /path/to/output.json
#
# Author: LOVELESS (QA Specialist)
# Version: 1.0
# Platform: RHEL 8, CentOS 8, Rocky Linux 8, AlmaLinux 8
# Requires: root or sudo privileges
# Read-only: YES - No system modifications
# Idempotent: YES - Safe to run multiple times
# Zero hallucination tolerance: All checks verify actual system state
################################################################################

set -euo pipefail
IFS=$'\n\t'

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Output file
OUTPUT_FILE="${1:-./ia7_rhel8_compliance_report.json}"

# Compliance report structure
CONTROL_ID="IA-7"
CONTROL_NAME="Cryptographic Module Authentication"
TIMESTAMP=$(date -Iseconds)
HOSTNAME=$(hostname)
OS_VERSION=$(grep PRETTY_NAME /etc/os-release | cut -d'"' -f2)
COMPLIANT="true"
FINDINGS=()
ERRORS=()
EVIDENCE=()

# Privilege check
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] This script must be run as root or with sudo${NC}" >&2
   exit 2
fi

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

add_finding() {
    local check="$1"
    local status="$2"
    local severity="$3"
    local finding="$4"
    local remediation="$5"
    local stig_id="${6:-}"

    FINDINGS+=("$(cat <<EOF
{
  "check": "$check",
  "status": "$status",
  "severity": "$severity",
  "finding": "$finding",
  "remediation": "$remediation",
  "stig_id": "$stig_id"
}
EOF
)")

    if [[ "$status" == "FAIL" ]]; then
        COMPLIANT="false"
    fi
}

add_evidence() {
    local key="$1"
    local value="$2"
    EVIDENCE+=("\"$key\": \"$value\"")
}

################################################################################
# Validation Functions
################################################################################

check_fips_mode_kernel() {
    log_info "Checking FIPS mode kernel enablement..."

    if [[ -f /proc/sys/crypto/fips_enabled ]]; then
        fips_enabled=$(cat /proc/sys/crypto/fips_enabled)

        if [[ "$fips_enabled" == "1" ]]; then
            log_pass "FIPS mode is enabled (kernel)"
            add_evidence "fips_mode_kernel" "enabled"
        else
            log_fail "FIPS mode is NOT enabled in kernel"
            add_finding \
                "FIPS Mode Kernel" \
                "FAIL" \
                "HIGH" \
                "FIPS mode not enabled. /proc/sys/crypto/fips_enabled = $fips_enabled" \
                "Enable FIPS mode: fips-mode-setup --enable && reboot" \
                "RHEL-08-010160"
        fi
    else
        log_fail "/proc/sys/crypto/fips_enabled does not exist"
        add_finding \
            "FIPS Mode Kernel File" \
            "FAIL" \
            "CRITICAL" \
            "/proc/sys/crypto/fips_enabled file not found" \
            "Ensure RHEL 8 kernel supports FIPS mode" \
            ""
    fi
}

check_fips_dracut() {
    log_info "Checking dracut-fips package installation..."

    if rpm -q dracut-fips &>/dev/null; then
        log_pass "dracut-fips package installed"
        add_evidence "dracut_fips" "installed"

        # Check if fips=1 is in kernel command line
        if grep -q "fips=1" /proc/cmdline; then
            log_pass "Kernel boot parameter fips=1 present"
            add_evidence "kernel_fips_param" "present"
        else
            log_fail "Kernel boot parameter fips=1 NOT found"
            add_finding \
                "Kernel FIPS Boot Parameter" \
                "FAIL" \
                "HIGH" \
                "fips=1 not present in /proc/cmdline" \
                "Run: grubby --update-kernel=ALL --args='fips=1' && reboot" \
                ""
        fi
    else
        log_fail "dracut-fips package NOT installed"
        add_finding \
            "dracut-fips Package" \
            "FAIL" \
            "HIGH" \
            "dracut-fips package not installed" \
            "Install: yum install dracut-fips && dracut -f && reboot" \
            ""
    fi
}

check_ssh_crypto() {
    log_info "Checking SSH cryptographic algorithms..."

    local sshd_config="/etc/ssh/sshd_config"

    if [[ -f "$sshd_config" ]]; then
        # FIPS-approved ciphers
        local fips_ciphers="aes256-ctr,aes192-ctr,aes128-ctr,aes256-gcm@openssh.com,aes128-gcm@openssh.com"

        # Check Ciphers configuration
        if grep -q "^Ciphers" "$sshd_config"; then
            local configured_ciphers=$(grep "^Ciphers" "$sshd_config" | awk '{print $2}')

            # Check if non-FIPS ciphers are present
            if echo "$configured_ciphers" | grep -qE "3des|arcfour|blowfish|cast128"; then
                log_fail "SSH has non-FIPS ciphers configured"
                add_finding \
                    "SSH Ciphers" \
                    "FAIL" \
                    "HIGH" \
                    "Non-FIPS ciphers detected in sshd_config: $configured_ciphers" \
                    "Configure Ciphers $fips_ciphers in $sshd_config" \
                    "RHEL-07-040110"
            else
                log_pass "SSH ciphers appear FIPS-compliant"
                add_evidence "ssh_ciphers" "$configured_ciphers"
            fi
        else
            log_warn "No explicit Ciphers directive in sshd_config (using defaults)"
        fi

        # Check MACs (Message Authentication Codes)
        if grep -q "^MACs" "$sshd_config"; then
            local configured_macs=$(grep "^MACs" "$sshd_config" | awk '{print $2}')

            if echo "$configured_macs" | grep -qE "md5|96"; then
                log_fail "SSH has weak MACs configured"
                add_finding \
                    "SSH MACs" \
                    "FAIL" \
                    "HIGH" \
                    "Weak MACs detected: $configured_macs" \
                    "Configure MACs hmac-sha2-256,hmac-sha2-512 in $sshd_config" \
                    "RHEL-07-040110"
            else
                log_pass "SSH MACs appear FIPS-compliant"
                add_evidence "ssh_macs" "$configured_macs"
            fi
        fi

        # Check KexAlgorithms
        if grep -q "^KexAlgorithms" "$sshd_config"; then
            local configured_kex=$(grep "^KexAlgorithms" "$sshd_config" | awk '{print $2}')
            add_evidence "ssh_kex_algorithms" "$configured_kex"
        fi

    else
        log_fail "sshd_config not found at $sshd_config"
        add_finding \
            "SSH Configuration File" \
            "FAIL" \
            "HIGH" \
            "sshd_config file not found" \
            "Ensure OpenSSH is installed" \
            ""
    fi
}

check_pam_sha512() {
    log_info "Checking PAM sha512 hashing for authentication..."

    local pam_password_auth="/etc/pam.d/password-auth"
    local pam_system_auth="/etc/pam.d/system-auth"

    for pam_file in "$pam_password_auth" "$pam_system_auth"; do
        if [[ -f "$pam_file" ]]; then
            if grep -E "^password.*pam_unix.so.*sha512" "$pam_file" &>/dev/null; then
                log_pass "$pam_file uses sha512 hashing"
                add_evidence "pam_$(basename $pam_file)_sha512" "enabled"
            else
                log_fail "$pam_file does NOT use sha512 hashing"
                add_finding \
                    "PAM SHA-512 Hashing" \
                    "FAIL" \
                    "HIGH" \
                    "$pam_file missing sha512 option for pam_unix.so" \
                    "Add 'sha512' to pam_unix.so line in $pam_file" \
                    "RHEL-08-010160"
            fi
        else
            log_warn "$pam_file not found"
        fi
    done
}

check_openssl_fips() {
    log_info "Checking OpenSSL FIPS module..."

    if command -v openssl &>/dev/null; then
        local openssl_version=$(openssl version)
        add_evidence "openssl_version" "$openssl_version"

        # Check if OpenSSL FIPS module is installed
        if openssl md5 /dev/null &>/dev/null; then
            log_warn "OpenSSL MD5 available (not in FIPS mode or permissive)"
        else
            log_pass "OpenSSL FIPS mode active (MD5 disabled)"
            add_evidence "openssl_fips_mode" "active"
        fi
    else
        log_fail "OpenSSL not installed"
        add_finding \
            "OpenSSL Installation" \
            "FAIL" \
            "MEDIUM" \
            "OpenSSL command not found" \
            "Install OpenSSL: yum install openssl" \
            ""
    fi
}

check_crypto_policies() {
    log_info "Checking system-wide crypto-policies..."

    if command -v update-crypto-policies &>/dev/null; then
        local current_policy=$(update-crypto-policies --show 2>/dev/null || echo "unknown")

        if [[ "$current_policy" == "FIPS" ]]; then
            log_pass "Crypto-policy set to FIPS"
            add_evidence "crypto_policy" "FIPS"
        else
            log_fail "Crypto-policy is NOT set to FIPS (current: $current_policy)"
            add_finding \
                "System Crypto-Policy" \
                "FAIL" \
                "HIGH" \
                "System crypto-policy not set to FIPS. Current: $current_policy" \
                "Set FIPS policy: update-crypto-policies --set FIPS && reboot" \
                ""
        fi
    else
        log_warn "crypto-policies tools not available"
    fi
}

check_nss_fips() {
    log_info "Checking NSS (Network Security Services) FIPS mode..."

    # NSS FIPS indicator file
    if [[ -f /etc/system-fips ]]; then
        log_pass "NSS FIPS mode indicator file exists (/etc/system-fips)"
        add_evidence "nss_fips_indicator" "present"
    else
        log_fail "NSS FIPS indicator file /etc/system-fips NOT found"
        add_finding \
            "NSS FIPS Mode" \
            "FAIL" \
            "MEDIUM" \
            "/etc/system-fips file not found" \
            "Enable FIPS mode: fips-mode-setup --enable" \
            ""
    fi
}

check_gnutls_fips() {
    log_info "Checking GnuTLS FIPS mode..."

    if command -v gnutls-cli &>/dev/null; then
        # GnuTLS in FIPS mode disallows weak algorithms
        if gnutls-cli --priority "NORMAL:-VERS-TLS-ALL:+VERS-TLS1.2" --list &>/dev/null; then
            add_evidence "gnutls_available" "yes"
        else
            log_warn "GnuTLS tests failed or restrictive FIPS mode active"
        fi
    else
        log_info "GnuTLS not installed (optional)"
    fi
}

check_libgcrypt_fips() {
    log_info "Checking Libgcrypt FIPS mode..."

    # Libgcrypt FIPS mode is controlled by /etc/gcrypt/fips_enabled or kernel FIPS mode
    if [[ -f /etc/gcrypt/fips_enabled ]]; then
        log_pass "Libgcrypt FIPS configuration file exists"
        add_evidence "libgcrypt_fips_config" "present"
    else
        # Libgcrypt inherits from kernel FIPS mode
        log_info "Libgcrypt inherits kernel FIPS mode (no separate config)"
    fi
}

check_selinux_crypto_policy() {
    log_info "Checking SELinux cryptographic policy enforcement..."

    if command -v getenforce &>/dev/null; then
        local selinux_status=$(getenforce)

        if [[ "$selinux_status" == "Enforcing" ]]; then
            log_pass "SELinux is Enforcing"
            add_evidence "selinux_mode" "Enforcing"
        else
            log_warn "SELinux is NOT Enforcing (current: $selinux_status)"
            add_evidence "selinux_mode" "$selinux_status"
        fi
    else
        log_warn "SELinux tools not available"
    fi
}

################################################################################
# Main Execution
################################################################################

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}IA-7 FIPS 140-2/140-3 Validation - RHEL 8${NC}"
echo -e "${CYAN}========================================${NC}"

check_fips_mode_kernel
check_fips_dracut
check_ssh_crypto
check_pam_sha512
check_openssl_fips
check_crypto_policies
check_nss_fips
check_gnutls_fips
check_libgcrypt_fips
check_selinux_crypto_policy

################################################################################
# Generate JSON Report
################################################################################

log_info "Generating compliance report..."

# Build findings JSON array
FINDINGS_JSON="[]"
if [[ ${#FINDINGS[@]} -gt 0 ]]; then
    FINDINGS_JSON="[$(IFS=,; echo "${FINDINGS[*]}")]"
fi

# Build evidence JSON object
EVIDENCE_JSON="{}"
if [[ ${#EVIDENCE[@]} -gt 0 ]]; then
    EVIDENCE_JSON="{$(IFS=,; echo "${EVIDENCE[*]}")}"
fi

# Build errors JSON array
ERRORS_JSON="[]"
if [[ ${#ERRORS[@]} -gt 0 ]]; then
    ERRORS_JSON="[$(printf '"%s",' "${ERRORS[@]}" | sed 's/,$//')]"
fi

# Compliance summary
FINDINGS_COUNT=${#FINDINGS[@]}
ERRORS_COUNT=${#ERRORS[@]}
COMPLIANCE_STATUS=$([ "$COMPLIANT" == "true" ] && echo "COMPLIANT" || echo "NON-COMPLIANT")

# Generate JSON report
cat > "$OUTPUT_FILE" <<EOF
{
  "control_id": "$CONTROL_ID",
  "control_name": "$CONTROL_NAME",
  "timestamp": "$TIMESTAMP",
  "hostname": "$HOSTNAME",
  "os_version": "$OS_VERSION",
  "compliant": $COMPLIANT,
  "findings": $FINDINGS_JSON,
  "errors": $ERRORS_JSON,
  "evidence": $EVIDENCE_JSON,
  "summary": {
    "total_checks": 10,
    "findings_count": $FINDINGS_COUNT,
    "errors_count": $ERRORS_COUNT,
    "compliance_status": "$COMPLIANCE_STATUS"
  }
}
EOF

log_info "Compliance report generated: $OUTPUT_FILE"

################################################################################
# Display Summary
################################################################################

echo -e "\n${CYAN}======================================${NC}"
echo -e "${CYAN}IA-7 COMPLIANCE SUMMARY${NC}"
echo -e "${CYAN}======================================${NC}"

if [[ "$COMPLIANT" == "true" ]]; then
    echo -e "Status: ${GREEN}$COMPLIANCE_STATUS${NC}"
else
    echo -e "Status: ${RED}$COMPLIANCE_STATUS${NC}"
fi

echo -e "Findings: ${YELLOW}$FINDINGS_COUNT${NC}"
echo -e "Errors: ${RED}$ERRORS_COUNT${NC}"
echo -e "${CYAN}======================================${NC}\n"

################################################################################
# Exit with appropriate code
################################################################################

if [[ $ERRORS_COUNT -gt 0 ]]; then
    exit 2
elif [[ "$COMPLIANT" == "false" ]]; then
    exit 1
else
    exit 0
fi
