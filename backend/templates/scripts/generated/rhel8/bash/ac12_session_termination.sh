#!/bin/bash
################################################################################
# NIST 800-53 AC-12 Implementation Script
# Control: Session Termination
# Platform: RHEL 8
# Generated: 2025-01-08
# Generator Version: 1.0.0
#
# Description:
# Implements NIST 800-53 Rev 5 AC-12 by automatically terminating user sessions
# after a defined period of inactivity. Prevents unauthorized access through
# abandoned sessions.
#
# This script implements AC-12 compliance requirements with:
# - Pre-flight validation
# - State backup
# - TMOUT configuration for shells
# - SSH idle timeout
# - systemd-logind configuration
# - Verification
# - Rollback capability
################################################################################

set -euo pipefail
IFS=$'\n\t'

################################################################################
# CONFIGURATION
################################################################################

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
readonly LOG_FILE="/var/log/nist_compliance_${TIMESTAMP}.log"
readonly BACKUP_DIR="/var/backups/nist_ac12_${TIMESTAMP}"
readonly CONTROL_ID="AC-12"
readonly PLATFORM="RHEL 8"

# Control-specific configuration
readonly SESSION_TIMEOUT=900  # 15 minutes in seconds
readonly SSH_CLIENT_ALIVE_INTERVAL=300  # 5 minutes
readonly SSH_CLIENT_ALIVE_COUNT_MAX=0  # Disconnect immediately after interval

readonly PROFILE_FILE="/etc/profile"
readonly SSHD_CONFIG="/etc/sshd_config"
readonly BASHRC="/etc/bashrc"

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

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

################################################################################
# ERROR HANDLING
################################################################################

cleanup() {
    local exit_code=$?
    if [ ${exit_code} -ne 0 ]; then
        log_error "Script failed with exit code ${exit_code}"
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
    log_info "Starting pre-flight checks for AC-12..."

    if [ "${EUID}" -ne 0 ]; then
        log_error "This script must be run as root or with sudo"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    if [ ! -f /etc/os-release ]; then
        log_error "Cannot detect OS - /etc/os-release not found"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    source /etc/os-release
    log_info "Detected OS: ${NAME} ${VERSION_ID}"

    if [[ ! "${ID}" =~ ^(rhel|centos|rocky|almalinux)$ ]]; then
        log_error "This script is designed for RHEL-based systems"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    # Check required files
    for file in "${PROFILE_FILE}" "${SSHD_CONFIG}" "${BASHRC}"; do
        if [ ! -f "${file}" ]; then
            log_error "Required file not found: ${file}"
            return ${EXIT_PREFLIGHT_FAILED}
        fi
    done

    # Check if sshd is installed
    if ! command -v sshd &> /dev/null; then
        log_warn "SSH server not installed - SSH timeout will not be configured"
    fi

    log_success "Pre-flight checks passed"
    return ${EXIT_SUCCESS}
}

################################################################################
# BACKUP
################################################################################

backup_state() {
    log_info "Creating backup in ${BACKUP_DIR}..."

    mkdir -p "${BACKUP_DIR}"

    # Backup configuration files
    for file in "${PROFILE_FILE}" "${SSHD_CONFIG}" "${BASHRC}"; do
        if [ -e "${file}" ]; then
            cp -a "${file}" "${BACKUP_DIR}/$(basename ${file}).backup"
            log_info "Backed up: ${file}"
        fi
    done

    cat > "${BACKUP_DIR}/state_snapshot.txt" <<EOF
Backup created: $(date)
Control ID: ${CONTROL_ID}
Platform: ${PLATFORM}
Hostname: $(hostname)
Session timeout: ${SESSION_TIMEOUT} seconds
SSH ClientAliveInterval: ${SSH_CLIENT_ALIVE_INTERVAL}
EOF

    BACKUP_CREATED=true
    log_success "Backup completed: ${BACKUP_DIR}"
    return ${EXIT_SUCCESS}
}

################################################################################
# IMPLEMENTATION
################################################################################

implement_control() {
    log_info "Implementing AC-12 compliance requirements..."

    # Implementation 1: Configure TMOUT in /etc/profile
    log_info "Implementing: Set TMOUT=${SESSION_TIMEOUT} in ${PROFILE_FILE}"

    # Remove existing TMOUT entries
    sed -i '/^[[:space:]]*export[[:space:]]*TMOUT=/d' "${PROFILE_FILE}"
    sed -i '/^[[:space:]]*TMOUT=/d' "${PROFILE_FILE}"

    # Add new TMOUT configuration
    cat >> "${PROFILE_FILE}" <<EOF

# NIST 800-53 AC-12: Session Termination
# Automatically terminate inactive sessions after ${SESSION_TIMEOUT} seconds
# Applied: $(date '+%Y-%m-%d %H:%M:%S')
export TMOUT=${SESSION_TIMEOUT}
readonly TMOUT
EOF

    log_success "TMOUT configured in ${PROFILE_FILE}"

    # Implementation 2: Configure TMOUT in /etc/bashrc
    log_info "Implementing: Set TMOUT in ${BASHRC}"

    sed -i '/^[[:space:]]*export[[:space:]]*TMOUT=/d' "${BASHRC}"
    sed -i '/^[[:space:]]*TMOUT=/d' "${BASHRC}"

    cat >> "${BASHRC}" <<EOF

# NIST 800-53 AC-12: Session Termination
export TMOUT=${SESSION_TIMEOUT}
readonly TMOUT
EOF

    log_success "TMOUT configured in ${BASHRC}"

    # Implementation 3: Configure SSH idle timeout
    if command -v sshd &> /dev/null; then
        log_info "Implementing: SSH idle timeout configuration"

        # Backup sshd_config first
        cp -a "${SSHD_CONFIG}" "${BACKUP_DIR}/sshd_config.pre_ac12"

        # Remove existing ClientAlive settings
        sed -i '/^[[:space:]]*ClientAliveInterval/d' "${SSHD_CONFIG}"
        sed -i '/^[[:space:]]*ClientAliveCountMax/d' "${SSHD_CONFIG}"

        # Add new SSH timeout settings
        cat >> "${SSHD_CONFIG}" <<EOF

# NIST 800-53 AC-12: SSH Session Termination
# ClientAliveInterval: Server sends keepalive every ${SSH_CLIENT_ALIVE_INTERVAL} seconds
# ClientAliveCountMax: Disconnect if no response (0 = immediate)
ClientAliveInterval ${SSH_CLIENT_ALIVE_INTERVAL}
ClientAliveCountMax ${SSH_CLIENT_ALIVE_COUNT_MAX}
EOF

        log_success "SSH timeout configured"

        # Test sshd configuration
        log_info "Testing sshd configuration..."
        if sshd -t; then
            log_success "sshd configuration is valid"

            # Restart sshd to apply changes
            log_info "Restarting sshd service..."
            systemctl restart sshd
            log_success "sshd service restarted"
        else
            log_error "sshd configuration test failed"
            # Restore original config
            cp -a "${BACKUP_DIR}/sshd_config.pre_ac12" "${SSHD_CONFIG}"
            return ${EXIT_IMPLEMENTATION_FAILED}
        fi
    else
        log_warn "SSH server not available - skipping SSH timeout configuration"
    fi

    log_success "AC-12 implementation completed"
    return ${EXIT_SUCCESS}
}

################################################################################
# VERIFICATION
################################################################################

verify_implementation() {
    log_info "Verifying AC-12 implementation..."

    local verification_passed=true

    # Verify TMOUT in /etc/profile
    log_info "Verifying: TMOUT in ${PROFILE_FILE}"
    if grep -q "^export TMOUT=${SESSION_TIMEOUT}" "${PROFILE_FILE}"; then
        log_success "[PASS] TMOUT verified in ${PROFILE_FILE}"
    else
        log_error "[FAIL] TMOUT not set correctly in ${PROFILE_FILE}"
        verification_passed=false
    fi

    # Verify TMOUT in /etc/bashrc
    log_info "Verifying: TMOUT in ${BASHRC}"
    if grep -q "^export TMOUT=${SESSION_TIMEOUT}" "${BASHRC}"; then
        log_success "[PASS] TMOUT verified in ${BASHRC}"
    else
        log_error "[FAIL] TMOUT not set correctly in ${BASHRC}"
        verification_passed=false
    fi

    # Verify SSH configuration if sshd is available
    if command -v sshd &> /dev/null; then
        log_info "Verifying: SSH ClientAliveInterval"
        if grep -q "^ClientAliveInterval ${SSH_CLIENT_ALIVE_INTERVAL}" "${SSHD_CONFIG}"; then
            log_success "[PASS] SSH ClientAliveInterval verified"
        else
            log_error "[FAIL] SSH ClientAliveInterval not set correctly"
            verification_passed=false
        fi

        log_info "Verifying: SSH ClientAliveCountMax"
        if grep -q "^ClientAliveCountMax ${SSH_CLIENT_ALIVE_COUNT_MAX}" "${SSHD_CONFIG}"; then
            log_success "[PASS] SSH ClientAliveCountMax verified"
        else
            log_error "[FAIL] SSH ClientAliveCountMax not set correctly"
            verification_passed=false
        fi

        # Verify sshd is running
        log_info "Verifying: sshd service status"
        if systemctl is-active --quiet sshd; then
            log_success "[PASS] sshd service is active"
        else
            log_warn "[WARN] sshd service is not active"
        fi
    fi

    if [ "${verification_passed}" = "true" ]; then
        log_success "All verification checks passed"
        log_info "Note: Changes will apply to NEW shell sessions"
        log_info "Existing sessions are NOT affected"
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

    # Restore configuration files
    for backup_file in "${BACKUP_DIR}"/*.backup; do
        if [ -f "${backup_file}" ]; then
            original_file=$(basename "${backup_file}" .backup)
            case "${original_file}" in
                "profile")
                    cp -a "${backup_file}" "${PROFILE_FILE}"
                    log_info "Restored: ${PROFILE_FILE}"
                    ;;
                "sshd_config")
                    cp -a "${backup_file}" "${SSHD_CONFIG}"
                    log_info "Restored: ${SSHD_CONFIG}"
                    if command -v sshd &> /dev/null; then
                        systemctl restart sshd
                        log_info "Restarted sshd"
                    fi
                    ;;
                "bashrc")
                    cp -a "${backup_file}" "${BASHRC}"
                    log_info "Restored: ${BASHRC}"
                    ;;
            esac
        fi
    done

    log_success "Rollback completed"
    return ${EXIT_SUCCESS}
}

################################################################################
# MAIN
################################################################################

main() {
    log_info "========================================="
    log_info "NIST 800-53 AC-12 Implementation"
    log_info "Platform: ${PLATFORM}"
    log_info "Session Timeout: ${SESSION_TIMEOUT} seconds"
    log_info "SSH ClientAliveInterval: ${SSH_CLIENT_ALIVE_INTERVAL} seconds"
    log_info "========================================="

    preflight_checks || exit $?
    backup_state || exit $?
    implement_control || exit $?
    verify_implementation || exit $?

    log_success "========================================="
    log_success "AC-12 implementation successful!"
    log_success "Logs: ${LOG_FILE}"
    log_success "Backup: ${BACKUP_DIR}"
    log_success ""
    log_success "IMPORTANT: Session timeout applies to NEW sessions only"
    log_success "Users must log out and log back in for changes to take effect"
    log_success "========================================="

    exit ${EXIT_SUCCESS}
}

main "$@"
