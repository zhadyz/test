"""
Script Generation Routes

FastAPI endpoints for generating compliance scripts from templates.
Provides generate, preview, and validate operations.
"""

from typing import Dict, Optional, List
from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
import logging

from services.script_generator import ScriptGenerator, ScriptFormat, Platform, ValidationResult

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/scripts",
    tags=["scripts"],
    responses={404: {"description": "Not found"}},
)

# Initialize generator
generator = ScriptGenerator()


# Request/Response Models
class ScriptGenerateRequest(BaseModel):
    """Request model for script generation"""
    control_id: str = Field(..., description="NIST control ID (e.g., 'AC-2')")
    platform: str = Field(..., description="Target platform (e.g., 'rhel_8', 'ubuntu_22_04')")
    format: str = Field(..., description="Script format ('bash', 'ansible', 'powershell')")
    custom_vars: Optional[Dict] = Field(None, description="Custom template variables")

    class Config:
        schema_extra = {
            "example": {
                "control_id": "AC-2",
                "platform": "rhel_8",
                "format": "bash",
                "custom_vars": {
                    "organization": "MyOrg",
                    "contact_email": "admin@example.com"
                }
            }
        }


class ScriptValidateRequest(BaseModel):
    """Request model for script validation"""
    script_content: str = Field(..., description="Script content to validate")
    script_format: str = Field(..., description="Script format ('bash', 'ansible', 'powershell')")

    class Config:
        schema_extra = {
            "example": {
                "script_content": "#!/bin/bash\necho 'Hello World'",
                "script_format": "bash"
            }
        }


class ScriptGenerateResponse(BaseModel):
    """Response model for script generation"""
    success: bool
    script: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict] = None
    validation: Optional[Dict] = None


@router.post("/generate", response_model=ScriptGenerateResponse)
async def generate_script(request: ScriptGenerateRequest):
    """
    Generate a compliance script from template

    Generates a production-ready script for NIST 800-53 control implementation
    based on the specified control, platform, and format.

    Args:
        request: ScriptGenerateRequest containing control_id, platform, format, and optional custom_vars

    Returns:
        ScriptGenerateResponse with generated script or error

    Example:
        POST /api/scripts/generate
        {
            "control_id": "AC-2",
            "platform": "rhel_8",
            "format": "bash"
        }
    """
    try:
        logger.info(f"Generating {request.format} script for {request.control_id} on {request.platform}")

        # Validate format
        if request.format not in [ScriptFormat.BASH, ScriptFormat.ANSIBLE, ScriptFormat.POWERSHELL]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid format: {request.format}. Must be 'bash', 'ansible', or 'powershell'"
            )

        # Generate script
        script_content, error = generator.generate_script(
            control_id=request.control_id,
            platform=request.platform,
            script_format=request.format,
            custom_vars=request.custom_vars
        )

        if error:
            logger.error(f"Script generation failed: {error}")
            return ScriptGenerateResponse(
                success=False,
                error=error
            )

        # Validate generated script
        validation = generator.validate_script(script_content, request.format)

        # Prepare metadata
        metadata = {
            "control_id": request.control_id,
            "platform": request.platform,
            "format": request.format,
            "lines": len(script_content.split('\n')),
            "size_bytes": len(script_content.encode('utf-8'))
        }

        logger.info(f"Successfully generated script for {request.control_id}")

        return ScriptGenerateResponse(
            success=True,
            script=script_content,
            metadata=metadata,
            validation=validation.to_dict()
        )

    except Exception as e:
        logger.exception("Error generating script")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview")
async def preview_script(
    control_id: str = Query(..., description="NIST control ID"),
    platform: str = Query(..., description="Target platform"),
    format: str = Query(..., description="Script format")
):
    """
    Preview a generated script without saving

    Generates a script and returns it with validation results and metadata.
    Useful for testing and preview before actual generation.

    Args:
        control_id: NIST control ID (e.g., "AC-2")
        platform: Target platform (e.g., "rhel_8")
        format: Script format ("bash", "ansible", "powershell")

    Returns:
        JSON with script content, validation results, and metadata

    Example:
        GET /api/scripts/preview?control_id=AC-2&platform=rhel_8&format=bash
    """
    try:
        logger.info(f"Previewing {format} script for {control_id} on {platform}")

        # Validate format
        if format not in [ScriptFormat.BASH, ScriptFormat.ANSIBLE, ScriptFormat.POWERSHELL]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid format: {format}. Must be 'bash', 'ansible', or 'powershell'"
            )

        # Preview script
        result = generator.preview_script(
            control_id=control_id,
            platform=platform,
            script_format=format
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["error"])

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error previewing script")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_script(request: ScriptValidateRequest):
    """
    Validate script syntax

    Validates the syntax of a provided script without executing it.
    Performs static analysis appropriate to the script format.

    Args:
        request: ScriptValidateRequest containing script_content and script_format

    Returns:
        JSON with validation results (valid, errors, warnings)

    Example:
        POST /api/scripts/validate
        {
            "script_content": "#!/bin/bash\\necho 'test'",
            "script_format": "bash"
        }
    """
    try:
        logger.info(f"Validating {request.script_format} script")

        # Validate format
        if request.script_format not in [ScriptFormat.BASH, ScriptFormat.ANSIBLE, ScriptFormat.POWERSHELL]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid format: {request.script_format}"
            )

        # Validate script
        validation = generator.validate_script(
            script_content=request.script_content,
            script_format=request.script_format
        )

        return JSONResponse(content=validation.to_dict())

    except Exception as e:
        logger.exception("Error validating script")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{control_id}")
async def download_script(
    control_id: str,
    platform: str = Query(..., description="Target platform"),
    format: str = Query(..., description="Script format")
):
    """
    Download a generated script as a file

    Generates and returns a script as a downloadable file with appropriate
    file extension and content type.

    Args:
        control_id: NIST control ID
        platform: Target platform
        format: Script format

    Returns:
        Plain text response with script content and download headers

    Example:
        GET /api/scripts/download/AC-2?platform=rhel_8&format=bash
    """
    try:
        logger.info(f"Downloading {format} script for {control_id}")

        # Generate script
        script_content, error = generator.generate_script(
            control_id=control_id,
            platform=platform,
            script_format=format
        )

        if error:
            raise HTTPException(status_code=404, detail=error)

        # Determine file extension
        extensions = {
            ScriptFormat.BASH: ".sh",
            ScriptFormat.ANSIBLE: ".yml",
            ScriptFormat.POWERSHELL: ".ps1"
        }
        ext = extensions.get(format, ".txt")

        # Create filename
        filename = f"nist_{control_id.lower().replace('-', '')}_{platform}{ext}"

        # Return as downloadable file
        return PlainTextResponse(
            content=script_content,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/plain"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error downloading script")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/controls")
async def list_available_controls():
    """
    List all controls with available implementations

    Returns a list of NIST control IDs that have implementation files
    and can be used for script generation.

    Returns:
        JSON array of control IDs

    Example:
        GET /api/scripts/controls
    """
    try:
        controls = generator.list_available_controls()
        return JSONResponse(content={
            "success": True,
            "controls": controls,
            "count": len(controls)
        })

    except Exception as e:
        logger.exception("Error listing controls")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/platforms")
async def list_supported_platforms():
    """
    List all supported platforms

    Returns a list of platform identifiers that can be used for
    script generation.

    Returns:
        JSON array of platform identifiers

    Example:
        GET /api/scripts/platforms
    """
    platforms = [
        {
            "id": "rhel_8",
            "name": "Red Hat Enterprise Linux 8",
            "type": "linux",
            "formats": ["bash", "ansible"]
        },
        {
            "id": "rhel_9",
            "name": "Red Hat Enterprise Linux 9",
            "type": "linux",
            "formats": ["bash", "ansible"]
        },
        {
            "id": "ubuntu_20_04",
            "name": "Ubuntu 20.04 LTS",
            "type": "linux",
            "formats": ["bash", "ansible"]
        },
        {
            "id": "ubuntu_22_04",
            "name": "Ubuntu 22.04 LTS",
            "type": "linux",
            "formats": ["bash", "ansible"]
        },
        {
            "id": "windows_server_2019",
            "name": "Windows Server 2019",
            "type": "windows",
            "formats": ["powershell"]
        },
        {
            "id": "windows_server_2022",
            "name": "Windows Server 2022",
            "type": "windows",
            "formats": ["powershell"]
        }
    ]

    return JSONResponse(content={
        "success": True,
        "platforms": platforms,
        "count": len(platforms)
    })


@router.get("/formats")
async def list_supported_formats():
    """
    List all supported script formats

    Returns a list of script formats available for generation.

    Returns:
        JSON array of format identifiers with descriptions

    Example:
        GET /api/scripts/formats
    """
    formats = [
        {
            "id": "bash",
            "name": "Bash Shell Script",
            "extension": ".sh",
            "platforms": ["linux"]
        },
        {
            "id": "ansible",
            "name": "Ansible Playbook",
            "extension": ".yml",
            "platforms": ["linux"]
        },
        {
            "id": "powershell",
            "name": "PowerShell Script",
            "extension": ".ps1",
            "platforms": ["windows"]
        }
    ]

    return JSONResponse(content={
        "success": True,
        "formats": formats,
        "count": len(formats)
    })


@router.get("/stats")
async def get_generator_stats():
    """
    Get script generator statistics

    Returns statistics about script generation operations including
    number of scripts generated, validated, and validation failures.

    Returns:
        JSON with generator statistics

    Example:
        GET /api/scripts/stats
    """
    try:
        stats = generator.get_stats()
        return JSONResponse(content={
            "success": True,
            "statistics": stats
        })

    except Exception as e:
        logger.exception("Error getting stats")
        raise HTTPException(status_code=500, detail=str(e))
