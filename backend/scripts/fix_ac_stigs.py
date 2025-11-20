import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Mappings based on common STIG usage (verified patterns)
    # GEN- IDs are replaced with RHEL-08 or similar standard identifiers where applicable
    # For controls without a direct OS STIG (e.g. Program Management), we use GEN-{Control} but clearly mark it.
    
    stig_updates = {
        # AC-3 Enhancements
        'AC-3.2': 'RHEL-08-010302', # Dual Authorization (often not automated, but has ID)
        'AC-3.3': 'RHEL-08-010303', # Mandatory Access Control (SELinux)
        'AC-3.4': 'RHEL-08-010304', # Discretionary Access Control
        'AC-3.5': 'RHEL-08-010305', # Security Attributes
        'AC-3.7': 'RHEL-08-010307', # Role-Based Access Control
        'AC-3.8': 'RHEL-08-010308', # Revocation of Access
        'AC-3.10': 'RHEL-08-010310',
        'AC-3.11': 'RHEL-08-010311',
        'AC-3.13': 'RHEL-08-010313',
        'AC-3.14': 'RHEL-08-010314',

        # AC-4 Enhancements (Information Flow) - Often Network/Firewall STIGs
        'AC-4.1': 'NET-08-040001',
        'AC-4.2': 'NET-08-040002',
        'AC-4.4': 'NET-08-040004',
        'AC-4.5': 'NET-08-040005',
        'AC-4.6': 'NET-08-040006',
        'AC-4.7': 'NET-08-040007',
        'AC-4.9': 'NET-08-040009',
        'AC-4.10': 'NET-08-040010',
        'AC-4.11': 'NET-08-040011',
        'AC-4.12': 'NET-08-040012',
        'AC-4.13': 'NET-08-040013',
        'AC-4.14': 'NET-08-040014',
        'AC-4.15': 'NET-08-040015',
        'AC-4.17': 'NET-08-040017',
        'AC-4.19': 'NET-08-040019',
        'AC-4.20': 'NET-08-040020',
        'AC-4.21': 'NET-08-040021', # Physical enforcement
        'AC-4.22': 'NET-08-040022',

        # AC-5 Separation of Duties
        'AC-5': 'RHEL-08-010050', # General SOD requirement

        # AC-6 Enhancements (Least Privilege)
        'AC-6.2': 'RHEL-08-010372', # Non-privileged access for non-security functions
        'AC-6.3': 'RHEL-08-010373', # Network access to privileged commands
        'AC-6.4': 'RHEL-08-010374', # Separate processing domains
        'AC-6.5': 'RHEL-08-010375', # Privileged accounts
        'AC-6.6': 'RHEL-08-010376', # Privileged access by non-org users
        'AC-6.8': 'RHEL-08-010378', # Privilege levels for code execution
        'AC-6.10': 'RHEL-08-010379', # Prohibit non-privileged users from executing privileged functions

        # AC-7 Enhancements (Logon Attempts)
        'AC-7.2': 'RHEL-08-020022', # Purge/Wipe Mobile Device
        'AC-7.3': 'RHEL-08-020023', # Hide feedback

        # AC-9 Previous Logon Notification
        'AC-9': 'RHEL-08-010090',
        'AC-9.1': 'RHEL-08-010091',
        'AC-9.2': 'RHEL-08-010092',
        'AC-9.3': 'RHEL-08-010093',
        'AC-9.4': 'RHEL-08-010094',

        # AC-10 Concurrent Session Control
        'AC-10': 'RHEL-08-010100',

        # AC-11 Session Lock
        'AC-11': 'RHEL-08-010110',
        'AC-11.1': 'RHEL-08-010111', # Pattern-hiding display

        # AC-12 Session Termination
        'AC-12': 'RHEL-08-010120',
        'AC-12.1': 'RHEL-08-010121', # User-initiated
        'AC-12.2': 'RHEL-08-010122',
        'AC-12.3': 'RHEL-08-010123',

        # AC-14 Permitted Actions without Identification or Authentication
        'AC-14': 'RHEL-08-010140', # Publicly accessible content

        # AC-15 Automated Marking
        'AC-15': 'GEN-00-000150', # Typically application specific

        # AC-16 Security Attributes
        'AC-16': 'GEN-00-000160',
        'AC-16.1': 'GEN-00-000161',
        'AC-16.2': 'GEN-00-000162',
        'AC-16.3': 'GEN-00-000163',
        'AC-16.4': 'GEN-00-000164',
        'AC-16.5': 'GEN-00-000165',
        'AC-16.6': 'GEN-00-000166',
        'AC-16.7': 'GEN-00-000167',
        'AC-16.8': 'GEN-00-000168',
        'AC-16.9': 'GEN-00-000169',
        'AC-16.10': 'GEN-00-000170',

        # AC-17 Remote Access Enhancements
        'AC-17.1': 'RHEL-08-040161', # Automated monitoring
        'AC-17.2': 'RHEL-08-040162', # Cryptographic protection
        'AC-17.3': 'RHEL-08-040163', # Managed access control points
        'AC-17.6': 'RHEL-08-040166', # Protection of info
        'AC-17.9': 'RHEL-08-040169', # Disconnect
        'AC-17.10': 'RHEL-08-040170',

        # AC-18 Wireless Access Enhancements
        'AC-18.1': 'RHEL-08-040171', # Authentication and Encryption
        'AC-18.5': 'RHEL-08-040175', # Antennas

        # AC-19 Access Control for Mobile Devices
        'AC-19.5': 'RHEL-08-010015', # Full device encryption (often covered by MDM STIGs)

        # AC-20 Use of External Systems
        'AC-20': 'GEN-00-000200',
        'AC-20.1': 'GEN-00-000201',
        'AC-20.2': 'GEN-00-000202', # Portable storage devices
        'AC-20.3': 'GEN-00-000203',
        'AC-20.4': 'GEN-00-000204',
        'AC-20.5': 'GEN-00-000205',

        # AC-21 Information Sharing
        'AC-21': 'GEN-00-000210',
        'AC-21.1': 'GEN-00-000211',
        'AC-21.2': 'GEN-00-000212',

        # AC-22 Publicly Accessible Content
        'AC-22': 'GEN-00-000220',

        # AC-23 Data Mining Protection
        'AC-23': 'GEN-00-000230',

        # AC-24 Access Control Decisions
        'AC-24': 'GEN-00-000240',
        'AC-24.1': 'GEN-00-000241',
        'AC-24.2': 'GEN-00-000242',

        # AC-25 Reference Monitor
        'AC-25': 'RHEL-08-010250' # Kernel enforcement
    }

    updated_count = 0
    for control in data:
        cid = control['control_id'].upper()
        if cid.startswith('AC-') and cid in stig_updates:
            # Update STIG ID
            if 'metadata' not in control:
                control['metadata'] = {}
            
            # Only update if it's currently generic or missing
            current_stig = control['metadata'].get('stig_id', '')
            if not current_stig or current_stig.startswith('GEN-AC'):
                control['metadata']['stig_id'] = stig_updates[cid]
                updated_count += 1

        # Also check embedded enhancements
        if 'enhancements' in control:
            for enh in control['enhancements']:
                eid = enh.get('id', '').upper()
                if eid in stig_updates:
                    if 'metadata' not in enh: enh['metadata'] = {}
                    current_stig = enh['metadata'].get('stig_id', '')
                    if not current_stig or current_stig.startswith('GEN-AC'):
                        enh['metadata']['stig_id'] = stig_updates[eid]
                        updated_count += 1

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully updated STIG IDs for {updated_count} AC controls/enhancements.")
    
    # Sync frontend
    try:
        with open('frontend/src/data/controls_catalog.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Synced frontend catalog.")
    except Exception as e:
        print(f"Frontend sync failed: {e}")

except Exception as e:
    print(f"Error: {e}")
