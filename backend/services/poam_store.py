"""
Data store service for POA&M (Plan of Action and Milestones) management
Uses JSON file for persistence with in-memory caching
"""
import json
import os
import uuid
from datetime import datetime, date
from typing import Dict, List, Optional, Any
from pathlib import Path

from models.poam import POAMRecord, POAMStatus, POAMPriority, POAMSeverity


class POAMStore:
    """JSON-based data store for POA&M management"""
    
    def __init__(self, data_file: str = "poam_data.json"):
        """Initialize store with data file path"""
        self.data_file = Path(data_file)
        self.data: Dict[str, POAMRecord] = {}
        self._load_data()
    
    def _load_data(self) -> None:
        """Load data from JSON file into memory"""
        if self.data_file.exists():
            try:
                with open(self.data_file, 'r') as f:
                    json_data = json.load(f)
                    
                # Convert JSON back to POAMRecord objects
                for poam_id, record_data in json_data.items():
                    # Parse datetime strings back to datetime objects
                    record_data['created_at'] = datetime.fromisoformat(record_data['created_at'])
                    record_data['last_updated'] = datetime.fromisoformat(record_data['last_updated'])
                    
                    # Parse date strings back to date objects
                    record_data['estimated_completion_date'] = date.fromisoformat(record_data['estimated_completion_date'])
                    if record_data.get('actual_completion_date'):
                        record_data['actual_completion_date'] = date.fromisoformat(record_data['actual_completion_date'])
                    
                    self.data[poam_id] = POAMRecord(**record_data)
                    
                print(f"[OK] Loaded {len(self.data)} POA&M records from {self.data_file}")
            except Exception as e:
                print(f"[WARNING] Error loading POA&M data: {e}")
                self.data = {}
        else:
            print(f"[INFO] Creating new POA&M data file: {self.data_file}")
            self.data = {}
            # Sample data loading disabled after cleanup
            # self._load_sample_data()
    
    def _save_data(self) -> None:
        """Save data from memory to JSON file"""
        try:
            # Convert POAMRecord objects to JSON-serializable format
            json_data = {}
            for poam_id, record in self.data.items():
                record_dict = record.model_dump()
                
                # Convert datetime objects to ISO format strings
                record_dict['created_at'] = record.created_at.isoformat()
                record_dict['last_updated'] = record.last_updated.isoformat()
                
                # Convert date objects to ISO format strings
                record_dict['estimated_completion_date'] = record.estimated_completion_date.isoformat()
                if record.actual_completion_date:
                    record_dict['actual_completion_date'] = record.actual_completion_date.isoformat()
                
                json_data[poam_id] = record_dict
            
            # Create directory if it doesn't exist
            self.data_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Write to file with backup
            temp_file = self.data_file.with_suffix('.tmp')
            with open(temp_file, 'w') as f:
                json.dump(json_data, f, indent=2, default=str)
            
            # Atomic move
            temp_file.replace(self.data_file)
            
        except Exception as e:
            print(f"[ERROR] Error saving POA&M data: {e}")
            raise
    
    def _load_sample_data(self) -> None:
        """Load sample POA&M data for testing (disabled after cleanup)"""
        # Sample data removed during repository cleanup
        pass
    
    def create_record(self, control_id: str, system_id: str, control_title: Optional[str], description: str,
                     remediation_action: str, estimated_completion_date: date,
                     assigned_owner: Optional[str] = None, priority: POAMPriority = POAMPriority.MEDIUM,
                     severity: Optional[POAMSeverity] = None, root_cause: Optional[str] = None,
                     resources_required: Optional[str] = None, milestones: Optional[List[str]] = None,
                     cost_estimate: Optional[float] = None, business_impact: Optional[str] = None,
                     created_by: Optional[str] = None) -> POAMRecord:
        """Create a new POA&M record"""
        now = datetime.now()
        poam_id = str(uuid.uuid4())
        
        record = POAMRecord(
            id=poam_id,
            control_id=control_id,
            system_id=system_id,
            control_title=control_title,
            description=description,
            remediation_action=remediation_action,
            estimated_completion_date=estimated_completion_date,
            assigned_owner=assigned_owner,
            priority=priority,
            severity=severity,
            root_cause=root_cause,
            resources_required=resources_required,
            milestones=milestones or [],
            cost_estimate=cost_estimate,
            business_impact=business_impact,
            created_at=now,
            last_updated=now,
            created_by=created_by,
            status=POAMStatus.OPEN,
            comments=[]
        )
        
        # Save to memory and file
        self.data[poam_id] = record
        self._save_data()
        
        return record
    
    def get_record(self, poam_id: str) -> Optional[POAMRecord]:
        """Get a specific POA&M record by ID"""
        return self.data.get(poam_id)
    
    def get_all_records(self) -> List[POAMRecord]:
        """Get all POA&M records"""
        return list(self.data.values())
    
    def get_records_by_control(self, control_id: str) -> List[POAMRecord]:
        """Get all POA&M records for a specific control"""
        return [record for record in self.data.values() if record.control_id == control_id]
    
    def get_records_by_status(self, status: POAMStatus) -> List[POAMRecord]:
        """Get all records with a specific status"""
        return [record for record in self.data.values() if record.status == status]
    
    def get_records_by_priority(self, priority: POAMPriority) -> List[POAMRecord]:
        """Get all records with a specific priority"""
        return [record for record in self.data.values() if record.priority == priority]
    
    def get_records_by_owner(self, owner: str) -> List[POAMRecord]:
        """Get all records assigned to a specific owner"""
        return [record for record in self.data.values() 
                if record.assigned_owner and record.assigned_owner.lower() == owner.lower()]
    
    def get_records(self, status: Optional[str] = None, priority: Optional[str] = None,
                   control_id: Optional[str] = None, owner: Optional[str] = None,
                   overdue: Optional[bool] = None) -> List[POAMRecord]:
        """Get filtered POA&M records"""
        records = list(self.data.values())
        
        # Apply filters
        if status:
            try:
                status_enum = POAMStatus(status.lower())
                records = [r for r in records if r.status == status_enum]
            except ValueError:
                pass  # Invalid status, return empty list
        
        if priority:
            try:
                priority_enum = POAMPriority(priority.lower())
                records = [r for r in records if r.priority == priority_enum]
            except ValueError:
                pass  # Invalid priority, return empty list
        
        if control_id:
            records = [r for r in records if r.control_id and control_id.upper() in r.control_id.upper()]
        
        if owner:
            records = [r for r in records if r.assigned_owner and owner.lower() in r.assigned_owner.lower()]
        
        if overdue:
            today = date.today()
            records = [r for r in records 
                      if r.estimated_completion_date < today and r.status != POAMStatus.COMPLETED]
        
        return records
    
    def update_record(self, poam_id: str, **updates) -> Optional[POAMRecord]:
        """Update a POA&M record"""
        if poam_id not in self.data:
            return None
        
        record = self.data[poam_id]
        now = datetime.now()
        
        # Track the update in comments if a comment is provided
        comment_text = updates.pop('comment', None)
        if comment_text:
            comment = {
                'timestamp': now.isoformat(),
                'comment': comment_text,
                'updated_by': updates.get('updated_by', 'System')
            }
            record.comments.append(comment)
        
        # Update fields
        for field, value in updates.items():
            if hasattr(record, field) and value is not None:
                setattr(record, field, value)
        
        # Always update the last_updated timestamp
        record.last_updated = now
        
        # Save to file
        self._save_data()
        
        return record
    
    def delete_record(self, poam_id: str) -> bool:
        """Delete a POA&M record"""
        if poam_id in self.data:
            del self.data[poam_id]
            self._save_data()
            return True
        return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get POA&M statistics"""
        all_records = list(self.data.values())
        
        # Status breakdown
        status_counts = {}
        for status in POAMStatus:
            status_counts[status.value] = len([r for r in all_records if r.status == status])
        
        # Priority breakdown
        priority_counts = {}
        for priority in POAMPriority:
            priority_counts[priority.value] = len([r for r in all_records if r.priority == priority])
        
        # Control family breakdown
        control_families = {}
        for record in all_records:
            family = record.control_id.split('-')[0] if '-' in record.control_id else 'Other'
            control_families[family] = control_families.get(family, 0) + 1
        
        # Owner breakdown
        owner_counts = {}
        for record in all_records:
            owner = record.assigned_owner or 'Unassigned'
            owner_counts[owner] = owner_counts.get(owner, 0) + 1
        
        # Overdue items (past estimated completion date)
        today = date.today()
        overdue_count = len([r for r in all_records 
                           if r.status not in [POAMStatus.COMPLETED, POAMStatus.CANCELLED] 
                           and r.estimated_completion_date < today])
        
        # Due soon (within 30 days)
        from datetime import timedelta
        due_soon_date = today + timedelta(days=30)
        due_soon_count = len([r for r in all_records 
                            if r.status not in [POAMStatus.COMPLETED, POAMStatus.CANCELLED] 
                            and today <= r.estimated_completion_date <= due_soon_date])
        
        return {
            'total_poams': len(all_records),
            'status_breakdown': status_counts,
            'priority_breakdown': priority_counts,
            'control_family_breakdown': control_families,
            'owner_breakdown': owner_counts,
            'overdue_count': overdue_count,
            'due_soon_count': due_soon_count,
            'completion_rate': round(
                (status_counts.get('Completed', 0) / len(all_records) * 100) if all_records else 0, 1
            )
        }


# Global instance
poam_store = POAMStore() 