# PHASE 2 MIGRATION CHECKLIST
## AC-2 Single Control Migration - Pre-Flight & Execution

**Control**: AC-2 (Enable auditd Service)
**Date**: 2025-11-10
**Operator**: _____________
**QA Approval**: LOVELESS ✓

---

## PRE-FLIGHT CHECKS

### Environment Validation
- [ ] CAC repository accessible at `C:\Users\eclip\Desktop\cac`
- [ ] Controls catalog exists at `backend/data/controls_catalog.json`
- [ ] Backup directory exists at `backend/data/backups/`
- [ ] Python environment has required modules (jinja2, yaml, pathlib)

### Framework Validation
- [ ] Run: `python test_modules.py` → All 4 tests PASS
- [ ] Run: `python qa_final_report.py` → AC-2 in GREEN list
- [ ] Run: `python catalog_updater.py --validate` → Catalog valid

### AC-2 Status Check
- [ ] Verify AC-2 exists in catalog: `grep -i '"control_id": "ac-2"' backend/data/controls_catalog.json`
- [ ] Check existing scripts: AC-2 does NOT have `migration_source: CAC` metadata
- [ ] Confirm AC-2 safe to overwrite (or user approval obtained)

**Pre-Flight Status**: [ ] PASS - Proceed / [ ] FAIL - Abort

---

## MIGRATION EXECUTION

### Step 1: Create Backup
```bash
cd backend/migration
python -c "
from catalog_updater import CatalogUpdater
updater = CatalogUpdater()
backup = updater._create_backup('pre_ac2_phase2_migration')
print(f'Backup created: {backup}')
"
```

- [ ] Backup file created in `backend/data/backups/`
- [ ] Backup filename recorded: `_________________________`

### Step 2: Extract Control Info
```bash
python -c "
from cac_explorer import CACExplorer
explorer = CACExplorer(r'C:\Users\eclip\Desktop\cac')
control = explorer.get_control_info('ac-2')
print(f'Control ID: {control[\"control_id\"]}')
print(f'Title: {control[\"title\"]}')
print(f'Rules: {control[\"rules\"]}')
print(f'Templates: {list(control[\"templates\"].keys())}')
"
```

- [ ] Control info retrieved successfully
- [ ] bash template path confirmed: `_________________________`
- [ ] ansible template path confirmed: `_________________________`

### Step 3: Render Templates
```bash
python -c "
from template_processor import TemplateProcessor
processor = TemplateProcessor(cac_path=r'C:\Users\eclip\Desktop\cac')

# Render bash
bash_script = processor.render_template(
    r'C:\Users\eclip\Desktop\cac\shared\templates\service_enabled\bash.template',
    variables={'SERVICENAME': 'auditd', 'DAEMONNAME': 'auditd', 'PACKAGENAME': 'audit'},
    product='rhel8'
)
print(f'Bash script length: {len(bash_script)} bytes')
print(f'First line: {bash_script.split(chr(10))[0]}')

# Render ansible
ansible_script = processor.render_template(
    r'C:\Users\eclip\Desktop\cac\shared\templates\service_enabled\ansible.template',
    variables={'SERVICENAME': 'auditd', 'DAEMONNAME': 'auditd', 'rule_title': 'Enable auditd Service'},
    product='rhel8'
)
print(f'Ansible script length: {len(ansible_script)} bytes')
print(f'First line: {ansible_script.split(chr(10))[0]}')
"
```

- [ ] bash script rendered successfully
- [ ] ansible script rendered successfully
- [ ] bash script length: `______` bytes (expected: ~590 bytes)
- [ ] ansible script length: `______` bytes (expected: ~590 bytes)

### Step 4: Validate Rendered Scripts
```bash
python -c "
from template_processor import TemplateProcessor
import re

processor = TemplateProcessor(cac_path=r'C:\Users\eclip\Desktop\cac')

# Render scripts
bash_script = processor.render_template(
    r'C:\Users\eclip\Desktop\cac\shared\templates\service_enabled\bash.template',
    variables={'SERVICENAME': 'auditd', 'DAEMONNAME': 'auditd', 'PACKAGENAME': 'audit'},
    product='rhel8'
)

ansible_script = processor.render_template(
    r'C:\Users\eclip\Desktop\cac\shared\templates\service_enabled\ansible.template',
    variables={'SERVICENAME': 'auditd', 'DAEMONNAME': 'auditd', 'rule_title': 'Enable auditd Service'},
    product='rhel8'
)

# Validation checks
print('Validation Results:')
print(f'  bash validates: {processor.validate_rendered_script(bash_script)}')
print(f'  ansible validates: {processor.validate_rendered_script(ansible_script)}')
print(f'  bash unrendered vars: {len(re.findall(r\"\\{\\{\\{|\\}\\}\\}\", bash_script))}')
print(f'  ansible unrendered vars: {len(re.findall(r\"\\{\\{\\{|\\}\\}\\}\", ansible_script))}')
print(f'  bash has systemctl: {\"systemctl\" in bash_script.lower()}')
print(f'  ansible has service: {\"service\" in ansible_script.lower()}')
"
```

- [ ] bash script validates: True
- [ ] ansible script validates: True
- [ ] bash unrendered vars: 0
- [ ] ansible unrendered vars: 0
- [ ] bash contains systemctl: True
- [ ] ansible contains service module: True

**Validation Status**: [ ] PASS - Proceed / [ ] FAIL - Abort

### Step 5: Update Catalog
```bash
python -c "
from cac_explorer import CACExplorer
from template_processor import TemplateProcessor
from catalog_updater import CatalogUpdater
from datetime import datetime

# Initialize
explorer = CACExplorer(r'C:\Users\eclip\Desktop\cac')
processor = TemplateProcessor(cac_path=r'C:\Users\eclip\Desktop\cac')
updater = CatalogUpdater()

# Get control
control = explorer.get_control_info('ac-2')

# Render scripts
bash_script = processor.render_template(
    control['templates']['bash'],
    variables={'SERVICENAME': 'auditd', 'DAEMONNAME': 'auditd', 'PACKAGENAME': 'audit'},
    product='rhel8'
)

ansible_script = processor.render_template(
    control['templates']['ansible'],
    variables={'SERVICENAME': 'auditd', 'DAEMONNAME': 'auditd', 'rule_title': 'Enable auditd Service'},
    product='rhel8'
)

# Update catalog
success = updater.update_control(
    'ac-2',
    implementation_scripts={
        'linux': {
            'bash': bash_script,
            'ansible': ansible_script
        }
    },
    metadata={
        'migration_source': 'CAC',
        'migration_date': datetime.now().isoformat(),
        'cac_template_type': 'service_enabled',
        'migrated_by': 'LOVELESS_QA_Phase2'
    },
    create_backup=True
)

print(f'Update successful: {success}')
"
```

- [ ] Catalog update completed successfully
- [ ] No exceptions raised
- [ ] Update timestamp: `_________________________`

### Step 6: Post-Migration Verification
```bash
# Verify catalog integrity
python catalog_updater.py --validate
```

- [ ] Catalog validation: PASS

```bash
# Verify AC-2 update
python -c "
import json
with open('backend/data/controls_catalog.json') as f:
    catalog = json.load(f)

ac2 = next((c for c in catalog if c['control_id'] == 'ac-2'), None)

print('AC-2 Verification:')
print(f'  Control found: {ac2 is not None}')
print(f'  Has bash script: {\"bash\" in ac2.get(\"implementation_scripts\", {}).get(\"linux\", {})}')
print(f'  Has ansible script: {\"ansible\" in ac2.get(\"implementation_scripts\", {}).get(\"linux\", {})}')
print(f'  Migration source: {ac2.get(\"metadata\", {}).get(\"migration_source\")}')
print(f'  Migration date: {ac2.get(\"metadata\", {}).get(\"migration_date\")}')
print(f'  bash script length: {len(ac2.get(\"implementation_scripts\", {}).get(\"linux\", {}).get(\"bash\", \"\"))} bytes')
print(f'  ansible script length: {len(ac2.get(\"implementation_scripts\", {}).get(\"linux\", {}).get(\"ansible\", \"\"))} bytes')
"
```

- [ ] AC-2 found in catalog: True
- [ ] AC-2 has bash script: True
- [ ] AC-2 has ansible script: True
- [ ] AC-2 migration_source: 'CAC'
- [ ] AC-2 bash script length: `______` bytes
- [ ] AC-2 ansible script length: `______` bytes

```bash
# Verify control count unchanged
python -c "
import json

# Load pre-migration backup
with open('<backup_file_path>') as f:
    pre_catalog = json.load(f)

# Load current catalog
with open('backend/data/controls_catalog.json') as f:
    post_catalog = json.load(f)

print(f'Pre-migration control count: {len(pre_catalog)}')
print(f'Post-migration control count: {len(post_catalog)}')
print(f'Count unchanged: {len(pre_catalog) == len(post_catalog)}')
"
```

- [ ] Control count unchanged: True

### Step 7: Spot-Check Script Quality
```bash
python -c "
import json
with open('backend/data/controls_catalog.json') as f:
    catalog = json.load(f)

ac2 = next(c for c in catalog if c['control_id'] == 'ac-2')
bash_script = ac2['implementation_scripts']['linux']['bash']

# Quality checks
print('Bash Script Quality Check:')
print(f'  Starts with shebang: {bash_script.startswith(\"#!/bin/bash\")}')
print(f'  Contains SYSTEMCTL_EXEC: {\"SYSTEMCTL_EXEC\" in bash_script}')
print(f'  Contains unmask: {\"unmask\" in bash_script}')
print(f'  Contains enable: {\"enable\" in bash_script}')
print(f'  Contains start: {\"start\" in bash_script}')
print(f'  Contains auditd: {\"auditd\" in bash_script}')
print(f'  No template errors: {\"JINJA TEMPLATE ERROR\" not in bash_script}')
print(f'  No unrendered vars: {\"{{{\" not in bash_script and \"}}}\" not in bash_script}')
"
```

- [ ] Script has shebang: True
- [ ] Script has systemctl commands: True
- [ ] Script has service name (auditd): True
- [ ] No template errors: True
- [ ] No unrendered variables: True

**Post-Migration Status**: [ ] PASS - Complete / [ ] FAIL - Rollback

---

## ROLLBACK PROCEDURE (If Needed)

### If Any Validation FAILS

```bash
# List available backups
python catalog_updater.py --list-backups

# Rollback to pre-migration backup
python catalog_updater.py --rollback <backup_file_path>

# Verify rollback
python catalog_updater.py --validate

# Check AC-2 status
python -c "
import json
with open('backend/data/controls_catalog.json') as f:
    catalog = json.load(f)
ac2 = next(c for c in catalog if c['control_id'] == 'ac-2')
print(f'AC-2 migration_source: {ac2.get(\"metadata\", {}).get(\"migration_source\", \"NOT PRESENT\")}')
"
```

- [ ] Rollback executed
- [ ] Catalog validated post-rollback
- [ ] AC-2 restored to pre-migration state

---

## FINAL SIGN-OFF

### Phase 2 Outcome
- [ ] **SUCCESS** - All validation gates PASSED, migration complete
- [ ] **FAILURE** - Validation failed, rollback executed, investigation required

### Quality Gates Summary
| Gate | Status |
|------|--------|
| Pre-flight checks | [ ] PASS / [ ] FAIL |
| Backup creation | [ ] PASS / [ ] FAIL |
| Template rendering | [ ] PASS / [ ] FAIL |
| Script validation | [ ] PASS / [ ] FAIL |
| Catalog update | [ ] PASS / [ ] FAIL |
| Post-migration verification | [ ] PASS / [ ] FAIL |
| Control count check | [ ] PASS / [ ] FAIL |
| Script quality check | [ ] PASS / [ ] FAIL |

**Total Gates PASSED**: ______ / 8

### Sign-Off
- [ ] Operator confirms all steps completed
- [ ] QA confirms validation gates PASSED
- [ ] Backup confirmed and labeled
- [ ] Catalog integrity verified
- [ ] Ready for Phase 3 (if Phase 2 successful)

**Operator Signature**: _________________ Date: _________

**QA Approval**: LOVELESS (Elite QA Specialist) Date: 2025-11-10

---

## NEXT STEPS (If Phase 2 Successful)

1. Document lessons learned
2. Review Phase 2 execution time
3. Implement Phase 1 macros (if proceeding to comprehensive migration)
4. Plan Phase 3 batch migration (AC-2 + AC-18)

---

**END OF CHECKLIST**
