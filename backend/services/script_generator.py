"""
Script Generator Service

Production-ready script generation framework for NIST 800-53 control implementations.
Generates Bash, Ansible, and PowerShell scripts from templates with validation.

Features:
- Template-based generation using Jinja2
- Support for Bash, Ansible, PowerShell formats
- Syntax validation for generated scripts
- Variable substitution and control-specific logic
- Error handling and logging
"""

import os
import yaml
import json
import subprocess
import tempfile
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from enum import Enum
import logging

try:
    from jinja2 import Environment, FileSystemLoader, Template, TemplateNotFound
except ImportError:
    raise ImportError("jinja2 is required. Install with: pip install jinja2")


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ScriptFormat(str, Enum):
    """Supported script formats"""
    BASH = "bash"
    ANSIBLE = "ansible"
    POWERSHELL = "powershell"


class Platform(str, Enum):
    """Supported platforms"""
    RHEL_8 = "rhel_8"
    RHEL_9 = "rhel_9"
    UBUNTU_20_04 = "ubuntu_20_04"
    UBUNTU_22_04 = "ubuntu_22_04"
    WINDOWS_SERVER_2019 = "windows_server_2019"
    WINDOWS_SERVER_2022 = "windows_server_2022"


class ValidationResult:
    """Result of script validation"""
    def __init__(self, valid: bool, errors: List[str] = None, warnings: List[str] = None):
        self.valid = valid
        self.errors = errors or []
        self.warnings = warnings or []

    def to_dict(self) -> Dict:
        return {
            "valid": self.valid,
            "errors": self.errors,
            "warnings": self.warnings
        }


class ScriptGenerator:
    """
    Main script generation engine

    Handles template loading, variable substitution, and script generation
    for NIST 800-53 compliance implementations.
    """

    def __init__(
        self,
        templates_dir: str = None,
        implementations_dir: str = None
    ):
        """
        Initialize the script generator

        Args:
            templates_dir: Path to templates directory
            implementations_dir: Path to control implementations directory
        """
        # Set default paths relative to backend directory
        backend_dir = Path(__file__).resolve().parents[1]

        self.templates_dir = Path(templates_dir) if templates_dir else backend_dir / "templates" / "scripts"
        self.implementations_dir = Path(implementations_dir) if implementations_dir else backend_dir / "data" / "control_implementations"

        # Create directories if they don't exist
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        self.implementations_dir.mkdir(parents=True, exist_ok=True)

        # Initialize Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True
        )

        # Add custom filters
        self.jinja_env.filters['upper'] = str.upper
        self.jinja_env.filters['lower'] = str.lower
        self.jinja_env.filters['title'] = str.title
        self.jinja_env.filters['regex_search'] = self._regex_search_filter

        # Statistics
        self.stats = {
            "generated": 0,
            "validated": 0,
            "validation_failures": 0
        }

        logger.info(f"Script generator initialized")
        logger.info(f"Templates directory: {self.templates_dir}")
        logger.info(f"Implementations directory: {self.implementations_dir}")

    @staticmethod
    def _regex_search_filter(value, pattern, *groups):
        """
        Custom Jinja2 filter that mimics Ansible's regex_search filter

        Args:
            value: String to search in
            pattern: Regex pattern to search for
            *groups: Optional group indices to extract

        Returns:
            Match groups as list if specified, empty list if no match, or entire match string
        """
        if not value:
            return [] if groups else None

        match = re.search(pattern, str(value))
        if not match:
            return [] if groups else None

        # If groups specified, return those groups as a list
        if groups:
            try:
                # Convert groups to integers and extract
                group_nums = [int(g) if isinstance(g, (int, str)) and str(g).isdigit() else g for g in groups]
                results = [match.group(g) if isinstance(g, int) else g for g in group_nums]
                return results  # Always return list when groups specified
            except (IndexError, ValueError):
                return []

        # Return entire match as string
        return match.group(0)

    def load_control_implementation(self, control_id: str) -> Optional[Dict]:
        """
        Load control-specific implementation logic

        Args:
            control_id: NIST control ID (e.g., "AC-2")

        Returns:
            Dictionary containing control implementation details
        """
        # Normalize control ID (e.g., "ac-2" -> "ac2", "AC-11.1" -> "ac11-1")
        # Remove hyphens first, then convert dots to hyphens for enhancement numbers
        normalized_id = control_id.lower().replace("-", "").replace(".", "-")

        # Try to find implementation file with various naming patterns
        patterns = [
            f"{normalized_id}.yml",                    # ac2.yml
            f"{normalized_id}_*.yml",                  # ac2_account_management.yml
            f"{control_id.lower()}.yml",               # ac-2.yml
            f"{control_id.lower().replace('-', '_')}_*.yml"  # ac_2_*.yml
        ]

        implementation_file = None
        for pattern in patterns:
            matches = list(self.implementations_dir.glob(pattern))
            if matches:
                implementation_file = matches[0]
                break

        if not implementation_file:
            logger.warning(f"No implementation found for control {control_id}")
            return None

        try:
            with open(implementation_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                logger.info(f"Loaded implementation for {control_id} from {implementation_file.name}")
                return data
        except Exception as e:
            logger.error(f"Failed to load implementation for {control_id}: {e}")
            return None

    def get_platform_data(self, platform: str, implementation: Dict) -> Optional[Dict]:
        """
        Extract platform-specific data from implementation

        Args:
            platform: Platform identifier (e.g., "rhel_8")
            implementation: Full implementation dictionary

        Returns:
            Platform-specific implementation data
        """
        platforms = implementation.get("platforms", {})

        # Try exact match
        if platform in platforms:
            return platforms[platform]

        # Try platform family matching (e.g., rhel_8 -> rhel)
        platform_family = platform.split("_")[0]
        for key, value in platforms.items():
            if key.startswith(platform_family):
                return value

        # Try OS type matching (linux/windows)
        os_type = "linux" if platform.startswith(("rhel", "ubuntu")) else "windows"
        if os_type in platforms:
            return platforms[os_type]

        logger.warning(f"No platform data for {platform} in implementation")
        return None

    def generate_script(
        self,
        control_id: str,
        platform: str,
        script_format: str,
        custom_vars: Dict = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Generate a compliance script from template

        Args:
            control_id: NIST control ID (e.g., "AC-2")
            platform: Target platform (e.g., "rhel_8")
            script_format: Script format ("bash", "ansible", "powershell")
            custom_vars: Additional template variables

        Returns:
            Tuple of (generated_script, error_message)
        """
        try:
            # Load control implementation
            implementation = self.load_control_implementation(control_id)
            if not implementation:
                return None, f"No implementation found for control {control_id}"

            # Get platform-specific data
            platform_data = self.get_platform_data(platform, implementation)
            if not platform_data:
                return None, f"No implementation for platform {platform}"

            # Select template file
            template_name = self._get_template_name(script_format)

            try:
                template = self.jinja_env.get_template(template_name)
            except TemplateNotFound:
                return None, f"Template not found: {template_name}"

            # Prepare template variables
            template_vars = self._prepare_template_vars(
                control_id,
                platform,
                implementation,
                platform_data,
                custom_vars or {}
            )

            # Render template
            script_content = template.render(**template_vars)

            # Update statistics
            self.stats["generated"] += 1

            logger.info(f"Generated {script_format} script for {control_id} on {platform}")

            return script_content, None

        except Exception as e:
            import traceback
            logger.error(f"Script generation failed: {e}")
            logger.error(f"Traceback:\n{traceback.format_exc()}")
            return None, str(e)

    def _get_template_name(self, script_format: str) -> str:
        """Get template filename for script format"""
        template_map = {
            ScriptFormat.BASH: "bash_template.sh.j2",
            ScriptFormat.ANSIBLE: "ansible_template.yml.j2",
            ScriptFormat.POWERSHELL: "powershell_template.ps1.j2"
        }
        return template_map.get(script_format, "bash_template.sh.j2")

    def _prepare_template_vars(
        self,
        control_id: str,
        platform: str,
        implementation: Dict,
        platform_data: Dict,
        custom_vars: Dict
    ) -> Dict:
        """
        Prepare all variables for template rendering

        Returns:
            Dictionary of template variables
        """
        # Base variables
        variables = {
            "control_id": control_id,
            "control_name": implementation.get("control_name", control_id),
            "platform": platform,
            "description": implementation.get("description", f"NIST 800-53 {control_id} implementation"),
            "generated_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "generator_version": "1.0.0",

            # Platform-specific data
            "checks": platform_data.get("checks", []),
            "implementations": platform_data.get("implementations", []),
            "verification": platform_data.get("verification", []),
            "rollback": platform_data.get("rollback", []),
            "prerequisites": platform_data.get("prerequisites", []),
        }

        # Continue with rest of variables
        variables.update({

            # Platform detection helpers
            "is_rhel": platform.startswith("rhel"),
            "is_ubuntu": platform.startswith("ubuntu"),
            "is_windows": platform.startswith("windows"),
            "is_linux": platform.startswith(("rhel", "ubuntu")),

            # Package manager detection
            "package_manager": self._get_package_manager(platform),
            "service_manager": self._get_service_manager(platform),

            # Control-specific parameters from YAML
            "parameters": implementation.get("parameters", {}),
        })

        # Merge custom variables
        variables.update(custom_vars)

        return variables

    def _get_package_manager(self, platform: str) -> str:
        """Determine package manager for platform"""
        if platform.startswith("rhel"):
            return "dnf" if "9" in platform else "yum"
        elif platform.startswith("ubuntu"):
            return "apt"
        elif platform.startswith("windows"):
            return "choco"
        return "unknown"

    def _get_service_manager(self, platform: str) -> str:
        """Determine service manager for platform"""
        if platform.startswith(("rhel", "ubuntu")):
            return "systemctl"
        elif platform.startswith("windows"):
            return "sc"
        return "unknown"

    def validate_script(
        self,
        script_content: str,
        script_format: str
    ) -> ValidationResult:
        """
        Validate generated script syntax

        Args:
            script_content: The script to validate
            script_format: Script format ("bash", "ansible", "powershell")

        Returns:
            ValidationResult object
        """
        try:
            self.stats["validated"] += 1

            if script_format == ScriptFormat.BASH:
                return self._validate_bash(script_content)
            elif script_format == ScriptFormat.ANSIBLE:
                return self._validate_ansible(script_content)
            elif script_format == ScriptFormat.POWERSHELL:
                return self._validate_powershell(script_content)
            else:
                return ValidationResult(False, [f"Unknown script format: {script_format}"])

        except Exception as e:
            logger.error(f"Validation failed: {e}")
            self.stats["validation_failures"] += 1
            return ValidationResult(False, [str(e)])

    def _validate_bash(self, script_content: str) -> ValidationResult:
        """Validate Bash script syntax using bash -n"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sh', delete=False) as f:
            f.write(script_content)
            temp_path = f.name

        try:
            # Use bash -n for syntax checking
            result = subprocess.run(
                ['bash', '-n', temp_path],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                return ValidationResult(True)
            else:
                errors = result.stderr.strip().split('\n') if result.stderr else ["Unknown syntax error"]
                return ValidationResult(False, errors)

        except FileNotFoundError:
            # Bash not available, do basic validation
            return self._validate_bash_basic(script_content)
        except subprocess.TimeoutExpired:
            return ValidationResult(False, ["Validation timeout"])
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass

    def _validate_bash_basic(self, script_content: str) -> ValidationResult:
        """Basic Bash validation without external tools"""
        errors = []
        warnings = []

        # Check for shebang
        if not script_content.strip().startswith("#!"):
            warnings.append("Missing shebang line")

        # Check for common syntax errors
        lines = script_content.split('\n')
        for i, line in enumerate(lines, 1):
            # Check for unmatched quotes (basic)
            if line.count('"') % 2 != 0:
                errors.append(f"Line {i}: Unmatched double quotes")
            if line.count("'") % 2 != 0:
                errors.append(f"Line {i}: Unmatched single quotes")

        # Check for balanced braces
        open_braces = script_content.count('{')
        close_braces = script_content.count('}')
        if open_braces != close_braces:
            errors.append(f"Unbalanced braces: {open_braces} open, {close_braces} close")

        valid = len(errors) == 0
        return ValidationResult(valid, errors, warnings)

    def _validate_ansible(self, script_content: str) -> ValidationResult:
        """Validate Ansible playbook YAML syntax"""
        errors = []
        warnings = []

        try:
            # Parse YAML
            data = yaml.safe_load(script_content)

            # Check if it's a list (playbook format)
            if not isinstance(data, list):
                errors.append("Playbook must be a YAML list")
            else:
                # Check first play
                if len(data) > 0:
                    play = data[0]

                    # Required fields
                    if 'name' not in play:
                        warnings.append("Play missing 'name' field")
                    if 'hosts' not in play:
                        errors.append("Play missing required 'hosts' field")
                    if 'tasks' not in play:
                        warnings.append("Play has no 'tasks' field")

            valid = len(errors) == 0
            return ValidationResult(valid, errors, warnings)

        except yaml.YAMLError as e:
            return ValidationResult(False, [f"YAML syntax error: {str(e)}"])

    def _validate_powershell(self, script_content: str) -> ValidationResult:
        """Validate PowerShell script syntax"""
        # Basic validation - full validation requires PowerShell runtime
        errors = []
        warnings = []

        # Check for balanced braces
        open_braces = script_content.count('{')
        close_braces = script_content.count('}')
        if open_braces != close_braces:
            errors.append(f"Unbalanced braces: {open_braces} open, {close_braces} close")

        # Check for balanced parentheses
        open_parens = script_content.count('(')
        close_parens = script_content.count(')')
        if open_parens != close_parens:
            errors.append(f"Unbalanced parentheses: {open_parens} open, {close_parens} close")

        # Check for common PowerShell keywords
        if 'Configuration' not in script_content and 'function' not in script_content:
            warnings.append("No Configuration or function definitions found")

        valid = len(errors) == 0
        return ValidationResult(valid, errors, warnings)

    def preview_script(
        self,
        control_id: str,
        platform: str,
        script_format: str,
        custom_vars: Dict = None
    ) -> Dict:
        """
        Generate and preview a script without saving

        Args:
            control_id: NIST control ID
            platform: Target platform
            script_format: Script format
            custom_vars: Custom template variables

        Returns:
            Dictionary with script content, validation results, metadata
        """
        # Generate script
        script_content, error = self.generate_script(
            control_id,
            platform,
            script_format,
            custom_vars
        )

        if error:
            return {
                "success": False,
                "error": error,
                "script": None,
                "validation": None
            }

        # Validate script
        validation = self.validate_script(script_content, script_format)

        return {
            "success": True,
            "script": script_content,
            "validation": validation.to_dict(),
            "metadata": {
                "control_id": control_id,
                "platform": platform,
                "format": script_format,
                "generated_at": datetime.now().isoformat(),
                "lines": len(script_content.split('\n'))
            }
        }

    def get_stats(self) -> Dict:
        """Get generator statistics"""
        return self.stats.copy()

    def list_available_controls(self) -> List[str]:
        """List all controls with implementations"""
        controls = []
        for file in self.implementations_dir.glob("*.yml"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                    if "control_id" in data:
                        controls.append(data["control_id"])
            except:
                pass
        return sorted(controls)
