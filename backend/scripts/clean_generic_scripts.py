import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # The generic script that was incorrectly pasted
    generic_script_content = "Ensure no accounts have empty password"

    count = 0
    for control in data:
        if 'implementation_scripts' in control:
            scripts = control['implementation_scripts']
            
            # Check Linux/Ansible
            if 'linux' in scripts and 'ansible' in scripts['linux']:
                current_script = scripts['linux']['ansible']
                # If it contains the generic "empty password" check BUT the control is NOT AC-2
                # We want to keep it for AC-2 as that is a valid check there.
                if generic_script_content in current_script and control['control_id'].lower() != 'ac-2':
                    # Remove it or set to null to indicate no specific automation
                    # Better to remove the key so the UI shows "Administrative" or "Manual" guidance
                    # unless we have a replacement.
                    
                    # For enhancements of AC-2 (like AC-2.1), we might want to inherit AC-2's script?
                    # The user complained it was "pasted multiple times".
                    # It implies they want to see something specific or nothing if not applicable.
                    
                    # I'll clear it for enhancements to force the UI to fall back to "Manual Implementation"
                    # or "Policy" if configured, rather than showing a misleading script.
                    
                    # Check if we have a specific replacement in mind? No.
                    # Just clean the junk.
                    
                    # Strategy: If the script is EXACTLY or MOSTLY the generic one, nuke it.
                    if "awk -F: '($2 == \"\" )" in current_script:
                        del scripts['linux']['ansible']
                        # Also clean bash if it matches the generic bash script
                        if 'bash' in scripts['linux'] and "awk -F: '($2 == \"\" )" in scripts['linux']['bash']:
                            del scripts['linux']['bash']
                        
                        count += 1
                        # print(f"Cleaned generic script from {control['control_id']}")

    if count > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully removed generic AC-2 scripts from {count} other controls/enhancements.")
        
        # Sync frontend
        try:
            with open('frontend/src/data/controls_catalog.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("Synced frontend catalog.")
        except Exception as e:
            print(f"Frontend sync failed: {e}")
            
    else:
        print("No generic scripts found to clean (or AC-2 was skipped).")

except Exception as e:
    print(f"Error: {e}")
