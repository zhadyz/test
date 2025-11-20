import json
import re

try:
    json_path = 'backend/data/controls_catalog.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # The comment to remove
    comment_string = "# Fixed Jinja Template Error (systemd assumed)"
    
    # Regex to clean up multiple newlines that might result from removing the line
    # Replace 3 or more newlines with 2
    newline_regex = re.compile(r'\n{3,}')

    fixed_count = 0

    for control in data:
        if 'implementation_scripts' in control:
            scripts = control['implementation_scripts']
            
            # Check linux ansible
            if 'linux' in scripts and 'ansible' in scripts['linux']:
                content = scripts['linux']['ansible']
                if comment_string in content:
                    new_content = content.replace(comment_string, "")
                    # Clean up extra whitespace
                    new_content = newline_regex.sub('\n\n', new_content)
                    scripts['linux']['ansible'] = new_content
                    fixed_count += 1
                    print(f"Polished Ansible script for {control['control_id']}")

            # Check linux bash
            if 'linux' in scripts and 'bash' in scripts['linux']:
                content = scripts['linux']['bash']
                if comment_string in content:
                    new_content = content.replace(comment_string, "")
                    new_content = newline_regex.sub('\n\n', new_content)
                    scripts['linux']['bash'] = new_content
                    fixed_count += 1
                    print(f"Polished Bash script for {control['control_id']}")

    if fixed_count > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully polished {fixed_count} scripts in catalog.")
        
        # Also update the frontend copy
        frontend_path = 'frontend/src/data/controls_catalog.json'
        try:
            with open(frontend_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Successfully synced frontend catalog.")
        except FileNotFoundError:
            pass
            
    else:
        print("No artifacts found to clean.")

except Exception as e:
    print(f"Error: {e}")
