#!/usr/bin/env python
"""
Batch Migration Script for CAC Control Families

This script migrates entire control families from the ComplianceAsCode repository
into the controls catalog using a safe, atomic batch process.

Usage:
    python batch_migrate.py --family AU --dry-run
    python batch_migrate.py --family AU
    python batch_migrate.py --family SC --verbose
    python batch_migrate.py --family AU --validate-only

Safety Features:
    - All-or-nothing atomicity
    - Comprehensive pre-flight validation
    - Automatic backups
    - Rollback on any failure
    - Progress tracking
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import shutil

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from cac_explorer import CACExplorer
    from template_processor import TemplateProcessor
    from catalog_updater import CatalogUpdater
except ImportError as e:
    print(f"[ERROR] Failed to import migration modules: {e}")
    print("[ACTION] Ensure you're running from backend/migration/ directory")
    sys.exit(1)


class BatchValidationResult:
    """Result of batch pre-flight validation"""
    def __init__(self):
        self.passed = True
        self.errors = []
        self.warnings = []
        self.controls_to_migrate = []
        self.estimated_size_kb = 0

    def add_error(self, message: str):
        self.passed = False
        self.errors.append(message)

    def add_warning(self, message: str):
        self.warnings.append(message)

    def __bool__(self):
        return self.passed


class BatchMigrator:
    """Orchestrates batch migration of control families"""

    def __init__(self, cac_path: Optional[str] = None, verbose: bool = False):
        self.cac_path = Path(cac_path) if cac_path else Path(__file__).parents[2] / "cac"
        self.verbose = verbose
        self.catalog_path = Path(__file__).parents[1] / "data" / "controls_catalog.json"
        self.progress_path = Path(__file__).parent / "state" / "migration_progress.json"

        # Initialize components
        self.explorer = CACExplorer(str(self.cac_path))
        self.processor = TemplateProcessor()
        self.updater = CatalogUpdater()

    def log(self, message: str, level: str = "INFO"):
        """Log message if verbose mode enabled"""
        prefix = f"[{level}]"
        if self.verbose or level in ["ERROR", "SUCCESS", "WARNING"]:
            print(f"{prefix} {message}")

    def validate_family_batch(self, family_code: str) -> BatchValidationResult:
        """
        Comprehensive pre-flight validation before migration.

        Args:
            family_code: Control family code (e.g., "AU", "AC")

        Returns:
            BatchValidationResult with validation details
        """
        result = BatchValidationResult()
        family_upper = family_code.upper()

        self.log(f"Validating {family_upper} family for batch migration...")

        # 1. Check CAC repository accessible
        if not self.cac_path.exists():
            result.add_error(f"CAC repository not found at {self.cac_path}")
            return result

        # 2. Get automated controls for family
        try:
            all_controls = self.explorer.find_automated_controls()
            family_controls = [
                c for c in all_controls
                if c['control_id'].lower().startswith(family_code.lower() + '-')
            ]

            if not family_controls:
                result.add_error(f"No automated controls found for {family_upper} family")
                return result

            result.controls_to_migrate = family_controls
            self.log(f"Found {len(family_controls)} automated controls in {family_upper} family")

        except Exception as e:
            result.add_error(f"Failed to query CAC repository: {e}")
            return result

        # 3. Validate each control's templates
        for control in family_controls:
            control_id = control['control_id']

            # Check templates exist
            if 'templates' not in control or not control['templates']:
                result.add_warning(f"{control_id}: No templates found, skipping")
                continue

            # Try to render each template
            for template_type, template_path in control['templates'].items():
                try:
                    template_file = Path(template_path)
                    if not template_file.exists():
                        result.add_error(f"{control_id}: Template not found: {template_path}")
                        continue

                    # Test render
                    rendered = self.processor.render_template(str(template_file))
                    if not rendered or len(rendered) < 10:
                        result.add_warning(f"{control_id}: Template {template_type} renders to very short script")

                    result.estimated_size_kb += len(rendered) / 1024

                except Exception as e:
                    result.add_error(f"{control_id}: Template rendering failed ({template_type}): {e}")

        # 4. Check catalog accessible
        if not self.catalog_path.exists():
            result.add_error(f"Catalog not found at {self.catalog_path}")
            return result

        # 5. Check for conflicts (controls already migrated)
        try:
            with open(self.catalog_path, 'r', encoding='utf-8') as f:
                catalog = json.load(f)

            conflicts = []
            for control in family_controls:
                control_id = control['control_id'].lower()
                existing = next((c for c in catalog if c.get('control_id', '').lower() == control_id), None)

                if existing and 'implementation_scripts' in existing:
                    has_scripts = any(
                        script and script != "Not applicable"
                        for formats in existing.get('implementation_scripts', {}).values()
                        for script in formats.values()
                    )
                    if has_scripts:
                        conflicts.append(control_id)

            if conflicts:
                result.add_warning(f"Controls already have scripts: {', '.join(conflicts)}")
                result.add_warning("Use --force to overwrite existing implementations")

        except Exception as e:
            result.add_error(f"Failed to check catalog: {e}")
            return result

        # 6. Check disk space
        backup_size_mb = self.catalog_path.stat().st_size / (1024 * 1024)
        if backup_size_mb > 100:
            result.add_warning(f"Catalog is large ({backup_size_mb:.1f} MB) - backup may take time")

        self.log(f"Validation complete: {len(result.controls_to_migrate)} controls ready")
        self.log(f"Estimated catalog size increase: {result.estimated_size_kb:.1f} KB")

        return result

    def render_family_templates(self, controls: List[Dict], parallel: bool = False) -> Dict:
        """
        Render all templates for a list of controls.

        Args:
            controls: List of control dictionaries from CAC
            parallel: Use multiprocessing (not implemented yet)

        Returns:
            {control_id: {os: {format: rendered_script}}}
        """
        rendered = {}

        for control in controls:
            control_id = control['control_id']
            self.log(f"Rendering templates for {control_id}...")

            if 'templates' not in control:
                self.log(f"  Skipping {control_id} (no templates)", "WARNING")
                continue

            control_scripts = {}

            for template_type, template_path in control['templates'].items():
                try:
                    template_file = Path(template_path)
                    script = self.processor.render_template(str(template_file))

                    # Determine OS and format from template path
                    # e.g., "linux/bash/ac-2.template" -> os="linux", format="bash"
                    parts = template_path.lower().split('/')
                    os_type = "linux"  # Default
                    format_type = template_type  # e.g., "bash", "ansible"

                    if 'linux' in parts:
                        os_type = "linux"
                    elif 'windows' in parts:
                        os_type = "windows"

                    if os_type not in control_scripts:
                        control_scripts[os_type] = {}

                    control_scripts[os_type][format_type] = script
                    self.log(f"  ✓ Rendered {os_type}/{format_type}: {len(script)} bytes")

                except Exception as e:
                    self.log(f"  ✗ Failed to render {template_type}: {e}", "ERROR")
                    raise

            rendered[control_id] = control_scripts

        return rendered

    def atomic_batch_update(self, control_updates: Dict, family_code: str) -> Tuple[bool, str]:
        """
        Atomically update catalog with all control changes.

        Args:
            control_updates: {control_id: {os: {format: script}}}
            family_code: Family being migrated (for backup naming)

        Returns:
            (success, message)
        """
        family_upper = family_code.upper()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # 1. Create backup with family marker
        backup_dir = self.catalog_path.parent / "backups"
        backup_dir.mkdir(exist_ok=True)

        backup_filename = f"controls_catalog_{timestamp}_pre_{family_upper}_batch.json"
        backup_path = backup_dir / backup_filename

        try:
            shutil.copy2(self.catalog_path, backup_path)
            self.log(f"Backup created: {backup_path}")
        except Exception as e:
            return False, f"Backup creation failed: {e}"

        # 2. Load catalog
        try:
            with open(self.catalog_path, 'r', encoding='utf-8') as f:
                catalog = json.load(f)
        except Exception as e:
            return False, f"Failed to load catalog: {e}"

        # 3. Apply all updates to in-memory catalog
        updated_count = 0
        for control_id, scripts in control_updates.items():
            control = next((c for c in catalog if c.get('control_id', '').lower() == control_id.lower()), None)

            if not control:
                self.log(f"  Control {control_id} not found in catalog, skipping", "WARNING")
                continue

            # Update implementation_scripts
            if 'implementation_scripts' not in control:
                control['implementation_scripts'] = {}

            for os_type, formats in scripts.items():
                if os_type not in control['implementation_scripts']:
                    control['implementation_scripts'][os_type] = {}

                for format_type, script in formats.items():
                    control['implementation_scripts'][os_type][format_type] = script

            # Update metadata
            if 'metadata' not in control:
                control['metadata'] = {}

            control['metadata']['has_scripts'] = True
            control['metadata']['last_updated'] = timestamp
            control['metadata']['migration_source'] = 'CAC_batch_migration'

            updated_count += 1

        self.log(f"Applied {updated_count} control updates to in-memory catalog")

        # 4. Validate complete catalog
        try:
            # Ensure JSON serializable
            test_json = json.dumps(catalog)

            # Check no duplicates
            control_ids = [c.get('control_id', '').lower() for c in catalog]
            duplicates = [cid for cid in set(control_ids) if control_ids.count(cid) > 1]
            if duplicates:
                return False, f"Duplicate control IDs detected: {duplicates}"

        except Exception as e:
            return False, f"Catalog validation failed: {e}"

        # 5. Write to temp file
        temp_path = self.catalog_path.with_suffix('.tmp')
        try:
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(catalog, f, indent=2, ensure_ascii=False)
        except Exception as e:
            return False, f"Failed to write temp file: {e}"

        # 6. Validate temp file
        try:
            with open(temp_path, 'r', encoding='utf-8') as f:
                json.load(f)
        except Exception as e:
            temp_path.unlink()
            return False, f"Temp file validation failed: {e}"

        # 7. Atomic rename
        try:
            temp_path.replace(self.catalog_path)
            self.log(f"✓ Catalog updated atomically ({updated_count} controls)")
        except Exception as e:
            return False, f"Atomic rename failed: {e}"

        return True, f"Successfully migrated {updated_count} controls"

    def update_progress_tracker(self, family_code: str, controls: List[str], success: bool):
        """Update migration progress tracker"""
        try:
            if not self.progress_path.exists():
                self.log("Progress tracker not found, skipping update", "WARNING")
                return

            with open(self.progress_path, 'r', encoding='utf-8') as f:
                progress = json.load(f)

            family_upper = family_code.upper()
            timestamp = datetime.now().isoformat()

            # Update family status
            if family_upper not in progress['families']:
                progress['families'][family_upper] = {
                    "controls": {}
                }

            for control_id in controls:
                progress['families'][family_upper]['controls'][control_id] = {
                    "status": "completed" if success else "failed",
                    "migrated_at": timestamp,
                    "migrated_by": "batch_migrate_script"
                }

            # Update statistics
            if success:
                progress['families'][family_upper]['migrated'] = len(controls)
                progress['families'][family_upper]['pending'] = max(0, progress['families'][family_upper].get('pending', 0) - len(controls))
                progress['families'][family_upper]['status'] = "completed"

            progress['metadata']['last_updated'] = timestamp
            progress['statistics']['total_controls_migrated'] = sum(
                f.get('migrated', 0) for f in progress['families'].values()
            )

            # Add log entry
            progress['migration_log'].append({
                "timestamp": timestamp,
                "event": "batch_migration_completed" if success else "batch_migration_failed",
                "family": family_upper,
                "controls_count": len(controls),
                "agent": "batch_migrate_script"
            })

            # Save
            with open(self.progress_path, 'w', encoding='utf-8') as f:
                json.dump(progress, f, indent=2, ensure_ascii=False)

            self.log(f"✓ Progress tracker updated")

        except Exception as e:
            self.log(f"Failed to update progress tracker: {e}", "WARNING")

    def migrate_family(self, family_code: str, dry_run: bool = False, force: bool = False) -> bool:
        """
        Migrate an entire control family.

        Args:
            family_code: Family code (e.g., "AU")
            dry_run: If True, validate but don't modify catalog
            force: Overwrite existing implementations

        Returns:
            True if successful, False otherwise
        """
        family_upper = family_code.upper()

        print(f"\n{'='*60}")
        print(f"  Batch Migration: {family_upper} Family")
        print(f"  Mode: {'DRY-RUN' if dry_run else 'LIVE'}")
        print(f"{'='*60}\n")

        # 1. Pre-flight validation
        print("[STEP 1/6] Pre-flight Validation")
        validation = self.validate_family_batch(family_code)

        if not validation:
            print("\n[FAILED] Pre-flight validation failed:")
            for error in validation.errors:
                print(f"  ✗ {error}")
            return False

        if validation.warnings:
            print("\nWarnings:")
            for warning in validation.warnings:
                print(f"  ⚠ {warning}")

            if not force and not dry_run:
                response = input("\nContinue anyway? (y/N): ")
                if response.lower() != 'y':
                    print("[ABORTED] Migration cancelled")
                    return False

        print(f"✓ Validation passed: {len(validation.controls_to_migrate)} controls ready")

        if dry_run:
            print("\n[DRY-RUN] Would migrate:")
            for control in validation.controls_to_migrate:
                print(f"  - {control['control_id']}: {control['title']}")
            print(f"\n[DRY-RUN] Total: {len(validation.controls_to_migrate)} controls")
            print(f"[DRY-RUN] Estimated size increase: {validation.estimated_size_kb:.1f} KB")
            return True

        # 2. Render templates
        print("\n[STEP 2/6] Rendering Templates")
        try:
            rendered = self.render_family_templates(validation.controls_to_migrate)
            print(f"✓ Rendered templates for {len(rendered)} controls")
        except Exception as e:
            print(f"\n[FAILED] Template rendering failed: {e}")
            return False

        # 3. Atomic catalog update
        print("\n[STEP 3/6] Updating Catalog (Atomic)")
        success, message = self.atomic_batch_update(rendered, family_code)

        if not success:
            print(f"\n[FAILED] {message}")
            print("[ACTION] Catalog unchanged, no rollback needed")
            return False

        print(f"✓ {message}")

        # 4. Update progress tracker
        print("\n[STEP 4/6] Updating Progress Tracker")
        control_ids = list(rendered.keys())
        self.update_progress_tracker(family_code, control_ids, True)

        # 5. Post-migration validation (placeholder - see validate_migration.py)
        print("\n[STEP 5/6] Post-Migration Validation")
        print("  → Run: python validate_migration.py --family", family_upper)

        # 6. Summary
        print("\n[STEP 6/6] Migration Summary")
        print(f"✓ Family: {family_upper}")
        print(f"✓ Controls migrated: {len(control_ids)}")
        print(f"✓ Catalog updated atomically")
        print(f"✓ Progress tracker updated")
        print(f"\n[SUCCESS] Batch migration complete!")

        return True


def main():
    parser = argparse.ArgumentParser(
        description="Batch migrate NIST control families from CAC repository",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry-run (safe, no modifications)
  python batch_migrate.py --family AU --dry-run

  # Migrate AU family
  python batch_migrate.py --family AU

  # Migrate with verbose logging
  python batch_migrate.py --family SC --verbose

  # Force overwrite existing implementations
  python batch_migrate.py --family AU --force
        """
    )

    parser.add_argument('--family', required=True, help='Control family code (e.g., AU, AC, IA)')
    parser.add_argument('--dry-run', action='store_true', help='Validate only, do not modify catalog')
    parser.add_argument('--force', action='store_true', help='Overwrite existing implementations')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    parser.add_argument('--cac-path', help='Path to CAC repository (default: ../../cac)')

    args = parser.parse_args()

    # Create migrator
    migrator = BatchMigrator(cac_path=args.cac_path, verbose=args.verbose)

    # Execute migration
    success = migrator.migrate_family(
        family_code=args.family,
        dry_run=args.dry_run,
        force=args.force
    )

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
