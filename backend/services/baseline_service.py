"""
Baseline Service Module

This service provides optimized access to NIST 800-53 controls with pre-computed
baseline and family indexes for O(1) filtering performance.

Key features:
- In-memory caching of controls catalog
- Pre-computed baseline × family indexes
- Efficient filtering and search
- Script availability detection
"""

import json
from pathlib import Path
from typing import List, Dict, Optional, Set
from datetime import datetime


class BaselineService:
    """
    Service for managing NIST 800-53 baseline controls with optimized indexing.

    This service loads the controls catalog once on initialization and builds
    pre-computed indexes for fast baseline and family filtering.
    """

    def __init__(self):
        """Initialize the service and build indexes."""
        self.controls: List[Dict] = []
        self.controls_by_id: Dict[str, Dict] = {}
        self.baseline_indexes: Dict[str, Dict[str, List[Dict]]] = {}
        self.families: Set[str] = set()

        # Load controls and build indexes
        self._load_controls()
        self._build_indexes()

    def _load_controls(self) -> None:
        """Load controls from controls_catalog.json."""
        base_dir = Path(__file__).resolve().parents[1] / "data"
        catalog_path = base_dir / "controls_catalog.json"

        if not catalog_path.exists():
            raise FileNotFoundError(
                f"Controls catalog not found at {catalog_path}. "
                "Run phase 1 script to generate controls_catalog.json"
            )

        try:
            with open(catalog_path, 'r', encoding='utf-8') as f:
                self.controls = json.load(f)

            # Build control ID index for O(1) lookups
            self.controls_by_id = {
                control['control_id']: control
                for control in self.controls
            }

            # Verify AC-2 has scripts
            if 'ac-2' in self.controls_by_id:
                impl_keys = list(self.controls_by_id['ac-2'].get('implementation_scripts', {}).keys())
                print(f"[BaselineService] AC-2 implementation_scripts: {impl_keys}")

            print(f"[BaselineService] Loaded {len(self.controls)} controls from catalog")

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in controls catalog: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to load controls catalog: {e}")

    def _build_indexes(self) -> None:
        """
        Build pre-computed indexes for O(1) baseline and family filtering.

        Creates nested dictionaries:
        baseline_indexes[baseline][family] = [controls]

        This allows instant filtering without iterating through all controls.
        """
        start_time = datetime.now()

        # Initialize baseline indexes
        self.baseline_indexes = {
            'low': {},
            'moderate': {},
            'high': {}
        }

        # Build indexes
        for control in self.controls:
            # Track families
            family = control.get('family', 'Unknown')
            self.families.add(family)

            # Index by baseline
            baselines = control.get('baselines', {})

            for baseline_name, is_included in baselines.items():
                if is_included:
                    # Ensure family key exists
                    if family not in self.baseline_indexes[baseline_name]:
                        self.baseline_indexes[baseline_name][family] = []

                    # Add control to baseline × family index
                    self.baseline_indexes[baseline_name][family].append(control)

        # Calculate index build time
        elapsed_ms = (datetime.now() - start_time).total_seconds() * 1000

        # Log statistics
        low_count = sum(len(controls) for controls in self.baseline_indexes['low'].values())
        moderate_count = sum(len(controls) for controls in self.baseline_indexes['moderate'].values())
        high_count = sum(len(controls) for controls in self.baseline_indexes['high'].values())

        print(f"[BaselineService] Built indexes in {elapsed_ms:.2f}ms")
        print(f"[BaselineService] Baseline counts: LOW={low_count}, MODERATE={moderate_count}, HIGH={high_count}")
        print(f"[BaselineService] Families: {len(self.families)}")

    def get_baseline_controls(
        self,
        baseline: str,
        family: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict]:
        """
        Get controls for a baseline with optional filtering.

        Args:
            baseline: Baseline name (low, moderate, high)
            family: Optional family filter
            search: Optional search term (searches ID, name, description)

        Returns:
            List of matching controls

        Raises:
            ValueError: If baseline is invalid
        """
        baseline_lower = baseline.lower()

        if baseline_lower not in self.baseline_indexes:
            raise ValueError(
                f"Invalid baseline '{baseline}'. Must be one of: low, moderate, high"
            )

        # Get controls from index (O(1) lookup)
        if family:
            # Filter by specific family
            controls = self.baseline_indexes[baseline_lower].get(family, [])
        else:
            # Get all controls for baseline (concatenate all families)
            controls = []
            for family_controls in self.baseline_indexes[baseline_lower].values():
                controls.extend(family_controls)

        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            controls = [
                c for c in controls
                if (search_lower in c.get('control_id', '').lower() or
                    search_lower in c.get('control_name', '').lower() or
                    search_lower in c.get('plain_english_explanation', '').lower())
            ]

        return controls

    def get_baseline_summary(self, baseline: str) -> Dict:
        """
        Get summary statistics for a baseline.

        Args:
            baseline: Baseline name (low, moderate, high)

        Returns:
            Dictionary with baseline statistics
        """
        baseline_lower = baseline.lower()

        if baseline_lower not in self.baseline_indexes:
            raise ValueError(
                f"Invalid baseline '{baseline}'. Must be one of: low, moderate, high"
            )

        # Calculate statistics
        family_stats = {}
        total_controls = 0
        controls_with_scripts = 0

        for family, controls in self.baseline_indexes[baseline_lower].items():
            count = len(controls)
            with_scripts = sum(1 for c in controls if c.get('metadata', {}).get('has_scripts', False))

            family_stats[family] = {
                'total': count,
                'with_scripts': with_scripts,
                'without_scripts': count - with_scripts
            }

            total_controls += count
            controls_with_scripts += with_scripts

        return {
            'baseline': baseline,
            'total_controls': total_controls,
            'controls_with_scripts': controls_with_scripts,
            'controls_without_scripts': total_controls - controls_with_scripts,
            'families': family_stats
        }

    def get_control_by_id(self, control_id: str) -> Optional[Dict]:
        """
        Get a control by its ID with O(1) lookup.

        Args:
            control_id: Control identifier (e.g., "ac-2")

        Returns:
            Control dictionary or None if not found
        """
        return self.controls_by_id.get(control_id.lower())

    def get_available_formats(self, control_id: str) -> Dict:
        """
        Get available script formats for a control.

        Args:
            control_id: Control identifier

        Returns:
            Dictionary mapping OS to available script formats
        """
        control = self.get_control_by_id(control_id)

        if not control:
            return {}

        implementation_scripts = control.get('implementation_scripts', {})
        available = {}

        for os_name, formats in implementation_scripts.items():
            available_formats = []

            for format_name, script in formats.items():
                # Check if script exists and is not "Not applicable"
                if script and script != "Not applicable":
                    available_formats.append(format_name)

            if available_formats:
                available[os_name] = available_formats

        return available

    def get_all_families(self) -> List[str]:
        """
        Get list of all control families.

        Returns:
            Sorted list of family names
        """
        return sorted(list(self.families))

    def get_all_baselines(self) -> List[str]:
        """
        Get list of all available baselines.

        Returns:
            List of baseline names
        """
        return ['low', 'moderate', 'high']


# Global singleton instance - initialized as None, created on first access
_baseline_service_instance: Optional[BaselineService] = None


def get_baseline_service() -> BaselineService:
    """
    Get or create the global BaselineService instance.

    This function implements lazy singleton pattern to ensure
    the service is initialized only once.

    Returns:
        BaselineService instance
    """
    global _baseline_service_instance

    if _baseline_service_instance is None:
        _baseline_service_instance = BaselineService()

    return _baseline_service_instance


def reset_baseline_service():
    """
    Reset the baseline service singleton to force reload from JSON files.
    Use this when controls_catalog.json or other data files are updated.
    """
    global _baseline_service_instance
    _baseline_service_instance = None
    print("Baseline service singleton reset - will reload on next access")


# Singleton proxy that delays initialization until first attribute access
class _LazyBaselineService:
    """Lazy proxy for BaselineService that initializes on first use."""

    def __getattr__(self, name):
        # Get or create the real service instance
        service = get_baseline_service()
        # Return the requested attribute from the real service
        return getattr(service, name)


# Create lazy singleton instance for direct import
baseline_service = _LazyBaselineService()
# Trigger reload on module import
reset_baseline_service()
