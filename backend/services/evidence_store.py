"""
Evidence Store Service for NIST Control Evidence Management

This service handles file storage, metadata management, and retrieval
of evidence artifacts associated with NIST 800-53 controls.
"""

import json
import os
import hashlib
import uuid
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path

from models.evidence import (
    EvidenceRecord, EvidenceRequest, EvidenceUpdateRequest,
    EvidenceType, ConfidenceLevel, EvidenceSummary
)


class EvidenceStore:
    """File-based evidence store with JSON metadata"""
    
    def __init__(self, data_file: str = "evidence_data.json", storage_dir: str = "evidence_files"):
        """Initialize evidence store with data file and storage directory"""
        self.data_file = Path(data_file)
        self.storage_dir = Path(storage_dir)
        self.data: Dict[str, EvidenceRecord] = {}
        
        # Create storage directory if it doesn't exist
        self.storage_dir.mkdir(exist_ok=True)
        
        # Create subdirectories for organization
        for evidence_type in EvidenceType:
            (self.storage_dir / evidence_type.value).mkdir(exist_ok=True)
        
        self._load_data()
    
    def _load_data(self) -> None:
        """Load evidence metadata from JSON file"""
        if self.data_file.exists():
            try:
                with open(self.data_file, 'r') as f:
                    json_data = json.load(f)
                    
                # Convert JSON back to EvidenceRecord objects
                for evidence_id, record_data in json_data.items():
                    # Parse datetime strings back to datetime objects
                    record_data['uploaded_at'] = datetime.fromisoformat(record_data['uploaded_at'])
                    record_data['last_updated'] = datetime.fromisoformat(record_data['last_updated'])
                    if record_data.get('date_collected'):
                        record_data['date_collected'] = datetime.fromisoformat(record_data['date_collected'])
                    if record_data.get('last_accessed'):
                        record_data['last_accessed'] = datetime.fromisoformat(record_data['last_accessed'])
                    
                    self.data[evidence_id] = EvidenceRecord(**record_data)
                    
                print(f"[OK] Loaded {len(self.data)} evidence records from {self.data_file}")
            except Exception as e:
                print(f"[WARNING] Error loading evidence data: {e}")
                self.data = {}
        else:
            print(f"[INFO] Creating new evidence data file: {self.data_file}")
            self.data = {}
    
    def _save_data(self) -> None:
        """Save evidence metadata to JSON file"""
        try:
            # Convert EvidenceRecord objects to JSON-serializable format
            json_data = {}
            for evidence_id, record in self.data.items():
                record_dict = record.model_dump()
                # Convert datetime objects to ISO format strings
                record_dict['uploaded_at'] = record.uploaded_at.isoformat()
                record_dict['last_updated'] = record.last_updated.isoformat()
                if record.date_collected:
                    record_dict['date_collected'] = record.date_collected.isoformat()
                if record.last_accessed:
                    record_dict['last_accessed'] = record.last_accessed.isoformat()
                json_data[evidence_id] = record_dict
            
            with open(self.data_file, 'w') as f:
                json.dump(json_data, f, indent=2)
                
        except Exception as e:
            print(f"[WARNING] Error saving evidence data: {e}")
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def _get_storage_path(self, evidence_type: EvidenceType, filename: str) -> Path:
        """Get the storage path for a file based on evidence type"""
        # Create a unique filename to avoid conflicts
        file_extension = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        return self.storage_dir / evidence_type.value / unique_filename
    
    def upload_evidence(self, request: EvidenceRequest, file_content: bytes, 
                       filename: str, file_type: str, uploaded_by: Optional[str] = None) -> EvidenceRecord:
        """Upload and store evidence file with metadata"""
        now = datetime.now()
        evidence_id = str(uuid.uuid4())
        
        # Determine storage path
        storage_path = self._get_storage_path(request.evidence_type, filename)
        
        try:
            # Write file to storage
            with open(storage_path, 'wb') as f:
                f.write(file_content)
            
            # Calculate file hash
            file_hash = self._calculate_file_hash(storage_path)
            
            # Create evidence record
            record = EvidenceRecord(
                evidence_id=evidence_id,
                control_id=request.control_id,
                system_id=request.system_id,
                title=request.title,
                description=request.description,
                evidence_type=request.evidence_type,
                confidence_level=request.confidence_level,
                filename=filename,
                file_path=str(storage_path),
                file_size=len(file_content),
                file_type=file_type,
                file_hash=file_hash,
                date_collected=request.date_collected,
                tags=request.tags,
                metadata=request.metadata,
                uploaded_by=uploaded_by,
                uploaded_at=now,
                last_updated=now
            )
            
            # Save to store
            self.data[evidence_id] = record
            self._save_data()
            
            return record
            
        except Exception as e:
            # Clean up file if record creation failed
            if storage_path.exists():
                storage_path.unlink()
            raise Exception(f"Failed to upload evidence: {str(e)}")
    
    def get_evidence(self, evidence_id: str, track_access: bool = True) -> Optional[EvidenceRecord]:
        """Get evidence record by ID"""
        record = self.data.get(evidence_id)
        
        if record and track_access:
            # Update access tracking
            record.access_count += 1
            record.last_accessed = datetime.now()
            self.data[evidence_id] = record
            self._save_data()
        
        return record
    
    def get_evidence_file(self, evidence_id: str) -> Tuple[Optional[bytes], Optional[str]]:
        """Get evidence file content and filename"""
        record = self.get_evidence(evidence_id, track_access=True)
        if not record:
            return None, None
        
        file_path = Path(record.file_path)
        if not file_path.exists():
            return None, None
        
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            return content, record.filename
        except Exception:
            return None, None
    
    def get_evidence_by_control(self, control_id: str, system_id: Optional[str] = None) -> List[EvidenceRecord]:
        """Get all evidence for a specific control"""
        evidence_list = [
            record for record in self.data.values() 
            if record.control_id == control_id
        ]
        
        if system_id:
            evidence_list = [
                record for record in evidence_list 
                if record.system_id == system_id
            ]
        
        # Sort by upload date (newest first)
        return sorted(evidence_list, key=lambda x: x.uploaded_at, reverse=True)
    
    def get_evidence_by_system(self, system_id: str) -> List[EvidenceRecord]:
        """Get all evidence for a specific system"""
        return [
            record for record in self.data.values() 
            if record.system_id == system_id
        ]
    
    def update_evidence(self, evidence_id: str, update_request: EvidenceUpdateRequest) -> Optional[EvidenceRecord]:
        """Update evidence metadata"""
        record = self.data.get(evidence_id)
        if not record:
            return None
        
        # Update fields that are provided
        update_data = update_request.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(record, field, value)
        
        record.last_updated = datetime.now()
        self.data[evidence_id] = record
        self._save_data()
        
        return record
    
    def delete_evidence(self, evidence_id: str) -> bool:
        """Delete evidence record and file"""
        record = self.data.get(evidence_id)
        if not record:
            return False
        
        # Delete file from storage
        file_path = Path(record.file_path)
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                print(f"[WARNING] Error deleting evidence file: {e}")
        
        # Remove from data store
        del self.data[evidence_id]
        self._save_data()
        
        return True
    
    def get_evidence_summary(self, control_id: str, system_id: str) -> EvidenceSummary:
        """Get summary statistics for evidence by control and system"""
        evidence_list = self.get_evidence_by_control(control_id, system_id)
        
        # Count by type
        evidence_by_type = {}
        for evidence_type in EvidenceType:
            evidence_by_type[evidence_type.value] = sum(
                1 for record in evidence_list if record.evidence_type == evidence_type
            )
        
        # Count by confidence level
        evidence_by_confidence = {}
        for confidence in ConfidenceLevel:
            evidence_by_confidence[confidence.value] = sum(
                1 for record in evidence_list if record.confidence_level == confidence
            )
        
        # Get last uploaded date
        last_uploaded = None
        if evidence_list:
            last_uploaded = max(record.uploaded_at for record in evidence_list)
        
        return EvidenceSummary(
            control_id=control_id,
            system_id=system_id,
            total_evidence=len(evidence_list),
            evidence_by_type=evidence_by_type,
            evidence_by_confidence=evidence_by_confidence,
            last_uploaded=last_uploaded
        )
    
    def get_all_evidence(self) -> List[EvidenceRecord]:
        """Get all evidence records"""
        return list(self.data.values())
    
    def get_storage_stats(self) -> Dict[str, any]:
        """Get storage statistics"""
        total_files = len(self.data)
        total_size = sum(record.file_size for record in self.data.values())
        
        # Count by type
        type_counts = {}
        for evidence_type in EvidenceType:
            type_counts[evidence_type.value] = sum(
                1 for record in self.data.values() if record.evidence_type == evidence_type
            )
        
        return {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "evidence_by_type": type_counts,
            "storage_directory": str(self.storage_dir)
        }


# Global evidence store instance
evidence_store = EvidenceStore() 