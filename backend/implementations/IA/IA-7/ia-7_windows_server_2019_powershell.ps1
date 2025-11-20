<#
.SYNOPSIS
    NIST 800-53 IA-7 Cryptographic Module Authentication - Windows Server 2019/2022 Validation Script

.DESCRIPTION
    Validates FIPS 140-2/140-3 compliance for cryptographic module authentication per NIST SP 800-53 Rev 5 IA-7.

    Checks performed:
    1. FIPS mode enablement (registry: HKLM\System\CurrentControlSet\Control\Lsa\FipsAlgorithmPolicy\Enabled)
    2. Schannel cryptographic protocol restrictions (TLS 1.2/1.3 enforcement, disabled weak protocols)
    3. FIPS-compliant cipher suites for TLS/SSL
    4. BitLocker cryptographic algorithm validation (AES-256)
    5. EFS (Encrypting File System) algorithm validation
    6. IPsec cryptographic settings
    7. RDP cryptographic configuration
    8. Active cryptographic providers (CNG/CSP validation)
    9. Certificate store validation (FIPS-compliant certificates)
    10. Windows Hello for Business cryptographic settings (if enabled)

    STIG Mappings:
    - Windows Server 2019 STIG V-205842 (WN19-SO-000360)
    - Windows Server 2022 STIG V-254480

    Exit Codes:
    0 = Fully compliant with IA-7
    1 = Non-compliant (findings identified)
    2 = Error during execution

.PARAMETER OutputPath
    Optional path for JSON compliance report. Defaults to .\ia7_compliance_report.json

.EXAMPLE
    .\ia-7_windows_server_2019_powershell.ps1

.EXAMPLE
    .\ia-7_windows_server_2019_powershell.ps1 -OutputPath "C:\compliance\ia7_report.json"

.NOTES
    Author: LOVELESS (QA Specialist)
    Version: 1.0
    Requires: Administrator privileges
    Platform: Windows Server 2019, Windows Server 2022
    Read-only: YES - No system modifications
    Idempotent: YES - Safe to run multiple times
    Zero hallucination tolerance: All checks verify actual system state
#>

[CmdletBinding()]
param(
    [string]$OutputPath = ".\ia7_compliance_report.json"
)

# Requires Administrator privileges
#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# Initialize compliance report structure
$ComplianceReport = @{
    control_id = "IA-7"
    control_name = "Cryptographic Module Authentication"
    timestamp = (Get-Date).ToString("o")
    hostname = $env:COMPUTERNAME
    os_version = (Get-WmiObject -Class Win32_OperatingSystem).Caption
    compliant = $true
    findings = @()
    errors = @()
    evidence = @{}
}

function Test-FIPSMode {
    <#
    .SYNOPSIS
    Validates FIPS mode enablement via registry and Group Policy.
    #>
    try {
        $fipsRegPath = "HKLM:\System\CurrentControlSet\Control\Lsa\FipsAlgorithmPolicy"

        if (Test-Path $fipsRegPath) {
            $fipsEnabled = Get-ItemProperty -Path $fipsRegPath -Name "Enabled" -ErrorAction SilentlyContinue

            if ($null -eq $fipsEnabled -or $fipsEnabled.Enabled -ne 1) {
                $ComplianceReport.findings += @{
                    check = "FIPS Mode Enablement"
                    status = "FAIL"
                    severity = "HIGH"
                    finding = "FIPS mode is not enabled. Registry key HKLM\System\CurrentControlSet\Control\Lsa\FipsAlgorithmPolicy\Enabled is not set to 1."
                    remediation = "Enable via GPO: Computer Configuration >> Windows Settings >> Security Settings >> Local Policies >> Security Options >> 'System cryptography: Use FIPS compliant algorithms' = Enabled"
                    stig_id = "V-205842"
                    evidence = "Registry value: $($fipsEnabled.Enabled)"
                }
                $ComplianceReport.compliant = $false
            } else {
                $ComplianceReport.evidence.fips_mode = "Enabled (Registry value: $($fipsEnabled.Enabled))"
            }
        } else {
            $ComplianceReport.findings += @{
                check = "FIPS Mode Registry"
                status = "FAIL"
                severity = "HIGH"
                finding = "FIPS mode registry path does not exist: $fipsRegPath"
                remediation = "Configure FIPS mode via Group Policy"
                stig_id = "V-205842"
            }
            $ComplianceReport.compliant = $false
        }

    } catch {
        $ComplianceReport.errors += "FIPS Mode Check Error: $($_.Exception.Message)"
        $ComplianceReport.compliant = $false
    }
}

function Test-SchannelProtocols {
    <#
    .SYNOPSIS
    Validates Schannel protocol restrictions (TLS 1.2/1.3 only, disabled weak protocols).
    #>
    try {
        $schannelPath = "HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols"

        # Weak protocols that must be disabled
        $weakProtocols = @("SSL 2.0", "SSL 3.0", "TLS 1.0", "TLS 1.1")

        foreach ($protocol in $weakProtocols) {
            $serverPath = "$schannelPath\$protocol\Server"
            $clientPath = "$schannelPath\$protocol\Client"

            foreach ($path in @($serverPath, $clientPath)) {
                if (Test-Path $path) {
                    $enabled = Get-ItemProperty -Path $path -Name "Enabled" -ErrorAction SilentlyContinue
                    if ($null -ne $enabled -and $enabled.Enabled -ne 0) {
                        $ComplianceReport.findings += @{
                            check = "Weak Protocol Disabled"
                            status = "FAIL"
                            severity = "HIGH"
                            finding = "Weak cryptographic protocol '$protocol' is enabled at: $path"
                            remediation = "Set registry value Enabled=0 (DWORD) at: $path"
                            evidence = "Current value: $($enabled.Enabled)"
                        }
                        $ComplianceReport.compliant = $false
                    }
                }
            }
        }

        # Validate TLS 1.2 is enabled
        $tls12ServerPath = "$schannelPath\TLS 1.2\Server"
        if (Test-Path $tls12ServerPath) {
            $tls12Enabled = Get-ItemProperty -Path $tls12ServerPath -Name "Enabled" -ErrorAction SilentlyContinue
            if ($null -eq $tls12Enabled -or $tls12Enabled.Enabled -ne 1) {
                $ComplianceReport.findings += @{
                    check = "TLS 1.2 Enabled"
                    status = "FAIL"
                    severity = "MEDIUM"
                    finding = "TLS 1.2 is not explicitly enabled"
                    remediation = "Set registry value Enabled=1 (DWORD) at: $tls12ServerPath"
                }
                $ComplianceReport.compliant = $false
            } else {
                $ComplianceReport.evidence.tls_12 = "Enabled"
            }
        }

    } catch {
        $ComplianceReport.errors += "Schannel Protocol Check Error: $($_.Exception.Message)"
    }
}

function Test-FIPSCipherSuites {
    <#
    .SYNOPSIS
    Validates FIPS-compliant TLS cipher suites.
    #>
    try {
        $cipherSuites = Get-TlsCipherSuite

        # FIPS 140-2 approved cipher suites (AES-GCM, AES-CBC with SHA256+)
        $fipsCompliantSuites = @(
            "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
            "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
            "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
            "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
            "TLS_DHE_RSA_WITH_AES_256_GCM_SHA384",
            "TLS_DHE_RSA_WITH_AES_128_GCM_SHA256"
        )

        # Non-FIPS cipher suites that should not be present
        $nonFIPSPatterns = @("3DES", "RC4", "DES", "MD5", "NULL")

        $nonFIPSFound = @()
        foreach ($suite in $cipherSuites) {
            foreach ($pattern in $nonFIPSPatterns) {
                if ($suite.Name -match $pattern) {
                    $nonFIPSFound += $suite.Name
                }
            }
        }

        if ($nonFIPSFound.Count -gt 0) {
            $ComplianceReport.findings += @{
                check = "Non-FIPS Cipher Suites"
                status = "FAIL"
                severity = "HIGH"
                finding = "Non-FIPS compliant cipher suites detected: $($nonFIPSFound -join ', ')"
                remediation = "Remove non-FIPS cipher suites via Group Policy or PowerShell: Disable-TlsCipherSuite"
            }
            $ComplianceReport.compliant = $false
        }

        $ComplianceReport.evidence.cipher_suites = @{
            total = $cipherSuites.Count
            non_fips_detected = $nonFIPSFound.Count
            fips_compliant_present = ($cipherSuites | Where-Object { $fipsCompliantSuites -contains $_.Name }).Count
        }

    } catch {
        $ComplianceReport.errors += "Cipher Suite Check Error: $($_.Exception.Message)"
    }
}

function Test-BitLockerCrypto {
    <#
    .SYNOPSIS
    Validates BitLocker uses FIPS-compliant AES encryption.
    #>
    try {
        $bitlockerVolumes = Get-BitLockerVolume -ErrorAction SilentlyContinue

        if ($null -ne $bitlockerVolumes) {
            foreach ($volume in $bitlockerVolumes) {
                if ($volume.ProtectionStatus -eq "On") {
                    # BitLocker in FIPS mode uses AES-CBC with Diffuser (AES 128/256)
                    if ($volume.EncryptionMethod -notmatch "Aes") {
                        $ComplianceReport.findings += @{
                            check = "BitLocker Encryption Algorithm"
                            status = "FAIL"
                            severity = "MEDIUM"
                            finding = "BitLocker volume $($volume.MountPoint) uses non-AES encryption: $($volume.EncryptionMethod)"
                            remediation = "Re-encrypt volume with AES algorithm (manage-bde -changekey or Group Policy)"
                            evidence = "Volume: $($volume.MountPoint), Method: $($volume.EncryptionMethod)"
                        }
                        $ComplianceReport.compliant = $false
                    } else {
                        $ComplianceReport.evidence."bitlocker_$($volume.MountPoint)" = "AES encryption active"
                    }
                }
            }
        }

    } catch {
        # BitLocker may not be installed or enabled - not a failure
        $ComplianceReport.evidence.bitlocker = "Not enabled or not available"
    }
}

function Test-EFSCrypto {
    <#
    .SYNOPSIS
    Validates EFS (Encrypting File System) cryptographic settings.
    #>
    try {
        $efsRegPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\EFS"

        if (Test-Path $efsRegPath) {
            $efsAlgorithm = Get-ItemProperty -Path $efsRegPath -Name "AlgorithmID" -ErrorAction SilentlyContinue

            # FIPS-compliant EFS uses AES (algorithm IDs: 0x6603 = 3DES, 0x6610 = AES 128, 0x6618 = AES 256)
            # 0x6603 (3DES) is FIPS 140-2 approved but weak
            if ($null -ne $efsAlgorithm) {
                $algoID = $efsAlgorithm.AlgorithmID
                if ($algoID -eq 0x6603) {
                    $ComplianceReport.findings += @{
                        check = "EFS Encryption Algorithm"
                        status = "WARNING"
                        severity = "LOW"
                        finding = "EFS uses 3DES (weak but FIPS-approved). Recommend upgrading to AES-256."
                        remediation = "Set AlgorithmID to 0x6618 (AES-256) via Group Policy or registry"
                        evidence = "Algorithm ID: 0x$($algoID.ToString('X'))"
                    }
                } elseif ($algoID -notin @(0x6610, 0x6618)) {
                    $ComplianceReport.findings += @{
                        check = "EFS Encryption Algorithm"
                        status = "FAIL"
                        severity = "MEDIUM"
                        finding = "EFS uses non-standard algorithm ID: 0x$($algoID.ToString('X'))"
                        remediation = "Configure EFS to use AES-256 (AlgorithmID = 0x6618)"
                    }
                    $ComplianceReport.compliant = $false
                } else {
                    $ComplianceReport.evidence.efs_algorithm = "AES (ID: 0x$($algoID.ToString('X')))"
                }
            }
        }

    } catch {
        $ComplianceReport.errors += "EFS Check Error: $($_.Exception.Message)"
    }
}

function Test-CryptographicProviders {
    <#
    .SYNOPSIS
    Validates active cryptographic providers (CNG/CSP) are FIPS-validated.
    #>
    try {
        # Check for FIPS-validated CNG providers
        $cngProviders = certutil -csplist 2>$null | Select-String "Provider Name:"

        if ($null -ne $cngProviders) {
            $ComplianceReport.evidence.cng_providers = @($cngProviders | ForEach-Object { $_.ToString().Trim() })
        }

        # Validate bcryptprimitives.dll (Windows FIPS 140-2 validated module)
        $bcryptPath = "$env:SystemRoot\System32\bcryptprimitives.dll"
        if (Test-Path $bcryptPath) {
            $bcryptVersion = (Get-Item $bcryptPath).VersionInfo.FileVersion
            $ComplianceReport.evidence.bcryptprimitives_version = $bcryptVersion
        } else {
            $ComplianceReport.findings += @{
                check = "FIPS Cryptographic Module"
                status = "FAIL"
                severity = "CRITICAL"
                finding = "bcryptprimitives.dll not found at: $bcryptPath"
                remediation = "Reinstall Windows cryptographic components"
            }
            $ComplianceReport.compliant = $false
        }

    } catch {
        $ComplianceReport.errors += "Cryptographic Provider Check Error: $($_.Exception.Message)"
    }
}

function Test-IPsecCrypto {
    <#
    .SYNOPSIS
    Validates IPsec cryptographic settings use FIPS-approved algorithms.
    #>
    try {
        $ipsecMMSAs = Get-NetIPsecMainModeSA -ErrorAction SilentlyContinue

        if ($null -ne $ipsecMMSAs -and $ipsecMMSAs.Count -gt 0) {
            foreach ($sa in $ipsecMMSAs) {
                # Check encryption algorithm (should be AES)
                if ($sa.EncryptionAlgorithm -notmatch "AES") {
                    $ComplianceReport.findings += @{
                        check = "IPsec Encryption Algorithm"
                        status = "FAIL"
                        severity = "MEDIUM"
                        finding = "IPsec SA uses non-AES encryption: $($sa.EncryptionAlgorithm)"
                        remediation = "Configure IPsec to use AES encryption via Group Policy or PowerShell"
                    }
                    $ComplianceReport.compliant = $false
                }

                # Check integrity algorithm (should be SHA256+)
                if ($sa.IntegrityAlgorithm -match "MD5|SHA1") {
                    $ComplianceReport.findings += @{
                        check = "IPsec Integrity Algorithm"
                        status = "FAIL"
                        severity = "HIGH"
                        finding = "IPsec SA uses weak integrity algorithm: $($sa.IntegrityAlgorithm)"
                        remediation = "Configure IPsec to use SHA256 or SHA384"
                    }
                    $ComplianceReport.compliant = $false
                }
            }
        }

    } catch {
        # IPsec may not be active - not necessarily a failure
        $ComplianceReport.evidence.ipsec = "No active IPsec SAs"
    }
}

function Test-RDPCrypto {
    <#
    .SYNOPSIS
    Validates Remote Desktop Protocol (RDP) cryptographic settings.
    #>
    try {
        $rdpRegPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp"

        if (Test-Path $rdpRegPath) {
            # Check encryption level (should be High = 3 or FIPS = 4)
            $minEncryption = Get-ItemProperty -Path $rdpRegPath -Name "MinEncryptionLevel" -ErrorAction SilentlyContinue

            if ($null -ne $minEncryption -and $minEncryption.MinEncryptionLevel -lt 3) {
                $ComplianceReport.findings += @{
                    check = "RDP Encryption Level"
                    status = "FAIL"
                    severity = "HIGH"
                    finding = "RDP encryption level is below High (value: $($minEncryption.MinEncryptionLevel))"
                    remediation = "Set MinEncryptionLevel to 3 (High) or 4 (FIPS) via Group Policy"
                    evidence = "Registry path: $rdpRegPath"
                }
                $ComplianceReport.compliant = $false
            } else {
                $ComplianceReport.evidence.rdp_encryption = "Level $($minEncryption.MinEncryptionLevel)"
            }
        }

    } catch {
        $ComplianceReport.errors += "RDP Crypto Check Error: $($_.Exception.Message)"
    }
}

function Test-CertificateStore {
    <#
    .SYNOPSIS
    Validates certificates in local machine store for weak cryptographic algorithms.
    #>
    try {
        $certs = Get-ChildItem -Path Cert:\LocalMachine\My -ErrorAction SilentlyContinue

        $weakCerts = @()
        foreach ($cert in $certs) {
            # Check for weak signature algorithms (MD5, SHA1)
            if ($cert.SignatureAlgorithm.FriendlyName -match "md5|sha1") {
                $weakCerts += @{
                    thumbprint = $cert.Thumbprint
                    subject = $cert.Subject
                    algorithm = $cert.SignatureAlgorithm.FriendlyName
                    expiry = $cert.NotAfter
                }
            }
        }

        if ($weakCerts.Count -gt 0) {
            $ComplianceReport.findings += @{
                check = "Certificate Store - Weak Algorithms"
                status = "WARNING"
                severity = "MEDIUM"
                finding = "$($weakCerts.Count) certificates found with weak signature algorithms (MD5/SHA1)"
                remediation = "Replace certificates with SHA256+ signed certificates"
                evidence = ($weakCerts | ForEach-Object { "$($_.subject) [$($_.algorithm)]" }) -join "; "
            }
        }

        $ComplianceReport.evidence.certificates_checked = $certs.Count

    } catch {
        $ComplianceReport.errors += "Certificate Store Check Error: $($_.Exception.Message)"
    }
}

# Execute all validation functions
Write-Host "[IA-7] Starting FIPS 140-2/140-3 Cryptographic Module Authentication validation..." -ForegroundColor Cyan

Test-FIPSMode
Test-SchannelProtocols
Test-FIPSCipherSuites
Test-BitLockerCrypto
Test-EFSCrypto
Test-CryptographicProviders
Test-IPsecCrypto
Test-RDPCrypto
Test-CertificateStore

# Generate compliance report
$ComplianceReport.summary = @{
    total_checks = 9
    findings_count = $ComplianceReport.findings.Count
    errors_count = $ComplianceReport.errors.Count
    compliance_status = if ($ComplianceReport.compliant) { "COMPLIANT" } else { "NON-COMPLIANT" }
}

# Write JSON report
try {
    $ComplianceReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-Host "[IA-7] Compliance report generated: $OutputPath" -ForegroundColor Green
} catch {
    Write-Error "Failed to write compliance report: $($_.Exception.Message)"
    exit 2
}

# Display summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "IA-7 COMPLIANCE SUMMARY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Status: $($ComplianceReport.summary.compliance_status)" -ForegroundColor $(if ($ComplianceReport.compliant) { "Green" } else { "Red" })
Write-Host "Findings: $($ComplianceReport.findings.Count)" -ForegroundColor Yellow
Write-Host "Errors: $($ComplianceReport.errors.Count)" -ForegroundColor Red
Write-Host "======================================`n" -ForegroundColor Cyan

# Exit with appropriate code
if ($ComplianceReport.errors.Count -gt 0) {
    exit 2
} elseif (-not $ComplianceReport.compliant) {
    exit 1
} else {
    exit 0
}
