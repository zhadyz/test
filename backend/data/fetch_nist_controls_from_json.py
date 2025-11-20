import requests
import json

# Official NIST 800-53 Rev. 5 JSON URL
NIST_JSON_URL = 'https://raw.githubusercontent.com/usnistgov/oscal-content/master/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json'
OUTPUT_FILE = 'all_controls.json'

print('Downloading NIST 800-53 Rev. 5 JSON...')
resp = requests.get(NIST_JSON_URL)
resp.raise_for_status()
data = resp.json()

controls = data['catalog']['groups']

mapped_controls = {}

for group in controls:
    for c in group.get('controls', []):
        control_id = c.get('id')
        mapped_controls[control_id] = {
            'control_id': control_id,
            'control_name': c.get('title', ''),
            'official_text': c.get('parts', [{}])[0].get('prose', ''),
            'supplemental_guidance': '',
            'enhancements': [],
            'family': group.get('title', ''),
            'related_controls': [],
            'external_links': [],
        }
        # Supplemental guidance
        for part in c.get('parts', []):
            if part.get('name') == 'supplemental-guidance':
                mapped_controls[control_id]['supplemental_guidance'] = part.get('prose', '')
        # Enhancements
        for eh in c.get('controls', []):
            mapped_controls[control_id]['enhancements'].append({
                'id': eh.get('id'),
                'title': eh.get('title', ''),
                'official_text': eh.get('parts', [{}])[0].get('prose', ''),
            })

# Write to JSON file
with open(OUTPUT_FILE, 'w') as f:
    json.dump(mapped_controls, f, indent=2)

print(f'Success! {len(mapped_controls)} controls written to {OUTPUT_FILE}') 