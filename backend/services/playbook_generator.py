import os
import json
import hashlib
import yaml
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from openai import OpenAI
from data.controls import get_control_by_id
from models.playbook import (
    PlaybookRequest, 
    PlaybookResponse, 
    PlaybookTemplate,
    PlaybookSource,
    OperatingSystem,
    PlaybookTask,
    PlaybookGenerationStats
)

class PlaybookGenerator:
    def __init__(self, templates_dir: str = "playbook-templates-new", cache_dir: str = "playbook-cache"):
        self.templates_dir = Path(templates_dir)
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # Fallback to old structure if new one doesn't exist
        if not self.templates_dir.exists():
            self.templates_dir = Path("playbook-templates")
            self.use_legacy_structure = True
        else:
            self.use_legacy_structure = False
        
        # Statistics tracking
        self.stats = {
            "total_requests": 0,
            "static_template_hits": 0,
            "gpt_generated": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
        
        # Enhanced STIG ID mappings for common controls with more comprehensive coverage
        self.stig_mappings = {
            "ubuntu_20_04": {
                "AC-17": ["UBTU-20-010043", "UBTU-20-010044", "UBTU-20-010045"],
                "AU-2": ["UBTU-20-653010", "UBTU-20-653020", "UBTU-20-653030"],
                "SC-28": ["UBTU-20-010030", "UBTU-20-010040", "UBTU-20-010050"],
                "AC-2": ["UBTU-20-010000", "UBTU-20-010001", "UBTU-20-010002"],
                "AC-3": ["UBTU-20-010100", "UBTU-20-010101", "UBTU-20-010102"],
                "CM-2": ["UBTU-20-020000", "UBTU-20-020001"],
                "SI-4": ["UBTU-20-050000", "UBTU-20-050001"]
            },
            "ubuntu_22_04": {
                "AU-2": ["UBTU-22-653010", "UBTU-22-653020", "UBTU-22-653030"],
                "AC-17": ["UBTU-22-255010", "UBTU-22-255020", "UBTU-22-255030"],
                "SC-28": ["UBTU-22-231010", "UBTU-22-231020", "UBTU-22-231030"],
                "AC-2": ["UBTU-22-010000", "UBTU-22-010001", "UBTU-22-010002"],
                "AC-3": ["UBTU-22-010100", "UBTU-22-010101", "UBTU-22-010102"],
                "CM-2": ["UBTU-22-020000", "UBTU-22-020001"],
                "SI-4": ["UBTU-22-050000", "UBTU-22-050001"]
            },
            "rhel_8": {
                "SC-28": ["RHEL-08-010030", "RHEL-08-010040", "RHEL-08-010050"],
                "AU-2": ["RHEL-08-030000", "RHEL-08-030010", "RHEL-08-030020"],
                "AC-17": ["RHEL-08-040110", "RHEL-08-040120", "RHEL-08-040130"],
                "AC-2": ["RHEL-08-020000", "RHEL-08-020001", "RHEL-08-020002"],
                "AC-3": ["RHEL-08-020100", "RHEL-08-020101", "RHEL-08-020102"],
                "CM-2": ["RHEL-08-010000", "RHEL-08-010001"],
                "SI-4": ["RHEL-08-050000", "RHEL-08-050001"]
            },
            "windows_server_2019": {
                "AC-2": ["WN19-00-000010", "WN19-00-000020", "WN19-00-000030"],
                "AC-3": ["WN19-00-000100", "WN19-00-000110", "WN19-00-000120"],
                "AU-2": ["WN19-AU-000010", "WN19-AU-000020", "WN19-AU-000030"],
                "SC-28": ["WN19-SC-000010", "WN19-SC-000020"],
                "CM-2": ["WN19-CM-000010", "WN19-CM-000020"],
                "SI-4": ["WN19-SI-000010", "WN19-SI-000020"]
            }
        }
        
        # OS-specific package managers and tools
        self.os_tools = {
            "ubuntu_20_04": {"package_manager": "apt", "service_manager": "systemctl", "firewall": "ufw"},
            "ubuntu_22_04": {"package_manager": "apt", "service_manager": "systemctl", "firewall": "ufw"},
            "rhel_8": {"package_manager": "yum", "service_manager": "systemctl", "firewall": "firewalld"},
            "windows_server_2019": {"package_manager": "chocolatey", "service_manager": "sc", "firewall": "netsh"}
        }
        
        # Load available templates
        self.available_templates = self._scan_templates()
    
    def _scan_templates(self) -> Dict[str, PlaybookTemplate]:
        """Scan the templates directory and catalog available templates using new modular structure"""
        templates = {}
        
        if not self.templates_dir.exists():
            return templates
        
        if self.use_legacy_structure:
            # Use legacy scanning method
            return self._scan_legacy_templates()
        
        # New modular structure: scan OS directories
        for os_dir in self.templates_dir.iterdir():
            if os_dir.is_dir():
                os_name = os_dir.name
                
                # Scan YAML files in the OS directory
                for template_file in os_dir.glob("*.yml"):
                    try:
                        control_id = template_file.stem  # filename without extension
                        
                        # Read template content for metadata
                        with open(template_file, 'r') as f:
                            content = f.read()
                            yaml_data = yaml.safe_load(content)
                        
                        # Extract STIG IDs from comments
                        stig_ids = []
                        for line in content.split('\n'):
                            if line.strip().startswith('# STIG ID:'):
                                stig_ids.extend([s.strip() for s in line.split(':')[1].split(',')])
                        
                        template = PlaybookTemplate(
                            control_id=control_id,
                            operating_system=OperatingSystem(os_name),
                            stig_id=stig_ids[0] if stig_ids else None,
                            file_path=str(template_file),
                            description=self._extract_description(content),
                            created_at=datetime.fromtimestamp(template_file.stat().st_ctime),
                            updated_at=datetime.fromtimestamp(template_file.stat().st_mtime),
                            tags=self._extract_tags(yaml_data),
                            variables=self._extract_variables(yaml_data),
                            requirements=self._extract_requirements(yaml_data)
                        )
                        
                        key = f"{control_id}__{os_name}"
                        templates[key] = template
                        
                    except Exception as e:
                        print(f"Error processing template {template_file}: {e}")
                        continue
        
        return templates
    
    def _scan_legacy_templates(self) -> Dict[str, PlaybookTemplate]:
        """Legacy template scanning for backward compatibility"""
        templates = {}
        
        for template_file in self.templates_dir.glob("*.yml"):
            try:
                # Parse filename: CONTROL__OS.yml
                filename = template_file.stem
                if "__" in filename:
                    control_id, os_name = filename.split("__", 1)
                    
                    # Read template content for metadata
                    with open(template_file, 'r') as f:
                        content = f.read()
                        yaml_data = yaml.safe_load(content)
                    
                    # Extract STIG IDs from comments
                    stig_ids = []
                    for line in content.split('\n'):
                        if line.strip().startswith('# STIG ID:'):
                            stig_ids.extend([s.strip() for s in line.split(':')[1].split(',')])
                    
                    template = PlaybookTemplate(
                        control_id=control_id,
                        operating_system=OperatingSystem(os_name),
                        stig_id=stig_ids[0] if stig_ids else None,
                        file_path=str(template_file),
                        description=self._extract_description(content),
                        created_at=datetime.fromtimestamp(template_file.stat().st_ctime),
                        updated_at=datetime.fromtimestamp(template_file.stat().st_mtime),
                        tags=self._extract_tags(yaml_data),
                        variables=self._extract_variables(yaml_data),
                        requirements=self._extract_requirements(yaml_data)
                    )
                    
                    key = f"{control_id}__{os_name}"
                    templates[key] = template
                    
            except Exception as e:
                print(f"Error processing template {template_file}: {e}")
                continue
        
        return templates
    
    def _extract_description(self, content: str) -> str:
        """Extract description from template comments"""
        for line in content.split('\n'):
            if line.strip().startswith('# Description:'):
                return line.split(':', 1)[1].strip()
        return "No description available"
    
    def _extract_tags(self, yaml_data: dict) -> List[str]:
        """Extract tags from YAML playbook data"""
        tags = set()
        if isinstance(yaml_data, list) and len(yaml_data) > 0:
            playbook = yaml_data[0]
            tasks = playbook.get('tasks', [])
            for task in tasks:
                task_tags = task.get('tags', [])
                if isinstance(task_tags, list):
                    tags.update(task_tags)
        return list(tags)
    
    def _extract_variables(self, yaml_data: dict) -> Dict[str, Any]:
        """Extract variables from YAML playbook data"""
        if isinstance(yaml_data, list) and len(yaml_data) > 0:
            playbook = yaml_data[0]
            return playbook.get('vars', {})
        return {}
    
    def _extract_requirements(self, yaml_data: dict) -> List[str]:
        """Extract requirements from YAML playbook data"""
        requirements = []
        if isinstance(yaml_data, list) and len(yaml_data) > 0:
            playbook = yaml_data[0]
            tasks = playbook.get('tasks', [])
            for task in tasks:
                # Extract package names from apt/yum tasks
                if 'apt' in task:
                    packages = task['apt'].get('name', [])
                    if isinstance(packages, str):
                        requirements.append(packages)
                    elif isinstance(packages, list):
                        requirements.extend(packages)
                elif 'yum' in task:
                    packages = task['yum'].get('name', [])
                    if isinstance(packages, str):
                        requirements.append(packages)
                    elif isinstance(packages, list):
                        requirements.extend(packages)
        return list(set(requirements))
    
    def _generate_cache_key(self, request: PlaybookRequest) -> str:
        """Generate a deterministic cache key for the request"""
        # Normalize environment to ensure consistent caching
        normalized_env = {}
        if request.environment:
            # Sort and normalize environment variables
            for key, value in request.environment.items():
                if value is not None and value != "":
                    normalized_env[key.lower().strip()] = str(value).strip()
        
        key_data = {
            "control_id": request.control_id.upper().strip(),
            "operating_system": request.operating_system.value,
            "stig_id": request.stig_id.strip() if request.stig_id else None,
            "environment": sorted(normalized_env.items()),
            "include_comments": request.include_comments,
            "include_handlers": request.include_handlers,
            "include_variables": request.include_variables
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()
    
    def _get_cached_playbook(self, cache_key: str) -> Optional[PlaybookResponse]:
        """Retrieve a cached playbook if it exists"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                
                # Check if cache is still valid (configurable TTL)
                cached_time = datetime.fromisoformat(data['generated_at'])
                cache_ttl_days = int(os.getenv("PLAYBOOK_CACHE_TTL_DAYS", "30"))
                age_days = (datetime.now() - cached_time).days
                
                if age_days < cache_ttl_days:
                    playbook = PlaybookResponse(**data)
                    playbook.cached = True
                    self.stats["cache_hits"] += 1
                    print(f"[CACHE HIT] for {cache_key[:8]}... (age: {age_days} days)")
                    return playbook
                else:
                    # Cache expired, remove it
                    cache_file.unlink()
                    print(f"[CACHE EXPIRED] for {cache_key[:8]}... (age: {age_days} days)")
                
            except Exception as e:
                print(f"Error reading cache file {cache_file}: {e}")
                # Remove corrupted cache file
                try:
                    cache_file.unlink()
                except:
                    pass
        
        self.stats["cache_misses"] += 1
        print(f"[CACHE MISS] for {cache_key[:8]}...")
        return None
    
    def _cache_playbook(self, cache_key: str, playbook: PlaybookResponse):
        """Cache a generated playbook"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        try:
            # Ensure cache directory exists
            self.cache_dir.mkdir(exist_ok=True)
            
            with open(cache_file, 'w') as f:
                json.dump(playbook.dict(), f, indent=2, default=str)
            
            print(f"[CACHED] Playbook {cache_key[:8]}... ({cache_file.stat().st_size} bytes)")
            
        except Exception as e:
            print(f"Error caching playbook to {cache_file}: {e}")
    
    def _load_static_template(self, control_id: str, os: OperatingSystem) -> Optional[str]:
        """Load a static template using the new modular structure"""
        if self.use_legacy_structure:
            # Legacy structure: CONTROL__OS.yml
            template_key = f"{control_id}__{os.value}"
            if template_key in self.available_templates:
                template = self.available_templates[template_key]
                try:
                    with open(template.file_path, 'r') as f:
                        self.stats["static_template_hits"] += 1
                        return f.read()
                except Exception as e:
                    print(f"Error loading template {template.file_path}: {e}")
        else:
            # New modular structure: {os}/{control_id}.yml
            template_path = self.templates_dir / os.value / f"{control_id}.yml"
            if template_path.exists():
                try:
                    with open(template_path, 'r') as f:
                        self.stats["static_template_hits"] += 1
                        return f.read()
                except Exception as e:
                    print(f"Error loading template {template_path}: {e}")
        
        return None
    
    def _generate_with_gpt(self, request: PlaybookRequest) -> str:
        """Generate playbook using OpenAI GPT with enhanced structured prompt"""
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key or "dummy" in openai_api_key.lower():
            # Return a mock playbook when using dummy API key
            return self._generate_mock_playbook(request)
        
        client = OpenAI(api_key=openai_api_key)
        
        # Get control details from our data
        control = get_control_by_id(request.control_id)
        control_title = control.control_name if control else "Unknown Control"
        control_description = control.plain_english_explanation if control else ""
        
        # Get STIG IDs for context
        stig_ids = self.stig_mappings.get(request.operating_system.value, {}).get(request.control_id, [])
        stig_context = f"\nSTIG IDs: {', '.join(stig_ids)}" if stig_ids else ""
        
        # Get OS-specific tools
        os_tools = self.os_tools.get(request.operating_system.value, {})
        package_manager = os_tools.get("package_manager", "apt")
        service_manager = os_tools.get("service_manager", "systemctl")
        
        # Enhanced structured prompt for better results
        prompt = f"""You are a DevSecOps assistant.

Generate an **Ansible playbook** for NIST control {request.control_id} ("{control_title}") on {request.operating_system.value.replace('_', ' ').title()}.

**Control Context:**
- Control ID: {request.control_id}
- Title: {control_title}
- Description: {control_description[:200]}...{stig_context}

**Target Environment:**
- Operating System: {request.operating_system.value.replace('_', ' ').title()}
- Package Manager: {package_manager}
- Service Manager: {service_manager}
- Environment Variables: {request.environment}

**Requirements:**
- Follow STIG guidance if relevant
- Use Ansible best practices (idempotent, tagged, clear YAML)
- Include inline comments explaining each step
- Use appropriate modules for the target OS
- Include error handling and verification
- Add tags for task organization
- Include handlers for service management
- Use variables for customization
- Output only valid Ansible YAML

**Structure Required:**
```yaml
---
- name: "Implement NIST {request.control_id} - {control_title}"
  hosts: all
  become: yes
  vars:
    # Define variables here
  
  tasks:
    # Implementation tasks here
    
  handlers:
    # Service handlers here
```

Generate the complete playbook focusing on practical, secure implementation of {request.control_id} requirements."""

        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a cybersecurity expert and Ansible automation specialist. Generate secure, production-ready Ansible playbooks that implement NIST 800-53 security controls with proper error handling and best practices. Always output valid YAML without any explanation text."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=2500,
                temperature=0.2
            )
            
            self.stats["gpt_generated"] += 1
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            raise Exception(f"Failed to generate playbook with GPT: {str(e)}")
    
    def _generate_mock_playbook(self, request: PlaybookRequest) -> str:
        """Generate a mock playbook when OpenAI API is not available"""
        control = get_control_by_id(request.control_id)
        control_title = control.control_name if control else "Unknown Control"
        
        # Create a basic mock playbook structure
        mock_playbook = f"""---
- name: "Implement NIST {request.control_id} - {control_title}"
  hosts: all
  become: yes
  vars:
    control_id: "{request.control_id}"
    operating_system: "{request.operating_system.value}"
    
  tasks:
    - name: "Display control information"
      debug:
        msg: "Implementing NIST control {{{{ control_id }}}} on {{{{ operating_system }}}}"
      tags:
        - info
        - {request.control_id.lower()}
    
    - name: "Create compliance directory"
      file:
        path: "/etc/compliance/{request.control_id.lower()}"
        state: directory
        mode: '0755'
      tags:
        - setup
        - {request.control_id.lower()}
    
    - name: "Generate compliance report"
      copy:
        content: |
          Control: {request.control_id}
          Title: {control_title}
          OS: {request.operating_system.value}
          Status: Mock Implementation (OpenAI API not configured)
          Generated: {{{{ ansible_date_time.iso8601 }}}}
        dest: "/etc/compliance/{request.control_id.lower()}/status.txt"
        mode: '0644'
      tags:
        - compliance
        - {request.control_id.lower()}
      notify:
        - restart_compliance_service
        
  handlers:
    - name: restart_compliance_service
      debug:
        msg: "Would restart compliance service (mock implementation)"
"""
        return mock_playbook
    
    def _parse_playbook_content(self, yaml_content: str) -> Dict[str, Any]:
        """Parse YAML content and extract playbook components"""
        try:
            yaml_data = yaml.safe_load(yaml_content)
            
            if not isinstance(yaml_data, list) or len(yaml_data) == 0:
                return {}
            
            playbook = yaml_data[0]
            
            # Extract tasks
            tasks = []
            for task_data in playbook.get('tasks', []):
                if 'name' in task_data:
                    # Find the main module (exclude meta attributes)
                    module = None
                    parameters = {}
                    
                    for key, value in task_data.items():
                        if key not in ['name', 'tags', 'when', 'become', 'notify']:
                            module = key
                            parameters = value if isinstance(value, dict) else {key: value}
                            break
                    
                    if module:
                        task = PlaybookTask(
                            name=task_data['name'],
                            module=module,
                            parameters=parameters,
                            tags=task_data.get('tags', []),
                            when=task_data.get('when'),
                            become=task_data.get('become'),
                            notify=task_data.get('notify', [])
                        )
                        tasks.append(task)
            
            # Extract handlers
            handlers = []
            for handler_data in playbook.get('handlers', []):
                if 'name' in handler_data:
                    module = None
                    parameters = {}
                    
                    for key, value in handler_data.items():
                        if key not in ['name', 'tags', 'when', 'become']:
                            module = key
                            parameters = value if isinstance(value, dict) else {key: value}
                            break
                    
                    if module:
                        handler = PlaybookTask(
                            name=handler_data['name'],
                            module=module,
                            parameters=parameters
                        )
                        handlers.append(handler)
            
            return {
                'tasks': tasks,
                'variables': playbook.get('vars', {}),
                'handlers': handlers,
                'requirements': self._extract_requirements(playbook)
            }
            
        except Exception as e:
            print(f"Error parsing playbook content: {e}")
            return {'tasks': [], 'variables': {}, 'handlers': [], 'requirements': []}
    
    def generate_playbook(self, request: PlaybookRequest) -> PlaybookResponse:
        """Generate an Ansible playbook for the given request"""
        self.stats["total_requests"] += 1
        
        # Generate cache key
        cache_key = self._generate_cache_key(request)
        
        # Check cache first (unless force refresh)
        if not request.force_refresh:
            cached_playbook = self._get_cached_playbook(cache_key)
            if cached_playbook:
                return cached_playbook
        
        # Try to load static template first
        static_content = self._load_static_template(request.control_id, request.operating_system)
        
        if static_content:
            # Use static template
            source = PlaybookSource.STATIC_TEMPLATE
            playbook_yaml = static_content
            description = f"Static template for {request.control_id} on {request.operating_system.value}"
        else:
            # Generate with GPT
            source = PlaybookSource.GPT_GENERATED
            playbook_yaml = self._generate_with_gpt(request)
            description = f"AI-generated playbook for {request.control_id} on {request.operating_system.value}"
        
        # Parse playbook content
        parsed_content = self._parse_playbook_content(playbook_yaml)
        
        # Get STIG ID if available
        stig_id = None
        if request.stig_id:
            stig_id = request.stig_id
        else:
            stig_ids = self.stig_mappings.get(request.operating_system.value, {}).get(request.control_id, [])
            stig_id = stig_ids[0] if stig_ids else None
        
        # Create response
        response = PlaybookResponse(
            control_id=request.control_id,
            operating_system=request.operating_system,
            stig_id=stig_id,
            playbook_yaml=playbook_yaml,
            source=source,
            cached=False,
            tasks=parsed_content.get('tasks', []),
            variables=parsed_content.get('variables', {}),
            handlers=parsed_content.get('handlers', []),
            requirements=parsed_content.get('requirements', []),
            description=description,
            generated_at=datetime.now(),
            cache_key=cache_key,
            estimated_runtime="5-15 minutes",
            compliance_notes=f"Implements NIST 800-53 {request.control_id} requirements for {request.operating_system.value}"
        )
        
        # Cache the response
        self._cache_playbook(cache_key, response)
        
        return response
    
    def generate_bulk_playbook(self, control_ids: List[str], operating_system: str, 
                             playbook_name: str = "Multi-Control Compliance Playbook", 
                             environment: Dict[str, str] = None) -> PlaybookResponse:
        """Generate a combined Ansible playbook for multiple NIST controls"""
        if environment is None:
            environment = {}
        
        # Convert string OS to enum
        try:
            os_enum = OperatingSystem(operating_system)
        except ValueError:
            raise ValueError(f"Unsupported operating system: {operating_system}")
        
        # Generate cache key for bulk request
        bulk_cache_key = hashlib.sha256(
            f"bulk:{','.join(sorted(control_ids))}:{operating_system}:{playbook_name}".encode()
        ).hexdigest()
        
        # Check cache first
        cached_playbook = self._get_cached_playbook(bulk_cache_key)
        if cached_playbook:
            return cached_playbook
        
        # Get control information
        control_details = []
        for control_id in control_ids:
            control = get_control_by_id(control_id)
            if control:
                control_details.append(control)
        
        if not control_details:
            raise ValueError("No valid controls found")
        
        # Generate individual playbooks and combine them
        combined_tasks = []
        combined_handlers = []
        combined_variables = {}
        combined_requirements = set()
        sources_used = set()
        
        for control in control_details:
            try:
                # Create individual request
                individual_request = PlaybookRequest(
                    control_id=control.control_id,
                    operating_system=os_enum,
                    environment=environment
                )
                
                # Generate individual playbook
                individual_playbook = self.generate_playbook(individual_request)
                sources_used.add(individual_playbook.source)
                
                # Extract tasks and add control context
                for task in individual_playbook.tasks:
                    task_dict = task.dict() if hasattr(task, 'dict') else task
                    task_dict['tags'] = task_dict.get('tags', []) + [control.control_id.lower()]
                    combined_tasks.append(task_dict)
                
                # Merge handlers
                for handler in individual_playbook.handlers:
                    handler_dict = handler.dict() if hasattr(handler, 'dict') else handler
                    combined_handlers.append(handler_dict)
                
                # Merge variables
                combined_variables.update(individual_playbook.variables)
                
                # Merge requirements
                combined_requirements.update(individual_playbook.requirements)
                
            except Exception as e:
                print(f"Error generating playbook for {control.control_id}: {e}")
                # Add a basic task for failed controls
                combined_tasks.append({
                    'name': f'Manual implementation required for {control.control_id} - {control.control_name}',
                    'debug': {
                        'msg': f'Automated implementation not available for {control.control_id}. Please implement manually.'
                    },
                    'tags': [control.control_id.lower(), 'manual']
                })
        
        # Create combined playbook YAML
        combined_playbook_yaml = self._create_combined_playbook_yaml(
            playbook_name=playbook_name,
            control_ids=control_ids,
            operating_system=os_enum,
            tasks=combined_tasks,
            handlers=combined_handlers,
            variables=combined_variables,
            environment=environment
        )
        
        # Determine source
        if PlaybookSource.STATIC_TEMPLATE in sources_used and PlaybookSource.GPT_GENERATED in sources_used:
            source = PlaybookSource.GPT_GENERATED  # Mixed, default to GPT
        elif PlaybookSource.STATIC_TEMPLATE in sources_used:
            source = PlaybookSource.STATIC_TEMPLATE
        else:
            source = PlaybookSource.GPT_GENERATED
        
        # Create response
        response = PlaybookResponse(
            control_id=",".join(control_ids),
            operating_system=os_enum,
            playbook_yaml=combined_playbook_yaml,
            source=source,
            cached=False,
            tasks=combined_tasks,
            variables=combined_variables,
            handlers=combined_handlers,
            requirements=list(combined_requirements),
            description=f"Combined playbook implementing {len(control_ids)} NIST controls: {', '.join(control_ids)}",
            generated_at=datetime.now(),
            cache_key=bulk_cache_key,
            estimated_runtime=f"{len(control_ids) * 5}-{len(control_ids) * 15} minutes",
            compliance_notes=f"Implements NIST 800-53 controls {', '.join(control_ids)} for {os_enum.value}"
        )
        
        # Cache the response
        self._cache_playbook(bulk_cache_key, response)
        
        self.stats["total_requests"] += 1
        if source == PlaybookSource.GPT_GENERATED:
            self.stats["gpt_generated"] += 1
        else:
            self.stats["static_template_hits"] += 1
        
        return response
    
    def _create_combined_playbook_yaml(self, playbook_name: str, control_ids: List[str], 
                                     operating_system: OperatingSystem, tasks: List[dict], 
                                     handlers: List[dict], variables: Dict[str, Any], 
                                     environment: Dict[str, str]) -> str:
        """Create a combined playbook YAML from multiple controls"""
        
        # Remove duplicate handlers by name
        unique_handlers = {}
        for handler in handlers:
            handler_name = handler.get('name', 'unnamed')
            if handler_name not in unique_handlers:
                unique_handlers[handler_name] = handler
        
        playbook_data = {
            'name': playbook_name,
            'hosts': 'all',
            'become': True,
            'vars': {
                'compliance_controls': control_ids,
                'target_os': operating_system.value,
                'generated_by': 'NIST Compliance Control Builder',
                'generated_at': datetime.now().isoformat(),
                **variables,
                **environment
            },
            'tasks': [
                {
                    'name': 'Display compliance information',
                    'debug': {
                        'msg': f'Implementing NIST 800-53 controls: {", ".join(control_ids)} on {operating_system.value}'
                    },
                    'tags': ['info', 'compliance']
                },
                {
                    'name': 'Create compliance directory',
                    'file': {
                        'path': '/etc/compliance',
                        'state': 'directory',
                        'mode': '0755'
                    },
                    'tags': ['setup', 'compliance']
                }
            ] + tasks,
            'handlers': list(unique_handlers.values()) if unique_handlers else []
        }
        
        # Convert to YAML
        import yaml
        yaml_content = yaml.dump([playbook_data], default_flow_style=False, sort_keys=False)
        
        # Add header comment
        header = f"""---
# Combined NIST 800-53 Compliance Playbook
# Generated by: NIST Compliance Control Builder
# Controls: {', '.join(control_ids)}
# Target OS: {operating_system.value}
# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
#
# This playbook implements multiple NIST 800-53 security controls
# Run with: ansible-playbook -i inventory {playbook_name.lower().replace(' ', '_')}.yml
#

"""
        
        return header + yaml_content
    
    def get_stats(self) -> PlaybookGenerationStats:
        """Get statistics about playbook generation"""
        return PlaybookGenerationStats(
            total_requests=self.stats["total_requests"],
            static_template_hits=self.stats["static_template_hits"],
            gpt_generated=self.stats["gpt_generated"],
            cache_hits=self.stats["cache_hits"],
            cache_misses=self.stats["cache_misses"],
            supported_os_count=len(OperatingSystem),
            available_templates=len(self.available_templates),
            template_structure=f"{'Legacy' if self.use_legacy_structure else 'Modular'}",
            supported_controls=list(set(template.control_id for template in self.available_templates.values()))
        )
    
    def list_templates(self) -> List[PlaybookTemplate]:
        """Get all available templates"""
        return list(self.available_templates.values())
    
    def get_supported_controls(self, os: OperatingSystem) -> List[str]:
        """Get supported controls for a specific operating system"""
        controls = []
        for template in self.available_templates.values():
            if template.operating_system == os:
                controls.append(template.control_id)
        return sorted(list(set(controls)))
    
    def get_supported_operating_systems(self) -> List[str]:
        """Get all supported operating systems"""
        return [os.value for os in OperatingSystem]
    
    def migrate_templates_to_modular_structure(self) -> Dict[str, str]:
        """Migrate existing templates from legacy to modular structure"""
        if not self.use_legacy_structure:
            return {"status": "Already using modular structure"}
        
        migration_results = {}
        legacy_dir = Path("playbook-templates")
        new_dir = Path("playbook-templates-new")
        
        # Create OS directories
        for os_value in OperatingSystem:
            os_dir = new_dir / os_value.value
            os_dir.mkdir(parents=True, exist_ok=True)
        
        # Migrate templates
        for template_file in legacy_dir.glob("*.yml"):
            try:
                filename = template_file.stem
                if "__" in filename:
                    control_id, os_name = filename.split("__", 1)
                    
                    # Create new path
                    new_path = new_dir / os_name / f"{control_id}.yml"
                    
                    # Copy file
                    import shutil
                    shutil.copy2(template_file, new_path)
                    
                    migration_results[str(template_file)] = str(new_path)
                    
            except Exception as e:
                migration_results[str(template_file)] = f"Error: {e}"
        
        return migration_results

    def warm_cache_for_common_requests(self) -> Dict[str, str]:
        """Pre-generate and cache playbooks for common control/OS combinations"""
        common_combinations = [
            ("AC-2", OperatingSystem.UBUNTU_22_04),
            ("AC-3", OperatingSystem.RHEL_8),
            ("AU-2", OperatingSystem.UBUNTU_22_04),
            ("SC-28", OperatingSystem.RHEL_8),
            ("AC-17", OperatingSystem.UBUNTU_20_04),
            ("SI-4", OperatingSystem.WINDOWS_SERVER_2019),
            ("IA-5", OperatingSystem.UBUNTU_22_04),
            ("CM-6", OperatingSystem.RHEL_8),
            ("AC-6", OperatingSystem.UBUNTU_22_04),
            ("SI-2", OperatingSystem.RHEL_8),
        ]
        
        results = {}
        for control_id, os in common_combinations:
            try:
                request = PlaybookRequest(
                    control_id=control_id,
                    operating_system=os,
                    environment={},
                    force_refresh=False
                )
                
                cache_key = self._generate_cache_key(request)
                
                # Only generate if not already cached
                if not self._get_cached_playbook(cache_key):
                    playbook = self.generate_playbook(request)
                    results[f"{control_id}-{os.value}"] = f"Cached: {cache_key[:8]}..."
                else:
                    results[f"{control_id}-{os.value}"] = "Already cached"
                    
            except Exception as e:
                results[f"{control_id}-{os.value}"] = f"Error: {str(e)}"
        
        return results

    def get_cache_analytics(self) -> Dict[str, Any]:
        """Get detailed cache analytics"""
        cache_files = list(self.cache_dir.glob("*.json"))
        total_size = sum(f.stat().st_size for f in cache_files)
        
        # Analyze cache age distribution
        ages = []
        for cache_file in cache_files:
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                cached_time = datetime.fromisoformat(data['generated_at'])
                age_days = (datetime.now() - cached_time).days
                ages.append(age_days)
            except:
                continue
        
        return {
            "total_cached_playbooks": len(cache_files),
            "total_cache_size_mb": round(total_size / (1024 * 1024), 2),
            "average_cache_age_days": round(sum(ages) / len(ages), 1) if ages else 0,
            "oldest_cache_days": max(ages) if ages else 0,
            "newest_cache_days": min(ages) if ages else 0,
            "cache_hit_rate": round(
                (self.stats["cache_hits"] / max(1, self.stats["total_requests"])) * 100, 1
            ),
            "api_cost_savings": {
                "requests_saved": self.stats["cache_hits"],
                "estimated_tokens_saved": self.stats["cache_hits"] * 2500,  # avg tokens per request
                "estimated_cost_saved_usd": round(self.stats["cache_hits"] * 0.05, 2)  # rough estimate
            }
        }

# Global playbook generator instance
playbook_generator = PlaybookGenerator() 