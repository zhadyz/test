from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

class OperatingSystem(str, Enum):
    UBUNTU_20_04 = "ubuntu_20_04"
    UBUNTU_22_04 = "ubuntu_22_04"
    RHEL_8 = "rhel_8"
    RHEL_9 = "rhel_9"
    CENTOS_7 = "centos_7"
    CENTOS_8 = "centos_8"
    WINDOWS_SERVER_2019 = "windows_server_2019"
    WINDOWS_SERVER_2022 = "windows_server_2022"
    DEBIAN_11 = "debian_11"
    SUSE_15 = "suse_15"

class PlaybookSource(str, Enum):
    STATIC_TEMPLATE = "static_template"
    GPT_GENERATED = "gpt_generated"
    HYBRID = "hybrid"

class PlaybookRequest(BaseModel):
    """Request for generating an Ansible playbook"""
    control_id: str
    operating_system: OperatingSystem
    stig_id: Optional[str] = None
    environment: Dict[str, str] = {}
    force_refresh: bool = False
    include_comments: bool = True
    include_handlers: bool = True
    include_variables: bool = True

class PlaybookTemplate(BaseModel):
    """Metadata for a static playbook template"""
    control_id: str
    operating_system: OperatingSystem
    stig_id: Optional[str] = None
    file_path: str
    description: str
    created_at: datetime
    updated_at: datetime
    tags: List[str] = []
    variables: Dict[str, Any] = {}
    requirements: List[str] = []

class PlaybookTask(BaseModel):
    """Individual Ansible task within a playbook"""
    name: str
    module: str
    parameters: Dict[str, Any]
    tags: List[str] = []
    when: Optional[str] = None
    become: Optional[bool] = None
    notify: List[str] = []

class PlaybookResponse(BaseModel):
    """Response containing generated Ansible playbook"""
    control_id: str
    operating_system: OperatingSystem
    stig_id: Optional[str] = None
    playbook_yaml: str
    source: PlaybookSource
    cached: bool = False
    tasks: List[PlaybookTask] = []
    variables: Dict[str, Any] = {}
    handlers: List[PlaybookTask] = []
    requirements: List[str] = []
    description: str
    generated_at: datetime
    cache_key: str
    estimated_runtime: Optional[str] = None
    compliance_notes: str = ""

class PlaybookGenerationStats(BaseModel):
    """Statistics for playbook generation system"""
    total_requests: int
    static_template_hits: int
    gpt_generated: int
    cache_hits: int
    cache_misses: int
    supported_os_count: int
    available_templates: int
    template_structure: str = "Legacy"
    supported_controls: List[str] = []
    last_updated: datetime = datetime.now()

class STIGMapping(BaseModel):
    """Mapping between NIST controls and STIG IDs"""
    control_id: str
    stig_id: str
    operating_system: OperatingSystem
    title: str
    severity: str
    description: str
    check_text: str
    fix_text: str
    created_at: datetime 