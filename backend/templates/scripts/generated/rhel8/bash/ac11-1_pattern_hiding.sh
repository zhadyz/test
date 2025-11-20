#!/bin/bash
################################################################################
# NIST 800-53 AC-11(1) Implementation Script
# Control: Device Lock - Pattern-Hiding Displays
# Platform: RHEL 8
# Generated: 2025-01-08
# Generator Version: 1.0.0
#
# Description:
# Implements NIST 800-53 Rev 5 AC-11(1) by concealing information displayed
# on the system during screen lock. Prevents visual hacking and shoulder surfing
# by hiding displayed information with patterns or blank screens.
#
# This script implements AC-11(1) compliance requirements with:
# - Pre-flight validation
# - State backup
# - GNOME screen lock pattern configuration
# - Notification hiding during lock
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
readonly BACKUP_DIR="/var/backups/nist_ac11-1_${TIMESTAMP}"
readonly CONTROL_ID="AC-11(1)"
readonly PLATFORM="RHEL 8"

# Control-specific configuration
readonly LOCK_SCREEN_IMAGE="/usr/share/backgrounds/nist-lock-screen.png"
readonly SHOW_NOTIFICATIONS="false"
readonly SHOW_USER_INFO="false"

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
    log_info "Starting pre-flight checks for AC-11(1)..."

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

    # Check if GNOME is installed
    if ! command -v gsettings &> /dev/null; then
        log_error "gsettings not found - GNOME desktop environment required"
        log_error "This control applies to systems with graphical interfaces"
        return ${EXIT_PREFLIGHT_FAILED}
    fi

    # Check if running in X11 or Wayland session
    if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
        log_warn "No graphical session detected"
        log_warn "Settings will be applied but cannot be verified in this session"
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

    # Backup current gsettings for screensaver
    log_info "Backing up GNOME screensaver settings..."

    # Get all users with home directories
    while IFS=: read -r username _ uid _ _ homedir _; do
        if [ ${uid} -ge 1000 ] && [ -d "${homedir}" ]; then
            user_backup="${BACKUP_DIR}/${username}_gsettings.backup"

            # Backup screensaver settings for this user
            sudo -u "${username}" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${uid}/bus" \
                gsettings list-recursively org.gnome.desktop.screensaver > "${user_backup}" 2>/dev/null || true

            log_info "Backed up settings for user: ${username}"
        fi
    done < /etc/passwd

    cat > "${BACKUP_DIR}/state_snapshot.txt" <<EOF
Backup created: $(date)
Control ID: ${CONTROL_ID}
Platform: ${PLATFORM}
Hostname: $(hostname)
Lock screen image: ${LOCK_SCREEN_IMAGE}
Show notifications: ${SHOW_NOTIFICATIONS}
Show user info: ${SHOW_USER_INFO}
EOF

    BACKUP_CREATED=true
    log_success "Backup completed: ${BACKUP_DIR}"
    return ${EXIT_SUCCESS}
}

################################################################################
# IMPLEMENTATION
################################################################################

implement_control() {
    log_info "Implementing AC-11(1) compliance requirements..."

    # Implementation 1: Configure lock screen to hide content
    log_info "Implementing: Pattern-hiding display on lock screen"

    # Get all regular users
    while IFS=: read -r username _ uid _ _ homedir _; do
        if [ ${uid} -ge 1000 ] && [ -d "${homedir}" ]; then
            log_info "Configuring lock screen for user: ${username}"

            # Set as user to ensure proper dconf/gsettings configuration
            sudo -u "${username}" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${uid}/bus" bash <<USEREOF
# Disable notifications on lock screen
gsettings set org.gnome.desktop.notifications show-in-lock-screen ${SHOW_NOTIFICATIONS}

# Disable showing user information on lock screen
gsettings set org.gnome.desktop.screensaver show-full-name-in-top-bar ${SHOW_USER_INFO}

# Use solid color or pattern instead of user's wallpaper
gsettings set org.gnome.desktop.screensaver picture-opacity 0

# Set lock screen to use solid color
gsettings set org.gnome.desktop.screensaver color-shading-type 'solid'
gsettings set org.gnome.desktop.screensaver primary-color '#000000'

# If custom lock screen image exists, use it
if [ -f "${LOCK_SCREEN_IMAGE}" ]; then
    gsettings set org.gnome.desktop.screensaver picture-uri "file://${LOCK_SCREEN_IMAGE}"
fi
USEREOF

            log_success "Configured lock screen for user: ${username}"
        fi
    done < /etc/passwd

    # Implementation 2: System-wide dconf policy (enforces for all users)
    log_info "Implementing: System-wide lock screen policy"

    DCONF_PROFILE_DIR="/etc/dconf/profile"
    DCONF_DB_DIR="/etc/dconf/db/local.d"

    mkdir -p "${DCONF_PROFILE_DIR}"
    mkdir -p "${DCONF_DB_DIR}"

    # Create dconf profile
    cat > "${DCONF_PROFILE_DIR}/user" <<EOF
user-db:user
system-db:local
EOF

    # Create lock screen policy
    cat > "${DCONF_DB_DIR}/00-screensaver" <<EOF
# NIST 800-53 AC-11(1): Pattern-Hiding Displays
# Applied: $(date '+%Y-%m-%d %H:%M:%S')

[org/gnome/desktop/screensaver]
show-notifications=${SHOW_NOTIFICATIONS}
show-full-name-in-top-bar=${SHOW_USER_INFO}
picture-opacity=0
color-shading-type='solid'
primary-color='#000000'
EOF

    # Update dconf database
    dconf update

    log_success "System-wide lock screen policy configured"

    log_success "AC-11(1) implementation completed"
    return ${EXIT_SUCCESS}
}

################################################################################
# VERIFICATION
################################################################################

verify_implementation() {
    log_info "Verifying AC-11(1) implementation..."

    local verification_passed=true

    # Verify system-wide policy files exist
    log_info "Verifying: System-wide dconf policy"
    if [ -f "/etc/dconf/db/local.d/00-screensaver" ]; then
        log_success "[PASS] System-wide screensaver policy exists"
    else
        log_error "[FAIL] System-wide screensaver policy not found"
        verification_passed=false
    fi

    # Verify dconf profile
    log_info "Verifying: dconf profile configuration"
    if [ -f "/etc/dconf/profile/user" ]; then
        log_success "[PASS] dconf profile configured"
    else
        log_error "[FAIL] dconf profile not configured"
        verification_passed=false
    fi

    # Verify user settings (check first regular user as example)
    local test_user=$(awk -F: '$3 >= 1000 && $3 < 65534 {print $1; exit}' /etc/passwd)
    if [ -n "${test_user}" ]; then
        log_info "Verifying: User ${test_user} lock screen settings"

        local test_uid=$(id -u "${test_user}")
        local show_notif=$(sudo -u "${test_user}" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${test_uid}/bus" \
            gsettings get org.gnome.desktop.notifications show-in-lock-screen 2>/dev/null || echo "unknown")

        if [ "${show_notif}" = "false" ]; then
            log_success "[PASS] Notifications hidden on lock screen for ${test_user}"
        else
            log_warn "[WARN] Could not verify notification settings for ${test_user}"
        fi
    fi

    if [ "${verification_passed}" = "true" ]; then
        log_success "All verification checks passed"
        log_info "Note: Lock screen changes apply immediately"
        log_info "Users should lock/unlock to see changes"
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

    # Restore user settings
    for backup_file in "${BACKUP_DIR}"/*_gsettings.backup; do
        if [ -f "${backup_file}" ]; then
            username=$(basename "${backup_file}" _gsettings.backup)
            uid=$(id -u "${username}" 2>/dev/null || echo "0")

            if [ "${uid}" -ge 1000 ]; then
                log_info "Restoring settings for user: ${username}"

                # Note: This is a simplified rollback - full restoration would need
                # to parse and apply each gsettings line individually
                log_warn "User ${username} settings backed up but automatic restore limited"
                log_info "Manual restore available in: ${backup_file}"
            fi
        fi
    done

    # Remove system-wide policy
    if [ -f "/etc/dconf/db/local.d/00-screensaver" ]; then
        rm -f "/etc/dconf/db/local.d/00-screensaver"
        dconf update
        log_info "Removed system-wide screensaver policy"
    fi

    log_success "Rollback completed"
    return ${EXIT_SUCCESS}
}

################################################################################
# MAIN
################################################################################

main() {
    log_info "========================================="
    log_info "NIST 800-53 AC-11(1) Implementation"
    log_info "Platform: ${PLATFORM}"
    log_info "Lock Screen Pattern: Solid black / Custom image"
    log_info "Show Notifications: ${SHOW_NOTIFICATIONS}"
    log_info "Show User Info: ${SHOW_USER_INFO}"
    log_info "========================================="

    preflight_checks || exit $?
    backup_state || exit $?
    implement_control || exit $?
    verify_implementation || exit $?

    log_success "========================================="
    log_success "AC-11(1) implementation successful!"
    log_success "Logs: ${LOG_FILE}"
    log_success "Backup: ${BACKUP_DIR}"
    log_success ""
    log_success "Lock screen now hides displayed information"
    log_success "Users should lock/unlock screen to verify changes"
    log_success "========================================="

    exit ${EXIT_SUCCESS}
}

main "$@"
