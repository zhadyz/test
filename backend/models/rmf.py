"""
Pydantic models for RMF (Risk Management Framework) documentation generation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum


class RMFDocumentType(str, Enum):
    """Types of RMF documents that can be generated"""
    SSP = "ssp"  # System Security Plan
    SAR = "sar"  # Security Assessment Report
    POAM = "poam"  # Plan of Action and Milestones
    EXECUTIVE_SUMMARY = "executive_summary"


class RMFDocumentFormat(str, Enum):
    """Output formats for RMF documents"""
    DOCX = "docx"
    PDF = "pdf"
    JSON = "json"
    XML = "xml"


class SystemClassification(str, Enum):
    """FIPS 199 impact levels"""
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"


class ControlImplementationStatus(str, Enum):
    """Implementation status for security controls"""
    IMPLEMENTED = "Implemented"
    PARTIALLY_IMPLEMENTED = "Partially Implemented"
    PLANNED = "Planned"
    ALTERNATIVE_IMPLEMENTATION = "Alternative Implementation"
    NOT_APPLICABLE = "Not Applicable"


class SystemInformation(BaseModel):
    """Basic system information for RMF documents"""
    system_name: str = Field(..., description="Official system name")
    system_abbreviation: Optional[str] = Field(None, description="System abbreviation/acronym")
    system_type: str = Field("Information System", description="Type of system")
    system_description: str = Field(..., description="Brief system description")
    system_owner: str = Field(..., description="System owner name and organization")
    authorizing_official: Optional[str] = Field(None, description="Authorizing Official")
    system_security_contact: Optional[str] = Field(None, description="System security contact")
    
    # Technical details
    operating_environment: str = Field("Production", description="Operating environment")
    cloud_provider: Optional[str] = Field(None, description="Cloud service provider if applicable")
    data_types: List[str] = Field(default_factory=list, description="Types of data processed")
    user_types: List[str] = Field(default_factory=list, description="Types of system users")
    
    # Classification
    confidentiality_impact: SystemClassification = SystemClassification.MODERATE
    integrity_impact: SystemClassification = SystemClassification.MODERATE
    availability_impact: SystemClassification = SystemClassification.MODERATE
    
    # Dates
    system_go_live_date: Optional[date] = Field(None, description="System go-live date")
    last_assessment_date: Optional[date] = Field(None, description="Last security assessment date")
    next_assessment_date: Optional[date] = Field(None, description="Next scheduled assessment")


class ControlImplementation(BaseModel):
    """Implementation details for a specific security control"""
    control_id: str = Field(..., description="NIST control identifier")
    control_title: str = Field(..., description="Control title")
    control_family: str = Field(..., description="Control family")
    implementation_status: ControlImplementationStatus
    implementation_description: str = Field(..., description="How the control is implemented")
    responsible_role: Optional[str] = Field(None, description="Role responsible for implementation")
    implementation_guidance: Optional[str] = Field(None, description="Additional implementation guidance")
    testing_procedures: Optional[str] = Field(None, description="How the control is tested")
    assessment_results: Optional[str] = Field(None, description="Results of control assessment")
    remediation_plan: Optional[str] = Field(None, description="Plan for addressing deficiencies")
    inherited_controls: List[str] = Field(default_factory=list, description="Controls inherited from provider")
    common_controls: List[str] = Field(default_factory=list, description="Common controls")


class RiskAssessment(BaseModel):
    """Risk assessment information"""
    risk_id: str = Field(..., description="Unique risk identifier")
    risk_description: str = Field(..., description="Description of the risk")
    threat_source: str = Field(..., description="Source of the threat")
    vulnerability: str = Field(..., description="Vulnerability being exploited")
    likelihood: str = Field(..., description="Likelihood of occurrence")
    impact: str = Field(..., description="Impact if realized")
    risk_level: str = Field(..., description="Overall risk level")
    mitigation_strategy: str = Field(..., description="Strategy to mitigate risk")
    residual_risk: str = Field(..., description="Remaining risk after mitigation")


class DocumentMetadata(BaseModel):
    """Metadata for generated documents"""
    document_title: str = Field(..., description="Document title")
    document_version: str = Field("1.0", description="Document version")
    prepared_by: str = Field(..., description="Document preparer")
    prepared_date: date = Field(default_factory=date.today, description="Preparation date")
    reviewed_by: Optional[str] = Field(None, description="Document reviewer")
    approved_by: Optional[str] = Field(None, description="Document approver")
    classification: str = Field("For Official Use Only", description="Document classification")
    organization: str = Field(..., description="Preparing organization")


class RMFGenerationRequest(BaseModel):
    """Request model for generating RMF documents"""
    document_type: RMFDocumentType = Field(..., description="Type of document to generate")
    output_format: RMFDocumentFormat = Field(RMFDocumentFormat.DOCX, description="Output format")
    
    # System information
    system_info: SystemInformation = Field(..., description="System information")
    document_metadata: DocumentMetadata = Field(..., description="Document metadata")
    
    # Data sources
    include_poams: bool = Field(True, description="Include POA&M data from system")
    include_scap_results: bool = Field(True, description="Include SCAP scan results")
    include_inventory: bool = Field(True, description="Include asset inventory")
    
    # Control selection
    control_baseline: Optional[str] = Field(None, description="Control baseline (e.g., NIST 800-53 High)")
    selected_controls: Optional[List[str]] = Field(None, description="Specific controls to include")
    
    # Document-specific options
    include_control_implementation: bool = Field(True, description="Include control implementation details")
    include_risk_assessment: bool = Field(True, description="Include risk assessment")
    include_appendices: bool = Field(True, description="Include appendices")
    
    # AI generation options
    generate_implementation_statements: bool = Field(True, description="Use AI to generate implementation statements")
    generate_risk_descriptions: bool = Field(True, description="Use AI to generate risk descriptions")
    
    # Template options
    custom_template: Optional[str] = Field(None, description="Path to custom Word template")


class RMFGenerationResponse(BaseModel):
    """Response model for RMF document generation"""
    success: bool = Field(..., description="Whether generation was successful")
    message: str = Field(..., description="Status message")
    document_id: str = Field(..., description="Unique document identifier")
    document_type: RMFDocumentType = Field(..., description="Type of document generated")
    output_format: RMFDocumentFormat = Field(..., description="Output format")
    file_path: Optional[str] = Field(None, description="Path to generated file")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    generation_time: float = Field(..., description="Time taken to generate document")
    generated_at: datetime = Field(default_factory=datetime.now, description="Generation timestamp")
    
    # Content summary
    pages_count: Optional[int] = Field(None, description="Number of pages")
    controls_included: int = Field(0, description="Number of controls included")
    poams_included: int = Field(0, description="Number of POA&Ms included")
    risks_assessed: int = Field(0, description="Number of risks assessed")
    
    # Validation results
    validation_errors: List[str] = Field(default_factory=list, description="Validation errors")
    validation_warnings: List[str] = Field(default_factory=list, description="Validation warnings")


class DocumentTemplate(BaseModel):
    """Template information for document generation"""
    template_id: str = Field(..., description="Template identifier")
    template_name: str = Field(..., description="Template display name")
    document_type: RMFDocumentType = Field(..., description="Document type")
    template_path: str = Field(..., description="Path to template file")
    description: str = Field(..., description="Template description")
    supported_formats: List[RMFDocumentFormat] = Field(..., description="Supported output formats")
    required_fields: List[str] = Field(default_factory=list, description="Required input fields")
    optional_fields: List[str] = Field(default_factory=list, description="Optional input fields")
    created_at: datetime = Field(default_factory=datetime.now, description="Template creation date")
    updated_at: datetime = Field(default_factory=datetime.now, description="Template last update")


class RMFDocumentHistory(BaseModel):
    """History record for generated documents"""
    document_id: str = Field(..., description="Document identifier")
    document_type: RMFDocumentType = Field(..., description="Document type")
    system_name: str = Field(..., description="System name")
    version: str = Field(..., description="Document version")
    generated_by: str = Field(..., description="User who generated document")
    generated_at: datetime = Field(..., description="Generation timestamp")
    file_path: str = Field(..., description="File path")
    file_size: int = Field(..., description="File size in bytes")
    status: str = Field("Generated", description="Document status")
    notes: Optional[str] = Field(None, description="Additional notes")


class RMFStatsResponse(BaseModel):
    """Response model for RMF generation statistics"""
    success: bool = Field(True, description="Response success status")
    data: Dict[str, Any] = Field(..., description="Statistics data")


class ControlBaseline(BaseModel):
    """Predefined control baseline"""
    baseline_id: str = Field(..., description="Baseline identifier")
    baseline_name: str = Field(..., description="Baseline name")
    description: str = Field(..., description="Baseline description")
    impact_level: SystemClassification = Field(..., description="Impact level")
    controls: List[str] = Field(..., description="List of control IDs in baseline")
    control_count: int = Field(..., description="Number of controls in baseline") 