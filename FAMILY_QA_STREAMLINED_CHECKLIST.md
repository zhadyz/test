# Control Family QA - Streamlined Checklist
**Status:** Production-Ready Process (Validated with AC Family)

---

## 🎯 Overview
This checklist ensures error-free QA for all 20 NIST control families. Each family follows the same proven workflow.

**Remaining Families:** 19 (AU, IA, CM, SI, SC, etc.)
**Reference Implementation:** AC (Access Control) - 145 controls ✅

---

## ✅ PRE-FLIGHT CHECKLIST

### 1. Environment Verification
- [ ] Backend running on port 8001
- [ ] Frontend running (any available port 517x)
- [ ] Modular architecture in place: `backend/data/controls/*.json`
- [ ] `_index.json` exists in controls directory
- [ ] No stuck Python/Node processes (check with `netstat` if issues)

### 2. Data Validation
```bash
# Verify backend loads modular files
curl http://localhost:8001/api/controls | python -c "import sys, json; print(f\"Total: {len(json.load(sys.stdin))}\")"
# Should return: Total: 1194
```

### 3. Family Selection
- [ ] Choose family code (e.g., AU, IA, CM)
- [ ] Count existing controls in `backend/data/controls/{FAMILY}.json`
- [ ] Identify control range (e.g., AU-1 through AU-12)
- [ ] Check CONTROL_FAMILY_QA_PLAYBOOK.md for family details

---

## 🚀 DEPLOYMENT CHECKLIST

### Step 0: Choose Your Approach (IMPORTANT!)

**Check family size first:**
```bash
python -c "import json; d=json.load(open('backend/data/controls/{FAMILY}.json')); print(f'Controls: {len(d)}')"
```

| Family Size | Recommended Approach |
|-------------|---------------------|
| **<50 controls** | Spawn parallel agents (Step 1A) |
| **50-100 controls** | Python script preferred (Step 1B) |
| **>100 controls** (SI, SC, SA) | **Always use Python script** (Step 1B) |

**Why?** Agents hit Claude's 32k output token limit. Large families with many enhancements (e.g., SI-4 has 25 enhancements) cause agents to fail with:
```
API Error: Claude's response exceeded the 32000 output token maximum
```

---

### Step 1A: Agent Spawn (For Small Families <50 controls)
```markdown
Spawn loveless agents for {FAMILY} family QA. Each agent must:

**Agent Naming:** loveless-{FAMILY}-{NUMBER} (e.g., loveless-AU-1, loveless-AU-2)

**Scope per agent:** One base control + all enhancements
- loveless-AU-1: AU-1, AU-1.1, AU-1.2, etc.
- loveless-AU-2: AU-2, AU-2.1, AU-2.2, etc.
...

**Output:** Fixed JSON file at backend/data/controls/fixed/{FAMILY}-{NUMBER}.json

**Requirements:**
1. Ground all data in NIST SP 800-53 Rev 5 official documentation
2. Cross-reference ComplianceAsCode (github.com/ComplianceAsCode/content) for RHEL 8 STIG mappings
3. Add technical implementation_scripts (Linux: bash + ansible, Windows: powershell + ansible)
4. Zero tolerance for hallucinations - mark as "not_applicable" if no valid automation exists
5. Include: plain_english_explanation, intent, ai_guidance, implementation_guidance
6. Preserve existing fields (control_id, control_name, official_text, family, etc.)
7. Add top-level stig_id field (not nested in metadata)

**Agent Execution:**
- Write fixed JSON directly to file (no markdown reports)
- Validate JSON syntax before writing
- Exit after file creation
```

**Critical:** All agents in ONE message for parallel execution!

- [ ] Spawned all agents in single message
- [ ] Verified agent count matches family size (usually 10-25 controls)

---

### Step 1B: Python Enhancement Script (For Large Families 50+ controls)

For large families, create a local Python script instead of spawning agents:

```python
#!/usr/bin/env python3
"""enhance_{family}_controls.py - Template for large family enhancement"""
import json
from pathlib import Path

# 1. Define enhancement structure (which base controls have which enhancements)
ENHANCEMENTS = {
    "{FAMILY}-1": [],
    "{FAMILY}-2": ["{FAMILY}-2.1", "{FAMILY}-2.2", "{FAMILY}-2.3"],
    # ... etc
}

# 2. Define STIG mappings from ComplianceAsCode
STIG_MAPPINGS = {
    "{FAMILY}-2": ["RHEL-08-XXXXXX"],
    # ... etc
}

# 3. Define implementation scripts for key technical controls
SCRIPTS = {
    "{FAMILY}-2": {
        "linux": {"bash": "#!/bin/bash\n...", "ansible": "---\n..."},
        "windows": {"powershell": "# ...", "ansible": "---\n..."}
    }
}

# 4. Define AI guidance per control
AI_GUIDANCE = {
    "{FAMILY}-1": "500+ char guidance...",
    # ... etc
}

# 5. Generate controls and write to JSON
# See enhance_si_controls.py for full implementation
```

**Reference implementation:** `enhance_si_controls.py`

**Checklist:**
- [ ] Created `enhance_{family}_controls.py`
- [ ] Defined all enhancements for each base control
- [ ] Added STIG mappings (check ComplianceAsCode)
- [ ] Added implementation scripts for technical controls
- [ ] Added AI guidance (500+ chars per control)
- [ ] Ran script: `python enhance_{family}_controls.py`
- [ ] Verified output: control count, UPPERCASE IDs, no duplicates

**Skip to Step 4** after running the script (no merge needed).

---

### Step 2: Monitor Agent Progress (Step 1A only)
- [ ] Check agent completion (look for "Task completed" or file creation confirmations)
- [ ] Spot-check 2-3 agent outputs for quality:
  ```bash
  cat backend/data/controls/fixed/{FAMILY}-5.json | python -c "import sys, json; c=json.load(sys.stdin); print(f\"Control: {c.get('control_id')}\nHas scripts: {bool(c.get('implementation_scripts'))}\nHas STIG: {bool(c.get('stig_id'))}\")"
  ```

---

## 🔧 MERGE & VALIDATION CHECKLIST

### Step 3: Create Merge Script
```python
#!/usr/bin/env python3
"""Merge {FAMILY} family agent outputs into {FAMILY}.json"""
import json
from pathlib import Path
import re

# Natural sorting function
def natural_sort_key(control_id):
    parts = re.split(r'[-.]', control_id.upper())
    result = []
    for part in parts:
        if part.isdigit():
            result.append((0, int(part)))
        else:
            result.append((1, part))
    return result

# Load all fixed files
fixed_dir = Path("backend/data/controls/fixed")
family_code = "{FAMILY}"  # e.g., "AU"

controls = []
for file in sorted(fixed_dir.glob(f"{family_code}-*.json")):
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)

        # Handle various agent output formats
        if isinstance(data, list):
            controls.extend(data)
        elif isinstance(data, dict):
            if 'controls' in data:
                controls.extend(data['controls'])
            elif 'control_id' in data:
                controls.append(data)
            else:
                # Check for nested control key
                for key in data:
                    if isinstance(data[key], dict) and 'control_id' in data[key]:
                        controls.append(data[key])
                        break

# Deduplicate and normalize
unique_controls = {}
for control in controls:
    control_id = control.get('control_id', '').upper()
    if not control_id:
        continue

    # Keep larger version (more complete)
    if control_id in unique_controls:
        existing_size = len(json.dumps(unique_controls[control_id]))
        new_size = len(json.dumps(control))
        if new_size > existing_size:
            unique_controls[control_id] = control
    else:
        unique_controls[control_id] = control

# Sort naturally
all_controls = list(unique_controls.values())
all_controls.sort(key=lambda x: natural_sort_key(x.get("control_id", "")))

# Write to family file
output_file = Path(f"backend/data/controls/{family_code}.json")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_controls, f, indent=2, ensure_ascii=False)

print(f"✅ Merged {len(all_controls)} {family_code} controls")
print(f"📁 Written to: {output_file}")
```

- [ ] Created merge script `merge_{family}_controls.py`
- [ ] Executed merge script
- [ ] Verified output count matches expected (no duplicates)

### Step 4: Validation Checks
```bash
# Check merged file
python -c "
import json
from pathlib import Path

family = '{FAMILY}'
controls = json.load(open(f'backend/data/controls/{family}.json'))

print(f'Total {family} controls: {len(controls)}')

# Verify all have required fields
missing_impl = [c['control_id'] for c in controls if not c.get('implementation_scripts')]
missing_stig = [c['control_id'] for c in controls if c.get('is_technical') and not c.get('stig_id')]

print(f'Missing implementation_scripts: {len(missing_impl)}')
print(f'Technical controls missing STIG: {len(missing_stig)}')

# Sample check
sample = controls[5] if len(controls) > 5 else controls[0]
print(f'\nSample control: {sample[\"control_id\"]}')
print(f'  Has implementation_scripts: {bool(sample.get(\"implementation_scripts\"))}')
print(f'  Has stig_id: {bool(sample.get(\"stig_id\"))}')
print(f'  Has ai_guidance: {bool(sample.get(\"ai_guidance\"))}')
"
```

- [ ] All controls have control_id
- [ ] Technical controls have implementation_scripts
- [ ] Technical controls have stig_id (top-level)
- [ ] All controls have plain_english_explanation
- [ ] Natural sorting verified (check first 10 IDs)

---

## 🔄 RELOAD & VERIFICATION CHECKLIST

### Step 5: Backend Reload
```bash
# Check if backend needs restart
curl http://localhost:8001/api/controls | python -c "
import json, sys
controls = json.load(sys.stdin)
family_controls = [c for c in controls if c.get('control_id', '').startswith('{FAMILY}-')]
print(f'{FAMILY} controls in API: {len(family_controls)}')
"
```

- [ ] If count doesn't match merged file, restart backend:
  ```bash
  # Kill backend (find PID with netstat or tasklist)
  taskkill /F /PID <backend_pid>

  # Restart
  cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
  ```
- [ ] Verify backend logs show: "Loaded X controls from {FAMILY}.json"
- [ ] Confirm API returns updated count

### Step 6: Frontend Verification

**CRITICAL:** Frontend loads enhancements from API, not static files!

#### Test Process:
1. Navigate to frontend URL (check console for port)
2. Hard refresh (Ctrl+F5)
3. Open browser console (F12)
4. Click on any {FAMILY} control with enhancements

#### Expected Console Output:
```
[DEBUG] getControlPlatformImplementation called for: {FAMILY}-2.1
[DEBUG] newFormatScripts: true oldFormatScripts: false
[DEBUG] Processing scripts...
[DEBUG] New format detected, checking platforms...
[DEBUG] Linux object exists: {...}
[DEBUG] Adding Ansible platform
[DEBUG] Adding Linux/Bash platform
[DEBUG] Final platforms: ['Ansible', 'Linux', 'Windows'] returning: platforms object
```

#### Visual Checks:
- [ ] **Technical controls show platform tabs** (Linux, Ansible, Windows)
  - NOT "Organizational Control" message
- [ ] **STIG IDs visible** in enhancement cards
- [ ] **Scripts render correctly** when clicking tabs
- [ ] **AI Guidance boxes display** for enhancements
- [ ] **Enhancements sorted naturally** (not lexicographically)

#### Test Cases (Sample at least 3):
- [ ] {FAMILY}-2 (base control with enhancements)
- [ ] {FAMILY}-2.1 (enhancement with Linux scripts)
- [ ] {FAMILY}-2.4 (enhancement with Windows scripts)

### Step 7: Spot-Check Data Quality
```bash
# Test a specific control
curl http://localhost:8001/api/control/{FAMILY}-2.1 | python -c "
import json, sys
c = json.load(sys.stdin)
print(f'Control: {c[\"control_id\"]}')
print(f'STIG ID: {c.get(\"stig_id\", \"MISSING\")}')
print(f'Has bash: {bool(c.get(\"implementation_scripts\", {}).get(\"linux\", {}).get(\"bash\"))}')
print(f'Has ansible: {bool(c.get(\"implementation_scripts\", {}).get(\"linux\", {}).get(\"ansible\"))}')
print(f'AI Guidance length: {len(c.get(\"ai_guidance\", \"\"))} chars')
"
```

- [ ] Verify 3-5 random controls have all expected fields
- [ ] Check script quality (no placeholder/dummy text)
- [ ] Validate STIG IDs match official mappings (spot-check ComplianceAsCode repo)

---

## 📝 COMMIT CHECKLIST

### Step 8: Git Commit
```bash
git status
# Should show:
#   modified: backend/data/controls/{FAMILY}.json
#   new: backend/data/controls/fixed/{FAMILY}-*.json (optional to commit)
#   modified: backend/data/controls/_index.json (if updated)

git add backend/data/controls/{FAMILY}.json backend/data/controls/_index.json

git commit -m "Complete {FAMILY} family QA - {COUNT} controls

- Added technical implementation scripts (bash, ansible, powershell)
- Mapped STIG IDs from ComplianceAsCode
- Enhanced with AI guidance and plain English explanations
- Validated NIST SP 800-53 Rev 5 alignment

Controls: {FAMILY}-1 through {FAMILY}-{MAX}
Agent count: {AGENT_COUNT}
Quality: Zero hallucinations, all sources verified

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
"
```

- [ ] Commit includes only necessary files
- [ ] Commit message documents control range and agent count
- [ ] No debug files or temporary scripts committed (unless intended)

---

## 🚨 TROUBLESHOOTING CHECKLIST

### Issue: "Organizational Control" Still Showing
**Root Cause:** Frontend using static enhancementsMap instead of API data

**Fix:**
1. Verify `ControlDetails.jsx` receives `allControls` prop
2. Check `apiEnhancements` filter is used instead of `enhancementsMap`
3. Confirm `ControlCard.jsx` and `ControlExplorer.jsx` pass `allControls`
4. Hard refresh browser (Ctrl+F5) to clear cached JavaScript

### Issue: Enhancements Not Showing
**Root Cause:** Enhancement control_id format mismatch

**Debug:**
```javascript
// In browser console
const control = /* current control object */;
const enhancements = allControls.filter(c => {
  const parts = c.control_id.split('.');
  return parts.length > 1 && parts[0] === control.control_id;
});
console.log('Found enhancements:', enhancements.length, enhancements.map(e => e.control_id));
```

**Fix:** Ensure control_ids follow format: {FAMILY}-{NUM}.{ENHANCEMENT} (e.g., AU-2.1, not au-2.1 or AU-2-1)

### Issue: STIG IDs Not Visible
**Root Cause:** STIG ID nested in metadata instead of top-level

**Fix:** Run STIG ID migration:
```python
for control in controls:
    if 'metadata' in control and 'stig_id' in control['metadata']:
        control['stig_id'] = control['metadata']['stig_id']
```

### Issue: Backend Not Loading New Data
**Symptoms:** API returns old control count or missing fields

**Fix:**
1. Check backend console for "Loading controls from modular directory"
2. Restart backend with `--reload` flag
3. Verify file timestamp on {FAMILY}.json is recent
4. Clear any caching (Redis, etc.) if applicable

---

## 📊 QUALITY METRICS

Track these for each family:

- **Coverage:** % controls with implementation_scripts
- **STIG Mapping:** % technical controls with stig_id
- **AI Enhancement:** % controls with ai_guidance
- **Source Verification:** 100% (zero hallucinations)
- **Frontend Display:** 100% (all technical controls show scripts)

**AC Family Baseline:**
- Coverage: 100% (145/145 controls)
- STIG Mapping: ~19% (27/145 - RHEL 8 applicable controls)
- AI Enhancement: 100%
- Source Verification: 100%
- Frontend Display: 100% ✅

---

## 🎯 SUCCESS CRITERIA

A family QA is complete when:

1. ✅ All controls merged into `backend/data/controls/{FAMILY}.json`
2. ✅ Backend API serves updated data (verified with curl)
3. ✅ Frontend displays technical controls with script tabs (NO "Organizational Control" for technical)
4. ✅ STIG IDs visible in UI for all applicable controls
5. ✅ Console debug logs show platforms detected correctly
6. ✅ Natural sorting working (not lexicographic)
7. ✅ No duplicate controls
8. ✅ Git commit created with detailed message

---

## 🔄 NEXT FAMILY CHECKLIST

Before starting next family:

- [ ] Review this checklist for any updates needed
- [ ] Clean up `backend/data/controls/fixed/` directory (archive or delete)
- [ ] Update `_index.json` if family was added/modified
- [ ] Document any new issues in troubleshooting section
- [ ] Celebrate! 🎉 (One family down, X remaining)

---

## 📚 REFERENCE DOCS

- **NIST SP 800-53 Rev 5:** https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- **ComplianceAsCode:** https://github.com/ComplianceAsCode/content
- **Control Family Details:** CONTROL_FAMILY_QA_PLAYBOOK.md
- **Architecture Summary:** MODULAR_ARCHITECTURE_SUMMARY.md
- **Verification Report:** VERIFICATION_REPORT.md

---

**Last Updated:** 2025-11-20
**Validated With:** AC (Access Control) - 145 controls
**Next Target:** AU (Audit & Accountability) - 69 controls
