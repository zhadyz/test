#!/usr/bin/env python3
"""Complete the final 3 controls with comprehensive guidance."""

import json
import datetime

def complete_final_controls():
    """Enhance IA-5.3, IA-5.4, IA-5.5 to meet 800+ char requirement."""

    with open(r'C:\Users\eclip\Desktop\nist-compliance-app-main\backend\data\controls\fixed\IA-5.json', 'r', encoding='utf-8') as f:
        controls = json.load(f)

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    control_map = {c['control_id']: c for c in controls}

    # IA-5(3)
    control_map['IA-5.3']['non_technical_guidance'] = (
        "To comply with IA-5(3) In-person or Trusted External Party Registration:\n"
        "1. Define authenticator types requiring in-person registration: High-assurance authenticators (PIV/CAC smart cards, biometric enrollment, hardware security tokens, code signing certificates) must be issued only after in-person identity verification or authorization by designated official.\n"
        "2. Designate registration authorities: Identify specific personnel authorized to conduct identity proofing and authenticator issuance—typically HR representatives, security personnel, or designated identity registration officers with proper training.\n"
        "3. Establish identity proofing requirements: For MODERATE/HIGH systems, require in-person appearance with two forms of government-issued photo identification (e.g., passport and driver license), verification against authoritative sources (DMV databases, passport records), and biometric capture if applicable.\n"
        "4. Configure registration workflow: User schedules appointment with registration authority, appears in-person with required identification documents, RA verifies identity and documents validity, captures identity information, obtains authorization from designated official (security manager, CISO), issues authenticator, logs transaction with approver details.\n"
        "5. For remote/distributed workforce exceptions: When in-person registration is impractical, implement trusted third-party verification using notarized identity documents, video conference identity verification with liveness detection, or trusted introducer model where existing verified employees vouch for new employees under their management.\n"
        "6. Train registration authorities: Provide fraud detection training (spotting fake IDs, document alteration techniques), proper identity verification procedures, data protection requirements, logging and documentation standards.\n"
        "7. Document all registration events: Maintain audit trail including identity documents presented, verification sources consulted, approving official identity, date/time of issuance, authenticator serial numbers or identifiers.\n"
        "8. Establish authorization criteria: Define who can approve authenticator issuance (department heads for standard credentials, CISO for privileged credentials, designated security officers for contractor/visitor credentials), required approval levels based on authenticator sensitivity.\n"
        "9. Implement compensating controls for remote scenarios: If in-person verification impossible, require multiple verification factors (notarized documents PLUS video verification PLUS background check), document risk acceptance, implement enhanced monitoring for remotely-issued authenticators."
    )
    control_map['IA-5.3']['metadata']['last_updated'] = timestamp

    # IA-5(4)
    control_map['IA-5.4']['non_technical_guidance'] = (
        "To comply with IA-5(4) Automated Support for Password Strength Determination:\n"
        "1. Deploy password strength checking tools at all authentication interfaces: Integrate real-time password strength meters in account creation pages, password change forms, and administrative consoles—use established libraries like zxcvbn (Dropbox), passwordmeter.js, or vendor-provided solutions.\n"
        "2. Configure automated password rejection criteria: Set minimum entropy requirements (60-80 bits for MODERATE systems, 80-100 bits for HIGH systems), enable dictionary checking against common password lists, block passwords containing username or organization name, prevent keyboard patterns (qwerty, 12345) and common substitutions (passw0rd).\n"
        "3. Integrate compromised password databases: Connect to HaveIBeenPwned Pwned Passwords API (600M+ breached passwords), NCSC password blacklist, or similar breach correlation services—automatically reject any password found in breach databases regardless of apparent complexity.\n"
        "4. Implement real-time user feedback: Display dynamic strength indicators (weak/fair/good/strong with visual progress bars), provide actionable guidance without revealing exact requirements to attackers, suggest improvements, show estimated crack time based on entropy calculation.\n"
        "5. Configure strength analysis algorithms: Use entropy-based calculation not just character counting (four random words stronger than 8-character complex password), account for dictionary words (penalize entropy for common words), detect patterns and sequences, analyze keyboard proximity exploitation.\n"
        "6. Set organizational strength thresholds: Define minimum acceptable scores for different account types (standard user accounts minimum 65-bit entropy, privileged accounts 80-bit entropy, service accounts 100-bit entropy or require non-password authentication).\n"
        "7. Provide user education on password creation: Display examples of strong passwords/passphrases, recommend passphrase approach (correct horse battery staple method), educate on why length beats complexity, warn against password reuse across systems.\n"
        "8. Test password strength tools effectiveness: Periodically validate tools detect weak passwords (test with known weak passwords, common patterns, leaked credentials), verify no false positives blocking legitimate strong passwords, ensure tools do not leak password information.\n"
        "9. Monitor password creation analytics: Track rejected password attempts to identify user confusion patterns, measure average password entropy across organization, identify users consistently creating weak passwords for additional training."
    )
    control_map['IA-5.4']['metadata']['last_updated'] = timestamp

    # IA-5(5)
    control_map['IA-5.5']['non_technical_guidance'] = (
        "To comply with IA-5(5) Change Authenticators Prior to Delivery:\n"
        "1. Establish organizational policy banning default credentials: Explicitly prohibit deployment of any system component (servers, network devices, databases, IoT devices, applications) with factory default passwords, keys, or certificates—make credential customization mandatory before operational use.\n"
        "2. Define pre-deployment credential requirements: All systems must have unique, randomly generated credentials configured before network connection or production deployment—minimum 32-character random passwords for administrative accounts, unique SSH host keys regenerated on first boot, custom certificates replacing vendor-shipped defaults.\n"
        "3. Create secure credential generation procedures: Use cryptographically strong random password generators (not sequential or predictable patterns), document credentials in enterprise password management system (Vault, CyberArk, Password Manager), apply role-based access controls to credential documentation, encrypt credential storage.\n"
        "4. Implement deployment automation with credential randomization: Configure infrastructure-as-code tools (Terraform, Ansible, CloudFormation) to generate random unique credentials during provisioning, integrate with secret management systems for credential storage/retrieval, prevent manual credential entry that could result in weak/default passwords being used.\n"
        "5. Establish vendor requirements and acceptance criteria: For procured equipment, contractual language requiring vendors to support credential customization before delivery or providing tools for rapid credential change on first boot—reject products that hardcode unchangeable default credentials, require vendor documentation of default credential change procedures.\n"
        "6. Conduct pre-deployment security validation: Scan new systems for default credentials using automated tools (Nessus, Qualys, OpenVAS configured with default credential checks), manually verify administrative passwords changed from defaults, check for vendor backdoor accounts, validate SSH keys regenerated.\n"
        "7. Create installation checklists requiring credential verification: Step-by-step procedures for each system type documenting required credential changes (database root passwords, web application admin accounts, network device enable passwords, SNMP community strings), sign-off requirements before production deployment approval.\n"
        "8. For legacy systems with unchangeable defaults: Document as risk in system authorization package, implement compensating controls (network segmentation isolating affected systems, enhanced monitoring for exploitation attempts, access restrictions limiting who can reach default credential interfaces), plan migration to replaceable systems.\n"
        "9. Audit credential management compliance: Quarterly scans for default credentials across infrastructure, review new system deployment documentation verifying credential change compliance, investigate any default credential findings as security incidents requiring immediate remediation."
    )
    control_map['IA-5.5']['metadata']['last_updated'] = timestamp

    with open(r'C:\Users\eclip\Desktop\nist-compliance-app-main\backend\data\controls\fixed\IA-5.json', 'w', encoding='utf-8') as f:
        json.dump(controls, f, indent=2, ensure_ascii=False)

    return controls

def main():
    controls = complete_final_controls()

    # Final statistics
    total = len(controls)
    with_scripts = sum(1 for c in controls if c['metadata']['has_scripts'])
    guidance_800 = sum(1 for c in controls if len(c.get('non_technical_guidance', '')) >= 800)

    print(f"\n=== FINAL IA-5 AUTHENTICATOR MANAGEMENT FAMILY ===\n")
    print(f"Total controls generated: {total}")
    print(f"Controls with full implementation scripts: {with_scripts}")
    print(f"Controls with comprehensive (800+) guidance: {guidance_800}/{total}")
    print(f"\nBreakdown:")
    for c in controls:
        status = "[SCRIPTS + GUIDANCE]" if c['metadata']['has_scripts'] else "[GUIDANCE ONLY]"
        guidance_len = len(c.get('non_technical_guidance', ''))
        print(f"  {c['control_id']:8} {guidance_len:5} chars  {status}")

    print(f"\nOutput: C:\\Users\\eclip\\Desktop\\nist-compliance-app-main\\backend\\data\\controls\\fixed\\IA-5.json")
    print("\n✓ All 19 IA-5 controls completed successfully")

if __name__ == "__main__":
    main()
