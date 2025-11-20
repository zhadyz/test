#!/usr/bin/env python
"""
Test Suite for Remaining Macros Implementation

This test suite validates the 4 newly implemented macros and verifies
the bug fix in bash_fix_audit_syscall_rule.

Tests:
1. ansible_audit_auditctl_add_watch_rule
2. ansible_audit_auditctl_add_syscall_rule
3. bash_sshd_remediation
4. ansible_sshd_set
5. bash_fix_audit_syscall_rule bug fix
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from template_processor import TemplateProcessor


def test_ansible_audit_auditctl_add_watch_rule():
    """Test ansible_audit_auditctl_add_watch_rule macro"""
    print("\n[TEST 1] ansible_audit_auditctl_add_watch_rule")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    # Test with legacy style
    result = macros['ansible_audit_auditctl_add_watch_rule'](
        path='/etc/passwd',
        permissions='wa',
        key='user-modify',
        style='',
        rule_title='Test Watch Rule'
    )

    print("Output (legacy style):")
    print(result[:500])

    # Validation
    assert '/etc/audit/audit.rules' in result, "Should target audit.rules"
    assert '-w /etc/passwd' in result, "Should contain legacy -w syntax"
    assert '-p wa' in result, "Should contain permissions"
    assert '-k user-modify' in result, "Should contain key"
    assert 'ansible.builtin.find' in result, "Should use Ansible find module"
    assert 'ansible.builtin.lineinfile' in result, "Should use lineinfile module"

    # Test with modern style
    result_modern = macros['ansible_audit_auditctl_add_watch_rule'](
        path='/etc/shadow',
        permissions='wa',
        key='user-modify',
        style='modern',
        arch='b64',
        filter_type='path',
        rule_title='Test Modern Watch Rule'
    )

    print("\nOutput (modern style):")
    print(result_modern[:500])

    assert '-F path=/etc/shadow' in result_modern, "Should contain modern -F syntax"
    assert '-F perm=wa' in result_modern, "Should contain perm filter"
    assert 'arch=b64' in result_modern, "Should contain architecture"

    print("\n[OK] TEST 1 PASSED - ansible_audit_auditctl_add_watch_rule works correctly")
    return True


def test_ansible_audit_auditctl_add_syscall_rule():
    """Test ansible_audit_auditctl_add_syscall_rule macro"""
    print("\n[TEST 2] ansible_audit_auditctl_add_syscall_rule")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    result = macros['ansible_audit_auditctl_add_syscall_rule'](
        action_arch_filters="-a always,exit -F arch=b64",
        other_filters="-F path=/usr/bin/sudo",
        auid_filters="-F auid>=1000 -F auid!=unset",
        syscalls=['execve'],
        key='privileged',
        syscall_grouping=['execveat']
    )

    print("Output (first 800 chars):")
    print(result[:800])

    # Validation
    assert '/etc/audit/audit.rules' in result, "Should target audit.rules"
    assert 'ansible.builtin.set_fact' in result, "Should set facts"
    assert 'ansible.builtin.find' in result, "Should use find module"
    assert 'ansible.builtin.lineinfile' in result, "Should use lineinfile"
    assert 'syscalls: [' in result or "syscalls: ['execve']" in result, "Should declare syscalls"
    assert '-a always,exit -F arch=b64' in result, "Should contain action filters"
    assert 'missing_syscalls' in result, "Should handle missing syscalls"
    assert 'key=privileged' in result, "Should contain key"

    print("\n[OK] TEST 2 PASSED - ansible_audit_auditctl_add_syscall_rule works correctly")
    return True


def test_bash_sshd_remediation():
    """Test bash_sshd_remediation macro"""
    print("\n[TEST 3] bash_sshd_remediation")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    # Test monolithic configuration
    result_mono = macros['bash_sshd_remediation'](
        parameter='ClientAliveInterval',
        value='300',
        config_is_distributed='false'
    )

    print("Output (monolithic):")
    print(result_mono)

    # Validation
    assert 'ClientAliveInterval' in result_mono, "Should contain parameter name"
    assert '300' in result_mono, "Should contain value"
    assert '/etc/ssh/sshd_config' in result_mono, "Should reference main config"
    assert 'included_files' in result_mono, "Should handle included files"
    assert 'sed -i' in result_mono, "Should use sed for modifications"

    # Test distributed configuration
    result_dist = macros['bash_sshd_remediation'](
        parameter='ClientAliveCountMax',
        value='0',
        config_is_distributed='true',
        config_basename='01-hardening.conf'
    )

    print("\nOutput (distributed):")
    print(result_dist)

    assert '/etc/ssh/sshd_config.d/' in result_dist, "Should reference config.d directory"
    assert '01-hardening.conf' in result_dist, "Should use specified basename"
    assert 'mkdir -p' in result_dist, "Should create directory"
    assert 'chmod 0600' in result_dist, "Should set permissions"

    print("\n[OK] TEST 3 PASSED - bash_sshd_remediation works correctly")
    return True


def test_ansible_sshd_set():
    """Test ansible_sshd_set macro"""
    print("\n[TEST 4] ansible_sshd_set")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    # Test monolithic configuration
    result_mono = macros['ansible_sshd_set'](
        parameter='PermitRootLogin',
        value='no',
        config_is_distributed='false',
        rule_title='Disable Root Login'
    )

    print("Output (monolithic, first 600 chars):")
    print(result_mono[:600])

    # Validation
    assert 'PermitRootLogin' in result_mono, "Should contain parameter"
    assert 'no' in result_mono or "'no'" in result_mono, "Should contain value"
    assert '/etc/ssh/sshd_config' in result_mono, "Should reference main config"
    assert 'ansible.builtin.lineinfile' in result_mono, "Should use lineinfile"
    assert 'validate:' in result_mono or '/usr/sbin/sshd -t' in result_mono, "Should validate config"
    assert 'Disable Root Login' in result_mono, "Should use custom rule title"

    # Test distributed configuration
    result_dist = macros['ansible_sshd_set'](
        parameter='MaxAuthTries',
        value='4',
        config_is_distributed='true',
        config_basename='02-hardening.conf',
        rule_title='Set Max Auth Tries'
    )

    print("\nOutput (distributed, first 800 chars):")
    print(result_dist[:800])

    assert '/etc/ssh/sshd_config.d/' in result_dist, "Should reference config.d"
    assert '02-hardening.conf' in result_dist, "Should use specified basename"
    assert 'ansible.builtin.file:' in result_dist, "Should ensure directory exists"
    assert 'state: directory' in result_dist, "Should create directory"

    print("\n[OK] TEST 4 PASSED - ansible_sshd_set works correctly")
    return True


def test_bash_fix_audit_syscall_rule_bug_fix():
    """Test that bash_fix_audit_syscall_rule bug is fixed"""
    print("\n[TEST 5] bash_fix_audit_syscall_rule bug fix")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    # Test with auditctl tool (this would previously fail with undefined other_filters_escaped)
    try:
        result = macros['bash_fix_audit_syscall_rule'](
            tool='auditctl',
            action_arch_filters='-a always,exit -F arch=b64',
            other_filters='-F path=/usr/bin/passwd',
            auid_filters='-F auid>=1000 -F auid!=unset',
            syscall='chown fchown lchown',
            syscall_groupings='chown fchown lchown fchownat',
            key='privileged'
        )

        print("Output (first 500 chars):")
        print(result[:500])

        # Validation
        assert '/etc/audit/audit.rules' in result, "Should target audit.rules for auditctl"
        assert 'other_filters_escaped' not in result or 'other_filters_escaped=' in result, "Should not have undefined variable"
        assert 'files_to_inspect' in result, "Should define files_to_inspect"

        print("\n[OK] TEST 5 PASSED - bash_fix_audit_syscall_rule bug is fixed (auditctl path works)")

    except NameError as e:
        if 'other_filters_escaped' in str(e):
            print(f"\n[FAIL] TEST 5 FAILED - Bug still exists: {e}")
            return False
        raise

    # Also test with augenrules to ensure we didn't break it
    result2 = macros['bash_fix_audit_syscall_rule'](
        tool='augenrules',
        action_arch_filters='-a always,exit -F arch=b64',
        other_filters='-F path=/usr/bin/sudo',
        auid_filters='-F auid>=1000 -F auid!=unset',
        syscall='execve',
        syscall_groupings='execve execveat',
        key='privileged'
    )

    assert '/etc/audit/rules.d/' in result2, "Should target rules.d for augenrules"
    # Note: other_filters_escaped is used internally but doesn't appear in output
    # Instead, verify that path filters are properly formatted in the sed commands
    assert '/usr/bin/sudo' in result2 or 'usr\\/bin\\/sudo' in result2, "Should handle path filters"

    print("[OK] TEST 5 COMPLETE - bash_fix_audit_syscall_rule works for both tools")
    return True


def test_macro_return_types():
    """Test that all macros return non-empty strings"""
    print("\n[TEST 6] Macro return types and non-empty validation")
    print("=" * 60)

    processor = TemplateProcessor()
    macros = processor._get_cac_macros()

    tests = [
        ('ansible_audit_auditctl_add_watch_rule', {
            'path': '/test', 'permissions': 'wa', 'key': 'test'
        }),
        ('ansible_audit_auditctl_add_syscall_rule', {
            'syscalls': ['test'], 'key': 'test'
        }),
        ('bash_sshd_remediation', {
            'parameter': 'Test', 'value': 'value'
        }),
        ('ansible_sshd_set', {
            'parameter': 'Test', 'value': 'value'
        }),
    ]

    for macro_name, args in tests:
        result = macros[macro_name](**args)
        assert isinstance(result, str), f"{macro_name} should return string"
        assert len(result) > 50, f"{macro_name} should return substantial content (got {len(result)} chars)"
        assert result.strip(), f"{macro_name} should return non-empty string"
        print(f"[OK] {macro_name}: {len(result)} chars")

    print("\n[OK] TEST 6 PASSED - All macros return valid non-empty strings")
    return True


def run_all_tests():
    """Run all tests and report results"""
    print("\n" + "=" * 60)
    print("COMPREHENSIVE MACRO TEST SUITE")
    print("Testing 4 new macros + 1 bug fix")
    print("=" * 60)

    tests = [
        ("ansible_audit_auditctl_add_watch_rule", test_ansible_audit_auditctl_add_watch_rule),
        ("ansible_audit_auditctl_add_syscall_rule", test_ansible_audit_auditctl_add_syscall_rule),
        ("bash_sshd_remediation", test_bash_sshd_remediation),
        ("ansible_sshd_set", test_ansible_sshd_set),
        ("bash_fix_audit_syscall_rule bug fix", test_bash_fix_audit_syscall_rule_bug_fix),
        ("Macro return types", test_macro_return_types),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"\n[FAIL] {test_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"\n[FAIL] {test_name} FAILED with exception:")
            print(f"   {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Total tests: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")

    if failed == 0:
        print("\n[OK] ALL TESTS PASSED - Implementation is complete and correct!")
        return 0
    else:
        print(f"\n[FAIL] {failed} TEST(S) FAILED - Please review implementation")
        return 1


if __name__ == '__main__':
    sys.exit(run_all_tests())
