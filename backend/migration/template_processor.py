#!/usr/bin/env python
"""
Template Processor Module

This module handles rendering of Jinja2 templates from the ComplianceAsCode
repository into executable implementation scripts (bash, ansible, etc.).

CAC templates use Jinja2 syntax with custom macros and variables. This module
provides the necessary context and rendering capabilities to generate valid
scripts from these templates.

Usage:
    from template_processor import TemplateProcessor

    processor = TemplateProcessor()

    # Render a template
    script = processor.render_template("/path/to/bash.template")

    # Render with custom variables
    script = processor.render_template(
        "/path/to/bash.template",
        variables={'CONTROL_ID': 'ac-2', 'custom_var': 'value'}
    )

    # Get default variables for a product
    defaults = processor.get_default_variables(product="rhel8")

    # Validate rendered script
    is_valid = processor.validate_rendered_script(script)
"""

import os
import re
import logging
from pathlib import Path
from typing import Dict, Optional, Any
from jinja2 import Environment, FileSystemLoader, Template, TemplateError


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class TemplateProcessor:
    """
    Processor for CAC Jinja2 templates.

    Renders ComplianceAsCode templates with appropriate variable substitution
    and validation. Handles CAC-specific macros and conventions.

    Attributes:
        cac_path (Path): Path to CAC repository
        env (Environment): Jinja2 environment with CAC macros loaded
    """

    def __init__(self, cac_path: Optional[str] = None):
        """
        Initialize Template Processor.

        Args:
            cac_path: Path to CAC repository (default: auto-detect)
        """
        if cac_path:
            self.cac_path = Path(cac_path)
        else:
            # Auto-detect CAC path relative to this file
            self.cac_path = Path(__file__).parents[2] / "cac"

        if not self.cac_path.exists():
            logger.warning(f"CAC path not found: {self.cac_path}")
            self.cac_path = None

        # Initialize Jinja2 environment
        self.env = self._setup_jinja_environment()

        logger.info("Template Processor initialized")

    def _setup_jinja_environment(self) -> Environment:
        """
        Set up Jinja2 environment with CAC-specific configuration.

        Returns:
            Configured Jinja2 Environment
        """
        # Create environment with special delimiters for CAC templates
        env = Environment(
            # CAC uses {{{ }}} for variables
            variable_start_string='{{{',
            variable_end_string='}}}',
            # Standard Jinja2 block delimiters
            block_start_string='{%',
            block_end_string='%}',
            # Comment delimiters
            comment_start_string='{#',
            comment_end_string='#}',
            # Other settings
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True,
        )

        # Get CAC macros
        macros = self._get_cac_macros()

        # Add CAC filters
        env.filters['replace'] = str.replace
        env.filters['escape_regex'] = macros['escape_regex']

        # Add CAC macros as globals
        env.globals.update(macros)

        return env

    def _get_cac_macros(self) -> Dict[str, Any]:
        """
        Get CAC-specific macro implementations.

        CAC templates use custom macros like describe_service_enable(),
        fixtext_service_enabled(), etc. We provide simplified versions
        that generate the key content without full CAC build system.

        Returns:
            Dictionary of macro name to implementation
        """
        def describe_service_enable(service):
            """Macro: describe_service_enable"""
            return f"The {service} service should be enabled."

        def ocil_service_enabled(service):
            """Macro: ocil_service_enabled"""
            return f"Verify that the {service} service is enabled and running."

        def fixtext_service_enabled(service):
            """Macro: fixtext_service_enabled"""
            return f"Enable and start the {service} service."

        def srg_requirement_service_enabled(service):
            """Macro: srg_requirement_service_enabled"""
            return f"The {service} service must be enabled."

        def escape_regex(text):
            """Filter: escape_regex - Escape special characters for regex"""
            return re.sub(r"([#$&*+.^`|~:()\[\]-])", r"\\\1", str(text))

        def die(message, rc=1, action="exit"):
            """Macro: die - Print error and exit"""
            escaped_msg = str(message).replace('"', '\\"')
            return f'printf \'%s\\n\' "{escaped_msg}" >&2\n{action} {rc}'

        def bash_instantiate_variables(*varargs):
            """Macro: bash_instantiate_variables - Load XCCDF variables"""
            result = []
            for name in varargs:
                result.append(f"{name}='(bash-populate {name})'")
            return '\n'.join(result)

        def ansible_instantiate_variables(*varargs):
            """Macro: ansible_instantiate_variables - Load XCCDF variables"""
            result = []
            for name in varargs:
                result.append(f"- (xccdf-var {name})")
            return '\n'.join(result)

        def lineinfile_absent(path, regex, insensitive=True, sed_path_separator="/", rule_id=None):
            """Macro: lineinfile_absent - Remove lines matching regex"""
            modifier = "Id" if insensitive else "d"
            if sed_path_separator in regex:
                raise ValueError(f"regex ({regex}) uses sed path separator ({sed_path_separator}) in {rule_id}")
            return f'LC_ALL=C sed -i "{sed_path_separator}{regex}{sed_path_separator}{modifier}" "{path}"'

        def lineinfile_present(path, line, insert_after="", insert_before="", insensitive=True, sed_path_separator="/"):
            """Macro: lineinfile_present - Ensure line is present in file"""
            grep_args = "-q -m 1 -i" if insensitive else "-q -m 1"

            script = f'''# make sure file has newline at the end
sed -i -e '$a\\' "{path}"

cp "{path}" "{path}.bak"'''

            if not insert_after and not insert_before or insert_after == "EOF":
                script += f'''
# Insert at the end of the file
printf '%s\\n' "{line}" >> "{path}"'''
            elif insert_before == "BOF":
                script += f'''
# Insert at the beginning of the file
printf '%s\\n' "{line}" > "{path}"
cat "{path}.bak" >> "{path}"'''
            elif insert_after:
                script += f'''
# Insert after the line matching the regex '{insert_after}'
line_number="$(LC_ALL=C grep -n "{insert_after}" "{path}.bak" | LC_ALL=C sed 's{sed_path_separator}:.*{sed_path_separator}{sed_path_separator}g')"
if [ -z "$line_number" ]; then
    # There was no match of '{insert_after}', insert at
    # the end of the file.
    printf '%s\\n' "{line}" >> "{path}"
else
    head -n "$(( line_number ))" "{path}.bak" > "{path}"
    printf '%s\\n' "{line}" >> "{path}"
    tail -n "+$(( line_number + 1 ))" "{path}.bak" >> "{path}"
fi'''
            elif insert_before:
                script += f'''
# Insert before the line matching the regex '{insert_before}'.
line_number="$(LC_ALL=C grep -n "{insert_before}" "{path}.bak" | LC_ALL=C sed 's{sed_path_separator}:.*{sed_path_separator}{sed_path_separator}g')"
if [ -z "$line_number" ]; then
    # There was no match of '{insert_before}', insert at
    # the end of the file.
    printf '%s\\n' "{line}" >> "{path}"
else
    head -n "$(( line_number - 1 ))" "{path}.bak" > "{path}"
    printf '%s\\n' "{line}" >> "{path}"
    tail -n "+$(( line_number ))" "{path}.bak" >> "{path}"
fi'''
            else:
                script += f'''
{die("This remediation has been generated incorrectly.")}'''

            script += f'''
# Clean up after ourselves.
rm "{path}.bak"'''
            return script

        def set_config_file(path, parameter, value, create, insert_after="", insert_before="",
                          insensitive=True, separator=" ", separator_regex="\\s\\+",
                          prefix_regex="^\\s*", sed_path_separator="/", rule_id=None):
            """Macro: set_config_file - Set configuration parameter in file"""
            new_line = parameter + separator + str(value)
            # Remove shell escape from parameter for regex
            param_for_regex = str(parameter).replace("\\$", "$")
            line_regex = prefix_regex + escape_regex(param_for_regex).replace("/", "\\/") + separator_regex

            script = f'''if [ -e "{path}" ] ; then
    {lineinfile_absent(path, line_regex, insensitive, sed_path_separator=sed_path_separator, rule_id=rule_id)}
else'''
            if create:
                script += f'''
    touch "{path}"'''
            else:
                script += f'''
    {die(f"Path '{path}' wasn't found on this system. Refusing to continue.", action="return")}'''
            script += f'''
fi
{lineinfile_present(path, new_line, insert_after, insert_before, insensitive, sed_path_separator=sed_path_separator)}'''
            return script

        def ansible_lineinfile(msg='', path='', mode='', regex='', insensitive='false',
                             new_line='', create='no', state='present', with_items='',
                             register='', when='', validate='', insert_after='',
                             insert_before='', check_mode=False, rule_title=None):
            """Macro: ansible_lineinfile - Ansible lineinfile task"""
            task = f'''- name: "{msg or rule_title}"
  ansible.builtin.lineinfile:
    path: '{path}'
    create: {create}'''

            if regex:
                if insensitive == 'true':
                    task += f"\n    regexp: '(?i){regex}'"
                else:
                    task += f"\n    regexp: '{regex}'"

            if mode:
                task += f"\n    mode: '{mode}'"

            if state == 'present':
                task += f"\n    line: '{new_line}'"
                task += f"\n    state: present"
                if insert_after:
                    task += f"\n    insertafter: '{insert_after}'"
                elif insert_before:
                    task += f"\n    insertbefore: '{insert_before}'"
            else:
                task += f"\n    state: '{state}'"

            if validate:
                task += f"\n    validate: '{validate}'"

            if with_items:
                task += f"\n  with_items: '{with_items}'"

            if check_mode:
                task += "\n  check_mode: yes\n  changed_when: no"

            if register:
                task += f"\n  register: '{register}'"

            if when:
                task += f"\n  when: '{when}'"

            return task

        def ansible_only_lineinfile(msg, path, line_regex, new_line, insensitive='false',
                                   create='no', block=False, validate='', insert_after='',
                                   insert_before='', mode='', register='', rule_title=None):
            """Macro: ansible_only_lineinfile - Ensure unique line in file"""
            if block:
                # Generate the three lineinfile tasks
                task1 = ansible_lineinfile("Check for duplicate values", path, mode=mode, regex=line_regex, insensitive=insensitive, create=create, state='absent', register='dupes', check_mode=True)
                task2 = ansible_lineinfile("Deduplicate values from " + path, path, mode=mode, regex=line_regex, insensitive=insensitive, create=create, state='absent', when='dupes.found is defined and dupes.found > 1')
                task3 = ansible_lineinfile("Insert correct line to " + path, path, mode=mode, regex=line_regex, insensitive=insensitive, new_line=new_line, create=create, state='present', validate=validate, insert_after=insert_after, insert_before=insert_before, register=register)

                # Indent each task by 4 spaces for block
                task1_indented = '\n'.join('    ' + line for line in task1.split('\n'))
                task2_indented = '\n'.join('    ' + line for line in task2.split('\n'))
                task3_indented = '\n'.join('    ' + line for line in task3.split('\n'))

                result = f'''- name: "{msg or rule_title}"
  block:
{task1_indented}
{task2_indented}
{task3_indented}'''
                return result
            else:
                tasks = []
                tasks.append(ansible_lineinfile("Check for duplicate values", path, mode=mode, regex=line_regex, insensitive=insensitive, create=create, state='absent', register='dupes', check_mode=True, rule_title=rule_title))
                tasks.append(ansible_lineinfile("Deduplicate values from " + path, path, mode=mode, regex=line_regex, insensitive=insensitive, create=create, state='absent', when='dupes.found is defined and dupes.found > 1', rule_title=rule_title))
                tasks.append(ansible_lineinfile("Insert correct line into " + path, path, mode=mode, regex=line_regex, insensitive=insensitive, new_line=new_line, create=create, state='present', validate=validate, insert_after=insert_after, insert_before=insert_before, rule_title=rule_title, register=register))
                return '\n'.join(tasks)

        def ansible_set_config_file(msg, file, parameter, separator=' ', separator_regex='\\s+',
                                   value='', prefix_regex='^\\s*', insensitive='false',
                                   create='no', validate='', insert_after='', insert_before='',
                                   mode='', register='', rule_title=None):
            """Macro: ansible_set_config_file - Set config parameter in file"""
            line_regex = prefix_regex + parameter + separator_regex
            new_line = parameter + separator + value
            return ansible_only_lineinfile(msg, file, line_regex, new_line, insensitive=insensitive,
                                         create=create, block=True, validate=validate,
                                         insert_after=insert_after, insert_before=insert_before,
                                         mode=mode, register=register, rule_title=rule_title)

        def bash_package_install(package, pkg_manager=None, product=None):
            """
            Macro: bash_package_install - Install a package using the appropriate package manager

            Generates bash code to install a package using the right command based on pkg_manager
            property defined in product.yml. Checks if package is already installed first.

            Args:
                package: Name of the package to install
                pkg_manager: Package manager (yum, dnf, apt_get, zypper)
                product: Product identifier (used if pkg_manager not specified)

            Returns:
                Bash code to install the package

            Raises:
                ValueError: If pkg_manager is not defined or not supported
            """
            if not pkg_manager and not product:
                return die("Can't generate a remediation for product {}, because there is no pkg_manager set in product.yml".format(product or "unknown"))

            # Auto-detect pkg_manager from product if not specified
            if not pkg_manager and product:
                if 'rhel' in product.lower() or 'fedora' in product.lower():
                    pkg_manager = 'dnf'
                elif 'ubuntu' in product.lower() or 'debian' in product.lower():
                    pkg_manager = 'apt_get'
                elif 'suse' in product.lower():
                    pkg_manager = 'zypper'

            if pkg_manager in ['yum', 'dnf']:
                return f'''if ! rpm -q --quiet "{package}" ; then
    {pkg_manager} install -y "{package}"
fi'''
            elif pkg_manager == 'apt_get':
                return f'DEBIAN_FRONTEND=noninteractive apt-get install -y "{package}"'
            elif pkg_manager == 'zypper':
                return f'zypper install -y "{package}"'
            else:
                return die("Can't generate a remediation for " + str(pkg_manager))

        def bash_bootc_build(pkg_system=None):
            """
            Macro: bash_bootc_build - Check if running in bootable container build environment

            Defines a conditional expression that evaluates to true if the remediation is
            performed during a build of a bootable container image. This checks for the
            presence of specific packages (kernel, rpm-ostree, bootc) and containerenv files.

            Args:
                pkg_system: Package system type (rpm or other)

            Returns:
                Bash conditional expression
            """
            if pkg_system == 'rpm' or not pkg_system:
                return '{ rpm --quiet -q kernel rpm-ostree bootc && ! rpm --quiet -q openshift-kubelet && { [ -f "/run/.containerenv" ] || [ -f "/.containerenv" ]; }; }'
            else:
                return '/bin/false'

        def bash_not_bootc_build(pkg_system=None):
            """
            Macro: bash_not_bootc_build - Check if NOT running in bootable container build

            Defines a conditional expression that evaluates to true if the remediation is
            NOT performed during a build of a bootable container image. This is the negation
            of bash_bootc_build().

            Args:
                pkg_system: Package system type (rpm or other)

            Returns:
                Bash conditional expression (negated bootc_build check)
            """
            return '! ' + bash_bootc_build(pkg_system)

        def bash_fix_audit_syscall_rule(tool, action_arch_filters, other_filters, auid_filters,
                                        syscall, syscall_groupings, key):
            """
            Macro: bash_fix_audit_syscall_rule - Generate complex audit syscall rule remediation

            Creates bash code to add or update audit syscall rules in the appropriate audit
            configuration file. Handles both auditctl and augenrules tools, checks for existing
            rules, groups syscalls when possible, and ensures proper permissions.

            This is a complex macro (~400+ lines) that implements sophisticated logic for:
            - Determining which audit file to modify based on tool (auditctl vs augenrules)
            - Searching for existing similar rules
            - Grouping related syscalls together
            - Appending new rules or updating existing ones

            Args:
                tool: Audit tool to use ('auditctl' or 'augenrules')
                action_arch_filters: Action and arch filters (e.g., "-a always,exit -F arch=b64")
                other_filters: Additional filters (e.g., "-F a2&03 -F path=/etc/passwd")
                auid_filters: AUID filters (e.g., "-F auid>=1000 -F auid!=unset")
                syscall: Space-separated list of syscalls to monitor
                syscall_groupings: Space-separated list of syscalls that can be grouped together
                key: Audit key/identifier for the rule

            Returns:
                Bash script to configure audit syscall rule
            """
            script = f'''
unset syscall_a
unset syscall_grouping
unset syscall_string
unset syscall
unset file_to_edit
unset rule_to_edit
unset rule_syscalls_to_edit
unset other_string
unset auid_string
unset full_rule

# Load macro arguments into arrays
read -a syscall_a <<< {syscall}
read -a syscall_grouping <<< {syscall_groupings}

# Create a list of audit *.rules files that should be inspected for presence and correctness
# of a particular audit rule. The scheme is as follows:
#
# -----------------------------------------------------------------------------------------
#  Tool used to load audit rules | Rule already defined  |  Audit rules file to inspect    |
# -----------------------------------------------------------------------------------------
#        auditctl                |     Doesn't matter    |  /etc/audit/audit.rules         |
# -----------------------------------------------------------------------------------------
#        augenrules              |          Yes          |  /etc/audit/rules.d/*.rules     |
#        augenrules              |          No           |  /etc/audit/rules.d/$key.rules  |
# -----------------------------------------------------------------------------------------
#
files_to_inspect=()
'''

            # Escape the filters for sed - replace / with \/ for sed delimiter
            # Initialize this outside the if/else to ensure it's always defined
            other_filters_escaped = other_filters.replace('/', '\\/')

            if tool == "auditctl":
                script += f'''
# If audit tool is 'auditctl', then add '/etc/audit/audit.rules'
# file to the list of files to be inspected
default_file="/etc/audit/audit.rules"
files_to_inspect+=('/etc/audit/audit.rules' )
'''
            else:
                script += f'''
# If audit tool is 'augenrules', then check if the audit rule is defined
# If rule is defined, add '/etc/audit/rules.d/*.rules' to the list for inspection
# If rule isn't defined yet, add '/etc/audit/rules.d/$key.rules' to the list for inspection
default_file="/etc/audit/rules.d/{key}.rules"
# As other_filters may include paths, lets use a different delimiter for it
# The "F" script expression tells sed to print the filenames where the expressions matched
readarray -t files_to_inspect < <(sed -s -n -e "/^{action_arch_filters}/!d" -e "#{other_filters_escaped}#!d" -e "/{auid_filters}/!d" -e "F" /etc/audit/rules.d/*.rules)
# Case when particular rule isn't defined in /etc/audit/rules.d/*.rules yet
if [ ${{#files_to_inspect[@]}} -eq "0" ]
then
    file_to_inspect="/etc/audit/rules.d/{key}.rules"
    files_to_inspect=("$file_to_inspect")
    if [ ! -e "$file_to_inspect" ]
    then
        touch "$file_to_inspect"
        chmod 0600 "$file_to_inspect"
    fi
fi
'''

            script += f'''
# After converting to jinja, we cannot return; therefore we skip the rest of the macro if needed instead
skip=1

for audit_file in "${{files_to_inspect[@]}}"
do
    # Filter existing $audit_file rules' definitions to select those that satisfy the rule pattern,
    # i.e, collect rules that match:
    # * the action, list and arch, (2-nd argument)
    # * the other filters, (3-rd argument)
    # * the auid filters, (4-rd argument)
    readarray -t similar_rules < <(sed -e "/^{action_arch_filters}/!d"  -e "#{other_filters_escaped}#!d" -e "/{auid_filters}/!d" "$audit_file")

    candidate_rules=()
    # Filter out rules that have more fields then required. This will remove rules more specific than the required scope
    for s_rule in "${{similar_rules[@]}}"
    do
        # Strip all the options and fields we know of,
        # than check if there was any field left over
        extra_fields=$(sed -E -e "s/{action_arch_filters}//"  -e "s#{other_filters_escaped}##" -e "s/{auid_filters}//" -e "s/((:?-S [[:alnum:],]+)+)//g" -e "s/-F key=\\w+|-k \\w+//"<<< "$s_rule")
        grep -q -- "-F" <<< "$extra_fields" || candidate_rules+=("$s_rule")
    done

    if [[ ${{#syscall_a[@]}} -ge 1 ]]
    then
        # Check if the syscall we want is present in any of the similar existing rules
        for rule in "${{candidate_rules[@]}}"
        do
            rule_syscalls=$(echo "$rule" | grep -o -P '(-S [\\w,]+)+' | xargs)
            all_syscalls_found=0
            for syscall in "${{syscall_a[@]}}"
            do
                grep -q -- "\\b${{syscall}}\\b" <<< "$rule_syscalls" || {{
                   # A syscall was not found in the candidate rule
                   all_syscalls_found=1
                   }}
            done
            if [[ $all_syscalls_found -eq 0 ]]
            then
                # We found a rule with all the syscall(s) we want; skip rest of macro
                skip=0
                break
            fi

            # Check if this rule can be grouped with our target syscall and keep track of it
            for syscall_g in "${{syscall_grouping[@]}}"
            do
                if grep -q -- "\\b${{syscall_g}}\\b" <<< "$rule_syscalls"
                then
                    file_to_edit=${{audit_file}}
                    rule_to_edit=${{rule}}
                    rule_syscalls_to_edit=${{rule_syscalls}}
                fi
            done
        done
    else
        # If there is any candidate rule, it is compliant; skip rest of macro
        if [ "${{#candidate_rules[@]}}" -gt 0 ]
        then
            skip=0
        fi
    fi

    if [ "$skip" -eq 0 ]; then
        break
    fi
done

if [ "$skip" -ne 0 ]; then
    # We checked all rules that matched the expected resemblance pattern (action, arch & auid)
    # At this point we know if we need to either append the $full_rule or group
    # the syscall together with an exsiting rule

    # Append the full_rule if it cannot be grouped to any other rule
    if [ -z ${{rule_to_edit+x}} ]
    then
        # Build full_rule while avoid adding double spaces when other_filters is empty
        if [ "${{#syscall_a[@]}}" -gt 0 ]
        then
            syscall_string=""
            for syscall in "${{syscall_a[@]}}"
            do
                syscall_string+=" -S $syscall"
            done
        fi
        other_string=$([[ {other_filters} ]] && echo " {other_filters}") || /bin/true
        auid_string=$([[ {auid_filters} ]] && echo " {auid_filters}") || /bin/true
        full_rule="{action_arch_filters}${{syscall_string}}${{other_string}}${{auid_string}} -F key={key}" || /bin/true
        echo "$full_rule" >> "$default_file"
        chmod 0600 ${{default_file}}
    else
        # Check if the syscalls are declared as a comma separated list or
        # as multiple -S parameters
        if grep -q -- "," <<< "${{rule_syscalls_to_edit}}"
        then
            delimiter=","
        else
            delimiter=" -S "
        fi
        new_grouped_syscalls="${{rule_syscalls_to_edit}}"
        for syscall in "${{syscall_a[@]}}"
        do
            grep -q -- "\\b${{syscall}}\\b" <<< "${{rule_syscalls_to_edit}}" || {{
               # A syscall was not found in the candidate rule
               new_grouped_syscalls+="${{delimiter}}${{syscall}}"
               }}
        done

        # Group the syscall in the rule
        sed -i -e "\\#${{rule_to_edit}}#s#${{rule_syscalls_to_edit}}#${{new_grouped_syscalls}}#" "$file_to_edit"
    fi
fi
'''
            return script

        def bash_fix_audit_watch_rule(tool, path, required_access_bits, key, style="", arch="", filter_type="path"):
            """
            Macro: bash_fix_audit_watch_rule - Generate audit watch rule remediation

            Creates bash code to add or update audit watch rules that monitor file system
            objects for specific access patterns (read, write, execute, attribute changes).
            Handles both legacy (-w) and modern (-F path=) audit rule syntax.

            Args:
                tool: Audit tool to use ('auditctl' or 'augenrules')
                path: File system path to watch
                required_access_bits: Access permissions to monitor (combination of r,w,x,a)
                key: Audit key/identifier for the rule
                style: Rule style ('modern' for -F syntax, or legacy -w syntax)
                arch: Architecture for modern style (e.g., 'b64', 'b32')
                filter_type: Filter type for modern style ('path' or 'dir')

            Returns:
                Bash script to configure audit watch rule
            """
            script = f'''
# Create a list of audit *.rules files that should be inspected for presence and correctness
# of a particular audit rule. The scheme is as follows:
#
# -----------------------------------------------------------------------------------------
# Tool used to load audit rules	| Rule already defined	|  Audit rules file to inspect	  |
# -----------------------------------------------------------------------------------------
#	auditctl		|     Doesn't matter	|  /etc/audit/audit.rules	  |
# -----------------------------------------------------------------------------------------
# 	augenrules		|          Yes		|  /etc/audit/rules.d/*.rules	  |
# 	augenrules		|          No		|  /etc/audit/rules.d/$key.rules  |
# -----------------------------------------------------------------------------------------
files_to_inspect=()
'''

            if tool == "auditctl":
                script += '''
# If the audit tool is 'auditctl', then add '/etc/audit/audit.rules'
# into the list of files to be inspected
files_to_inspect+=('/etc/audit/audit.rules')
'''
            elif tool == "augenrules":
                if style == "modern":
                    script += f'''
# If the audit is 'augenrules', then check if rule is already defined
# If rule is defined, add '/etc/audit/rules.d/*.rules' to list of files for inspection.
# If rule isn't defined, add '/etc/audit/rules.d/{key}.rules' to list of files for inspection.
readarray -t matches < <(grep -HP "[\\s]*-F[\\s]+{filter_type}={path}" /etc/audit/rules.d/*.rules)

# For each of the matched entries
for match in "${{matches[@]}}"
do
    # Extract filepath from the match
    rulesd_audit_file=$(echo $match | cut -f1 -d ':')
    # Append that path into list of files for inspection
    files_to_inspect+=("$rulesd_audit_file")
done
# Case when particular audit rule isn't defined yet
if [ "${{#files_to_inspect[@]}}" -eq "0" ]
then
    # Append '/etc/audit/rules.d/{key}.rules' into list of files for inspection
    key_rule_file="/etc/audit/rules.d/{key}.rules"
    # If the {key}.rules file doesn't exist yet, create it with correct permissions
    if [ ! -e "$key_rule_file" ]
    then
        touch "$key_rule_file"
        chmod 0600 "$key_rule_file"
    fi
    files_to_inspect+=("$key_rule_file")
fi
'''
                else:
                    script += f'''
# If the audit is 'augenrules', then check if rule is already defined
# If rule is defined, add '/etc/audit/rules.d/*.rules' to list of files for inspection.
# If rule isn't defined, add '/etc/audit/rules.d/{key}.rules' to list of files for inspection.
readarray -t matches < <(grep -HP "[\\s]*-w[\\s]+{path}" /etc/audit/rules.d/*.rules)

# For each of the matched entries
for match in "${{matches[@]}}"
do
    # Extract filepath from the match
    rulesd_audit_file=$(echo $match | cut -f1 -d ':')
    # Append that path into list of files for inspection
    files_to_inspect+=("$rulesd_audit_file")
done
# Case when particular audit rule isn't defined yet
if [ "${{#files_to_inspect[@]}}" -eq "0" ]
then
    # Append '/etc/audit/rules.d/{key}.rules' into list of files for inspection
    key_rule_file="/etc/audit/rules.d/{key}.rules"
    # If the {key}.rules file doesn't exist yet, create it with correct permissions
    if [ ! -e "$key_rule_file" ]
    then
        touch "$key_rule_file"
        chmod 0600 "$key_rule_file"
    fi
    files_to_inspect+=("$key_rule_file")
fi
'''
            else:
                return die("Unknown tool used: " + tool)

            # Add the inspection and correction logic
            script += '''
# Finally perform the inspection and possible subsequent audit rule
# correction for each of the files previously identified for inspection
for audit_rules_file in "${files_to_inspect[@]}"
do
    # Check if audit watch file system object rule for given path already present
'''

            if style == "modern":
                script += f'''    if grep -q -P -- "^[\\s]*-F[\\s]+{filter_type}={path}" "$audit_rules_file"
'''
            else:
                script += f'''    if grep -q -P -- "^[\\s]*-w[\\s]+{path}" "$audit_rules_file"
'''

            script += f'''    then
        # Rule is found => verify yet if existing rule definition contains
        # all of the required access type bits

        # Define BRE whitespace class shortcut
        sp="[[:space:]]"
        # Extract current permission access types (e.g. -p [r|w|x|a] values) from audit rule
'''

            if style == "modern":
                script += f'''        current_access_bits=$(sed -ne "s#$sp*-a$sp\\+always,exit$sp\\+-F$sp\\+arch={arch}$sp\\+-F$sp\\+{filter_type}={path}$sp\\+-F$sp\\+perm=\\([rxwa]{{1,4}}\\).*#\\1#p" "$audit_rules_file")
'''
            else:
                script += f'''        current_access_bits=$(sed -ne "s#$sp*-w$sp\\+{path} $sp\\+-p$sp\\+\\([rxwa]{{1,4}}\\).*#\\1#p" "$audit_rules_file")
'''

            script += f'''        # Split required access bits string into characters array
        # (to check bit's presence for one bit at a time)
        for access_bit in $(echo "{required_access_bits}" | grep -o .)
        do
            # For each from the required access bits (e.g. 'w', 'a') check
            # if they are already present in current access bits for rule.
            # If not, append that bit at the end
            if ! grep -q "$access_bit" <<< "$current_access_bits"
            then
                # Concatenate the existing mask with the missing bit
                current_access_bits="$current_access_bits$access_bit"
            fi
        done
        # Propagate the updated rule's access bits (original + the required
        # ones) back into the /etc/audit/audit.rules file for that rule
'''

            if style == "modern":
                script += f'''        sed -i "s#\\($sp*-a$sp\\+always,exit$sp\\+-F$sp\\+arch={arch}$sp\\+-F$sp\\+{filter_type}={path}$sp\\+-F$sp\\+perm=\\)\\([rxwa]{{1,4}}\\)\\(.*\\)#\\1$current_access_bits\\3#" "$audit_rules_file"
'''
            else:
                script += f'''        sed -i "s#\\($sp*-w$sp\\+{path}$sp\\+-p$sp\\+\\)\\([rxwa]{{1,4}}\\)\\(.*\\)#\\1$current_access_bits\\3#" "$audit_rules_file"
'''

            script += '''    else
        # Rule isn't present yet. Append it at the end of $audit_rules_file file
        # with proper key

'''

            if style == "modern":
                script += f'''        echo "-a always,exit -F arch={arch} -F {filter_type}={path} -F perm={required_access_bits} -F key={key}" >> "$audit_rules_file"
'''
            else:
                script += f'''        echo "-w {path} -p {required_access_bits} -k {key}" >> "$audit_rules_file"
'''

            script += '''    fi
done
'''
            return script

        def ansible_audit_augenrules_add_syscall_rule(action_arch_filters="", other_filters="",
                                                       auid_filters="", syscalls=None, key="",
                                                       syscall_grouping=None):
            """
            Macro: ansible_audit_augenrules_add_syscall_rule - Ansible version of audit syscall rule

            Generates Ansible tasks to add or update audit syscall rules in /etc/audit/rules.d/.
            Uses Ansible modules (find, set_fact, lineinfile) to achieve the same result as
            the bash version but in an idempotent, Ansible-native way.

            Args:
                action_arch_filters: Action and arch filters (e.g., "-a always,exit -F arch=b64")
                other_filters: Additional filters (e.g., "-F a2&03 -F path=/etc/passwd")
                auid_filters: AUID filters (e.g., "-F auid>=1000 -F auid!=unset")
                syscalls: List of syscalls to monitor (e.g., ['fchown', 'lchown'])
                key: Audit key/identifier for the rule
                syscall_grouping: List of syscalls that can be grouped together

            Returns:
                Ansible playbook YAML tasks
            """
            if syscalls is None:
                syscalls = []
            if syscall_grouping is None:
                syscall_grouping = []

            # Prepare filter strings with leading spaces if non-empty
            other_filters_str = (" " + other_filters) if other_filters else ""
            auid_filters_str = (" " + auid_filters) if auid_filters else ""
            syscall_flag = " -S " if syscalls else ""

            # Format lists for Ansible
            syscalls_yaml = str(syscalls)
            syscall_grouping_yaml = str(syscall_grouping)
            syscalls_display = ", ".join(syscalls) if syscalls else "syscalls"
            syscalls_joined = ",".join(syscalls) if syscalls else ""

            return f'''- name: Declare list of syscalls
  ansible.builtin.set_fact:
    syscalls: {syscalls_yaml}
    syscall_grouping: {syscall_grouping_yaml}

- name: Check existence of {syscalls_display} in /etc/audit/rules.d/
  ansible.builtin.find:
    paths: /etc/audit/rules.d
    contains: '{action_arch_filters}(( -S |,)\\w+)*(( -S |,){{{{ item }}}})+(( -S |,)\\w+)*{other_filters_str}{auid_filters_str} (-k\\s+|-F\\s+key=)\\S+\\s*$'
    patterns: '*.rules'
  register: find_command
  loop: '{{{{ (syscall_grouping + syscalls) | unique }}}}'

- name: Reset syscalls found per file
  ansible.builtin.set_fact:
    syscalls_per_file: {{{{}}}}
    found_paths_dict: {{{{}}}}

- name: Declare syscalls found per file
  ansible.builtin.set_fact: syscalls_per_file="{{{{ syscalls_per_file | combine( {{{{item.files[0].path :[item.item] + syscalls_per_file.get(item.files[0].path, []) }}}} ) }}}}"
  loop: "{{{{ find_command.results | selectattr('matched') | list }}}}"

- name: Declare files where syscalls were found
  ansible.builtin.set_fact: found_paths="{{{{ find_command.results | map(attribute='files') | flatten | map(attribute='path') | list }}}}"

- name: Count occurrences of syscalls in paths
  ansible.builtin.set_fact: found_paths_dict="{{{{ found_paths_dict | combine({{{{ item:1+found_paths_dict.get(item, 0) }}}}) }}}}"
  loop: "{{{{ find_command.results | map(attribute='files') | flatten | map(attribute='path') | list }}}}"

- name: Get path with most syscalls
  ansible.builtin.set_fact: audit_file="{{{{ (found_paths_dict | dict2items() | sort(attribute='value') | last).key }}}}"
  when: found_paths | length >= 1

- name: No file with syscall found, set path to /etc/audit/rules.d/{key}.rules
  ansible.builtin.set_fact: audit_file="/etc/audit/rules.d/{key}.rules"
  when: found_paths | length == 0

- name: Declare found syscalls
  ansible.builtin.set_fact: syscalls_found="{{{{ find_command.results | selectattr('matched') | map(attribute='item') | list }}}}"

- name: Declare missing syscalls
  ansible.builtin.set_fact:
    missing_syscalls="{{{{ syscalls | difference(syscalls_found) }}}}"

- name: Replace the audit rule in {{{{ audit_file }}}}
  ansible.builtin.lineinfile:
    path: '{{{{ audit_file }}}}'
    regexp: '({action_arch_filters})(?=.*(?:(?:-S |,)(?:{{{{ syscalls_per_file[audit_file] | join("|") }}}})\\b)((?:( -S |,)\\w+)+)({other_filters_str}{auid_filters_str} (?:-k |-F key=)\\w+)'
    line: '\\1\\2\\3{{{{ missing_syscalls | join("\\3") }}}}\\4'
    backrefs: yes
    state: present
    mode: g-rwx,o-rwx
  when: syscalls_found | length > 0 and missing_syscalls | length > 0

- name: Add the audit rule to {{{{ audit_file }}}}
  ansible.builtin.lineinfile:
    path: '{{{{ audit_file }}}}'
    line: "{action_arch_filters}{syscall_flag}{{{{ syscalls | join(',') }}}}{other_filters_str}{auid_filters_str} -F key={key}"
    create: true
    mode: g-rwx,o-rwx
    state: present
  when: syscalls_found | length == 0
'''

        def ansible_audit_augenrules_add_watch_rule(path='', permissions='', key='', style='',
                                                     arch='', filter_type='path', rule_title=None):
            """
            Macro: ansible_audit_augenrules_add_watch_rule - Ansible version of audit watch rule

            Generates Ansible tasks to add or update audit watch rules in /etc/audit/rules.d/.
            Uses Ansible modules to implement file system object auditing in an idempotent way.

            Args:
                path: File system path to watch
                permissions: Access permissions to monitor (combination of r,w,x,a)
                key: Audit key/identifier for the rule
                style: Rule style ('modern' for -F syntax, or legacy -w syntax)
                arch: Architecture for modern style (e.g., 'b64', 'b32')
                filter_type: Filter type for modern style ('path' or 'dir')
                rule_title: Human-readable description for the rule

            Returns:
                Ansible playbook YAML tasks
            """
            if not rule_title:
                rule_title = f"Audit watch rule for {path}"

            # Determine the search pattern based on style
            if style == "modern":
                search_pattern = f'^\\s*-a\\s+always,exit\\s+-F\\s+arch={arch}\\s+-F\\s+{filter_type}={path}\\s+-F\\s+perm={permissions}(\\s|$)+'
                rule_line = f"-a always,exit -F arch={arch} -F {filter_type}={path} -F perm={permissions} -F key={key}"
            else:
                search_pattern = f'^\\s*-w\\s+{path}\\s+-p\\s+{permissions}(\\s|$)+'
                rule_line = f"-w {path} -p {permissions} -k {key}"

            return f'''- name: {rule_title} - Check if watch rule for {path} already exists in /etc/audit/rules.d/
  ansible.builtin.find:
    paths: "/etc/audit/rules.d"
    contains: '{search_pattern}'
    patterns: "*.rules"
  register: find_existing_watch_rules_d

- name: {rule_title} - Search /etc/audit/rules.d for other rules with specified key {key}
  ansible.builtin.find:
    paths: "/etc/audit/rules.d"
    contains: '^.*(?:-F key=|-k\\s+){key}$'
    patterns: "*.rules"
  register: find_watch_key
  when: find_existing_watch_rules_d.matched is defined and find_existing_watch_rules_d.matched == 0

- name: {rule_title} - Use /etc/audit/rules.d/{key}.rules as the recipient for the rule
  ansible.builtin.set_fact:
    all_files:
      - /etc/audit/rules.d/{key}.rules
  when: find_watch_key.matched is defined and find_watch_key.matched == 0 and find_existing_watch_rules_d.matched is defined and find_existing_watch_rules_d.matched == 0

- name: {rule_title} - Use matched file as the recipient for the rule
  ansible.builtin.set_fact:
    all_files:
      - "{{{{ find_watch_key.files | map(attribute='path') | list | first }}}}"
  when: find_watch_key.matched is defined and find_watch_key.matched > 0 and find_existing_watch_rules_d.matched is defined and find_existing_watch_rules_d.matched == 0

- name: {rule_title} - Add watch rule for {path} in /etc/audit/rules.d/
  ansible.builtin.lineinfile:
    path: "{{{{ all_files[0] }}}}"
    line: "{rule_line}"
    create: yes
    mode: '0600'
  when: find_existing_watch_rules_d.matched is defined and find_existing_watch_rules_d.matched == 0
'''

        def ansible_audit_auditctl_add_watch_rule(path='', permissions='', key='', style='',
                                                   arch='', filter_type='path', rule_title=None):
            """
            Macro: ansible_audit_auditctl_add_watch_rule - Ansible version of auditctl watch rule

            Generates Ansible tasks to add or update audit watch rules in /etc/audit/audit.rules
            (the auditctl persistent configuration file). This is the auditctl equivalent of
            ansible_audit_augenrules_add_watch_rule, targeting /etc/audit/audit.rules instead
            of /etc/audit/rules.d/ directory.

            Args:
                path: File system path to watch
                permissions: Access permissions to monitor (combination of r,w,x,a)
                key: Audit key/identifier for the rule
                style: Rule style ('modern' for -F syntax, or legacy -w syntax)
                arch: Architecture for modern style (e.g., 'b64', 'b32')
                filter_type: Filter type for modern style ('path' or 'dir')
                rule_title: Title for Ansible task names

            Returns:
                Ansible playbook YAML tasks
            """
            if rule_title is None:
                rule_title = f"Configure audit watch rule for {path}"

            # Generate appropriate search pattern and rule line based on style
            if style == 'modern':
                search_pattern = f'^\\s*-F\\s+{filter_type}={path}\\s+-F\\s+perms={permissions}(\\s|$)+'
                rule_line = f"-a always,exit -F arch={arch} -F {filter_type}={path} -F perm={permissions} -F key={key}"
            else:
                search_pattern = f'^\\s*-w\\s+{path}\\s+-p\\s+{permissions}(\\s|$)+'
                rule_line = f"-w {path} -p {permissions} -k {key}"

            return f'''- name: {rule_title} - Check if watch rule for {path} already exists in /etc/audit/audit.rules
  ansible.builtin.find:
    paths: "/etc/audit/"
    contains: '{search_pattern}'
    patterns: "audit.rules"
  register: find_existing_watch_audit_rules

- name: {rule_title} - Add watch rule for {path} in /etc/audit/audit.rules
  ansible.builtin.lineinfile:
    line: "{rule_line}"
    state: present
    dest: /etc/audit/audit.rules
    create: yes
    mode: '0600'
  when: find_existing_watch_audit_rules.matched is defined and find_existing_watch_audit_rules.matched == 0
'''

        def ansible_audit_auditctl_add_syscall_rule(action_arch_filters="", other_filters="",
                                                     auid_filters="", syscalls=None, key="",
                                                     syscall_grouping=None):
            """
            Macro: ansible_audit_auditctl_add_syscall_rule - Ansible version of auditctl syscall rule

            Generates Ansible tasks to add or update audit syscall rules in /etc/audit/audit.rules.
            This is the auditctl equivalent of ansible_audit_augenrules_add_syscall_rule, targeting
            /etc/audit/audit.rules instead of /etc/audit/rules.d/.

            The implementation is simpler than augenrules version because auditctl only uses one
            file (/etc/audit/audit.rules), while augenrules can use multiple files in rules.d/.

            Args:
                action_arch_filters: Action and arch filters (e.g., "-a always,exit -F arch=b64")
                other_filters: Additional filters (e.g., "-F a2&03 -F path=/etc/passwd")
                auid_filters: AUID filters (e.g., "-F auid>=1000 -F auid!=unset")
                syscalls: List of syscalls to monitor (e.g., ['fchown', 'lchown'])
                key: Audit key/identifier for the rule
                syscall_grouping: List of syscalls that can be grouped together

            Returns:
                Ansible playbook YAML tasks
            """
            if syscalls is None:
                syscalls = []
            if syscall_grouping is None:
                syscall_grouping = []

            # Prepare filter strings with leading spaces if non-empty
            other_filters_str = (" " + other_filters) if other_filters else ""
            auid_filters_str = (" " + auid_filters) if auid_filters else ""
            syscall_flag = " -S " if syscalls else ""

            # Format lists for Ansible
            syscalls_yaml = str(syscalls)
            syscall_grouping_yaml = str(syscall_grouping)
            syscalls_display = ", ".join(syscalls) if syscalls else "syscalls"

            return f'''- name: Declare list of syscalls
  ansible.builtin.set_fact:
    syscalls: {syscalls_yaml}
    syscall_grouping: {syscall_grouping_yaml}

- name: Check existence of {syscalls_display} in /etc/audit/audit.rules
  ansible.builtin.find:
    paths: /etc/audit
    contains: '{action_arch_filters}(( -S |,)\\w+)*(( -S |,){{{{ item }}}})+(( -S |,)\\w+)*{other_filters_str}{auid_filters_str} (-k\\s+|-F\\s+key=)\\S+\\s*$'
    patterns: 'audit.rules'
  register: find_command
  loop: '{{{{ (syscall_grouping + syscalls) | unique }}}}'

- name: Set path to /etc/audit/audit.rules
  ansible.builtin.set_fact: audit_file="/etc/audit/audit.rules"

- name: Declare found syscalls
  ansible.builtin.set_fact: syscalls_found="{{{{ find_command.results | selectattr('matched') | map(attribute='item') | list }}}}"

- name: Declare missing syscalls
  ansible.builtin.set_fact:
    missing_syscalls="{{{{ syscalls | difference(syscalls_found) }}}}"

- name: Replace the audit rule in {{{{ audit_file }}}}
  ansible.builtin.lineinfile:
    path: '{{{{ audit_file }}}}'
    regexp: '({action_arch_filters})(?=.*(?:(?:-S |,)(?:{{{{ syscalls_found | join("|") }}}})\\b)((?:( -S |,)\\w+)+)({other_filters_str}{auid_filters_str} (?:-k |-F key=)\\w+)'
    line: '\\1\\2\\3{{{{ missing_syscalls | join("\\3") }}}}\\4'
    backrefs: yes
    state: present
    mode: g-rwx,o-rwx
  when: syscalls_found | length > 0 and missing_syscalls | length > 0

- name: Add the audit rule to {{{{ audit_file }}}}
  ansible.builtin.lineinfile:
    path: '{{{{ audit_file }}}}'
    line: "{action_arch_filters}{syscall_flag}{{{{ syscalls | join(',') }}}}{other_filters_str}{auid_filters_str} -F key={key}"
    create: true
    mode: g-rwx,o-rwx
    state: present
  when: syscalls_found | length == 0
'''

        def bash_sshd_remediation(parameter, value, config_is_distributed="false",
                                   config_basename="00-complianceascode-hardening.conf",
                                   rule_id=None):
            """
            Macro: bash_sshd_remediation - Configure SSH daemon settings in bash

            Generates bash code to set SSH daemon configuration parameters in the appropriate
            sshd_config file. Handles both monolithic (/etc/ssh/sshd_config) and distributed
            (/etc/ssh/sshd_config.d/) configuration approaches.

            This macro ensures proper SSH security configuration by:
            - Removing conflicting settings from included files (Oracle Linux)
            - Setting parameters in correct location based on config_is_distributed
            - Using set_config_file for idempotent configuration management
            - Ensuring proper file permissions (0600)

            Args:
                parameter: SSH configuration parameter name (e.g., "ClientAliveInterval")
                value: Value to set for the parameter (e.g., "300")
                config_is_distributed: "true" if using sshd_config.d/, "false" for monolithic
                config_basename: Filename for distributed config (default: 00-complianceascode-hardening.conf)
                rule_id: Optional rule identifier for tracking

            Returns:
                Bash script to configure SSH daemon setting
            """
            sshd_config_path = "/etc/ssh/sshd_config"
            sshd_config_dir = "/etc/ssh/sshd_config.d"

            # Build the script based on configuration style
            script = ""

            # For Oracle Linux, remove parameter from included files first
            # This uses lineinfile_absent to comment out conflicting settings
            script += f'''
# For Oracle Linux, remove conflicting settings from included files
included_files=$(grep -oP "^\\s*(?i)include.*" {sshd_config_path} 2>/dev/null | sed -e 's/\\s*include\\s*//I' | sed -e 's|^[^/]|{sshd_config_dir}/&|' || true)
for included_file in $included_files ; do
    if [ -f "$included_file" ]; then
        # Comment out any existing {parameter} settings in included files
        sed -i 's/^\\s*{parameter}.*$/# &/' "$included_file"
    fi
done
'''

            if config_is_distributed == "true":
                # Distributed configuration - use sshd_config.d/
                prefix_regex = "^\\s*"
                separator_regex = "\\s\\+"
                hardening_config_path = f"{sshd_config_dir}/{config_basename}"

                script += f'''
# Use distributed configuration in {sshd_config_dir}/
mkdir -p {sshd_config_dir}
touch {hardening_config_path}
chmod 0600 {hardening_config_path}

# Remove {parameter} from main sshd_config (will be in distributed config)
sed -i '/^\\s*{parameter}\\s/Id' {sshd_config_path}

# Remove {parameter} from other files in sshd_config.d/ (except our hardening config)
for conf_file in {sshd_config_dir}/*.conf; do
    if [ "$conf_file" != "{hardening_config_path}" ] && [ -f "$conf_file" ]; then
        sed -i '/^\\s*{parameter}\\s/Id' "$conf_file"
    fi
done

# Set the parameter in our hardening config file
# If parameter exists, update it; otherwise, insert at beginning of file
if grep -q "^\\s*{parameter}\\s" {hardening_config_path}; then
    sed -i "s/^\\s*{parameter}\\s.*$/{parameter} {value}/" {hardening_config_path}
else
    # Insert at beginning of file (BOF)
    sed -i "1i{parameter} {value}" {hardening_config_path}
fi
'''
            else:
                # Monolithic configuration - use main sshd_config
                script += f'''
# Use monolithic configuration in {sshd_config_path}
# Set {parameter} to {value}
if grep -q "^\\s*{parameter}\\s" {sshd_config_path}; then
    # Parameter exists, update it
    sed -i "s/^\\s*{parameter}\\s.*$/{parameter} {value}/" {sshd_config_path}
else
    # Parameter doesn't exist, add it at beginning of file
    sed -i "1i{parameter} {value}" {sshd_config_path}
fi
'''

            return script

        def ansible_sshd_set(parameter='', value='', config_is_distributed="false",
                            config_basename="00-complianceascode-hardening.conf",
                            rule_title=None):
            """
            Macro: ansible_sshd_set - Configure SSH daemon settings using Ansible

            Generates Ansible tasks to set SSH daemon configuration parameters. This is the
            Ansible equivalent of bash_sshd_remediation, providing idempotent configuration
            management through native Ansible modules.

            Handles both monolithic and distributed sshd_config approaches, ensures proper
            file permissions, and validates configuration changes with sshd -t.

            Args:
                parameter: SSH configuration parameter name (e.g., "ClientAliveInterval")
                value: Value to set for the parameter (e.g., "300")
                config_is_distributed: "true" if using sshd_config.d/, "false" for monolithic
                config_basename: Filename for distributed config
                rule_title: Title for Ansible task names

            Returns:
                Ansible playbook YAML tasks
            """
            if rule_title is None:
                rule_title = f"Configure SSH parameter {parameter}"

            config_dir = "/etc/ssh/sshd_config.d"
            config_file = f"{config_dir}/{config_basename}"

            # Build Ansible tasks
            tasks = ""

            # For Oracle Linux, comment out conflicting settings in included files
            tasks += f'''- name: "{rule_title} - Find sshd_config included files"
  ansible.builtin.shell: |-
    included_files=$(grep -oP "^\\s*(?i)include.*" /etc/ssh/sshd_config | sed -e 's/\\s*Include\\s*//i' | sed -e 's|^[^/]|/etc/ssh/&|')
    [[ -n $included_files ]] && ls $included_files || true
  register: sshd_config_included_files
  changed_when: false

- name: "{rule_title} - Comment out {parameter} from included files"
  ansible.builtin.replace:
    path: '{{{{ item }}}}'
    regexp: '^(\\s*{parameter}.*)$'
    replace: '# \\1'
  loop: "{{{{ sshd_config_included_files.stdout_lines }}}}"
  when: sshd_config_included_files.stdout_lines | length > 0

'''

            if config_is_distributed == "true":
                # Distributed configuration
                tasks += f'''- name: "{rule_title} - Ensure {config_dir} exists"
  ansible.builtin.file:
    path: {config_dir}
    state: directory
    mode: '0755'

- name: "{rule_title} - Remove {parameter} from main sshd_config"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '(?i)^\\s*{parameter}\\s'
    state: absent
  notify: restart sshd

- name: "{rule_title} - Remove {parameter} from other distributed configs"
  ansible.builtin.replace:
    path: '{{{{ item }}}}'
    regexp: '(?i)^(\\s*{parameter}\\s.*)$'
    replace: '# \\1'
  with_fileglob:
    - '{config_dir}/*.conf'
  when: item != '{config_file}'

- name: "{rule_title} - Set {parameter} in {config_file}"
  ansible.builtin.lineinfile:
    path: {config_file}
    regexp: '(?i)^\\s*{parameter}\\s'
    line: '{parameter} {value}'
    state: present
    create: yes
    insertbefore: BOF
    validate: '/usr/sbin/sshd -t -f %s'
    mode: '0600'
  notify: restart sshd
'''
            else:
                # Monolithic configuration
                tasks += f'''- name: "{rule_title} - Set {parameter} in /etc/ssh/sshd_config"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '(?i)^\\s*{parameter}\\s'
    line: '{parameter} {value}'
    state: present
    create: yes
    insertbefore: BOF
    validate: '/usr/sbin/sshd -t -f %s'
  notify: restart sshd
'''

            return tasks

        # Macro and filter dictionary
        macros = {
            # Service macros
            'describe_service_enable': describe_service_enable,
            'ocil_service_enabled': ocil_service_enabled,
            'fixtext_service_enabled': fixtext_service_enabled,
            'srg_requirement_service_enabled': srg_requirement_service_enabled,

            # Config file macros (bash)
            'bash_instantiate_variables': bash_instantiate_variables,
            'set_config_file': set_config_file,
            'lineinfile_absent': lineinfile_absent,
            'lineinfile_present': lineinfile_present,
            'die': die,

            # Config file macros (ansible)
            'ansible_instantiate_variables': ansible_instantiate_variables,
            'ansible_set_config_file': ansible_set_config_file,
            'ansible_only_lineinfile': ansible_only_lineinfile,
            'ansible_lineinfile': ansible_lineinfile,

            # Package management macros
            'bash_package_install': bash_package_install,

            # Environment check macros
            'bash_bootc_build': bash_bootc_build,
            'bash_not_bootc_build': bash_not_bootc_build,

            # Audit rule macros (bash)
            'bash_fix_audit_syscall_rule': bash_fix_audit_syscall_rule,
            'bash_fix_audit_watch_rule': bash_fix_audit_watch_rule,

            # Audit rule macros (ansible)
            'ansible_audit_augenrules_add_syscall_rule': ansible_audit_augenrules_add_syscall_rule,
            'ansible_audit_augenrules_add_watch_rule': ansible_audit_augenrules_add_watch_rule,
            'ansible_audit_auditctl_add_syscall_rule': ansible_audit_auditctl_add_syscall_rule,
            'ansible_audit_auditctl_add_watch_rule': ansible_audit_auditctl_add_watch_rule,

            # SSH configuration macros
            'bash_sshd_remediation': bash_sshd_remediation,
            'ansible_sshd_set': ansible_sshd_set,

            # Filters
            'escape_regex': escape_regex,
        }

        return macros

    def render_template(
        self,
        template_path: str,
        variables: Optional[Dict[str, str]] = None,
        product: str = "rhel8"
    ) -> str:
        """
        Render a CAC Jinja2 template to executable script.

        Args:
            template_path: Path to .template file
            variables: Optional custom variables to override defaults
            product: Target product (rhel8, rhel9, ubuntu2204, etc.)

        Returns:
            Rendered script content

        Raises:
            FileNotFoundError: If template file doesn't exist
            TemplateError: If template rendering fails
        """
        template_file = Path(template_path)

        if not template_file.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")

        # Read template content
        with open(template_file, 'r', encoding='utf-8') as f:
            template_content = f.read()

        # Get default variables
        context = self.get_default_variables(product=product)

        # Merge with custom variables
        if variables:
            context.update(variables)

        # Detect rule name from template path if not provided
        if 'rule_title' not in context:
            context['rule_title'] = self._extract_rule_name(template_path)

        # Render template
        try:
            template = self.env.from_string(template_content)
            rendered = template.render(context)

            # Post-process to clean up any remaining artifacts
            rendered = self._postprocess_rendered(rendered)

            logger.debug(f"Rendered template: {template_path} ({len(rendered)} bytes)")
            return rendered

        except TemplateError as e:
            logger.error(f"Template rendering error in {template_path}: {e}")
            raise

    def get_default_variables(self, product: str = "rhel8") -> Dict[str, str]:
        """
        Get default variable values for CAC templates.

        CAC templates expect certain variables to be defined. This provides
        sensible defaults based on the target product.

        Args:
            product: Target product (rhel8, rhel9, ubuntu2204, etc.)

        Returns:
            Dictionary of variable name to value
        """
        # Determine init system based on product
        init_system = "systemd"
        if "rhel" in product.lower() or "ubuntu" in product.lower():
            init_system = "systemd"

        # Common variables
        variables = {
            # System configuration
            'init_system': init_system,
            'product': product,

            # Service-related (defaults, can be overridden)
            'SERVICENAME': 'auditd',
            'DAEMONNAME': 'auditd',
            'PACKAGENAME': 'audit',

            # Control metadata (defaults)
            'CONTROL_ID': 'unknown',
            'rule_title': 'Security Configuration Rule',

            # Paths (product-specific)
            'sysconfdir': '/etc',
            'localstatedir': '/var',

            # Ansible-specific
            'ansible_facts': {'packages': {}},

            # Common product flags
            'is_rhel': 'rhel' in product.lower(),
            'is_ubuntu': 'ubuntu' in product.lower(),
            'is_fedora': 'fedora' in product.lower(),
        }

        # Product-specific overrides
        if 'ubuntu' in product.lower():
            variables['PACKAGENAME'] = 'auditd'  # Ubuntu uses 'auditd' not 'audit'

        return variables

    def validate_rendered_script(
        self,
        script: str,
        min_length: int = 10
    ) -> bool:
        """
        Validate that a rendered script is valid and executable.

        Args:
            script: Rendered script content
            min_length: Minimum expected length

        Returns:
            True if script appears valid, False otherwise
        """
        if not script:
            logger.warning("Validation failed: Empty script")
            return False

        if len(script) < min_length:
            logger.warning(f"Validation failed: Script too short ({len(script)} bytes)")
            return False

        # Check for Jinja2 errors left in output
        if "JINJA TEMPLATE ERROR" in script:
            logger.warning("Validation failed: Jinja2 error in output")
            return False

        # Check for unrendered variables
        if '{{{' in script or '}}}' in script:
            logger.warning("Validation failed: Unrendered variables found")
            return False

        # Check for shebang (bash/python scripts)
        lines = script.split('\n')
        first_line = lines[0] if lines else ""

        # Ansible playbooks don't need shebang
        if not first_line.startswith('#!') and not first_line.startswith('---'):
            logger.debug("Note: Script missing shebang (may be intentional for Ansible)")

        logger.debug("Script validation passed")
        return True

    def _extract_rule_name(self, template_path: str) -> str:
        """
        Extract rule name from template path.

        Args:
            template_path: Path to template file

        Returns:
            Rule name extracted from path
        """
        path = Path(template_path)

        # Try to get from parent directory of template
        # e.g., /path/to/service_enabled/bash.template -> service_enabled
        if path.parent.name in ['service_enabled', 'service_disabled', 'package_installed']:
            return path.parent.name

        # Default
        return "Security Configuration"

    def _postprocess_rendered(self, content: str) -> str:
        """
        Post-process rendered template to clean up artifacts.

        Args:
            content: Rendered template content

        Returns:
            Cleaned content
        """
        # Remove standalone braces from else blocks
        content = re.sub(r'^\{\}\s*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'\{\}$', '', content, flags=re.MULTILINE)

        # Remove lines with only whitespace
        content = re.sub(r'^\s+$', '', content, flags=re.MULTILINE)

        # Remove multiple blank lines
        content = re.sub(r'\n{3,}', '\n\n', content)

        # Ensure script ends with single newline
        content = content.rstrip() + '\n'

        # Add shebang if missing for bash scripts (check for bash-specific commands)
        if ('LC_ALL=C sed' in content or 'SYSTEMCTL_EXEC' in content) and not content.startswith('#!') and 'ansible.builtin' not in content:
            content = '#!/bin/bash\n# Source: ComplianceAsCode/content\n# Generated from CAC template\n\n' + content

        # Add header for Ansible if missing
        if 'ansible.builtin' in content and not content.startswith('---'):
            content = '---\n# Source: ComplianceAsCode/content\n# Generated from CAC template\n\n' + content

        return content

    def render_rule_templates(
        self,
        rule_name: str,
        template_names: Dict[str, str],
        product: str = "rhel8",
        control_id: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Render all templates for a specific rule.

        Args:
            rule_name: Name of the rule (e.g., "service_auditd_enabled")
            template_names: Dict of {format: template_path}
            product: Target product
            control_id: Optional control ID for variable substitution

        Returns:
            Dictionary of {format: rendered_script}
        """
        rendered = {}

        # Prepare variables
        variables = self.get_default_variables(product=product)
        variables['rule_title'] = rule_name.replace('_', ' ').title()

        if control_id:
            variables['CONTROL_ID'] = control_id

        # Render each template
        for format_name, template_path in template_names.items():
            try:
                script = self.render_template(
                    template_path,
                    variables=variables,
                    product=product
                )

                if self.validate_rendered_script(script):
                    rendered[format_name] = script
                else:
                    logger.warning(f"Skipping invalid {format_name} script for {rule_name}")

            except Exception as e:
                logger.error(f"Failed to render {format_name} for {rule_name}: {e}")
                continue

        return rendered


def main():
    """CLI interface for Template Processor"""
    import argparse
    import sys

    parser = argparse.ArgumentParser(
        description="Render CAC Jinja2 templates",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Render a template
  python template_processor.py --template /path/to/bash.template

  # Render with custom variables
  python template_processor.py --template /path/to/bash.template --var SERVICENAME=sshd

  # Get default variables
  python template_processor.py --defaults --product rhel9
        """
    )

    parser.add_argument(
        '--template',
        help='Path to template file'
    )
    parser.add_argument(
        '--product',
        default='rhel8',
        help='Target product (default: rhel8)'
    )
    parser.add_argument(
        '--var',
        action='append',
        help='Custom variable (format: NAME=value)'
    )
    parser.add_argument(
        '--defaults',
        action='store_true',
        help='Show default variables'
    )
    parser.add_argument(
        '--validate',
        help='Validate a rendered script file'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    try:
        processor = TemplateProcessor()

        if args.defaults:
            # Show default variables
            defaults = processor.get_default_variables(product=args.product)
            print(f"Default variables for {args.product}:")
            print("-" * 60)
            for key, value in sorted(defaults.items()):
                print(f"{key:20} = {value}")
            return 0

        elif args.validate:
            # Validate a rendered script
            with open(args.validate, 'r', encoding='utf-8') as f:
                script = f.read()

            is_valid = processor.validate_rendered_script(script)
            if is_valid:
                print(f"✓ Script is valid: {args.validate}")
                return 0
            else:
                print(f"✗ Script validation failed: {args.validate}")
                return 1

        elif args.template:
            # Render template
            variables = {}

            if args.var:
                for var in args.var:
                    if '=' in var:
                        key, value = var.split('=', 1)
                        variables[key] = value

            rendered = processor.render_template(
                args.template,
                variables=variables,
                product=args.product
            )

            print(rendered)
            return 0

        else:
            print("Use --template, --defaults, or --validate. See --help for usage.")
            return 1

    except Exception as e:
        logger.error(f"Error: {e}")
        if args.verbose:
            raise
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
