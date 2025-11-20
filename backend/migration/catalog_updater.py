#!/usr/bin/env python
"""
Catalog Updater Module

This module provides safe, atomic updates to the controls_catalog.json file.
All updates include automatic backups, validation, and rollback capabilities
to ensure the catalog is never corrupted.

Safety Mechanisms:
1. Automatic backup before any modification
2. Atomic updates via temp file + rename
3. JSON validation before commit
4. No-duplicate enforcement
5. Rollback capability

Usage:
    from catalog_updater import CatalogUpdater

    updater = CatalogUpdater()

    # Update single control
    success = updater.update_control(
        "ac-2",
        implementation_scripts={
            "linux": {"bash": "#!/bin/bash\\n..."}
        },
        metadata={"migration_source": "CAC"}
    )

    # Batch update multiple controls
    updates = [
        {"control_id": "ac-2", "scripts": {...}, "metadata": {...}},
        {"control_id": "au-2", "scripts": {...}, "metadata": {...}},
    ]
    success = updater.batch_update_controls(updates)

    # Rollback to backup
    updater.rollback_to_backup("/path/to/backup.json")
"""

import json
import shutil
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from collections import Counter


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class CatalogUpdater:
    """
    Safe updater for controls_catalog.json.

    Provides atomic update operations with automatic backups and validation.
    Ensures catalog integrity is maintained even during failures.

    Attributes:
        catalog_path (Path): Path to controls_catalog.json
        backup_dir (Path): Directory for backup files
    """

    def __init__(
        self,
        catalog_path: Optional[str] = None,
        backup_dir: Optional[str] = None
    ):
        """
        Initialize Catalog Updater.

        Args:
            catalog_path: Path to controls_catalog.json (default: auto-detect)
            backup_dir: Path to backup directory (default: catalog_path/../backups)

        Raises:
            ValueError: If catalog path doesn't exist
        """
        if catalog_path:
            self.catalog_path = Path(catalog_path)
        else:
            # Auto-detect relative to this file
            self.catalog_path = Path(__file__).parents[1] / "data" / "controls_catalog.json"

        if not self.catalog_path.exists():
            raise ValueError(f"Catalog not found: {self.catalog_path}")

        # Setup backup directory
        if backup_dir:
            self.backup_dir = Path(backup_dir)
        else:
            self.backup_dir = self.catalog_path.parent / "backups"

        self.backup_dir.mkdir(exist_ok=True)

        logger.info(f"Catalog Updater initialized: {self.catalog_path}")
        logger.info(f"Backups will be stored in: {self.backup_dir}")

    def update_control(
        self,
        control_id: str,
        implementation_scripts: Dict[str, Dict[str, str]],
        metadata: Optional[Dict] = None,
        create_backup: bool = True
    ) -> bool:
        """
        Update implementation scripts for a single control.

        Args:
            control_id: Control identifier (e.g., "ac-2")
            implementation_scripts: Nested dict of {os: {format: script}}
                Example: {"linux": {"bash": "#!/bin/bash\\n...", "ansible": "---\\n..."}}
            metadata: Optional metadata to update (merged with existing)
            create_backup: Whether to create backup (default: True)

        Returns:
            True if update successful, False otherwise
        """
        control_id_lower = control_id.lower()

        try:
            # Create backup if requested
            if create_backup:
                backup_path = self._create_backup(f"pre_update_{control_id_lower}")
                if not backup_path:
                    logger.error("Backup creation failed, aborting update")
                    return False

            # Load catalog
            catalog = self._load_catalog()

            # Find control
            control = self._find_control(catalog, control_id_lower)
            if not control:
                logger.error(f"Control {control_id} not found in catalog")
                return False

            # Update implementation_scripts
            if 'implementation_scripts' not in control:
                control['implementation_scripts'] = {}

            for os_type, formats in implementation_scripts.items():
                if os_type not in control['implementation_scripts']:
                    control['implementation_scripts'][os_type] = {}

                for format_type, script in formats.items():
                    control['implementation_scripts'][os_type][format_type] = script

            # Update metadata
            if 'metadata' not in control:
                control['metadata'] = {}

            if metadata:
                control['metadata'].update(metadata)

            # Always update timestamp
            control['metadata']['last_updated'] = datetime.now().isoformat()
            control['metadata']['has_scripts'] = True

            # Validate and save
            if not self._validate_catalog(catalog):
                logger.error("Catalog validation failed after update")
                return False

            if not self._save_catalog_atomic(catalog):
                logger.error("Failed to save catalog atomically")
                return False

            logger.info(f"✓ Updated control {control_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to update control {control_id}: {e}")
            return False

    def batch_update_controls(
        self,
        updates: List[Dict],
        create_backup: bool = True
    ) -> Tuple[bool, str]:
        """
        Update multiple controls atomically.

        All updates succeed or all fail (all-or-nothing).

        Args:
            updates: List of update dictionaries:
                [
                    {
                        "control_id": "ac-2",
                        "scripts": {os: {format: script}},
                        "metadata": {...}
                    },
                    ...
                ]
            create_backup: Whether to create backup (default: True)

        Returns:
            Tuple of (success: bool, message: str)
        """
        if not updates:
            return True, "No updates to apply"

        try:
            # Create backup
            if create_backup:
                backup_path = self._create_backup("pre_batch_update")
                if not backup_path:
                    return False, "Backup creation failed"

            # Load catalog
            catalog = self._load_catalog()

            # Apply all updates to in-memory catalog
            updated_count = 0

            for update in updates:
                control_id = update.get('control_id', '').lower()
                scripts = update.get('scripts', {})
                metadata = update.get('metadata', {})

                if not control_id:
                    logger.warning("Skipping update with missing control_id")
                    continue

                # Find control
                control = self._find_control(catalog, control_id)
                if not control:
                    logger.warning(f"Control {control_id} not found, skipping")
                    continue

                # Update scripts
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

                control['metadata'].update(metadata)
                control['metadata']['last_updated'] = datetime.now().isoformat()
                control['metadata']['has_scripts'] = True

                updated_count += 1

            # Validate complete catalog
            if not self._validate_catalog(catalog):
                return False, "Catalog validation failed after batch update"

            # Save atomically
            if not self._save_catalog_atomic(catalog):
                return False, "Failed to save catalog atomically"

            logger.info(f"✓ Batch update complete: {updated_count} controls updated")
            return True, f"Successfully updated {updated_count} controls"

        except Exception as e:
            logger.error(f"Batch update failed: {e}")
            return False, f"Batch update error: {e}"

    def rollback_to_backup(self, backup_path: str) -> bool:
        """
        Restore catalog from a backup file.

        Args:
            backup_path: Path to backup file

        Returns:
            True if rollback successful, False otherwise
        """
        backup_file = Path(backup_path)

        if not backup_file.exists():
            logger.error(f"Backup file not found: {backup_path}")
            return False

        try:
            # Validate backup file
            with open(backup_file, 'r', encoding='utf-8') as f:
                backup_catalog = json.load(f)

            if not self._validate_catalog(backup_catalog):
                logger.error("Backup file is invalid or corrupted")
                return False

            # Create backup of current state before rollback
            pre_rollback_backup = self._create_backup("pre_rollback")
            if pre_rollback_backup:
                logger.info(f"Created pre-rollback backup: {pre_rollback_backup}")

            # Copy backup to catalog location (atomic)
            shutil.copy2(backup_file, self.catalog_path.with_suffix('.tmp'))
            self.catalog_path.with_suffix('.tmp').replace(self.catalog_path)

            logger.info(f"✓ Rolled back to backup: {backup_path}")
            return True

        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False

    def _create_backup(self, suffix: str = "") -> Optional[Path]:
        """
        Create timestamped backup of catalog.

        Args:
            suffix: Optional suffix for backup filename

        Returns:
            Path to backup file or None if failed
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        suffix_str = f"_{suffix}" if suffix else ""
        backup_filename = f"controls_catalog_{timestamp}{suffix_str}.json"
        backup_path = self.backup_dir / backup_filename

        try:
            shutil.copy2(self.catalog_path, backup_path)
            logger.debug(f"Created backup: {backup_path}")
            return backup_path

        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            return None

    def _load_catalog(self) -> List[Dict]:
        """
        Load catalog from JSON file.

        Returns:
            Catalog list

        Raises:
            Exception: If catalog cannot be loaded
        """
        with open(self.catalog_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save_catalog_atomic(self, catalog: List[Dict]) -> bool:
        """
        Save catalog atomically via temp file + rename.

        Args:
            catalog: Catalog list to save

        Returns:
            True if successful, False otherwise
        """
        temp_path = self.catalog_path.with_suffix('.tmp')

        try:
            # Write to temp file
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(catalog, f, indent=2, ensure_ascii=False)

            # Validate temp file
            with open(temp_path, 'r', encoding='utf-8') as f:
                test_load = json.load(f)

            if not isinstance(test_load, list):
                logger.error("Temp file validation failed: not a list")
                temp_path.unlink()
                return False

            # Atomic rename
            temp_path.replace(self.catalog_path)
            logger.debug("Catalog saved atomically")
            return True

        except Exception as e:
            logger.error(f"Failed to save catalog: {e}")
            if temp_path.exists():
                temp_path.unlink()
            return False

    def _find_control(self, catalog: List[Dict], control_id: str) -> Optional[Dict]:
        """
        Find control in catalog by ID.

        Args:
            catalog: Catalog list
            control_id: Control ID (lowercase)

        Returns:
            Control dictionary or None if not found
        """
        for control in catalog:
            if control.get('control_id', '').lower() == control_id:
                return control
        return None

    def _validate_catalog(self, catalog: List[Dict]) -> bool:
        """
        Validate catalog structure and content.

        Args:
            catalog: Catalog list

        Returns:
            True if valid, False otherwise
        """
        if not isinstance(catalog, list):
            logger.error("Catalog must be a list")
            return False

        if not catalog:
            logger.error("Catalog is empty")
            return False

        # Check for duplicate control IDs
        control_ids = [c.get('control_id', '').lower() for c in catalog if 'control_id' in c]
        duplicates = [cid for cid, count in Counter(control_ids).items() if count > 1]

        if duplicates:
            logger.error(f"Duplicate control IDs found: {duplicates}")
            return False

        # Validate each control has required fields
        for idx, control in enumerate(catalog):
            if 'control_id' not in control:
                logger.error(f"Control at index {idx} missing control_id")
                return False

            if 'control_name' not in control:
                logger.warning(f"Control {control['control_id']} missing control_name")

        logger.debug(f"Catalog validation passed: {len(catalog)} controls")
        return True

    def get_backup_list(self) -> List[Dict]:
        """
        Get list of available backups.

        Returns:
            List of backup info dictionaries:
            [
                {
                    "path": "/path/to/backup.json",
                    "timestamp": "2025-11-10_12:30:45",
                    "size_mb": 1.5
                },
                ...
            ]
        """
        backups = []

        for backup_file in sorted(self.backup_dir.glob("*.json"), reverse=True):
            try:
                size_mb = backup_file.stat().st_size / (1024 * 1024)
                timestamp = backup_file.stem.split('_', 2)[-1]

                backups.append({
                    "path": str(backup_file),
                    "filename": backup_file.name,
                    "timestamp": timestamp,
                    "size_mb": round(size_mb, 2)
                })
            except Exception:
                continue

        return backups


def main():
    """CLI interface for Catalog Updater"""
    import argparse
    import sys

    parser = argparse.ArgumentParser(
        description="Safely update controls catalog",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # List backups
  python catalog_updater.py --list-backups

  # Rollback to specific backup
  python catalog_updater.py --rollback /path/to/backup.json

  # Validate catalog
  python catalog_updater.py --validate
        """
    )

    parser.add_argument(
        '--catalog-path',
        help='Path to controls_catalog.json'
    )
    parser.add_argument(
        '--list-backups',
        action='store_true',
        help='List available backups'
    )
    parser.add_argument(
        '--rollback',
        help='Rollback to specified backup file'
    )
    parser.add_argument(
        '--validate',
        action='store_true',
        help='Validate catalog structure'
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
        updater = CatalogUpdater(catalog_path=args.catalog_path)

        if args.list_backups:
            # List backups
            backups = updater.get_backup_list()

            if not backups:
                print("No backups found")
                return 0

            print(f"Found {len(backups)} backups:")
            print("-" * 80)
            for backup in backups:
                print(f"{backup['filename']:60} | {backup['size_mb']:6.2f} MB")

            return 0

        elif args.rollback:
            # Rollback to backup
            success = updater.rollback_to_backup(args.rollback)

            if success:
                print(f"[SUCCESS] Rolled back to: {args.rollback}")
                return 0
            else:
                print(f"[FAILED] Rollback failed")
                return 1

        elif args.validate:
            # Validate catalog
            catalog = updater._load_catalog()
            is_valid = updater._validate_catalog(catalog)

            if is_valid:
                print(f"[VALID] Catalog is valid ({len(catalog)} controls)")
                return 0
            else:
                print("[INVALID] Catalog validation failed")
                return 1

        else:
            print("Use --list-backups, --rollback, or --validate. See --help for usage.")
            return 1

    except Exception as e:
        logger.error(f"Error: {e}")
        if args.verbose:
            raise
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
