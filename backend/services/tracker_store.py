"""
Data store service for NIST control implementation tracking
Uses JSON file for persistence with in-memory caching
"""
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

from models.tracker import TrackerRecord, ImplementationStatus


class TrackerStore:
    """JSON-based data store for implementation tracking"""
    
    def __init__(self, data_file: str = "tracker_data.json"):
        """Initialize store with data file path"""
        self.data_file = Path(data_file)
        self.data: Dict[str, TrackerRecord] = {}
        self._load_data()
    
    def _load_data(self) -> None:
        """Load data from JSON file into memory"""
        if self.data_file.exists():
            try:
                with open(self.data_file, 'r') as f:
                    json_data = json.load(f)
                    
                # Convert JSON back to TrackerRecord objects
                for control_id, record_data in json_data.items():
                    # Parse datetime strings back to datetime objects
                    record_data['last_updated'] = datetime.fromisoformat(record_data['last_updated'])
                    record_data['created_at'] = datetime.fromisoformat(record_data['created_at'])
                    
                    self.data[control_id] = TrackerRecord(**record_data)
                    
                print(f"Loaded {len(self.data)} tracker records from {self.data_file}")
            except Exception as e:
                print(f"Warning: Error loading tracker data: {e}")
                self.data = {}
        else:
            print(f"[INFO] Creating new tracker data file: {self.data_file}")
            self.data = {}
    
    def _save_data(self) -> None:
        """Save data from memory to JSON file"""
        try:
            # Convert TrackerRecord objects to JSON-serializable dict
            json_data = {}
            for control_id, record in self.data.items():
                record_dict = record.dict()
                # Convert datetime objects to ISO strings
                record_dict['last_updated'] = record.last_updated.isoformat()
                record_dict['created_at'] = record.created_at.isoformat()
                json_data[control_id] = record_dict
            
            # Write to file with pretty formatting
            with open(self.data_file, 'w') as f:
                json.dump(json_data, f, indent=2, default=str)
                
        except Exception as e:
            print(f"[ERROR] Error saving tracker data: {e}")
            raise
    
    def get_record(self, control_id: str) -> Optional[TrackerRecord]:
        """Get a single tracker record by control ID"""
        return self.data.get(control_id)
    
    def get_all_records(self) -> List[TrackerRecord]:
        """Get all tracker records"""
        return list(self.data.values())
    
    def save_record(self, control_id: str, status: ImplementationStatus, 
                   owner: str, notes: str, adapted_guidance: Optional[str] = None) -> TrackerRecord:
        """Save or update a tracker record"""
        now = datetime.now()
        
        # Check if record exists
        existing_record = self.data.get(control_id)
        
        if existing_record:
            # Update existing record
            record = TrackerRecord(
                control_id=control_id,
                status=status,
                owner=owner,
                notes=notes,
                adapted_guidance=adapted_guidance,
                last_updated=now,
                created_at=existing_record.created_at  # Keep original creation time
            )
        else:
            # Create new record
            record = TrackerRecord(
                control_id=control_id,
                status=status,
                owner=owner,
                notes=notes,
                adapted_guidance=adapted_guidance,
                last_updated=now,
                created_at=now
            )
        
        # Save to memory and file
        self.data[control_id] = record
        self._save_data()
        
        return record
    
    def delete_record(self, control_id: str) -> bool:
        """Delete a tracker record"""
        if control_id in self.data:
            del self.data[control_id]
            self._save_data()
            return True
        return False
    
    def get_records_by_status(self, status: ImplementationStatus) -> List[TrackerRecord]:
        """Get all records with a specific status"""
        return [record for record in self.data.values() if record.status == status]
    
    def get_records_by_owner(self, owner: str) -> List[TrackerRecord]:
        """Get all records assigned to a specific owner"""
        return [record for record in self.data.values() if record.owner.lower() == owner.lower()]


# Create global instance
tracker_store = TrackerStore() 