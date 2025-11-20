"""
Variable Manager - CAC Jinja2 Template Rendering and Validation
Handles variable extraction, rendering, and validation for CAC scripts.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional, Any
import json
import re
from pathlib import Path
from jinja2 import Template, TemplateSyntaxError, UndefinedError


router = APIRouter(prefix="/api/variables", tags=["variable-manager"])


# ============================================================================
# MODELS
# ============================================================================

class VariableDefinition(BaseModel):
    """Variable definition with validation rules."""
    name: str
    description: str
    type: str = Field(default="string", pattern="^(string|integer|boolean|float)$")
    default: Optional[Any] = None
    validation: Optional[Dict[str, Any]] = None
    controls: List[str] = []


class VariableValue(BaseModel):
    """Variable name-value pair for rendering."""
    name: str
    value: Any


class RenderRequest(BaseModel):
    """Request to render a script with variables."""
    control_id: str = Field(..., description="AC control ID (e.g., 'ac-7')")
    rule_name: str = Field(..., description="Rule name from control directory")
    script_type: str = Field(..., pattern="^(ansible|bash|kubernetes)$")
    variables: List[VariableValue] = Field(default_factory=list)


class ValidationRequest(BaseModel):
    """Request to validate variable values."""
    variables: List[VariableValue]


class ValidationResult(BaseModel):
    """Variable validation result."""
    variable: str
    valid: bool
    error: Optional[str] = None


# ============================================================================
# VARIABLE REGISTRY
# ============================================================================

class VariableRegistry:
    """Manages CAC variable definitions and validation."""

    def __init__(self, variables_file: Path):
        self.variables_file = variables_file
        self.variables: Dict[str, VariableDefinition] = {}
        self.load_variables()

    def load_variables(self):
        """Load variable definitions from JSON file."""
        if not self.variables_file.exists():
            raise FileNotFoundError(f"Variables file not found: {self.variables_file}")

        with open(self.variables_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for var_name, var_data in data.items():
            self.variables[var_name] = VariableDefinition(**var_data)

    def get_variable(self, name: str) -> Optional[VariableDefinition]:
        """Retrieve variable definition by name."""
        return self.variables.get(name)

    def get_all_variables(self) -> Dict[str, VariableDefinition]:
        """Get all variable definitions."""
        return self.variables

    def validate_value(self, name: str, value: Any) -> ValidationResult:
        """Validate a variable value against its definition."""
        var_def = self.get_variable(name)

        if not var_def:
            return ValidationResult(
                variable=name,
                valid=False,
                error=f"Variable '{name}' not found in registry"
            )

        # Type validation
        if var_def.type == "integer":
            if not isinstance(value, int):
                try:
                    value = int(value)
                except (ValueError, TypeError):
                    return ValidationResult(
                        variable=name,
                        valid=False,
                        error=f"Expected integer, got {type(value).__name__}"
                    )

        elif var_def.type == "float":
            if not isinstance(value, (int, float)):
                try:
                    value = float(value)
                except (ValueError, TypeError):
                    return ValidationResult(
                        variable=name,
                        valid=False,
                        error=f"Expected float, got {type(value).__name__}"
                    )

        elif var_def.type == "boolean":
            if not isinstance(value, bool):
                if isinstance(value, str):
                    value = value.lower() in ('true', '1', 'yes')
                else:
                    return ValidationResult(
                        variable=name,
                        valid=False,
                        error=f"Expected boolean, got {type(value).__name__}"
                    )

        elif var_def.type == "string":
            if not isinstance(value, str):
                value = str(value)

        # Validation rules
        if var_def.validation:
            # Min/max validation for numeric types
            if "min" in var_def.validation and value < var_def.validation["min"]:
                return ValidationResult(
                    variable=name,
                    valid=False,
                    error=f"Value {value} below minimum {var_def.validation['min']}"
                )

            if "max" in var_def.validation and value > var_def.validation["max"]:
                return ValidationResult(
                    variable=name,
                    valid=False,
                    error=f"Value {value} exceeds maximum {var_def.validation['max']}"
                )

            # Pattern validation for strings
            if "pattern" in var_def.validation and var_def.type == "string":
                pattern = var_def.validation["pattern"]
                if not re.match(pattern, value):
                    return ValidationResult(
                        variable=name,
                        valid=False,
                        error=f"Value does not match pattern {pattern}"
                    )

        return ValidationResult(variable=name, valid=True)


# ============================================================================
# SCRIPT RENDERER
# ============================================================================

class ScriptRenderer:
    """Renders CAC scripts with Jinja2 variables."""

    def __init__(self, implementations_root: Path, registry: VariableRegistry):
        self.implementations_root = implementations_root
        self.registry = registry

    def extract_variables_from_script(self, script_content: str) -> List[str]:
        """Extract variable references from CAC script content."""
        variables = []

        # Pattern: {{{ xccdf_value("var_name") }}}
        pattern1 = r'\{\{\{\s*xccdf_value\(["\']([^"\']+)["\']\s*\)\s*\}\}\}'
        variables.extend(re.findall(pattern1, script_content))

        # Pattern: (bash-populate var_name)
        pattern2 = r'\(bash-populate\s+([^)]+)\)'
        variables.extend(re.findall(pattern2, script_content))

        return list(set(variables))

    def render_script(
        self,
        control_id: str,
        rule_name: str,
        script_type: str,
        variables: Dict[str, Any]
    ) -> str:
        """Render a CAC script with provided variable values."""
        # Construct script path
        script_filename = {
            'ansible': 'ansible.yml',
            'bash': 'bash.sh',
            'kubernetes': 'kubernetes.yml'
        }[script_type]

        script_path = (
            self.implementations_root /
            control_id.lower() /
            rule_name /
            script_filename
        )

        if not script_path.exists():
            raise FileNotFoundError(
                f"Script not found: {script_path}"
            )

        # Read script content
        with open(script_path, 'r', encoding='utf-8') as f:
            script_content = f.read()

        # Extract required variables
        required_vars = self.extract_variables_from_script(script_content)

        # Check for missing variables
        missing_vars = [v for v in required_vars if v not in variables]
        if missing_vars:
            # Use defaults for missing variables
            for var_name in missing_vars:
                var_def = self.registry.get_variable(var_name)
                if var_def and var_def.default is not None:
                    variables[var_name] = var_def.default
                else:
                    raise ValueError(
                        f"Missing required variable '{var_name}' with no default"
                    )

        # Convert CAC template syntax to Jinja2
        # Replace: {{{ xccdf_value("var_name") }}} -> {{ var_name }}
        def replace_xccdf(match):
            var_name = match.group(1)
            return "{{ " + var_name + " }}"

        jinja_content = re.sub(
            r'\{\{\{\s*xccdf_value\(["\']([^"\']+)["\']\s*\)\s*\}\}\}',
            replace_xccdf,
            script_content
        )

        # Replace: (bash-populate var_name) -> {{ var_name }}
        jinja_content = re.sub(
            r'\(bash-populate\s+([^)]+)\)',
            r'{{ \1 }}',
            jinja_content
        )

        # Render with Jinja2
        try:
            template = Template(jinja_content)
            rendered = template.render(**variables)
            return rendered
        except TemplateSyntaxError as e:
            raise ValueError(f"Template syntax error: {e}")
        except UndefinedError as e:
            raise ValueError(f"Undefined variable: {e}")


# ============================================================================
# GLOBAL INSTANCES
# ============================================================================

# Initialize registry and renderer
IMPLEMENTATIONS_ROOT = Path(__file__).parent.parent.parent / "implementations" / "AC"
VARIABLES_FILE = IMPLEMENTATIONS_ROOT / "variables.json"

registry = VariableRegistry(VARIABLES_FILE)
renderer = ScriptRenderer(IMPLEMENTATIONS_ROOT, registry)


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/")
async def list_variables():
    """List all available CAC variables."""
    return {
        "variables": {
            name: var_def.dict()
            for name, var_def in registry.get_all_variables().items()
        }
    }


@router.get("/{control_id}/variables")
async def get_control_variables(control_id: str):
    """Get variables used by a specific control."""
    control_vars = {
        name: var_def.dict()
        for name, var_def in registry.get_all_variables().items()
        if control_id.upper() in [c.upper() for c in var_def.controls]
    }

    if not control_vars:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No variables found for control {control_id}"
        )

    return {"control_id": control_id, "variables": control_vars}


@router.post("/validate")
async def validate_variables(request: ValidationRequest):
    """Validate variable values against their definitions."""
    results = []

    for var in request.variables:
        result = registry.validate_value(var.name, var.value)
        results.append(result)

    all_valid = all(r.valid for r in results)

    return {
        "valid": all_valid,
        "results": [r.dict() for r in results]
    }


@router.post("/render")
async def render_script(request: RenderRequest):
    """Render a CAC script with provided variables."""
    try:
        # Convert variable list to dict
        var_dict = {v.name: v.value for v in request.variables}

        # Validate variables first
        validation_results = []
        for var in request.variables:
            result = registry.validate_value(var.name, var.value)
            validation_results.append(result)

        invalid_vars = [r for r in validation_results if not r.valid]
        if invalid_vars:
            return {
                "success": False,
                "error": "Variable validation failed",
                "validation_errors": [r.dict() for r in invalid_vars]
            }

        # Render script
        rendered_script = renderer.render_script(
            request.control_id,
            request.rule_name,
            request.script_type,
            var_dict
        )

        return {
            "success": True,
            "control_id": request.control_id,
            "rule_name": request.rule_name,
            "script_type": request.script_type,
            "rendered_script": rendered_script
        }

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rendering failed: {str(e)}"
        )


@router.get("/{control_id}/{rule_name}/variables")
async def get_rule_variables(control_id: str, rule_name: str, script_type: str = "bash"):
    """Extract variables from a specific rule's script."""
    try:
        script_filename = {
            'ansible': 'ansible.yml',
            'bash': 'bash.sh',
            'kubernetes': 'kubernetes.yml'
        }[script_type]

        script_path = (
            IMPLEMENTATIONS_ROOT /
            control_id.lower() /
            rule_name /
            script_filename
        )

        if not script_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Script not found: {control_id}/{rule_name}/{script_type}"
            )

        with open(script_path, 'r', encoding='utf-8') as f:
            script_content = f.read()

        required_vars = renderer.extract_variables_from_script(script_content)

        # Get full definitions
        var_definitions = {}
        for var_name in required_vars:
            var_def = registry.get_variable(var_name)
            if var_def:
                var_definitions[var_name] = var_def.dict()

        return {
            "control_id": control_id,
            "rule_name": rule_name,
            "script_type": script_type,
            "required_variables": required_vars,
            "variable_definitions": var_definitions
        }

    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid script type: {script_type}"
        )
