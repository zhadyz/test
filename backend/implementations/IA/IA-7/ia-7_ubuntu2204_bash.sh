#!/bin/bash

################################################################################
# NIST 800-53 IA-7 Cryptographic Module Authentication - Ubuntu 22.04 Validation
#
# Description:
#   Validates FIPS 140-2/140-3 compliance for cryptographic module authentication
#   per NIST SP 800-53 Rev 5 IA-7 on Ubuntu 22.04 LTS (Jammy Jellyfish).
#
#   NOTE: Ubuntu 22.04 requires Ubuntu Advantage (UA) subscription for full
#   FIPS 140-2 validated cryptographic modules. This script validates both
#   standard cryptographic configurations and UA FIPS enablement.
#
# Checks Performed:
#   1. Ubuntu Advantage FIPS status (ua security status fips)
#   2. FIPS kernel module loading (if UA FIPS enabled)
#   3. SSH cryptographic algorithms (FIPS-approved ciphers, MACs, KexAlgorithms)
#   4. PAM authentication modules (pam_unix.so sha512 hashing)
#   5. OpenSSL configuration and FIPS provider
#   6. GnuTLS cryptographic settings
#   7. Libgcrypt configuration
#   8. StrongSwan/IPsec cryptographic algorithms (if installed)
#   9. AppArmor cryptographic policy enforcement
#   10. Certificate store validation (weak algorithms)
#
# Exit Codes:
#   0 = Fully compliant with IA-7
#   1 = Non-compliant (findings identified)
#   2 = Error during execution
#
# Usage:
#   sudo ./ia-7_ubuntu2204_bash.sh
#   sudo ./ia-7_ubuntu2204_bash.sh /path/to/output.json
#
# Author: LOVELESS (QA Specialist)
# Version: 1.0
# Platform: Ubuntu 22.04 LTS, Ubuntu 24.04 LTS
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
OUTPUT_FILE="${1:-./ia7_ubuntu2204_compliance_report.json}"

# Compliance report structure
CONTROL_ID="IA-7"
CONTROL_NAME="Cryptographic Module Authentication"
TIMESTAMP=$(date -Iseconds)
HOSTNAME=$(hostname)
OS_VERSION=$(lsb_release -d | awk -F'\t' '{print $2}')
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

    FINDINGS+=("$(cat <<EOF
{
  "check": "$check",
  "status": "$status",
  "severity": "$severity",
  "finding": "$finding",
  "remediation": "$remediation"
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

check_ua_fips_status() {
    log_info "Checking Ubuntu Advantage (UA) FIPS status..."

    if command -v ua &>/dev/null || command -v pro &>/dev/null; then
        local ua_cmd="ua"
        if command -v pro &>/dev/null; then
            ua_cmd="pro"
        fi

        # Check FIPS service status
        if $ua_cmd security status fips 2>/dev/null | grep -q "enabled"; then
            log_pass "Ubuntu Advantage FIPS is enabled"
            add_evidence "ua_fips_status" "enabled"

            # Verify FIPS kernel loaded
            if uname -r | grep -q "fips"; then
                log_pass "FIPS kernel is active"
                add_evidence "fips_kernel" "active"
            else
                log_warn "FIPS service enabled but FIPS kernel not active (reboot may be required)"
                add_evidence "fips_kernel" "not_active"
            fi
        else
            log_warn "Ubuntu Advantage FIPS is NOT enabled"
            add_finding \
                "UA FIPS Status" \
                "WARNING" \
                "MEDIUM" \
                "Ubuntu Advantage FIPS subscription not enabled. FIPS 140-2 validated modules require UA." \
                "Enable FIPS: sudo ua enable fips (requires UA subscription)" \
                ""
            add_evidence "ua_fips_status" "not_enabled"
        fi
    else
        log_warn "Ubuntu Advantage tools not installed"
        add_finding \
            "UA Tools" \
            "WARNING" \
            "LOW" \
            "Ubuntu Advantage client not installed. Cannot verify FIPS subscription status." \
            "Install: sudo apt install ubuntu-advantage-tools" \
            ""
    fi
}

check_ssh_crypto() {
    log_info "Checking SSH cryptographic algorithms..."

    local sshd_config="/etc/ssh/sshd_config"
    local sshd_config_d="/etc/ssh/sshd_config.d"

    if [[ -f "$sshd_config" ]]; then
        # FIPS-approved ciphers
        local fips_ciphers="aes256-ctr,aes192-ctr,aes128-ctr,aes256-gcm@openssh.com,aes128-gcm@openssh.com"

        # Check main config and drop-in directory
        local all_config="$sshd_config"
        if [[ -d "$sshd_config_d" ]]; then
            all_config="$sshd_config $(find $sshd_config_d -type f -name '*.conf' 2>/dev/null)"
        fi

        # Check Ciphers configuration
        local cipher_config=$(grep "^Ciphers" $all_config 2>/dev/null | tail -1)
        if [[ -n "$cipher_config" ]]; then
            local configured_ciphers=$(echo "$cipher_config" | awk '{print $2}')

            # Check if non-FIPS ciphers are present
            if echo "$configured_ciphers" | grep -qE "3des|arcfour|blowfish|cast128|chacha20"; then
                log_fail "SSH has non-FIPS ciphers configured"
                add_finding \
                    "SSH Ciphers" \
                    "FAIL" \
                    "HIGH" \
                    "Non-FIPS ciphers detected: $configured_ciphers" \
                    "Configure Ciphers $fips_ciphers in $sshd_config" \
                    ""
            else
                log_pass "SSH ciphers appear FIPS-compliant"
                add_evidence "ssh_ciphers" "$configured_ciphers"
            fi
        else
            log_warn "No explicit Ciphers directive in sshd_config (using defaults)"
            add_evidence "ssh_ciphers" "default"
        fi

        # Check MACs (Message Authentication Codes)
        local mac_config=$(grep "^MACs" $all_config 2>/dev/null | tail -1)
        if [[ -n "$mac_config" ]]; then
            local configured_macs=$(echo "$mac_config" | awk '{print $2}')

            if echo "$configured_macs" | grep -qE "md5|96|umac-64"; then
                log_fail "SSH has weak MACs configured"
                add_finding \
                    "SSH MACs" \
                    "FAIL" \
                    "HIGH" \
                    "Weak MACs detected: $configured_macs" \
                    "Configure MACs hmac-sha2-256,hmac-sha2-512 in $sshd_config" \
                    ""
            else
                log_pass "SSH MACs appear FIPS-compliant"
                add_evidence "ssh_macs" "$configured_macs"
            fi
        fi

        # Check KexAlgorithms
        local kex_config=$(grep "^KexAlgorithms" $all_config 2>/dev/null | tail -1)
        if [[ -n "$kex_config" ]]; then
            local configured_kex=$(echo "$kex_config" | awk '{print $2}')
            add_evidence "ssh_kex_algorithms" "$configured_kex"
        fi

    else
        log_fail "sshd_config not found at $sshd_config"
        add_finding \
            "SSH Configuration File" \
            "FAIL" \
            "HIGH" \
            "sshd_config file not found" \
            "Ensure OpenSSH is installed: sudo apt install openssh-server" \
            ""
    fi
}

check_pam_sha512() {
    log_info "Checking PAM sha512 hashing for authentication..."

    local pam_common_password="/etc/pam.d/common-password"

    if [[ -f "$pam_common_password" ]]; then
        if grep -E "^password.*pam_unix.so.*sha512" "$pam_common_password" &>/dev/null; then
            log_pass "$pam_common_password uses sha512 hashing"
            add_evidence "pam_password_hashing" "sha512"
        else
            log_fail "$pam_common_password does NOT use sha512 hashing"
            add_finding \
                "PAM SHA-512 Hashing" \
                "FAIL" \
                "HIGH" \
                "$pam_common_password missing sha512 option for pam_unix.so" \
                "Add 'sha512' to pam_unix.so line in $pam_common_password" \
                ""
        fi
    else
        log_fail "$pam_common_password not found"
        add_finding \
            "PAM Configuration" \
            "FAIL" \
            "HIGH" \
            "PAM common-password file not found" \
            "Reinstall PAM: sudo apt install --reinstall libpam-modules" \
            ""
    fi
}

check_openssl_config() {
    log_info "Checking OpenSSL configuration and FIPS provider..."

    if command -v openssl &>/dev/null; then
        local openssl_version=$(openssl version)
        add_evidence "openssl_version" "$openssl_version"

        # Check if OpenSSL 3.0+ FIPS provider is loaded
        if openssl list -providers 2>/dev/null | grep -q "fips"; then
            log_pass "OpenSSL FIPS provider loaded"
            add_evidence "openssl_fips_provider" "loaded"
        else
            log_warn "OpenSSL FIPS provider NOT loaded (requires UA FIPS or manual configuration)"
            add_evidence "openssl_fips_provider" "not_loaded"
        fi

        # Test if weak algorithms are disabled
        if openssl md5 /dev/null &>/dev/null; then
            log_warn "OpenSSL MD5 available (not in strict FIPS mode)"
            add_evidence "openssl_md5_available" "yes"
        else
            log_pass "OpenSSL MD5 disabled (strict FIPS mode)"
            add_evidence "openssl_md5_available" "no"
        fi
    else
        log_fail "OpenSSL not installed"
        add_finding \
            "OpenSSL Installation" \
            "FAIL" \
            "CRITICAL" \
            "OpenSSL command not found" \
            "Install OpenSSL: sudo apt install openssl" \
            ""
    fi
}

check_gnutls_config() {
    log_info "Checking GnuTLS cryptographic configuration..."

    if command -v gnutls-cli &>/dev/null; then
        local gnutls_version=$(gnutls-cli --version | head -1)
        add_evidence "gnutls_version" "$gnutls_version"

        # Check priority strings configuration
        if [[ -f /etc/gnutls/default-priorities ]]; then
            local gnutls_priority=$(cat /etc/gnutls/default-priorities)
            add_evidence "gnutls_priority" "$gnutls_priority"

            if echo "$gnutls_priority" | grep -qE "SECURE256|SECURE192|SECURE128"; then
                log_pass "GnuTLS configured with secure priority strings"
            fi
        fi
    else
        log_info "GnuTLS not installed (optional)"
    fi
}

check_libgcrypt_config() {
    log_info "Checking Libgcrypt configuration..."

    # Libgcrypt FIPS mode on Ubuntu typically requires recompilation or UA FIPS
    if dpkg -l | grep -q "libgcrypt20"; then
        local libgcrypt_version=$(dpkg -l | grep "libgcrypt20" | awk '{print $3}')
        add_evidence "libgcrypt_version" "$libgcrypt_version"

        # Check if FIPS-capable libgcrypt is installed (UA FIPS version)
        if dpkg -l | grep -q "libgcrypt20-fips"; then
            log_pass "FIPS-capable libgcrypt installed"
            add_evidence "libgcrypt_fips" "installed"
        else
            log_info "Standard libgcrypt installed (FIPS requires UA subscription)"
            add_evidence "libgcrypt_fips" "not_installed"
        fi
    else
        log_warn "Libgcrypt not installed"
    fi
}

check_ipsec_crypto() {
    log_info "Checking IPsec/StrongSwan cryptographic algorithms..."

    if command -v ipsec &>/dev/null; then
        # Check StrongSwan configuration
        local ipsec_conf="/etc/ipsec.conf"
        local strongswan_conf="/etc/strongswan.conf"

        if [[ -f "$strongswan_conf" ]]; then
            # Check if FIPS mode is enabled in strongswan.conf
            if grep -qE "^[[:space:]]*fips_mode[[:space:]]*=[[:space:]]*yes" "$strongswan_conf"; then
                log_pass "StrongSwan FIPS mode enabled"
                add_evidence "strongswan_fips_mode" "enabled"
            else
                log_warn "StrongSwan FIPS mode NOT explicitly enabled"
                add_evidence "strongswan_fips_mode" "not_enabled"
            fi
        fi

        # Check for weak algorithms in connections
        if [[ -d /etc/ipsec.d/connections ]]; then
            local weak_algos=$(grep -rE "3des|md5|modp1024" /etc/ipsec.d/connections 2>/dev/null || true)
            if [[ -n "$weak_algos" ]]; then
                log_fail "IPsec connections use weak cryptographic algorithms"
                add_finding \
                    "IPsec Weak Algorithms" \
                    "FAIL" \
                    "HIGH" \
                    "Weak algorithms detected in IPsec configuration: 3DES, MD5, or MODP1024" \
                    "Update IPsec connections to use AES, SHA256+, and strong DH groups" \
                    ""
            fi
        fi
    else
        log_info "IPsec/StrongSwan not installed (optional)"
    fi
}

check_apparmor_enforcement() {
    log_info "Checking AppArmor cryptographic policy enforcement..."

    if command -v aa-status &>/dev/null; then
        local apparmor_status=$(aa-status --enabled 2>&1)

        if [[ $? -eq 0 ]]; then
            log_pass "AppArmor is enabled"
            add_evidence "apparmor_status" "enabled"

            # Count enforced profiles
            local enforced_count=$(aa-status 2>/dev/null | grep "profiles are in enforce mode" | awk '{print $1}')
            if [[ -n "$enforced_count" && "$enforced_count" -gt 0 ]]; then
                add_evidence "apparmor_enforced_profiles" "$enforced_count"
            fi
        else
            log_warn "AppArmor is NOT enabled"
            add_finding \
                "AppArmor Enforcement" \
                "WARNING" \
                "LOW" \
                "AppArmor not enabled. Reduced security policy enforcement." \
                "Enable AppArmor: sudo systemctl enable apparmor && sudo systemctl start apparmor" \
                ""
        fi
    else
        log_warn "AppArmor tools not installed"
    fi
}

check_certificate_store() {
    log_info "Checking certificate store for weak cryptographic algorithms..."

    local cert_count=0
    local weak_cert_count=0

    # Check system CA certificates
    if [[ -d /etc/ssl/certs ]]; then
        for cert_file in /etc/ssl/certs/*.pem; do
            if [[ -f "$cert_file" ]]; then
                ((cert_count++))

                # Check signature algorithm
                local sig_algo=$(openssl x509 -in "$cert_file" -noout -text 2>/dev/null | grep "Signature Algorithm:" | head -1 | awk -F': ' '{print $2}')
                if [[ "$sig_algo" =~ (md5|sha1) ]]; then
                    ((weak_cert_count++))
                fi
            fi

            # Limit check to first 50 certificates (performance)
            if [[ $cert_count -ge 50 ]]; then
                break
            fi
        done

        add_evidence "certificates_checked" "$cert_count"

        if [[ $weak_cert_count -gt 0 ]]; then
            log_warn "$weak_cert_count certificates with weak signature algorithms (MD5/SHA1) detected"
            add_finding \
                "Certificate Store - Weak Algorithms" \
                "WARNING" \
                "LOW" \
                "$weak_cert_count certificates use weak signature algorithms (MD5/SHA1)" \
                "Review and update CA certificates: sudo update-ca-certificates" \
                ""
        else
            log_pass "No weak certificates detected in sample"
        fi
    fi
}

check_kernel_crypto_api() {
    log_info "Checking kernel cryptographic API configuration..."

    # Verify kernel supports strong cryptographic algorithms
    if [[ -f /proc/crypto ]]; then
        local crypto_algos=$(grep "^name" /proc/crypto | awk '{print $3}' | sort -u)
        local fips_algos=("aes" "sha256" "sha512")

        local missing_algos=()
        for algo in "${fips_algos[@]}"; do
            if ! echo "$crypto_algos" | grep -q "^${algo}$"; then
                missing_algos+=("$algo")
            fi
        done

        if [[ ${#missing_algos[@]} -eq 0 ]]; then
            log_pass "Kernel supports required FIPS cryptographic algorithms"
            add_evidence "kernel_crypto_support" "compliant"
        else
            log_fail "Kernel missing FIPS algorithms: ${missing_algos[*]}"
            add_finding \
                "Kernel Crypto API" \
                "FAIL" \
                "HIGH" \
                "Kernel missing required cryptographic algorithms: ${missing_algos[*]}" \
                "Upgrade kernel or enable required crypto modules" \
                ""
        fi
    else
        log_warn "/proc/crypto not available"
    fi
}

################################################################################
# Main Execution
################################################################################

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}IA-7 FIPS 140-2/140-3 Validation - Ubuntu 22.04${NC}"
echo -e "${CYAN}========================================${NC}"

check_ua_fips_status
check_ssh_crypto
check_pam_sha512
check_openssl_config
check_gnutls_config
check_libgcrypt_config
check_ipsec_crypto
check_apparmor_enforcement
check_certificate_store
check_kernel_crypto_api

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
  },
  "note": "Ubuntu 22.04 requires Ubuntu Advantage (UA) subscription for FIPS 140-2 validated cryptographic modules. This report validates both standard configurations and UA FIPS enablement."
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
