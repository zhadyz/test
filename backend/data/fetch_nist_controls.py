import requests
import json

# Endpoint for all NIST 800-53 Rev. 5 controls from csf.tools
API_URL = 'https://api.csf.tools/nist_sp800_53_rev5/control'

# Output file
OUTPUT_FILE = 'all_controls.json'

# Fetch all controls
print('Fetching all controls from csf.tools...')
resp = requests.get(API_URL)
resp.raise_for_status()
controls = resp.json()

mapped_controls = {}

for c in controls:
    control_id = c.get('controlId')
    mapped_controls[control_id] = {
        'control_id': control_id,
        'control_name': c.get('title', ''),
        'official_text': c.get('statement', {}).get('statement', ''),
        'plain_english_explanation': c.get('summary', ''),
        'intent': c.get('purpose', ''),
        'example_implementation': '',  # Placeholder, can be filled by AI or manual
        'common_misinterpretations': '',  # Placeholder
        'supplemental_guidance': c.get('supplementalGuidance', ''),
        'family': c.get('family', ''),
        'baselines': c.get('baselines', []),
        'impact': c.get('impactLevel', ''),
        'enhancements': c.get('enhancements', []),
        'related_controls': c.get('relatedControls', []),
        'external_links': c.get('references', []),
    }

# Write to JSON file
with open(OUTPUT_FILE, 'w') as f:
    json.dump(mapped_controls, f, indent=2)

print(f'Success! {len(mapped_controls)} controls written to {OUTPUT_FILE}') 