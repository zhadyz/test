import json
import re

INPUT_FILE = 'all_controls_with_scripts_ansible_rhel8.json'
OUTPUT_FILE = 'all_controls_with_scripts_ansible_rhel8_clean.json'

# Helper: ensure starts with subject and active voice

def ensure_subject_and_active(text, script_type=None):
    if not text:
        return text
    text = text.strip()
    # If already starts with 'This script', 'This playbook', 'This plan', etc., return as is
    if re.match(r'^(This (script|playbook|plan|guidance|policy|procedure|control|implementation))', text, re.I):
        return text
    # If it's a script, prepend 'This script'
    if script_type:
        return f"This {script_type.lower()} {text[0].lower() + text[1:] if text[0].isupper() else text}" if not text.lower().startswith('this') else text
    # Otherwise, prepend 'This plan'
    return f"This plan {text[0].lower() + text[1:] if text[0].isupper() else text}" if not text.lower().startswith('this') else text

# Helper: fix common subject-verb agreement issues

def fix_verb_agreement(text):
    # Simple fixes for 'a script disable' -> 'a script disables', etc.
    text = re.sub(r'\bscript disable\b', 'script disables', text, flags=re.I)
    text = re.sub(r'\bscript enable\b', 'script enables', text, flags=re.I)
    text = re.sub(r'\bscript enforce\b', 'script enforces', text, flags=re.I)
    text = re.sub(r'\bscript audit\b', 'script audits', text, flags=re.I)
    text = re.sub(r'\bscript log\b', 'script logs', text, flags=re.I)
    text = re.sub(r'\bscript monitor\b', 'script monitors', text, flags=re.I)
    text = re.sub(r'\bscript set\b', 'script sets', text, flags=re.I)
    text = re.sub(r'\bscript remove\b', 'script removes', text, flags=re.I)
    text = re.sub(r'\bscript create\b', 'script creates', text, flags=re.I)
    text = re.sub(r'\bscript update\b', 'script updates', text, flags=re.I)
    text = re.sub(r'\bscript assign\b', 'script assigns', text, flags=re.I)
    text = re.sub(r'\bscript notify\b', 'script notifies', text, flags=re.I)
    return text

def clean_guidance(text, script_type=None):
    if not text:
        return text
    text = ensure_subject_and_active(text, script_type)
    text = fix_verb_agreement(text)
    return text

def main():
    with open(INPUT_FILE, 'r') as f:
        controls = json.load(f)
    for control in controls:
        # Clean example_implementation
        if 'example_implementation' in control:
            control['example_implementation'] = clean_guidance(control['example_implementation'], script_type='script')
        # Clean non_technical_guidance
        if 'non_technical_guidance' in control:
            control['non_technical_guidance'] = clean_guidance(control['non_technical_guidance'], script_type='plan')
        # Clean script descriptions (if present)
        if 'scripts' in control and control['scripts']:
            for script_type, scripts in control['scripts'].items():
                if isinstance(scripts, list):
                    for script in scripts:
                        if 'description' in script:
                            script['description'] = clean_guidance(script['description'], script_type=script_type)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(controls, f, indent=2)
    print(f"Cleaned implementation guidance written to {OUTPUT_FILE}")

if __name__ == '__main__':
    main() 