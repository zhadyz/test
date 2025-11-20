"""
Data store service for system management
Uses JSON file for persistence with in-memory caching
"""
import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

from models.system import SystemRecord, SystemStatus, SystemEnvironment, SystemSummary
from services.tracker_store import tracker_store
from services.poam_store import poam_store


class SystemStore:
    """JSON-based data store for system management"""
    
    def __init__(self, data_file: str = "systems_data.json"):
        """Initialize store with data file path"""
        self.data_file = Path(data_file)
        self.data: Dict[str, SystemRecord] = {}
        self._load_data()
    
    def _load_data(self) -> None:
        """Load data from JSON file into memory"""
        if self.data_file.exists():
            try:
                with open(self.data_file, 'r') as f:
                    json_data = json.load(f)
                    
                # Convert JSON back to SystemRecord objects
                for system_id, record_data in json_data.items():
                    # Parse datetime strings back to datetime objects
                    record_data['created_at'] = datetime.fromisoformat(record_data['created_at'])
                    record_data['last_updated'] = datetime.fromisoformat(record_data['last_updated'])
                    
                    self.data[system_id] = SystemRecord(**record_data)
                    
                print(f"[OK] Loaded {len(self.data)} system records from {self.data_file}")
            except Exception as e:
                print(f"[WARNING] Error loading system data: {e}")
                self.data = {}
                self._create_default_system()
        else:
            print(f"[INFO] Creating new system data file: {self.data_file}")
            self.data = {}
            self._create_default_system()
    
    def _create_default_system(self) -> None:
        """Create a default system if none exist"""
        default_system = self.create_system(
            name="Default System",
            description="Default system created automatically for initial setup",
            tags=["default"],
            environment=SystemEnvironment.DEVELOPMENT,
            owner="System Administrator",
            created_by="System"
        )
        print(f"[OK] Created default system: {default_system.system_id}")
    
    def _save_data(self) -> None:
        """Save data to JSON file"""
        try:
            # Convert SystemRecord objects to JSON-serializable format
            json_data = {}
            for system_id, record in self.data.items():
                record_dict = record.model_dump()
                # Convert datetime objects to ISO format strings
                record_dict['created_at'] = record.created_at.isoformat()
                record_dict['last_updated'] = record.last_updated.isoformat()
                json_data[system_id] = record_dict
            
            with open(self.data_file, 'w') as f:
                json.dump(json_data, f, indent=2, default=str)
                
        except Exception as e:
            print(f"[WARNING] Error saving system data: {e}")
    
    def create_system(self, name: str, description: str, tags: List[str] = None,
                     environment: SystemEnvironment = SystemEnvironment.PRODUCTION,
                     owner: Optional[str] = None, business_unit: Optional[str] = None,
                     criticality: Optional[str] = None, metadata: Dict = None,
                     created_by: Optional[str] = None) -> SystemRecord:
        """Create a new system record"""
        now = datetime.now()
        system_id = str(uuid.uuid4())
        
        record = SystemRecord(
            system_id=system_id,
            name=name,
            description=description,
            tags=tags or [],
            environment=environment,
            owner=owner,
            business_unit=business_unit,
            criticality=criticality,
            metadata=metadata or {},
            status=SystemStatus.ACTIVE,
            created_at=now,
            last_updated=now,
            created_by=created_by
        )
        
        # Save to memory and file
        self.data[system_id] = record
        self._save_data()
        
        return record
    
    def get_system(self, system_id: str) -> Optional[SystemRecord]:
        """Get a specific system record by ID"""
        system = self.data.get(system_id)
        if system:
            # Update statistics
            system = self._update_system_stats(system)
        return system
    
    def get_all_systems(self) -> List[SystemRecord]:
        """Get all system records with updated statistics"""
        systems = []
        for system in self.data.values():
            updated_system = self._update_system_stats(system)
            systems.append(updated_system)
        return systems
    
    def get_active_systems(self) -> List[SystemRecord]:
        """Get all active system records"""
        return [system for system in self.get_all_systems() 
                if system.status == SystemStatus.ACTIVE]
    
    def update_system(self, system_id: str, **updates) -> Optional[SystemRecord]:
        """Update a system record"""
        if system_id not in self.data:
            return None
        
        system = self.data[system_id]
        now = datetime.now()
        
        # Update fields
        for field, value in updates.items():
            if hasattr(system, field) and value is not None:
                setattr(system, field, value)
        
        # Always update the last_updated timestamp
        system.last_updated = now
        
        # Save to file
        self._save_data()
        
        return self._update_system_stats(system)
    
    def delete_system(self, system_id: str) -> bool:
        """Delete a system record (soft delete by setting status to archived)"""
        if system_id in self.data:
            self.data[system_id].status = SystemStatus.ARCHIVED
            self.data[system_id].last_updated = datetime.now()
            self._save_data()
            return True
        return False
    
    def get_system_summary(self, system_id: str) -> Optional[SystemSummary]:
        """Get summary statistics for a system"""
        system = self.get_system(system_id)
        if not system:
            return None
        
        return SystemSummary(
            system_id=system_id,
            name=system.name,
            control_count=system.control_count,
            poam_count=system.poam_count,
            rmf_progress=system.rmf_progress,
            last_activity=system.last_updated
        )
    
    def _update_system_stats(self, system: SystemRecord) -> SystemRecord:
        """Update system statistics based on current data"""
        # Count tracker records for this system
        # Note: This will need to be updated when we add system_id to tracker records
        all_tracker_records = tracker_store.get_all_records()
        system.control_count = len(all_tracker_records)
        
        # Count POA&M records for this system
        # Note: This will need to be updated when we add system_id to POAM records
        all_poam_records = poam_store.get_all_records()
        system.poam_count = len(all_poam_records)
        
        # Calculate RMF progress (placeholder - will be updated with RMF tracker integration)
        system.rmf_progress = 0.0
        
        return system
    
    def get_default_system(self) -> Optional[SystemRecord]:
        """Get the default system (first active system)"""
        active_systems = self.get_active_systems()
        return active_systems[0] if active_systems else None


# Global system store instance
system_store = SystemStore() 