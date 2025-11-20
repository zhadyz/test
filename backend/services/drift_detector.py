import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
from models.drift import (
    BaselineSnapshot, 
    DriftChange, 
    DriftCheckResponse, 
    ResourceState, 
    RiskLevel
)

class DriftDetector:
    def __init__(self, baseline_dir: str = "baselines"):
        self.baseline_dir = Path(baseline_dir)
        self.baseline_dir.mkdir(exist_ok=True)
        
        # Define compliance rules for different resource types and controls
        self.compliance_rules = {
            "aws_s3": {
                "SC-28": self._check_s3_encryption,
                "AC-3": self._check_s3_access_control,
                "SC-12": self._check_s3_key_management
            },
            "aws_iam": {
                "AC-2": self._check_iam_account_management,
                "IA-2": self._check_iam_authentication
            },
            "linux_server": {
                "CM-6": self._check_linux_configuration,
                "SI-2": self._check_linux_patches
            },
            "aws_ec2": {
                "SC-7": self._check_ec2_boundary_protection,
                "AU-2": self._check_ec2_audit_events
            }
        }
    
    def create_baseline(self, resource_id: str, resource_type: str, control_id: str, 
                       compliant_state: Dict[str, Any], environment: Dict[str, str],
                       verified_by: Optional[str] = None) -> BaselineSnapshot:
        """Create a new baseline snapshot for a resource-control combination"""
        baseline_id = f"{resource_type}_{resource_id}_{control_id}".replace("/", "_")
        
        baseline = BaselineSnapshot(
            id=baseline_id,
            resource_id=resource_id,
            resource_type=resource_type,
            control_id=control_id,
            compliant_state=compliant_state,
            created_at=datetime.now(),
            environment=environment,
            verified_by=verified_by
        )
        
        # Save baseline to file
        baseline_file = self.baseline_dir / f"{baseline_id}.json"
        with open(baseline_file, 'w') as f:
            json.dump(baseline.dict(), f, indent=2, default=str)
        
        return baseline
    
    def get_baseline(self, resource_id: str, resource_type: str, control_id: str) -> Optional[BaselineSnapshot]:
        """Retrieve a baseline snapshot"""
        baseline_id = f"{resource_type}_{resource_id}_{control_id}".replace("/", "_")
        baseline_file = self.baseline_dir / f"{baseline_id}.json"
        
        if not baseline_file.exists():
            return None
        
        try:
            with open(baseline_file, 'r') as f:
                data = json.load(f)
            return BaselineSnapshot(**data)
        except (json.JSONDecodeError, KeyError, IOError):
            return None
    
    def list_baselines(self) -> List[BaselineSnapshot]:
        """List all stored baselines"""
        baselines = []
        for baseline_file in self.baseline_dir.glob("*.json"):
            try:
                with open(baseline_file, 'r') as f:
                    data = json.load(f)
                baselines.append(BaselineSnapshot(**data))
            except (json.JSONDecodeError, KeyError, IOError):
                continue
        return baselines
    
    def check_drift(self, resources: List[ResourceState], environment: Dict[str, str]) -> DriftCheckResponse:
        """Check for compliance drift across multiple resources"""
        changes = []
        total_resources = len(resources)
        compliant_count = 0
        
        for resource in resources:
            # Find all baselines for this resource
            resource_baselines = [
                b for b in self.list_baselines() 
                if b.resource_id == resource.resource_id and b.resource_type == resource.resource_type
            ]
            
            resource_compliant = True
            
            for baseline in resource_baselines:
                drift_change = self._check_resource_drift(resource, baseline)
                if drift_change:
                    changes.append(drift_change)
                    resource_compliant = False
            
            if resource_compliant:
                compliant_count += 1
        
        return DriftCheckResponse(
            drift_detected=len(changes) > 0,
            changes=changes,
            scan_timestamp=datetime.now(),
            total_resources_checked=total_resources,
            compliant_resources=compliant_count,
            non_compliant_resources=total_resources - compliant_count
        )
    
    def _check_resource_drift(self, current_state: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check if a single resource has drifted from its baseline"""
        resource_type = current_state.resource_type
        control_id = baseline.control_id
        
        if resource_type not in self.compliance_rules:
            return None
        
        if control_id not in self.compliance_rules[resource_type]:
            return None
        
        # Use the appropriate compliance rule checker
        rule_checker = self.compliance_rules[resource_type][control_id]
        return rule_checker(current_state, baseline)
    
    # Compliance rule implementations
    def _check_s3_encryption(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check S3 encryption compliance (SC-28)"""
        baseline_encrypted = baseline.compliant_state.get("encryption_enabled", False)
        current_encrypted = current.properties.get("encryption_enabled", False)
        
        if baseline_encrypted and not current_encrypted:
            return DriftChange(
                resource=current.resource_id,
                issue="S3 bucket encryption disabled — was enabled in baseline",
                control_id=baseline.control_id,
                risk_level=RiskLevel.HIGH,
                baseline_value=baseline_encrypted,
                current_value=current_encrypted,
                detected_at=datetime.now()
            )
        return None
    
    def _check_s3_access_control(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check S3 access control compliance (AC-3)"""
        baseline_public = baseline.compliant_state.get("public_access_blocked", True)
        current_public = current.properties.get("public_access_blocked", True)
        
        if baseline_public and not current_public:
            return DriftChange(
                resource=current.resource_id,
                issue="S3 bucket public access enabled — was blocked in baseline",
                control_id=baseline.control_id,
                risk_level=RiskLevel.CRITICAL,
                baseline_value=baseline_public,
                current_value=current_public,
                detected_at=datetime.now()
            )
        return None
    
    def _check_s3_key_management(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check S3 key management compliance (SC-12)"""
        baseline_kms = baseline.compliant_state.get("kms_key_id")
        current_kms = current.properties.get("kms_key_id")
        
        if baseline_kms and current_kms != baseline_kms:
            return DriftChange(
                resource=current.resource_id,
                issue=f"S3 KMS key changed from {baseline_kms} to {current_kms or 'None'}",
                control_id=baseline.control_id,
                risk_level=RiskLevel.MEDIUM,
                baseline_value=baseline_kms,
                current_value=current_kms,
                detected_at=datetime.now()
            )
        return None
    
    def _check_iam_account_management(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check IAM account management compliance (AC-2)"""
        baseline_mfa = baseline.compliant_state.get("mfa_enabled", False)
        current_mfa = current.properties.get("mfa_enabled", False)
        
        if baseline_mfa and not current_mfa:
            return DriftChange(
                resource=current.resource_id,
                issue="IAM user MFA disabled — was enabled in baseline",
                control_id=baseline.control_id,
                risk_level=RiskLevel.HIGH,
                baseline_value=baseline_mfa,
                current_value=current_mfa,
                detected_at=datetime.now()
            )
        return None
    
    def _check_iam_authentication(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check IAM authentication compliance (IA-2)"""
        baseline_policy = baseline.compliant_state.get("password_policy_enforced", False)
        current_policy = current.properties.get("password_policy_enforced", False)
        
        if baseline_policy and not current_policy:
            return DriftChange(
                resource=current.resource_id,
                issue="IAM password policy enforcement disabled — was enabled in baseline",
                control_id=baseline.control_id,
                risk_level=RiskLevel.MEDIUM,
                baseline_value=baseline_policy,
                current_value=current_policy,
                detected_at=datetime.now()
            )
        return None
    
    def _check_linux_configuration(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check Linux configuration compliance (CM-6)"""
        baseline_firewall = baseline.compliant_state.get("firewall_enabled", False)
        current_firewall = current.properties.get("firewall_enabled", False)
        
        if baseline_firewall and not current_firewall:
            return DriftChange(
                resource=current.resource_id,
                issue="Linux firewall disabled — was enabled in baseline",
                control_id=baseline.control_id,
                risk_level=RiskLevel.HIGH,
                baseline_value=baseline_firewall,
                current_value=current_firewall,
                detected_at=datetime.now()
            )
        return None
    
    def _check_linux_patches(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check Linux patch compliance (SI-2)"""
        baseline_patches = baseline.compliant_state.get("patches_up_to_date", False)
        current_patches = current.properties.get("patches_up_to_date", False)
        
        if baseline_patches and not current_patches:
            return DriftChange(
                resource=current.resource_id,
                issue="Linux system patches outdated — were up-to-date in baseline",
                control_id=baseline.control_id,
                risk_level=RiskLevel.MEDIUM,
                baseline_value=baseline_patches,
                current_value=current_patches,
                detected_at=datetime.now()
            )
        return None
    
    def _check_ec2_boundary_protection(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check EC2 boundary protection compliance (SC-7)"""
        baseline_sg = set(baseline.compliant_state.get("security_groups", []))
        current_sg = set(current.properties.get("security_groups", []))
        
        if baseline_sg != current_sg:
            return DriftChange(
                resource=current.resource_id,
                issue=f"EC2 security groups changed from {list(baseline_sg)} to {list(current_sg)}",
                control_id=baseline.control_id,
                risk_level=RiskLevel.MEDIUM,
                baseline_value=list(baseline_sg),
                current_value=list(current_sg),
                detected_at=datetime.now()
            )
        return None
    
    def _check_ec2_audit_events(self, current: ResourceState, baseline: BaselineSnapshot) -> Optional[DriftChange]:
        """Check EC2 audit events compliance (AU-2)"""
        baseline_logging = baseline.compliant_state.get("cloudtrail_enabled", False)
        current_logging = current.properties.get("cloudtrail_enabled", False)
        
        if baseline_logging and not current_logging:
            return DriftChange(
                resource=current.resource_id,
                issue="EC2 CloudTrail logging disabled — was enabled in baseline",
                control_id=baseline.control_id,
                risk_level=RiskLevel.HIGH,
                baseline_value=baseline_logging,
                current_value=current_logging,
                detected_at=datetime.now()
            )
        return None

# Global drift detector instance
drift_detector = DriftDetector() 