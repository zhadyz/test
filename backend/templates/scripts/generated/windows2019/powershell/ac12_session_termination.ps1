<#
################################################################################
# NIST 800-53 AC-12 Implementation Script
# Control: Session Termination
# Platform: Windows Server 2019
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
# - RDP session timeout configuration
# - Interactive logon session timeout
# - GPO-based enforcement
# - Verification
# - Rollback capability
################################################################################

[CmdletBinding()]
param()

#Requires -RunAsAdministrator
#Requires -Version 5.1

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

################################################################################
# CONFIGURATION
################################################################################

$Script:Config = @{
    ControlID = 'AC-12'
    ControlName = 'Session Termination'
    Platform = 'Windows Server 2019'
    Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

    # Control-specific parameters
    InactiveSessionTimeout = 900  # 15 minutes in seconds
    DisconnectedSessionTimeout = 300  # 5 minutes in seconds
    IdleSessionTimeout = 900  # 15 minutes for RDP

    # Exit codes
    ExitSuccess = 0
    ExitPreflightFailed = 1
    ExitImplementationFailed = 2
    ExitVerificationFailed = 3
    ExitRollbackFailed = 4
}

$Script:Paths = @{
    BackupDir = "C:\Windows\System32\config\backup\nist_ac12_$($Script:Config.Timestamp)"
    LogFile = "C:\Windows\Logs\NIST_Compliance_$($Script:Config.Timestamp).log"
}

$Script:RegistryPaths = @{
    # Terminal Services (RDP) settings
    TSGeneral = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services'

    # Interactive logon settings
    Winlogon = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'

    # Screen saver timeout (as additional enforcement)
    ScreenSaver = 'HKCU:\Control Panel\Desktop'
}

################################################################################
# LOGGING
################################################################################

function Write-Log {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet('INFO', 'WARN', 'ERROR', 'SUCCESS')]
        [string]$Level,

        [Parameter(Mandatory)]
        [string]$Message
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] [$Level] $Message"

    Write-Host $logMessage
    Add-Content -Path $Script:Paths.LogFile -Value $logMessage -ErrorAction SilentlyContinue
}

function Write-LogInfo { param([string]$Message) Write-Log -Level 'INFO' -Message $Message }
function Write-LogWarn { param([string]$Message) Write-Log -Level 'WARN' -Message $Message }
function Write-LogError { param([string]$Message) Write-Log -Level 'ERROR' -Message $Message }
function Write-LogSuccess { param([string]$Message) Write-Log -Level 'SUCCESS' -Message $Message }

################################################################################
# ERROR HANDLING
################################################################################

trap {
    Write-LogError "Unhandled exception: $_"
    Write-LogError $_.ScriptStackTrace

    if ($Script:BackupCreated) {
        Write-LogWarn "Attempting automatic rollback..."
        try {
            Restore-SystemState
        } catch {
            Write-LogError "Rollback failed: $_"
            exit $Script:Config.ExitRollbackFailed
        }
    }

    exit $Script:Config.ExitImplementationFailed
}

################################################################################
# PRE-FLIGHT CHECKS
################################################################################

function Test-PreFlightChecks {
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    Write-LogInfo "Starting pre-flight checks for AC-12..."

    # Check Windows version
    $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
    Write-LogInfo "Detected OS: $($osInfo.Caption) - Version $($osInfo.Version)"

    if ($osInfo.ProductType -ne 3) {
        Write-LogError "This script requires Windows Server (detected ProductType: $($osInfo.ProductType))"
        return $false
    }

    # Check if running as Administrator
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-LogError "This script must be run as Administrator"
        return $false
    }

    # Check registry access
    foreach ($regPath in $Script:RegistryPaths.Values) {
        $parent = Split-Path $regPath -Parent
        if (-not (Test-Path $parent)) {
            Write-LogError "Registry path not accessible: $parent"
            return $false
        }
    }

    Write-LogSuccess "Pre-flight checks passed"
    return $true
}

################################################################################
# BACKUP
################################################################################

function Backup-SystemState {
    [CmdletBinding()]
    param()

    Write-LogInfo "Creating backup in $($Script:Paths.BackupDir)..."

    # Create backup directory
    New-Item -Path $Script:Paths.BackupDir -ItemType Directory -Force | Out-Null

    # Backup registry keys
    foreach ($kvp in $Script:RegistryPaths.GetEnumerator()) {
        $keyName = $kvp.Key
        $regPath = $kvp.Value

        if (Test-Path $regPath) {
            $backupFile = Join-Path $Script:Paths.BackupDir "$keyName.reg"

            try {
                # Export registry key
                $hive = if ($regPath -match '^HKLM:') { 'HKLM' } else { 'HKCU' }
                $keyPath = $regPath -replace '^HK(LM|CU):\\', ''

                reg export "$hive\$keyPath" $backupFile /y 2>&1 | Out-Null
                Write-LogInfo "Backed up registry key: $regPath"
            } catch {
                Write-LogWarn "Could not backup $regPath : $_"
            }
        }
    }

    # Create state snapshot
    $snapshot = @{
        Timestamp = Get-Date -Format 'o'
        ControlID = $Script:Config.ControlID
        Platform = $Script:Config.Platform
        Hostname = $env:COMPUTERNAME
        InactiveSessionTimeout = $Script:Config.InactiveSessionTimeout
        DisconnectedSessionTimeout = $Script:Config.DisconnectedSessionTimeout
        IdleSessionTimeout = $Script:Config.IdleSessionTimeout
    }

    $snapshot | ConvertTo-Json | Out-File (Join-Path $Script:Paths.BackupDir 'state_snapshot.json')

    $Script:BackupCreated = $true
    Write-LogSuccess "Backup completed: $($Script:Paths.BackupDir)"
}

################################################################################
# IMPLEMENTATION
################################################################################

function Implement-AC12Control {
    [CmdletBinding()]
    param()

    Write-LogInfo "Implementing AC-12 compliance requirements..."

    # Implementation 1: Configure RDP session timeout
    Write-LogInfo "Implementing: RDP session idle timeout"

    # Ensure registry path exists
    if (-not (Test-Path $Script:RegistryPaths.TSGeneral)) {
        New-Item -Path $Script:RegistryPaths.TSGeneral -Force | Out-Null
    }

    # Set maximum idle time (in milliseconds)
    $idleTimeMs = $Script:Config.IdleSessionTimeout * 1000
    Set-ItemProperty -Path $Script:RegistryPaths.TSGeneral -Name 'MaxIdleTime' `
        -Value $idleTimeMs -Type DWord -Force

    # Set disconnected session time limit (in milliseconds)
    $disconnectTimeMs = $Script:Config.DisconnectedSessionTimeout * 1000
    Set-ItemProperty -Path $Script:RegistryPaths.TSGeneral -Name 'MaxDisconnectionTime' `
        -Value $disconnectTimeMs -Type DWord -Force

    # Enable automatic logoff of disconnected sessions
    Set-ItemProperty -Path $Script:RegistryPaths.TSGeneral -Name 'fResetBroken' `
        -Value 1 -Type DWord -Force

    Write-LogSuccess "RDP session timeout configured"

    # Implementation 2: Configure interactive session inactivity timeout
    Write-LogInfo "Implementing: Interactive session inactivity timeout"

    if (-not (Test-Path $Script:RegistryPaths.Winlogon)) {
        New-Item -Path $Script:RegistryPaths.Winlogon -Force | Out-Null
    }

    # Set inactivity timeout (in seconds)
    Set-ItemProperty -Path $Script:RegistryPaths.Winlogon -Name 'InactivityTimeoutSecs' `
        -Value $Script:Config.InactiveSessionTimeout -Type DWord -Force

    Write-LogSuccess "Interactive session timeout configured"

    # Implementation 3: Configure screen saver as additional enforcement
    Write-LogInfo "Implementing: Screen saver timeout for current user"

    if (-not (Test-Path $Script:RegistryPaths.ScreenSaver)) {
        New-Item -Path $Script:RegistryPaths.ScreenSaver -Force | Out-Null
    }

    # Convert to screen saver timeout format (seconds)
    $screenSaverTimeout = [math]::Floor($Script:Config.InactiveSessionTimeout / 60) * 60

    Set-ItemProperty -Path $Script:RegistryPaths.ScreenSaver -Name 'ScreenSaveTimeOut' `
        -Value $screenSaverTimeout -Type String -Force

    Set-ItemProperty -Path $Script:RegistryPaths.ScreenSaver -Name 'ScreenSaveActive' `
        -Value '1' -Type String -Force

    Set-ItemProperty -Path $Script:RegistryPaths.ScreenSaver -Name 'ScreenSaverIsSecure' `
        -Value '1' -Type String -Force

    Write-LogSuccess "Screen saver timeout configured"

    # Implementation 4: Update Group Policy
    Write-LogInfo "Updating Group Policy..."

    try {
        gpupdate /force /wait:0 2>&1 | Out-Null
        Write-LogSuccess "Group Policy updated"
    } catch {
        Write-LogWarn "Could not update Group Policy: $_"
    }

    Write-LogSuccess "AC-12 implementation completed"
}

################################################################################
# VERIFICATION
################################################################################

function Test-Implementation {
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    Write-LogInfo "Verifying AC-12 implementation..."

    $verificationPassed = $true

    # Verify RDP MaxIdleTime
    Write-LogInfo "Verifying: RDP MaxIdleTime"
    $expectedIdleTime = $Script:Config.IdleSessionTimeout * 1000
    $actualIdleTime = Get-ItemPropertyValue -Path $Script:RegistryPaths.TSGeneral -Name 'MaxIdleTime' -ErrorAction SilentlyContinue

    if ($actualIdleTime -eq $expectedIdleTime) {
        Write-LogSuccess "[PASS] RDP MaxIdleTime verified: $actualIdleTime ms"
    } else {
        Write-LogError "[FAIL] RDP MaxIdleTime incorrect. Expected: $expectedIdleTime, Got: $actualIdleTime"
        $verificationPassed = $false
    }

    # Verify RDP MaxDisconnectionTime
    Write-LogInfo "Verifying: RDP MaxDisconnectionTime"
    $expectedDisconnectTime = $Script:Config.DisconnectedSessionTimeout * 1000
    $actualDisconnectTime = Get-ItemPropertyValue -Path $Script:RegistryPaths.TSGeneral -Name 'MaxDisconnectionTime' -ErrorAction SilentlyContinue

    if ($actualDisconnectTime -eq $expectedDisconnectTime) {
        Write-LogSuccess "[PASS] RDP MaxDisconnectionTime verified: $actualDisconnectTime ms"
    } else {
        Write-LogError "[FAIL] RDP MaxDisconnectionTime incorrect. Expected: $expectedDisconnectTime, Got: $actualDisconnectTime"
        $verificationPassed = $false
    }

    # Verify fResetBroken
    Write-LogInfo "Verifying: RDP automatic logoff"
    $resetBroken = Get-ItemPropertyValue -Path $Script:RegistryPaths.TSGeneral -Name 'fResetBroken' -ErrorAction SilentlyContinue

    if ($resetBroken -eq 1) {
        Write-LogSuccess "[PASS] RDP automatic logoff enabled"
    } else {
        Write-LogError "[FAIL] RDP automatic logoff not enabled"
        $verificationPassed = $false
    }

    # Verify InactivityTimeoutSecs
    Write-LogInfo "Verifying: Interactive session inactivity timeout"
    $actualInactivityTimeout = Get-ItemPropertyValue -Path $Script:RegistryPaths.Winlogon -Name 'InactivityTimeoutSecs' -ErrorAction SilentlyContinue

    if ($actualInactivityTimeout -eq $Script:Config.InactiveSessionTimeout) {
        Write-LogSuccess "[PASS] Interactive session timeout verified: $actualInactivityTimeout seconds"
    } else {
        Write-LogError "[FAIL] Interactive session timeout incorrect. Expected: $($Script:Config.InactiveSessionTimeout), Got: $actualInactivityTimeout"
        $verificationPassed = $false
    }

    # Verify screen saver settings
    Write-LogInfo "Verifying: Screen saver timeout"
    $screenSaverActive = Get-ItemPropertyValue -Path $Script:RegistryPaths.ScreenSaver -Name 'ScreenSaveActive' -ErrorAction SilentlyContinue
    $screenSaverSecure = Get-ItemPropertyValue -Path $Script:RegistryPaths.ScreenSaver -Name 'ScreenSaverIsSecure' -ErrorAction SilentlyContinue

    if ($screenSaverActive -eq '1' -and $screenSaverSecure -eq '1') {
        Write-LogSuccess "[PASS] Screen saver lock enabled"
    } else {
        Write-LogWarn "[WARN] Screen saver lock not fully configured"
    }

    if ($verificationPassed) {
        Write-LogSuccess "All verification checks passed"
        Write-LogInfo "Note: Session timeout settings require user logout/login to take effect"
        Write-LogInfo "RDP settings take effect immediately for new connections"
        return $true
    } else {
        Write-LogError "Some verification checks failed"
        return $false
    }
}

################################################################################
# ROLLBACK
################################################################################

function Restore-SystemState {
    [CmdletBinding()]
    param()

    Write-LogWarn "Rolling back changes from $($Script:Paths.BackupDir)..."

    if (-not (Test-Path $Script:Paths.BackupDir)) {
        Write-LogError "Backup directory not found: $($Script:Paths.BackupDir)"
        throw "Backup not found"
    }

    # Restore registry keys
    Get-ChildItem -Path $Script:Paths.BackupDir -Filter '*.reg' | ForEach-Object {
        Write-LogInfo "Restoring registry from: $($_.Name)"
        reg import $_.FullName 2>&1 | Out-Null
    }

    Write-LogSuccess "Rollback completed"
}

################################################################################
# MAIN
################################################################################

function Main {
    [CmdletBinding()]
    param()

    Write-LogInfo "========================================="
    Write-LogInfo "NIST 800-53 AC-12 Implementation"
    Write-LogInfo "Platform: $($Script:Config.Platform)"
    Write-LogInfo "Inactive Session Timeout: $($Script:Config.InactiveSessionTimeout) seconds"
    Write-LogInfo "Disconnected Session Timeout: $($Script:Config.DisconnectedSessionTimeout) seconds"
    Write-LogInfo "RDP Idle Timeout: $($Script:Config.IdleSessionTimeout) seconds"
    Write-LogInfo "========================================="

    try {
        # Pre-flight checks
        if (-not (Test-PreFlightChecks)) {
            exit $Script:Config.ExitPreflightFailed
        }

        # Backup state
        Backup-SystemState

        # Implement control
        Implement-AC12Control

        # Verify implementation
        if (-not (Test-Implementation)) {
            exit $Script:Config.ExitVerificationFailed
        }

        Write-LogSuccess "========================================="
        Write-LogSuccess "AC-12 implementation successful!"
        Write-LogSuccess "Logs: $($Script:Paths.LogFile)"
        Write-LogSuccess "Backup: $($Script:Paths.BackupDir)"
        Write-LogSuccess ""
        Write-LogSuccess "IMPORTANT: Some settings require user logout/login"
        Write-LogSuccess "RDP timeout settings apply to NEW connections"
        Write-LogSuccess "A system restart may be required for full enforcement"
        Write-LogSuccess "========================================="

        exit $Script:Config.ExitSuccess

    } catch {
        Write-LogError "Script execution failed: $_"
        Write-LogError $_.ScriptStackTrace
        exit $Script:Config.ExitImplementationFailed
    }
}

# Execute main function
Main
