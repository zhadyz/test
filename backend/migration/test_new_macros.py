#!/usr/bin/env python
"""
Test script for the 6 new CAC macros

Tests each macro implementation individually to ensure they work correctly
and unblock AC family migration.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from template_processor import TemplateProcessor

def test_bash_package_install():
    """Test bash_package_install macro"""
    print("\n[TEST 1] bash_package_install")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    # Test with dnf
    result = macros['bash_package_install']('audit', pkg_manager='dnf')
    print("DNF package install:")
    print(result)
    assert 'dnf install -y "audit"' in result
    assert 'rpm -q --quiet' in result
    print("[PASS] DNF test passed")

    # Test with apt_get
    result = macros['bash_package_install']('auditd', pkg_manager='apt_get')
    print("\nAPT package install:")
    print(result)
    assert 'apt-get install -y "auditd"' in result
    assert 'DEBIAN_FRONTEND=noninteractive' in result
    print("[PASS] APT test passed")

    print("\n[PASS] bash_package_install: PASSED")


def test_bash_bootc_build():
    """Test bash_bootc_build and bash_not_bootc_build macros"""
    print("\n[TEST 2] bash_bootc_build / bash_not_bootc_build")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    # Test bootc_build
    result = macros['bash_bootc_build'](pkg_system='rpm')
    print("bash_bootc_build:")
    print(result)
    assert 'rpm --quiet -q kernel rpm-ostree bootc' in result
    assert 'openshift-kubelet' in result
    assert 'containerenv' in result
    print("[PASS] bootc_build test passed")

    # Test not_bootc_build
    result = macros['bash_not_bootc_build'](pkg_system='rpm')
    print("\nbash_not_bootc_build:")
    print(result)
    assert result.startswith('! {')
    print("[PASS] not_bootc_build test passed")

    print("\n[PASS] bash_bootc_build macros: PASSED")


def test_bash_fix_audit_syscall_rule():
    """Test bash_fix_audit_syscall_rule macro"""
    print("\n[TEST 3] bash_fix_audit_syscall_rule")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    # Test with augenrules
    result = macros['bash_fix_audit_syscall_rule'](
        tool='augenrules',
        action_arch_filters='-a always,exit -F arch=b64',
        other_filters='-F path=/etc/passwd',
        auid_filters='-F auid>=1000 -F auid!=unset',
        syscall='openat open',
        syscall_groupings='open openat',
        key='access_control'
    )

    print("Generated bash script (first 50 lines):")
    lines = result.split('\n')
    for i, line in enumerate(lines[:50], 1):
        print(f"{i:3}: {line}")

    # Validate key components
    assert 'files_to_inspect' in result
    assert 'readarray -t files_to_inspect' in result
    assert '/etc/audit/rules.d/access_control.rules' in result
    assert 'similar_rules' in result
    assert 'candidate_rules' in result
    assert 'syscall_a' in result
    assert 'rule_syscalls_to_edit' in result
    print(f"\n[PASS] Generated {len(lines)} lines of bash code")
    print("[PASS] All key components present")

    print("\n[PASS] bash_fix_audit_syscall_rule: PASSED")


def test_bash_fix_audit_watch_rule():
    """Test bash_fix_audit_watch_rule macro"""
    print("\n[TEST 4] bash_fix_audit_watch_rule")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    # Test with legacy style
    result = macros['bash_fix_audit_watch_rule'](
        tool='augenrules',
        path='/etc/passwd',
        required_access_bits='wa',
        key='user_modification',
        style='legacy'
    )

    print("Generated bash script (first 50 lines):")
    lines = result.split('\n')
    for i, line in enumerate(lines[:50], 1):
        print(f"{i:3}: {line}")

    # Validate key components
    assert 'files_to_inspect' in result
    assert 'grep -HP' in result
    assert '/etc/passwd' in result
    assert 'wa' in result
    assert 'user_modification' in result
    assert 'audit_rules_file' in result
    print(f"\n[PASS] Generated {len(lines)} lines of bash code")
    print("[PASS] All key components present")

    # Test modern style
    result_modern = macros['bash_fix_audit_watch_rule'](
        tool='augenrules',
        path='/var/log/audit',
        required_access_bits='rwa',
        key='audit_log_access',
        style='modern',
        arch='b64',
        filter_type='dir'
    )
    assert '-F arch=b64' in result_modern
    assert '-F dir=/var/log/audit' in result_modern
    print("[PASS] Modern style test passed")

    print("\n[PASS] bash_fix_audit_watch_rule: PASSED")


def test_ansible_audit_augenrules_add_syscall_rule():
    """Test ansible_audit_augenrules_add_syscall_rule macro"""
    print("\n[TEST 5] ansible_audit_augenrules_add_syscall_rule")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    result = macros['ansible_audit_augenrules_add_syscall_rule'](
        action_arch_filters='-a always,exit -F arch=b64',
        other_filters='-F path=/etc/shadow',
        auid_filters='-F auid>=1000 -F auid!=unset',
        syscalls=['open', 'openat', 'creat'],
        key='shadow_access',
        syscall_grouping=['open', 'openat', 'creat']
    )

    print("Generated Ansible playbook (first 40 lines):")
    lines = result.split('\n')
    for i, line in enumerate(lines[:40], 1):
        print(f"{i:3}: {line}")

    # Validate Ansible structure
    assert '- name: Declare list of syscalls' in result
    assert 'ansible.builtin.set_fact' in result
    assert 'ansible.builtin.find' in result
    assert 'ansible.builtin.lineinfile' in result
    assert '/etc/audit/rules.d' in result
    assert "['open', 'openat', 'creat']" in result
    assert 'shadow_access' in result
    print(f"\n[PASS] Generated {len(lines)} lines of Ansible YAML")
    print("[PASS] All Ansible modules present")

    print("\n[PASS] ansible_audit_augenrules_add_syscall_rule: PASSED")


def test_ansible_audit_augenrules_add_watch_rule():
    """Test ansible_audit_augenrules_add_watch_rule macro"""
    print("\n[TEST 6] ansible_audit_augenrules_add_watch_rule")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    result = macros['ansible_audit_augenrules_add_watch_rule'](
        path='/etc/group',
        permissions='wa',
        key='group_modification',
        style='legacy',
        rule_title='Monitor group file changes'
    )

    print("Generated Ansible playbook:")
    lines = result.split('\n')
    for i, line in enumerate(lines, 1):
        print(f"{i:3}: {line}")

    # Validate Ansible structure
    assert '- name: Monitor group file changes' in result
    assert 'ansible.builtin.find' in result
    assert 'ansible.builtin.set_fact' in result
    assert 'ansible.builtin.lineinfile' in result
    assert '/etc/group' in result
    assert 'wa' in result
    assert 'group_modification' in result
    print(f"\n[PASS] Generated {len(lines)} lines of Ansible YAML")
    print("[PASS] All Ansible modules present")

    # Test modern style
    result_modern = macros['ansible_audit_augenrules_add_watch_rule'](
        path='/var/log/wtmp',
        permissions='wa',
        key='session_monitoring',
        style='modern',
        arch='b64',
        filter_type='path',
        rule_title='Monitor login records'
    )
    assert '-F arch=b64' in result_modern
    assert '-F path=/var/log/wtmp' in result_modern
    print("[PASS] Modern style test passed")

    print("\n[PASS] ansible_audit_augenrules_add_watch_rule: PASSED")


def main():
    """Run all macro tests"""
    print("\n" + "=" * 60)
    print("Testing 6 Critical CAC Macros Implementation")
    print("=" * 60)

    try:
        test_bash_package_install()
        test_bash_bootc_build()
        test_bash_fix_audit_syscall_rule()
        test_bash_fix_audit_watch_rule()
        test_ansible_audit_augenrules_add_syscall_rule()
        test_ansible_audit_augenrules_add_watch_rule()

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED")
        print("=" * 60)
        print("\nSummary:")
        print("[PASS] bash_package_install - Package installation")
        print("[PASS] bash_bootc_build / bash_not_bootc_build - Environment checks")
        print("[PASS] bash_fix_audit_syscall_rule - Complex audit syscall rules")
        print("[PASS] bash_fix_audit_watch_rule - Audit watch rules")
        print("[PASS] ansible_audit_augenrules_add_syscall_rule - Ansible syscall rules")
        print("[PASS] ansible_audit_augenrules_add_watch_rule - Ansible watch rules")
        print("\nAll 6 macros are operational and ready for production.")

        return 0

    except Exception as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
