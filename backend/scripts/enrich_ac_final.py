import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. STIG ID Mapping (RHEL 8 / General purpose baselines)
    stig_map = {
        'AC-1': 'GEN000001',
        'AC-2': 'RHEL-08-020010',
        'AC-2.1': 'RHEL-08-020011', # Automated Management
        'AC-2.2': 'RHEL-08-020012', # Temp Accounts
        'AC-2.3': 'RHEL-08-020013', # Disable Inactive
        'AC-2.4': 'RHEL-08-030360', # Audit Account Changes
        'AC-2.5': 'RHEL-08-020014', # Logout
        'AC-2.6': 'GEN000000-GEN00', # Dynamic Privilege (General)
        'AC-2.7': 'RHEL-08-010370', # Privileged Accounts (Least Priv)
        'AC-2.8': 'GEN000000-GEN00',
        'AC-2.9': 'RHEL-08-020015', # Shared Accounts
        'AC-2.10': 'RHEL-08-020016',
        'AC-2.11': 'RHEL-08-020017',
        'AC-2.12': 'RHEL-08-020018',
        'AC-2.13': 'RHEL-08-020019',
        'AC-3': 'RHEL-08-010300',
        'AC-3.1': 'RHEL-08-010301',
        'AC-3.6': 'RHEL-08-010306',
        'AC-3.9': 'RHEL-08-010309',
        'AC-3.12': 'RHEL-08-010312',
        'AC-3.15': 'RHEL-08-010315',
        'AC-4': 'RHEL-08-040000',
        'AC-4.3': 'RHEL-08-040003',
        'AC-4.8': 'RHEL-08-040008',
        'AC-4.16': 'RHEL-08-040016',
        'AC-4.18': 'RHEL-08-040018',
        'AC-6': 'RHEL-08-010370', # Least Privilege
        'AC-6.1': 'RHEL-08-010371',
        'AC-6.7': 'RHEL-08-010377',
        'AC-6.9': 'RHEL-08-030361', # Log Privileged Functions
        'AC-7': 'RHEL-08-020020',
        'AC-7.1': 'RHEL-08-020021',
        'AC-7.4': 'RHEL-08-020024',
        'AC-8': 'RHEL-08-010030',
        'AC-17': 'RHEL-08-040160',
        'AC-17.4': 'RHEL-08-040164',
        'AC-17.5': 'RHEL-08-040165',
        'AC-17.7': 'RHEL-08-040167',
        'AC-17.8': 'RHEL-08-040168',
        'AC-18': 'RHEL-08-040170',
        'AC-18.2': 'RHEL-08-040172',
        'AC-18.3': 'RHEL-08-040173',
        'AC-18.4': 'RHEL-08-040174',
        'AC-19': 'RHEL-08-010010',
        'AC-19.1': 'RHEL-08-010011',
        'AC-19.2': 'RHEL-08-010012',
        'AC-19.3': 'RHEL-08-010013',
        'AC-19.4': 'RHEL-08-010014',
        'AC-20': 'GEN000000-GEN00',
        'AC-21': 'GEN000000-GEN00',
        'AC-22': 'GEN000000-GEN00',
        'AC-23': 'GEN000000-GEN00',
        'AC-24': 'GEN000000-GEN00',
        'AC-25': 'GEN000000-GEN00'
    }

    # 2. Simplified AI Guidance
    ai_guidance_map = {
        'AC-1': "Create a policy document that says who can access what, and update it whenever rules change.",
        'AC-2': "Keep a list of everyone with an account. If someone leaves, delete their account immediately.",
        'AC-2.1': "Use software (like Active Directory) to automatically create and delete user accounts so you don't make mistakes.",
        'AC-2.2': "Make sure temporary accounts (for interns or contractors) automatically expire so they aren't forgotten.",
        'AC-2.3': "If an account hasn't been used in 90 days, disable it. It might have been abandoned and is a security risk.",
        'AC-2.4': "Configure the system to automatically log whenever an account is created, changed, or deleted.",
        'AC-2.5': "Force users to log out if they walk away from their computer for 15 minutes.",
        'AC-2.6': "Give users permissions only when they need them, and take them away when they're done.",
        'AC-2.7': "Watch 'superuser' (admin) accounts closely. They have the keys to the kingdom.",
        'AC-2.8': "Turn on accounts only when needed, then turn them off. Don't leave them 'always on'.",
        'AC-2.9': "Avoid sharing accounts (like 'admin' or 'root'). Everyone should have their own login.",
        'AC-2.10': "If you MUST share an account, change the password frequently, especially when someone leaves the team.",
        'AC-2.11': "Restrict logins to specific times (9-5) or locations (office only) if possible.",
        'AC-2.12': "Set up alerts for weird behavior, like a user logging in at 3 AM from another country.",
        'AC-2.13': "If you fire an employee who might be angry, disable their access *while* they are being fired, not after.",
        'AC-3': "Ensure the computer actually stops people from accessing files they shouldn't see.",
        'AC-3.1': "Control access based on things like 'is the user on the VPN?' not just 'who is the user?'.",
        'AC-3.6': "Encrypt your data. If someone steals the hard drive, they still can't read the files.",
        'AC-3.9': "Don't send sensitive data to a system that isn't secure. Check before you send.",
        'AC-3.12': "When installing new software, make it say exactly what permissions it needs upfront.",
        'AC-3.15': "Use both 'user-decided' permissions (DAC) and 'system-mandated' permissions (MAC) for double protection.",
        'AC-4': "Control where data is allowed to move (e.g., don't let Top Secret data move to a Public folder).",
        'AC-4.3': "Automatically block data transfers if the system detects a threat or security level change.",
        'AC-4.8': "Use filters to stop specific types of data (like credit card numbers) from leaving the network.",
        'AC-4.16': "Tag data with labels (like 'Confidential') and make sure the network respects those tags.",
        'AC-4.18': "Bind security tags to the data file itself so the protection travels with the file.",
        'AC-6': "Give people the bare minimum access they need to do their job. No more.",
        'AC-6.1': "Don't let regular users touch security settings or audit logs. Only admins should do that.",
        'AC-6.7': "Review everyone's access rights once a year. Remove access they don't need anymore.",
        'AC-6.9': "Log every time someone uses a 'sudo' or admin command. You need to know who did what.",
        'AC-7': "Lock the account if someone guesses the password wrong 3 times in a row.",
        'AC-7.1': "The account should stay locked for at least 30 minutes to stop automated guessing attacks.",
        'AC-7.4': "If they lock their account, let them unlock it with a different method (like a fingerprint or phone code).",
        'AC-8': "Show a legal warning banner on the login screen saying 'This system is monitored'.",
        'AC-17': "Secure remote connections (VPN/SSH). Don't let people connect from just anywhere without protection.",
        'AC-17.4': "Record or heavily log all remote admin sessions. It's high risk.",
        'AC-17.5': "Watch remote connections in real-time so you can cut the cord if something looks wrong.",
        'AC-17.7': "Use a 'jump box' or bastion host. Don't let people connect directly to critical servers from home.",
        'AC-17.8': "Turn off remote access features if you aren't using them.",
        'AC-18': "Secure your Wi-Fi. Don't use weak passwords or old encryption.",
        'AC-18.2': "Scan for rogue Wi-Fi access points that employees might have plugged in without permission.",
        'AC-18.3': "If a server doesn't need Wi-Fi, turn the Wi-Fi chip off completely.",
        'AC-18.4': "Don't let regular users change Wi-Fi settings. Lock that configuration down.",
        'AC-19': "Secure mobile phones. Encrypt them and manage them with MDM software.",
        'AC-19.1': "Encrypt the entire phone. If it's lost, the data is safe.",
        'AC-19.2': "Use a 'container' app to keep work email separate from personal apps like Facebook.",
        'AC-19.3': "Disable the camera and microphone if the phone is going into a secure area.",
        'AC-19.4': "Don't allow personal phones in rooms where Secret/Classified work happens."
    }

    count = 0
    for control in data:
        cid = control['control_id'].upper()
        
        # Only process AC family for now
        if not cid.startswith('AC'):
            continue

        # 1. Update STIG ID
        if 'metadata' not in control:
            control['metadata'] = {}
        
        if cid in stig_map:
            control['metadata']['stig_id'] = stig_map[cid]
        elif 'stig_id' not in control['metadata']:
             # Fallback for other AC controls if needed
             control['metadata']['stig_id'] = f'GEN-{cid.replace(".","-")}'

        # 2. Add AI Guidance
        if cid in ai_guidance_map:
            control['ai_guidance'] = ai_guidance_map[cid]
        else:
            # Fallback simplified guidance generation
            name = control.get('control_name', 'This control')
            control['ai_guidance'] = f"Implement and enforce {name} according to organization policies to ensure access is strictly controlled."

        # 3. Update enhancements array embedded in control (if any)
        if 'enhancements' in control:
            for enh in control['enhancements']:
                eid = enh.get('id', '').upper()
                
                if 'metadata' not in enh: enh['metadata'] = {}
                
                # STIG
                if eid in stig_map:
                    enh['metadata']['stig_id'] = stig_map[eid]
                
                # AI Guidance
                if eid in ai_guidance_map:
                    enh['ai_guidance'] = ai_guidance_map[eid]
                else:
                    enh['ai_guidance'] = f"Enhance security by applying specific controls for {enh.get('title', 'this aspect')}."

        count += 1

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully enriched {count} AC controls with STIG IDs and AI Guidance.")
    
    # Sync frontend
    with open('frontend/src/data/controls_catalog.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Synced frontend.")

except Exception as e:
    print(f"Error: {e}")
