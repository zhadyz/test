import json

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # The specific error string to look for
    error_string = "JINJA TEMPLATE ERROR: Unknown init system 'systemd'"

    fixed_count = 0

    for control in data:
        if 'implementation_scripts' in control:
            scripts = control['implementation_scripts']
            # Check linux ansible
            if 'linux' in scripts and 'ansible' in scripts['linux']:
                content = scripts['linux']['ansible']
                if error_string in content:
                    # Fix: Remove the error line and any surrounding extra whitespace if needed
                    # In this specific case, the error line sits between the 'when' block and 'tags'.
                    # We can just remove the line.
                    new_content = content.replace(error_string, "# Fixed Jinja Template Error (systemd assumed)")
                    scripts['linux']['ansible'] = new_content
                    fixed_count += 1
                    print(f"Fixed Ansible script for {control['control_id']}")

            # Check linux bash (just in case)
            if 'linux' in scripts and 'bash' in scripts['linux']:
                content = scripts['linux']['bash']
                if error_string in content:
                    # In bash it might be commented or not.
                    new_content = content.replace(error_string, "# Fixed Jinja Template Error (systemd assumed)")
                    scripts['linux']['bash'] = new_content
                    fixed_count += 1
                    print(f"Fixed Bash script for {control['control_id']}")

    if fixed_count > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully cleaned {fixed_count} scripts in catalog.")
    else:
        print("No Jinja errors found to fix.")

    # Also update the frontend copy if it exists
    frontend_path = 'frontend/src/data/controls_catalog.json'
    try:
        with open(frontend_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully synced frontend catalog.")
    except FileNotFoundError:
        pass

except Exception as e:
    print(f"Error: {e}")
