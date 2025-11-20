"""
Hybrid AI Service for NIST 800-53 Control Implementation Guidance
Combines local knowledge base with AI API calls to minimize API usage
"""
import os
import re
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from services.ai_adapter import ai_adapter

logger = logging.getLogger(__name__)

@dataclass
class EnvironmentMatch:
    """Represents an environment match with confidence score"""
    environment_type: str
    confidence: float
    keywords: List[str]

@dataclass
class LocalKnowledgeResult:
    """Result from local knowledge base lookup"""
    found: bool
    implementation_guidance: str
    risks_and_gaps: str
    automation_tips: str
    confidence: float
    source: str

class HybridAIService:
    """
    Hybrid AI service that tries local knowledge first, then falls back to API calls
    """
    
    def __init__(self):
        self.local_knowledge = self._build_local_knowledge_base()
        self.environment_patterns = self._build_environment_patterns()
        
    def _build_environment_patterns(self) -> Dict[str, List[str]]:
        """Build patterns for environment detection"""
        return {
            "aws_cloud": [
                "aws", "amazon web services", "ec2", "s3", "rds", "lambda", 
                "cloudformation", "cloudwatch", "iam", "vpc", "elb", "alb"
            ],
            "azure_cloud": [
                "azure", "microsoft azure", "azure ad", "azure active directory",
                "azure sql", "azure storage", "azure functions", "arm templates"
            ],
            "kubernetes": [
                "kubernetes", "k8s", "kubectl", "helm", "pod", "deployment",
                "service", "ingress", "namespace", "configmap", "secret"
            ],
            "docker": [
                "docker", "container", "dockerfile", "docker-compose", "image"
            ],
            "windows_server": [
                "windows server", "active directory", "ad", "powershell", 
                "group policy", "gpo", "iis", "windows"
            ],
            "linux": [
                "linux", "ubuntu", "rhel", "centos", "debian", "systemd", "bash"
            ],
            "database": [
                "database", "sql", "mysql", "postgresql", "postgres", "oracle",
                "mongodb", "redis", "elasticsearch"
            ],
            "web_application": [
                "web application", "webapp", "frontend", "backend", "api",
                "react", "angular", "vue", "node.js", "express"
            ]
        }
    
    def _build_local_knowledge_base(self) -> Dict[str, Dict[str, Dict[str, str]]]:
        """Build comprehensive local knowledge base for common NIST controls"""
        
        knowledge_base = {
            "AC-2": {
                "aws_cloud": {
                    "implementation_guidance": """
## Summary
Implement account management for AWS cloud environment using IAM with least privilege principles and automated lifecycle management.

## Step-by-Step Implementation
1. **Configure AWS IAM Users and Roles**
   - Create IAM users for human access, roles for service accounts
   - Enable MFA for all IAM users: `aws iam enable-mfa-device`
   - Implement least privilege with custom policies

2. **Set Up Account Lifecycle Automation**
   - Use AWS Organizations for multi-account management
   - Implement AWS SSO for centralized access control
   - Create Lambda functions for automated account provisioning

3. **Configure Account Monitoring**
   - Enable CloudTrail for all account activities
   - Set up CloudWatch alarms for suspicious account activities
   - Use AWS Config to monitor IAM configuration changes

4. **Implement Regular Access Reviews**
   - Use AWS Access Analyzer to identify unused permissions
   - Set up automated reports using AWS CLI: `aws iam generate-credential-report`
   - Schedule regular IAM access reviews using AWS Systems Manager
                    """,
                    "risks_and_gaps": """
## Implementation Challenges
1. **Over-privileged Service Roles**: AWS services often request broad permissions; implement least privilege gradually
2. **Cross-Account Access Complexity**: Managing assume-role policies across multiple AWS accounts can create security gaps
3. **Temporary Credential Management**: STS tokens and session management require careful timeout configuration
4. **IAM Policy Complexity**: Complex JSON policies can inadvertently grant excessive permissions
                    """,
                    "automation_tips": """
## Implementation Tools
1. **Terraform AWS Provider**: Automate IAM resource creation with version control
   ```hcl
   resource "aws_iam_user" "example" {
     name = "example-user"
     force_destroy = true
   }
   ```

2. **AWS CLI Scripts**: Automate account lifecycle operations
   ```bash
   aws iam create-user --user-name new-user
   aws iam attach-user-policy --user-name new-user --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
   ```

3. **AWS Lambda for Automation**: Create event-driven account management
4. **Prowler**: Open-source tool for AWS security assessment and IAM analysis
                    """
                },
                "kubernetes": {
                    "implementation_guidance": """
## Summary
Implement Kubernetes account management using RBAC, service accounts, and integrated authentication systems.

## Step-by-Step Implementation
1. **Configure Kubernetes RBAC**
   - Create service accounts for applications: `kubectl create serviceaccount app-sa`
   - Define roles with minimal permissions: `kubectl create role pod-reader --verb=get,list --resource=pods`
   - Bind roles to service accounts: `kubectl create rolebinding read-pods --role=pod-reader --serviceaccount=default:app-sa`

2. **Integrate External Authentication**
   - Configure OIDC integration with identity providers
   - Set up certificate-based authentication for admin access
   - Implement webhook token authentication for service accounts

3. **Implement Pod Security Standards**
   - Enable Pod Security Standards: `kubectl label namespace default pod-security.kubernetes.io/enforce=restricted`
   - Configure security contexts for all pods
   - Use admission controllers to enforce security policies

4. **Set Up Audit Logging**
   - Enable Kubernetes audit logging in cluster configuration
   - Configure log forwarding to centralized logging system
   - Monitor RBAC denials and privilege escalation attempts
                    """,
                    "risks_and_gaps": """
## Implementation Challenges
1. **Default Service Account Usage**: Many deployments use default service accounts with excessive cluster permissions
2. **Cluster-Admin Overuse**: Tendency to grant cluster-admin role instead of implementing least privilege
3. **Certificate Management**: Client certificate rotation and revocation can be complex in large clusters
4. **Namespace Isolation**: Improper network policies can allow unauthorized cross-namespace access
                    """,
                    "automation_tips": """
## Implementation Tools
1. **Helm Charts**: Automate RBAC deployment with templates
   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: {{ .Values.serviceAccount.name }}
   ```

2. **Kubectl with YAML Manifests**: Version-controlled RBAC configurations
3. **Falco**: Runtime security monitoring for Kubernetes RBAC violations
4. **OPA Gatekeeper**: Policy enforcement for admission control and RBAC validation
                    """
                }
            },
            "AU-2": {
                "aws_cloud": {
                    "implementation_guidance": """
## Summary
Implement comprehensive audit logging in AWS using CloudTrail, VPC Flow Logs, and application-level logging with centralized analysis.

## Step-by-Step Implementation
1. **Enable AWS CloudTrail**
   - Create organization-wide CloudTrail: `aws cloudtrail create-trail --name org-trail --s3-bucket-name audit-logs-bucket`
   - Enable data events for S3 and Lambda functions
   - Configure log file validation and encryption

2. **Set Up VPC Flow Logs**
   - Enable VPC Flow Logs: `aws ec2 create-flow-logs --resource-type VPC --resource-ids vpc-12345678 --traffic-type ALL`
   - Configure delivery to CloudWatch Logs or S3
   - Set up automated analysis with AWS GuardDuty

3. **Configure Application Logging**
   - Use CloudWatch Logs agent on EC2 instances
   - Implement structured logging in applications (JSON format)
   - Set up log retention policies: `aws logs put-retention-policy --log-group-name /aws/lambda/function --retention-in-days 90`

4. **Implement Centralized Log Analysis**
   - Deploy Amazon OpenSearch for log analysis
   - Create CloudWatch dashboards for security events
   - Set up automated alerting for critical security events
                    """,
                    "risks_and_gaps": """
## Implementation Challenges
1. **Log Volume and Costs**: CloudTrail and VPC Flow Logs can generate massive volumes, impacting costs
2. **Data Event Logging**: Enabling data events for all S3 buckets can be expensive and noisy
3. **Cross-Region Logging**: Ensuring audit logs capture activities across all AWS regions
4. **Log Tampering Protection**: Securing audit logs from unauthorized modification or deletion
                    """,
                    "automation_tips": """
## Implementation Tools
1. **AWS Config Rules**: Automated compliance checking for CloudTrail configuration
2. **Terraform**: Infrastructure as code for consistent audit logging setup
   ```hcl
   resource "aws_cloudtrail" "main" {
     name           = "main-trail"
     s3_bucket_name = aws_s3_bucket.trail.bucket
   }
   ```

3. **AWS CLI Scripts**: Automated log analysis and reporting
4. **Splunk AWS Add-on**: Enterprise log analysis and correlation for AWS environments
                    """
                },
                "splunk": {
                    "implementation_guidance": """
## Summary
Configure Splunk for comprehensive audit event collection, analysis, and alerting across your infrastructure.

## Step-by-Step Implementation
1. **Deploy Splunk Universal Forwarders**
   - Install forwarders on all systems: `./splunkforwarder-install.sh`
   - Configure inputs.conf for system logs, application logs, and security events
   - Set up secure communication with deployment server

2. **Configure Data Inputs**
   - Set up Windows Event Log collection for domain controllers
   - Configure syslog inputs for network devices and Linux systems
   - Implement database audit log collection using DB Connect

3. **Create Security Dashboards**
   - Build authentication failure dashboards
   - Create privilege escalation monitoring views
   - Implement real-time security event correlation

4. **Set Up Automated Alerting**
   - Configure saved searches for critical security events
   - Set up email and SIEM integration for alerts
   - Implement automated response playbooks
                    """,
                    "risks_and_gaps": """
## Implementation Challenges
1. **Log Parsing Complexity**: Different log formats require custom parsing rules and field extractions
2. **Storage Scaling**: Audit logs can consume significant storage; implement lifecycle policies
3. **Search Performance**: Large audit datasets can impact search performance without proper indexing
4. **Data Retention Compliance**: Balancing storage costs with regulatory retention requirements
                    """,
                    "automation_tips": """
## Implementation Tools
1. **Splunk Deployment Server**: Centralized configuration management for forwarders
2. **Splunk REST API**: Automated dashboard and alert configuration
   ```bash
   curl -k -u admin:password -X POST https://splunk:8089/services/saved/searches -d name="Failed_Logins" -d search="index=security failed login"
   ```

3. **Ansible Splunk Modules**: Infrastructure as code for Splunk deployment
4. **Splunk Security Essentials**: Pre-built security use cases and dashboards
                    """
                }
            },
            "SC-28": {
                "aws_cloud": {
                    "implementation_guidance": """
## Summary
Implement encryption at rest for all AWS data stores using AWS KMS with proper key management and access controls.

## Step-by-Step Implementation
1. **Configure AWS KMS Customer Managed Keys**
   - Create customer managed keys: `aws kms create-key --description "Application data encryption"`
   - Set up key policies with least privilege access
   - Enable key rotation: `aws kms enable-key-rotation --key-id key-12345678`

2. **Enable EBS Volume Encryption**
   - Enable default EBS encryption: `aws ec2 enable-ebs-encryption-by-default`
   - Encrypt existing volumes using snapshots and re-creation
   - Configure encrypted AMIs for new instances

3. **Implement S3 Bucket Encryption**
   - Enable default encryption: `aws s3api put-bucket-encryption --bucket mybucket --server-side-encryption-configuration`
   - Use bucket policies to deny unencrypted uploads
   - Configure S3 Bucket Keys for cost optimization

4. **Configure Database Encryption**
   - Enable RDS encryption at creation: `aws rds create-db-instance --storage-encrypted`
   - Use encrypted snapshots for existing databases
   - Configure DynamoDB encryption with customer managed keys
                    """,
                    "risks_and_gaps": """
## Implementation Challenges
1. **Key Management Complexity**: Managing key lifecycle, rotation, and access across multiple services
2. **Performance Impact**: Encryption can add latency to database and storage operations
3. **Backup Encryption**: Ensuring all backups and snapshots are properly encrypted
4. **Cross-Region Key Access**: Managing KMS key access across multiple AWS regions
                    """,
                    "automation_tips": """
## Implementation Tools
1. **AWS Config Rules**: Automated compliance checking for encryption requirements
   ```json
   {
     "ConfigRuleName": "s3-bucket-server-side-encryption-enabled",
     "Source": {
       "Owner": "AWS",
       "SourceIdentifier": "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
     }
   }
   ```

2. **Terraform AWS Provider**: Infrastructure as code for encryption configuration
3. **AWS CLI Scripts**: Automated encryption status reporting and remediation
4. **AWS Security Hub**: Centralized security findings and encryption compliance monitoring
                    """
                },
                "database": {
                    "implementation_guidance": """
## Summary
Implement database encryption at rest using native database encryption features with proper key management.

## Step-by-Step Implementation
1. **Enable Database Native Encryption**
   - PostgreSQL: Enable TDE with `ALTER SYSTEM SET ssl = on`
   - MySQL: Configure InnoDB encryption: `SET GLOBAL innodb_encryption_threads=4`
   - SQL Server: Enable TDE: `ALTER DATABASE mydb SET ENCRYPTION ON`

2. **Configure Key Management**
   - Set up dedicated key management system (HashiCorp Vault, AWS KMS)
   - Implement key rotation policies (90-day rotation recommended)
   - Configure secure key storage with access controls

3. **Encrypt Database Backups**
   - Configure encrypted backup destinations
   - Use compression with encryption for storage efficiency
   - Test backup decryption procedures regularly

4. **Implement Column-Level Encryption**
   - Encrypt sensitive columns (PII, financial data) at application level
   - Use deterministic encryption for searchable fields
   - Implement proper key derivation for column encryption
                    """,
                    "risks_and_gaps": """
## Implementation Challenges
1. **Key Escrow Requirements**: Balancing security with business continuity and compliance requirements
2. **Application Compatibility**: Some applications may not support encrypted database connections
3. **Performance Overhead**: Encryption can impact query performance, especially for large datasets
4. **Key Recovery Procedures**: Ensuring secure and tested key recovery processes
                    """,
                    "automation_tips": """
## Implementation Tools
1. **HashiCorp Vault**: Centralized key management with dynamic secrets
   ```bash
   vault write database/config/mysql-database plugin_name=mysql-database-plugin connection_url="{{username}}:{{password}}@tcp(localhost:3306)/"
   ```

2. **Ansible Database Modules**: Automated database encryption configuration
3. **Database Native Tools**: Automated backup encryption and key rotation scripts
4. **Terraform Database Providers**: Infrastructure as code for database encryption setup
                    """
                }
            }
        }
        
        return knowledge_base
    
    def detect_environment(self, environment_description: str) -> List[EnvironmentMatch]:
        """Detect environment types from user description"""
        description_lower = environment_description.lower()
        matches = []
        
        for env_type, keywords in self.environment_patterns.items():
            matched_keywords = []
            total_score = 0
            
            for keyword in keywords:
                if keyword.lower() in description_lower:
                    matched_keywords.append(keyword)
                    # Weight longer keywords more heavily
                    total_score += len(keyword.split())
            
            if matched_keywords:
                # Calculate confidence based on keyword matches and length
                confidence = min(0.95, (len(matched_keywords) / len(keywords)) * 2)
                matches.append(EnvironmentMatch(
                    environment_type=env_type,
                    confidence=confidence,
                    keywords=matched_keywords
                ))
        
        # Sort by confidence score
        matches.sort(key=lambda x: x.confidence, reverse=True)
        return matches
    
    def get_local_knowledge(self, control_id: str, environment_description: str) -> LocalKnowledgeResult:
        """Try to get implementation guidance from local knowledge base"""
        
        # Check if we have knowledge for this control
        if control_id not in self.local_knowledge:
            return LocalKnowledgeResult(
                found=False,
                implementation_guidance="",
                risks_and_gaps="",
                automation_tips="",
                confidence=0.0,
                source="local_knowledge"
            )
        
        # Detect environment types
        env_matches = self.detect_environment(environment_description)
        
        if not env_matches:
            return LocalKnowledgeResult(
                found=False,
                implementation_guidance="",
                risks_and_gaps="",
                automation_tips="",
                confidence=0.0,
                source="local_knowledge"
            )
        
        # Find the best matching environment knowledge
        control_knowledge = self.local_knowledge[control_id]
        best_match = None
        best_confidence = 0.0
        
        for env_match in env_matches:
            if env_match.environment_type in control_knowledge:
                if env_match.confidence > best_confidence:
                    best_match = control_knowledge[env_match.environment_type]
                    best_confidence = env_match.confidence
        
        if best_match and best_confidence > 0.3:  # Minimum confidence threshold
            return LocalKnowledgeResult(
                found=True,
                implementation_guidance=best_match["implementation_guidance"],
                risks_and_gaps=best_match["risks_and_gaps"],
                automation_tips=best_match["automation_tips"],
                confidence=best_confidence,
                source="local_knowledge"
            )
        
        return LocalKnowledgeResult(
            found=False,
            implementation_guidance="",
            risks_and_gaps="",
            automation_tips="",
            confidence=0.0,
            source="local_knowledge"
        )
    
    async def generate_hybrid_guidance(
        self, 
        control_id: str, 
        control_data: Dict, 
        environment_description: str,
        force_api: bool = False
    ) -> Tuple[Dict[str, str], str]:
        """
        Generate guidance using hybrid approach: local knowledge first, then API fallback
        
        Returns:
            Tuple of (guidance_dict, source_type)
        """
        
        # Try local knowledge first (unless forced to use API)
        if not force_api:
            local_result = self.get_local_knowledge(control_id, environment_description)
            
            if local_result.found and local_result.confidence > 0.5:
                logger.info(f"Using local knowledge for {control_id} (confidence: {local_result.confidence:.2f})")
                return {
                    "implementation_guidance": local_result.implementation_guidance,
                    "risks_and_gaps": local_result.risks_and_gaps,
                    "automation_tips": local_result.automation_tips
                }, "local_knowledge"
        
        # Fall back to API if local knowledge insufficient or forced
        try:
            logger.info(f"Using AI API for {control_id} - local knowledge insufficient or forced")
            
            # Use the user's exact prompt template
            enhanced_prompt = self._create_enhanced_prompt_with_template(
                control_id, control_data, environment_description
            )
            
            if ai_adapter.anthropic_client:
                guidance = ai_adapter._call_claude(enhanced_prompt)
            elif ai_adapter.openai_client:
                guidance = ai_adapter._call_openai(enhanced_prompt)
            else:
                raise ValueError("No AI service available")
            
            return guidance, "ai_api"
            
        except Exception as e:
            logger.error(f"AI API failed for {control_id}: {str(e)}")
            
            # Final fallback to generic guidance
            return {
                "implementation_guidance": f"Local knowledge and AI API unavailable for {control_id}. Please refer to official NIST documentation and consult with your security team for environment-specific implementation guidance.",
                "risks_and_gaps": "Manual risk assessment required for your specific environment and technology stack.",
                "automation_tips": "Consider standard security automation tools compatible with your technology stack."
            }, "fallback"
    
    def _create_enhanced_prompt_with_template(
        self, 
        control_id: str, 
        control_data: Dict, 
        environment_description: str
    ) -> str:
        """Create enhanced prompt using the user's exact template"""
        
        return f"""You are a NIST 800-53 compliance assistant. Users will ask you to adapt controls to specific environments, which may include:
- Multiple operating systems, cloud platforms, and security tools
- Legacy and modern systems  
- Regulatory requirements (e.g., HIPAA, SOC 2, GDPR)
- DevOps, automation, and CI/CD pipelines
- Zero trust, remote work, and edge computing

Example queries:
- Adapt this control for a hybrid AWS and Azure environment using Kubernetes and HashiCorp Vault.
- What's the best way to meet this control on Windows Server 2012 with legacy Active Directory and Splunk for logging?
- Adapt this control for a CI/CD workflow using GitHub Actions and Ansible.

When responding, provide practical, environment-specific steps, pitfalls to avoid, and a checklist. If information is missing, state what else would be helpful.

CONTROL TO ADAPT:
- Control ID: {control_id}
- Control Name: {control_data.get('control_name', 'N/A')}
- Official Requirement: {control_data.get('official_text', 'N/A')}
- Intent: {control_data.get('intent', 'N/A')}

USER'S ENVIRONMENT:
{environment_description}

Please provide your response in exactly these three sections using markdown formatting:

## IMPLEMENTATION_GUIDANCE
Provide environment-specific adaptation with practical implementation steps, including specific configuration examples and commands where relevant.

## RISKS_AND_GAPS  
Identify the top 3 pitfalls to avoid (numbered list) specific to their environment and technology stack.

## AUTOMATION_TIPS
Provide actionable implementation items with checkboxes, including specific tools and integration guidance for their environment."""

        return prompt

# Global instance
hybrid_ai_service = HybridAIService() 