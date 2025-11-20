# Implementation Script Templates

Templates for generating NIST control implementation scripts.

## Template Types

### 1. Ansible Templates
- `ansible_base.yml.j2` - Base Ansible playbook template
- `ansible_rhel.yml.j2` - RHEL/CentOS specific template
- `ansible_ubuntu.yml.j2` - Ubuntu/Debian specific template

### 2. PowerShell Templates
- `powershell_base.ps1.j2` - Base PowerShell script template
- `powershell_win_server.ps1.j2` - Windows Server template
- `powershell_audit.ps1.j2` - Audit and compliance checking

### 3. Bash Templates
- `bash_base.sh.j2` - Base shell script template
- `bash_check.sh.j2` - Compliance checking template
- `bash_remediate.sh.j2` - Remediation script template

## Template Variables

All templates support these variables:
- `{control_id}` - Control identifier (e.g., AC-1, AU-2)
- `{control_name}` - Full control name
- `{control_description}` - Control objective/description
- `{baseline}` - Baseline level (LOW, MODERATE, HIGH)
- `{implementation_guidance}` - Specific guidance
- `{parameters}` - Control-specific parameters
- `{platform}` - Target platform (rhel8, ubuntu22, windows2022, etc.)

## Adding New Templates

1. Create template file with `.j2` extension
2. Use Jinja2 syntax for variable substitution
3. Include comprehensive error handling
4. Add logging for audit trails
5. Document new template in this README
