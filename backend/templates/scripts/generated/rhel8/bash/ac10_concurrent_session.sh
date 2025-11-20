#!/bin/bash
################################################################################
# NIST 800-53 AC-10 Implementation Script
# Control: Concurrent Session Control
# Platform: RHEL 8
# Generated: 2025-01-08
# Generator Version: 1.0.0
#
# Description:
# Implements NIST 800-53 Rev 5 AC-10 by limiting concurrent sessions per user
# to prevent resource exhaustion and enforce accountability.
#
# This script implements AC-10 compliance requirements with:
# - Pre-flight validation
# - State backup
# - Implementation with error handling
# - Verification
# - Rollback capability on failure
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'        # Safer field splitting

################################################################################
# CONFIGURATION
################################################################################

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
readonly LOG_FILE="/var/log/nist_compliance_${TIMESTAMP}.log"
readonly BACKUP_DIR="/var/backups/nist_ac10_${TIMESTAMP}"
readonly CONTROL_ID="AC-10"
readonly PLATFORM="RHEL 8"

# Control-specific configuration
readonly MAX_CONCURRENT_SESSIONS=3
readonly LIMITS_CONF="/etc/security/limits.conf"
readonly PAM_SYSTEM_AUTH="/etc/pam.d/system-auth"

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_PREFLIGHT_FAILED=1
readonly EXIT_IMPLEMENTATION_FAILED=2
readonly EXIT_VERIFICATION_FAILED=3
readonly EXIT_ROLLBACK_FAILED=4

################################################################################
# LOGGING
################################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
}

log_warn() {
    log "WARN" "$@"
}

log_error() {
    log "ERROR" "$@"
}

log_success() {
    log "SUCCESS" "$@"
}

################################################################################
# ERROR HANDLING
################################################################################

cleanup() {
    local exit_code=$?

    if [ ${exit_code} -ne 0 ]; then
        log_error "Script failed with exit code ${exit_code}"

        # Attempt rollback on failure
        if [ "${BACKUP_CREATED:-false}" = "true" ]; then
            log_warn "Attempting automatic rollback..."
            rollback_changes || log_error "Rollback failed"
        fi
    fi

    exit ${exit_code}
}

trap cleanup EXIT
trap 'log_error "Script interrupted"; exit 130' INT TERM

################################################################################
# PRE-FLIGHT CHECKS
################################################################################

preflight_checks() {
    log_info "Starting pre-flight checks for AC-10..."

    # Check if running as root
    if [ "${EUID}" -ne 0 ]; then
        log_error "This script must be run as root or with sudo"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    # OS detection
    if [ ! -f /etc/os-release ]; then
        log_error "Cannot detect OS - /etc/os-release not found"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    source /etc/os-release
    log_info "Detected OS: ${NAME} ${VERSION_ID}"

    # Verify RHEL platform
    if [[ ! "${ID}" =~ ^(rhel|centos|rocky|almalinux)$ ]]; then
        log_error "This script is designed for RHEL-based systems"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    # Check disk space (minimum 100MB)
    local available_space=$(df -BM / | awk 'NR==2 {print $4}' | sed 's/M//')
    if [ "${available_space}" -lt 100 ]; then
        log_warn "Low disk space: ${available_space}MB available"
    fi

    # Check required files exist
    if [ ! -f "${LIMITS_CONF}" ]; then
        log_error "Required file not found: ${LIMITS_CONF}"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    if [ ! -f "${PAM_SYSTEM_AUTH}" ]; then
        log_error "Required file not found: ${PAM_SYSTEM_AUTH}"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    # Check PAM limits module
    if ! grep -q 'pam_limits.so' "${PAM_SYSTEM_AUTH}"; then
        log_warn "PAM limits module not configured in ${PAM_SYSTEM_AUTH}"
    fi

    log_success "Pre-flight checks passed"
    return ${EXIT_SUCCESS}
}

################################################################################
# BACKUP
################################################################################

backup_state() {
    log_info "Creating backup in ${BACKUP_DIR}..."

    # Create backup directory
    mkdir -p "${BACKUP_DIR}"

    # Backup limits.conf
    if [ -e "${LIMITS_CONF}" ]; then
        cp -a "${LIMITS_CONF}" "${BACKUP_DIR}/limits.conf.backup"
        log_info "Backed up: ${LIMITS_CONF}"
    fi

    # Backup PAM configuration
    if [ -e "${PAM_SYSTEM_AUTH}" ]; then
        cp -a "${PAM_SYSTEM_AUTH}" "${BACKUP_DIR}/system-auth.backup"
        log_info "Backed up: ${PAM_SYSTEM_AUTH}"
    fi

    # Create state snapshot
    cat > "${BACKUP_DIR}/state_snapshot.txt" <<EOF
Backup created: $(date)
Control ID: ${CONTROL_ID}
Platform: ${PLATFORM}
Hostname: $(hostname)
Kernel: $(uname -r)
Current maxlogins setting: $(grep -E '^[^#]*maxlogins' ${LIMITS_CONF} 2>/dev/null || echo "Not configured")
EOF

    BACKUP_CREATED=true
    log_success "Backup completed: ${BACKUP_DIR}"
    return ${EXIT_SUCCESS}
}

################################################################################
# IMPLEMENTATION
################################################################################

implement_control() {
    log_info "Implementing AC-10 compliance requirements..."

    # Pre-implementation check
    log_info "Check: Current maxlogins configuration"
    local current_maxlogins=$(grep -E '^[^#]*maxlogins' "${LIMITS_CONF}" 2>/dev/null || echo "")
    if [ -n "${current_maxlogins}" ]; then
        log_info "Current configuration: ${current_maxlogins}"
    else
        log_info "No maxlogins configuration found"
    fi

    # Remove any existing maxlogins entries to avoid conflicts
    log_info "Removing any existing maxlogins entries..."
    sed -i '/^[^#]*maxlogins/d' "${LIMITS_CONF}"

    # Add new maxlogins configuration
    log_info "Implementing: Set hard maxlogins limit to ${MAX_CONCURRENT_SESSIONS}"
    cat >> "${LIMITS_CONF}" <<EOF

# NIST 800-53 AC-10: Concurrent Session Control
# Limit concurrent sessions to prevent resource exhaustion
# Applied: $(date '+%Y-%m-%d %H:%M:%S')
* hard maxlogins ${MAX_CONCURRENT_SESSIONS}
EOF

    log_success "Added maxlogins limit to ${LIMITS_CONF}"

    # Ensure PAM limits module is enabled
    log_info "Verifying PAM limits module configuration..."
    if ! grep -q 'pam_limits.so' "${PAM_SYSTEM_AUTH}"; then
        log_info "Adding pam_limits.so to ${PAM_SYSTEM_AUTH}"

        # Add pam_limits.so if not present
        if ! grep -q '^session.*required.*pam_limits.so' "${PAM_SYSTEM_AUTH}"; then
            # Add after the last session line
            sed -i '/^session/a session     required      pam_limits.so' "${PAM_SYSTEM_AUTH}"
            log_success "Added pam_limits.so to ${PAM_SYSTEM_AUTH}"
        fi
    else
        log_info "PAM limits module already configured"
    fi

    log_success "AC-10 implementation completed"
    return ${EXIT_SUCCESS}
}

################################################################################
# VERIFICATION
################################################################################

verify_implementation() {
    log_info "Verifying AC-10 implementation..."

    local verification_passed=true

    # Verification 1: Check maxlogins in limits.conf
    log_info "Verifying: maxlogins setting in limits.conf"
    if grep -q "^[^#]*\*.*hard.*maxlogins.*${MAX_CONCURRENT_SESSIONS}" "${LIMITS_CONF}"; then
        log_success "[PASS] maxlogins limit verified: ${MAX_CONCURRENT_SESSIONS}"
    else
        log_error "[FAIL] maxlogins limit not set correctly"
        log_error "Expected: * hard maxlogins ${MAX_CONCURRENT_SESSIONS}"
        verification_passed=false
    fi

    # Verification 2: Check PAM limits module
    log_info "Verifying: PAM limits module in system-auth"
    if grep -q 'pam_limits.so' "${PAM_SYSTEM_AUTH}"; then
        log_success "[PASS] PAM limits module verified"
    else
        log_error "[FAIL] PAM limits module not found in ${PAM_SYSTEM_AUTH}"
        verification_passed=false
    fi

    # Verification 3: Validate limits.conf syntax
    log_info "Verifying: limits.conf syntax"
    if grep -qE '^[^#]+[[:space:]]+hard[[:space:]]+maxlogins[[:space:]]+[0-9]+' "${LIMITS_CONF}"; then
        log_success "[PASS] limits.conf syntax is valid"
    else
        log_error "[FAIL] limits.conf syntax may be invalid"
        verification_passed=false
    fi

    # Verification 4: Check file permissions
    log_info "Verifying: limits.conf permissions"
    local perms=$(stat -c "%a" "${LIMITS_CONF}")
    if [ "${perms}" = "644" ]; then
        log_success "[PASS] limits.conf permissions correct: ${perms}"
    else
        log_warn "[WARN] limits.conf permissions: ${perms} (expected 644)"
    fi

    if [ "${verification_passed}" = "true" ]; then
        log_success "All verification checks passed"
        log_info "Note: Concurrent session limits will apply to NEW logins"
        return ${EXIT_SUCCESS}
    else
        log_error "Some verification checks failed"
        return ${EXIT_VERIFICATION_FAILED}
    fi
}

################################################################################
# ROLLBACK
################################################################################

rollback_changes() {
    log_warn "Rolling back changes from ${BACKUP_DIR}..."

    if [ ! -d "${BACKUP_DIR}" ]; then
        log_error "Backup directory not found: ${BACKUP_DIR}"
        return ${EXIT_ROLLBACK_FAILED}
    fi

    # Restore limits.conf
    if [ -f "${BACKUP_DIR}/limits.conf.backup" ]; then
        cp -a "${BACKUP_DIR}/limits.conf.backup" "${LIMITS_CONF}"
        log_info "Restored: ${LIMITS_CONF}"
    fi

    # Restore PAM configuration
    if [ -f "${BACKUP_DIR}/system-auth.backup" ]; then
        cp -a "${BACKUP_DIR}/system-auth.backup" "${PAM_SYSTEM_AUTH}"
        log_info "Restored: ${PAM_SYSTEM_AUTH}"
    fi

    log_success "Rollback completed"
    return ${EXIT_SUCCESS}
}

################################################################################
# MAIN
################################################################################

main() {
    log_info "========================================="
    log_info "NIST 800-53 AC-10 Implementation"
    log_info "Platform: ${PLATFORM}"
    log_info "Max Concurrent Sessions: ${MAX_CONCURRENT_SESSIONS}"
    log_info "========================================="

    # Execute implementation pipeline
    preflight_checks || exit $?
    backup_state || exit $?
    implement_control || exit $?
    verify_implementation || exit $?

    log_success "========================================="
    log_success "AC-10 implementation successful!"
    log_success "Logs: ${LOG_FILE}"
    log_success "Backup: ${BACKUP_DIR}"
    log_success ""
    log_success "IMPORTANT: Changes apply to NEW user sessions"
    log_success "Existing sessions are NOT affected"
    log_success "========================================="

    exit ${EXIT_SUCCESS}
}

# Execute main function
main "$@"
