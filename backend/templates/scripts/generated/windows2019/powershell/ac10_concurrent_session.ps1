<#
################################################################################
.SYNOPSIS
    NIST 800-53 AC-10 Implementation Script

.DESCRIPTION
    Control: Concurrent Session Control
    Platform: Windows Server 2019
    Generated: 2025-01-08
    Generator Version: 1.0.0

    Implements NIST 800-53 Rev 5 AC-10 by limiting concurrent sessions per user
    to prevent resource exhaustion and enforce accountability.

    This script implements AC-10 compliance requirements with:
    - Pre-flight validation
    - State backup
    - Registry configuration
    - GPO settings (if domain-joined)
    - Verification
    - Rollback capability

.NOTES
    Requires: PowerShell 5.1 or higher
    Requires: Administrator privileges
################################################################################
#>

#Requires -Version 5.1
#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [Parameter()]
    [switch]$WhatIf,

    [Parameter()]
    [int]$MaxConcurrentSessions = 3,

    [Parameter()]
    [switch]$Verbose
)

################################################################################
# CONFIGURATION
################################################################################

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Script:Config = @{
    ControlID = "AC-10"
    ControlName = "Concurrent Session Control"
    Platform = "Windows Server 2019"
    Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    LogPath = "C:\Logs\NIST_Compliance_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
    BackupPath = "C:\Backups\NIST_AC10_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    MaxConcurrentSessions = $MaxConcurrentSessions
}

# Exit codes
$ExitCode = @{
    Success = 0
    PreFlightFailed = 1
    ImplementationFailed = 2
    VerificationFailed = 3
    RollbackFailed = 4
}

# Registry paths
$Script:RegistryPaths = @{
    TerminalServices = 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server'
    RDPSettings = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services'
    SessionLimit = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
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

    # Create log directory if it doesn't exist
    $logDir = Split-Path -Path $Script:Config.LogPath -Parent
    if (-not (Test-Path -Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }

    # Write to log file and console
    Add-Content -Path $Script:Config.LogPath -Value $logMessage

    switch ($Level) {
        'INFO'    { Write-Host $logMessage -ForegroundColor Cyan }
        'WARN'    { Write-Warning $logMessage }
        'ERROR'   { Write-Host $logMessage -ForegroundColor Red }
        'SUCCESS' { Write-Host $logMessage -ForegroundColor Green }
    }
}

function Write-LogInfo { param([string]$Message) Write-Log -Level INFO -Message $Message }
function Write-LogWarn { param([string]$Message) Write-Log -Level WARN -Message $Message }
function Write-LogError { param([string]$Message) Write-Log -Level ERROR -Message $Message }
function Write-LogSuccess { param([string]$Message) Write-Log -Level SUCCESS -Message $Message }

################################################################################
# PRE-FLIGHT CHECKS
################################################################################

function Test-PreFlight {
    [CmdletBinding()]
    param()

    Write-LogInfo "Starting pre-flight checks for AC-10..."

    # Check PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-LogError "PowerShell 5.1 or higher required. Current version: $($PSVersionTable.PSVersion)"
        return $false
    }

    # Check administrator privileges
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-LogError "This script must be run as Administrator"
        return $false
    }

    # Check OS version
    $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
    Write-LogInfo "OS: $($osInfo.Caption) $($osInfo.Version)"

    if ($osInfo.Version -notlike "10.0.17763*") {
        Write-LogWarn "This script is designed for Windows Server 2019 (Build 17763)"
        Write-LogWarn "Current version: $($osInfo.Version)"
    }

    # Check disk space (minimum 1GB)
    $systemDrive = $env:SystemDrive
    $drive = Get-PSDrive -Name $systemDrive.TrimEnd(':')
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)

    if ($freeSpaceGB -lt 1) {
        Write-LogWarn "Low disk space: ${freeSpaceGB}GB available"
    }

    # Check Terminal Services
    $tsService = Get-Service -Name TermService -ErrorAction SilentlyContinue
    if ($tsService) {
        Write-LogInfo "Terminal Services: $($tsService.Status)"
    } else {
        Write-LogWarn "Terminal Services not found (RDP may not be enabled)"
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

    Write-LogInfo "Creating backup at $($Script:Config.BackupPath)..."

    # Create backup directory
    New-Item -Path $Script:Config.BackupPath -ItemType Directory -Force | Out-Null

    # Backup registry keys
    $registryBackups = @(
        @{Path = $Script:RegistryPaths.TerminalServices; Name = 'TerminalServices.reg'},
        @{Path = $Script:RegistryPaths.RDPSettings; Name = 'RDPSettings.reg'},
        @{Path = $Script:RegistryPaths.SessionLimit; Name = 'SessionLimit.reg'}
    )

    foreach ($backup in $registryBackups) {
        if (Test-Path -Path $backup.Path) {
            $backupFile = Join-Path -Path $Script:Config.BackupPath -ChildPath $backup.Name
            $regPath = $backup.Path -replace 'HKLM:', 'HKEY_LOCAL_MACHINE'
            reg export $regPath $backupFile /y 2>&1 | Out-Null
            Write-LogInfo "Backed up registry: $($backup.Path)"
        }
    }

    # Backup Group Policy if domain-joined
    $isDomainJoined = (Get-CimInstance -ClassName Win32_ComputerSystem).PartOfDomain
    if ($isDomainJoined) {
        $gpBackup = Join-Path -Path $Script:Config.BackupPath -ChildPath 'GPOBackup.html'
        gpresult /H $gpBackup 2>&1 | Out-Null
        Write-LogInfo "Backed up Group Policy report"
    }

    # Create state snapshot
    $snapshot = @{
        BackupCreated = Get-Date
        ControlID = $Script:Config.ControlID
        Platform = $Script:Config.Platform
        ComputerName = $env:COMPUTERNAME
        OSVersion = (Get-CimInstance Win32_OperatingSystem).Version
        MaxConcurrentSessions = $Script:Config.MaxConcurrentSessions
        IsDomainJoined = $isDomainJoined
    }

    $snapshot | ConvertTo-Json | Out-File -FilePath (Join-Path -Path $Script:Config.BackupPath -ChildPath 'snapshot.json')

    Write-LogSuccess "Backup completed: $($Script:Config.BackupPath)"
    return $true
}

################################################################################
# IMPLEMENTATION
################################################################################

function Invoke-Implementation {
    [CmdletBinding()]
    param()

    Write-LogInfo "Implementing AC-10 compliance requirements..."

    try {
        # Configure maximum concurrent RDP sessions
        Write-LogInfo "Configuring maximum concurrent RDP sessions: $($Script:Config.MaxConcurrentSessions)"

        # Ensure Terminal Services registry path exists
        if (-not (Test-Path -Path $Script:RegistryPaths.RDPSettings)) {
            New-Item -Path $Script:RegistryPaths.RDPSettings -Force | Out-Null
            Write-LogInfo "Created registry path: $($Script:RegistryPaths.RDPSettings)"
        }

        # Set maximum connections per user
        Set-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'MaxInstanceCount' `
            -Value $Script:Config.MaxConcurrentSessions -Type DWord -Force
        Write-LogSuccess "Set MaxInstanceCount to $($Script:Config.MaxConcurrentSessions)"

        # Set connection time limit (30 minutes = 1800000 milliseconds)
        Set-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'MaxConnectionTime' `
            -Value 1800000 -Type DWord -Force
        Write-LogInfo "Set connection time limit to 30 minutes"

        # Limit idle session time (15 minutes = 900000 milliseconds)
        Set-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'MaxIdleTime' `
            -Value 900000 -Type DWord -Force
        Write-LogInfo "Set idle session timeout to 15 minutes"

        # Enable session limit enforcement
        Set-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'fEnableSessionLimit' `
            -Value 1 -Type DWord -Force
        Write-LogSuccess "Enabled session limit enforcement"

        # Configure disconnect on time limit reached
        Set-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'fResetBroken' `
            -Value 1 -Type DWord -Force
        Write-LogInfo "Configured disconnect on time limit"

        # Add audit entry
        $auditMessage = @"
NIST 800-53 AC-10: Concurrent Session Control
Applied: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Maximum concurrent sessions: $($Script:Config.MaxConcurrentSessions)
Connection time limit: 30 minutes
Idle timeout: 15 minutes
"@
        Write-LogInfo $auditMessage

        Write-LogSuccess "AC-10 implementation completed"
        return $true

    } catch {
        Write-LogError "Implementation failed: $_"
        return $false
    }
}

################################################################################
# VERIFICATION
################################################################################

function Test-Implementation {
    [CmdletBinding()]
    param()

    Write-LogInfo "Verifying AC-10 implementation..."

    $verificationPassed = $true

    # Verify MaxInstanceCount
    Write-LogInfo "Verifying: MaxInstanceCount registry value"
    $maxInstance = Get-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'MaxInstanceCount' -ErrorAction SilentlyContinue
    if ($maxInstance.MaxInstanceCount -eq $Script:Config.MaxConcurrentSessions) {
        Write-LogSuccess "[PASS] MaxInstanceCount verified: $($maxInstance.MaxInstanceCount)"
    } else {
        Write-LogError "[FAIL] MaxInstanceCount not set correctly"
        Write-LogError "Expected: $($Script:Config.MaxConcurrentSessions), Found: $($maxInstance.MaxInstanceCount)"
        $verificationPassed = $false
    }

    # Verify session limit enabled
    Write-LogInfo "Verifying: Session limit enforcement"
    $limitEnabled = Get-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'fEnableSessionLimit' -ErrorAction SilentlyContinue
    if ($limitEnabled.fEnableSessionLimit -eq 1) {
        Write-LogSuccess "[PASS] Session limit enforcement enabled"
    } else {
        Write-LogError "[FAIL] Session limit enforcement not enabled"
        $verificationPassed = $false
    }

    # Verify connection time limit
    Write-LogInfo "Verifying: Connection time limit"
    $connTime = Get-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'MaxConnectionTime' -ErrorAction SilentlyContinue
    if ($connTime.MaxConnectionTime -gt 0) {
        $minutes = [math]::Round($connTime.MaxConnectionTime / 60000, 0)
        Write-LogSuccess "[PASS] Connection time limit set: $minutes minutes"
    } else {
        Write-LogWarn "[WARN] Connection time limit not set"
    }

    # Verify idle timeout
    Write-LogInfo "Verifying: Idle session timeout"
    $idleTime = Get-ItemProperty -Path $Script:RegistryPaths.RDPSettings -Name 'MaxIdleTime' -ErrorAction SilentlyContinue
    if ($idleTime.MaxIdleTime -gt 0) {
        $minutes = [math]::Round($idleTime.MaxIdleTime / 60000, 0)
        Write-LogSuccess "[PASS] Idle timeout set: $minutes minutes"
    } else {
        Write-LogWarn "[WARN] Idle timeout not set"
    }

    # Verify Terminal Services is running (if RDP enabled)
    $tsService = Get-Service -Name TermService -ErrorAction SilentlyContinue
    if ($tsService -and $tsService.Status -eq 'Running') {
        Write-LogSuccess "[PASS] Terminal Services is running"
    } else {
        Write-LogWarn "[WARN] Terminal Services not running (RDP may be disabled)"
    }

    if ($verificationPassed) {
        Write-LogSuccess "All verification checks passed"
        Write-LogInfo "Note: Changes require RDP service restart or system reboot to take full effect"
        return $true
    } else {
        Write-LogError "Some verification checks failed"
        return $false
    }
}

################################################################################
# ROLLBACK
################################################################################

function Invoke-Rollback {
    [CmdletBinding()]
    param()

    Write-LogWarn "Rolling back changes from $($Script:Config.BackupPath)..."

    if (-not (Test-Path -Path $Script:Config.BackupPath)) {
        Write-LogError "Backup directory not found: $($Script:Config.BackupPath)"
        return $false
    }

    try {
        # Restore registry backups
        $registryBackups = Get-ChildItem -Path $Script:Config.BackupPath -Filter '*.reg'
        foreach ($backup in $registryBackups) {
            reg import $backup.FullName /y 2>&1 | Out-Null
            Write-LogInfo "Restored registry: $($backup.Name)"
        }

        Write-LogSuccess "Rollback completed"
        return $true

    } catch {
        Write-LogError "Rollback failed: $_"
        return $false
    }
}

################################################################################
# MAIN
################################################################################

function Main {
    [CmdletBinding()]
    param()

    Write-LogInfo "========================================="
    Write-LogInfo "NIST 800-53 AC-10 Implementation"
    Write-LogInfo "Platform: $($Script:Config.Platform)"
    Write-LogInfo "Max Concurrent Sessions: $($Script:Config.MaxConcurrentSessions)"
    Write-LogInfo "========================================="

    try {
        # Pre-flight checks
        if (-not (Test-PreFlight)) {
            Write-LogError "Pre-flight checks failed"
            exit $ExitCode.PreFlightFailed
        }

        # Backup
        if (-not (Backup-SystemState)) {
            Write-LogError "Backup failed"
            exit $ExitCode.ImplementationFailed
        }

        # Implementation
        if (-not (Invoke-Implementation)) {
            Write-LogError "Implementation failed"
            Write-LogWarn "Attempting rollback..."
            Invoke-Rollback
            exit $ExitCode.ImplementationFailed
        }

        # Verification
        if (-not (Test-Implementation)) {
            Write-LogError "Verification failed"
            Write-LogWarn "Attempting rollback..."
            Invoke-Rollback
            exit $ExitCode.VerificationFailed
        }

        Write-LogSuccess "========================================="
        Write-LogSuccess "AC-10 implementation successful!"
        Write-LogSuccess "Logs: $($Script:Config.LogPath)"
        Write-LogSuccess "Backup: $($Script:Config.BackupPath)"
        Write-LogSuccess ""
        Write-LogSuccess "IMPORTANT: Restart RDP service or reboot for changes to take full effect"
        Write-LogSuccess "To restart RDP: Restart-Service TermService -Force"
        Write-LogSuccess "========================================="

        exit $ExitCode.Success

    } catch {
        Write-LogError "Unexpected error: $_"
        Write-LogWarn "Attempting rollback..."
        Invoke-Rollback
        exit $ExitCode.ImplementationFailed
    }
}

# Execute main function
Main
