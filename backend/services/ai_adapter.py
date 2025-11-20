"""
AI Adapter Service for NIST 800-53 Control Implementation Guidance
"""
import os
import logging
from typing import Dict, Optional
from anthropic import Anthropic
import openai
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class AIAdapter:
    """
    AI service adapter that can work with multiple AI providers
    Currently supports OpenAI GPT and Anthropic Claude
    """
    
    def __init__(self):
        # Initialize clients based on available API keys
        self.openai_client = None
        self.anthropic_client = None
        
        # Try to initialize OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and not openai_key.startswith("dummy"):
            try:
                self.openai_client = OpenAI(api_key=openai_key)
                logger.info("✅ OpenAI client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {e}")
        
        # Try to initialize Anthropic
        anthropic_key = os.getenv("ANTHROPIC_API_KEY") 
        if anthropic_key and not anthropic_key.startswith("dummy"):
            try:
                self.anthropic_client = Anthropic(api_key=anthropic_key)
                logger.info("✅ Anthropic client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Anthropic client: {e}")
        
        if not self.openai_client and not self.anthropic_client:
            logger.warning("⚠️ No AI services available - both OpenAI and Anthropic clients failed to initialize")
    
    def generate_control_implementation_guidance(
        self, 
        control_id: str, 
        control_data: Dict, 
        environment_description: str
    ) -> Dict[str, str]:
        """
        Generate focused implementation guidance for a NIST control in a specific environment.
        This method is restricted to providing only practical implementation steps.
        
        Args:
            control_id: NIST control ID (e.g., "AC-2")
            control_data: Full control data from our database
            environment_description: User's tech stack description
            
        Returns:
            Dict with focused implementation guidance, risks, and automation tips
        """
        if not self.anthropic_client and not self.openai_client:
            raise ValueError("No AI service available. Please configure ANTHROPIC_API_KEY or OPENAI_API_KEY.")
        
        # Create focused implementation prompt
        prompt = self._create_focused_implementation_prompt(control_id, control_data, environment_description)
        
        try:
            # Try Claude first (usually better for structured analysis)
            if self.anthropic_client:
                return self._call_claude(prompt)
            # Fall back to OpenAI
            elif self.openai_client:
                return self._call_openai(prompt)
            else:
                # This should never happen due to the check above, but satisfies type checker
                raise ValueError("No AI service available")
        except Exception as e:
            logger.error(f"AI implementation guidance failed: {str(e)}")
            raise ValueError(f"Failed to generate implementation guidance: {str(e)}")
    
    def _create_focused_implementation_prompt(
        self, 
        control_id: str, 
        control_data: Dict, 
        environment_description: str
    ) -> str:
        """Create a focused prompt for implementation guidance only"""
        
        prompt = f"""You are a cybersecurity implementation specialist with expertise in NIST 800-53 controls. Your role is to provide ONLY practical, actionable implementation guidance.

CONTROL TO IMPLEMENT:
- Control ID: {control_id}
- Control Name: {control_data.get('control_name', 'N/A')}
- Official Requirement: {control_data.get('official_text', 'N/A')}
- Intent: {control_data.get('intent', 'N/A')}

USER'S ENVIRONMENT:
{environment_description}

TASK: Provide specific implementation guidance for this control in their environment. Focus ONLY on "how to implement" - do not provide general explanations about what the control does.

Respond with exactly these three sections in markdown format:

## IMPLEMENTATION_GUIDANCE

Provide a brief **Summary** (2-3 sentences) of how this control applies to their specific environment.

Then provide **Step-by-Step Implementation**:
- List 4-6 specific, actionable steps to implement this control
- Be specific about the technologies they mentioned
- Include configuration examples, commands, or code snippets where relevant
- Focus on practical "how-to" instructions
- Reference their specific tools (AWS, Kubernetes, etc.) where applicable

## RISKS_AND_GAPS

Identify **Implementation Challenges** specific to their environment:
- List 3-4 potential implementation pitfalls or gaps
- Focus on technical challenges in their specific setup
- Mention configuration mistakes to avoid
- Be specific to their technology stack

## AUTOMATION_TIPS

Suggest **Implementation Tools** for their environment:
- List 3-4 specific tools, scripts, or automation approaches
- Include tool names with brief usage hints  
- Provide example commands or configuration snippets
- Focus on tools that integrate with their mentioned technologies

IMPORTANT: Stay focused on implementation. Do not explain what the control does or why it's important - only HOW to implement it in their specific environment."""

        return prompt
    
    def generate_implementation_guidance(
        self, 
        control_id: str, 
        control_data: Dict, 
        environment_description: str
    ) -> Dict[str, str]:
        """
        Generate tailored implementation guidance for a NIST control in a specific environment
        
        Args:
            control_id: NIST control ID (e.g., "AC-2")
            control_data: Full control data from our database
            environment_description: User's tech stack description
            
        Returns:
            Dict with implementation guidance, risks, and automation tips
        """
        if not self.anthropic_client and not self.openai_client:
            raise ValueError("No AI service available. Please configure ANTHROPIC_API_KEY or OPENAI_API_KEY.")
        
        # Create structured prompt
        prompt = self._create_adaptation_prompt(control_id, control_data, environment_description)
        
        try:
            # Try Claude first (usually better for structured analysis)
            if self.anthropic_client:
                return self._call_claude(prompt)
            # Fall back to OpenAI
            elif self.openai_client:
                return self._call_openai(prompt)
            else:
                # This should never happen due to the check above, but satisfies type checker
                raise ValueError("No AI service available")
        except Exception as e:
            logger.error(f"AI adaptation failed: {str(e)}")
            raise ValueError(f"Failed to generate implementation guidance: {str(e)}")
    
    def _create_adaptation_prompt(
        self, 
        control_id: str, 
        control_data: Dict, 
        environment_description: str
    ) -> str:
        """Create a structured prompt for AI adaptation"""
        
        prompt = f"""You are a cybersecurity expert specializing in NIST 800-53 compliance implementations. 

TASK: Provide specific, actionable implementation guidance for NIST control {control_id} in the given technology environment using proper markdown formatting.

CONTROL INFORMATION:
- Control ID: {control_id}
- Control Name: {control_data.get('control_name', 'N/A')}
- Official Text: {control_data.get('official_text', 'N/A')}
- Intent: {control_data.get('intent', 'N/A')}

USER'S TECHNOLOGY ENVIRONMENT:
{environment_description}

INSTRUCTIONS:
Please provide a comprehensive response with exactly these three sections in markdown format:

## IMPLEMENTATION_GUIDANCE

Provide a **Summary** paragraph explaining how this control applies to their specific environment.

Then provide **Implementation Steps** with 4-6 specific, actionable steps:
- Use bullet points for each step
- Be specific about tools, configurations, and processes mentioned in their environment
- Include code examples, configuration snippets, or command examples where relevant
- Reference specific technologies they mentioned (AWS, Terraform, Keycloak, etc.)

## RISKS_AND_GAPS

Identify **Common Pitfalls** in this environment:
- List 3-5 potential risks, gaps, or challenges
- Explain what could go wrong and what to watch out for
- Be specific to their technology stack
- Include security considerations unique to their setup

## AUTOMATION_TIPS

Suggest **Relevant Tools and Scripts**:
- List 3-5 specific tools, scripts, or automation approaches
- Include tool names with brief implementation hints
- Provide example commands or configuration snippets where helpful
- Focus on tools that work well with their mentioned technologies

Format your response using proper markdown with **bold text**, `code blocks`, and clear bullet points. Be practical, environment-specific, and actionable."""

        return prompt
    
    def _call_claude(self, prompt: str) -> Dict[str, str]:
        """Call Anthropic Claude API"""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            return self._parse_ai_response(content)
            
        except Exception as e:
            logger.error(f"Claude API call failed: {str(e)}")
            raise ValueError(f"Claude API error: {str(e)}")
    
    def _call_openai(self, prompt: str) -> Dict[str, str]:
        """Call OpenAI GPT API"""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.3
            )
            
            content = response.choices[0].message.content
            return self._parse_ai_response(content)
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise ValueError(f"OpenAI API error: {str(e)}")
    
    def _parse_ai_response(self, content: str) -> Dict[str, str]:
        """Parse AI response into structured sections"""
        result = {
            "implementation_guidance": "",
            "risks_and_gaps": "",
            "automation_tips": ""
        }
        
        # Split content by sections
        sections = content.split("##")
        
        for section in sections:
            section = section.strip()
            if section.startswith("IMPLEMENTATION_GUIDANCE"):
                result["implementation_guidance"] = section.replace("IMPLEMENTATION_GUIDANCE", "").strip()
            elif section.startswith("RISKS_AND_GAPS"):
                result["risks_and_gaps"] = section.replace("RISKS_AND_GAPS", "").strip()
            elif section.startswith("AUTOMATION_TIPS"):
                result["automation_tips"] = section.replace("AUTOMATION_TIPS", "").strip()
        
        # If parsing failed, put everything in implementation_guidance
        if not any(result.values()):
            result["implementation_guidance"] = content
            result["risks_and_gaps"] = "No specific risks identified."
            result["automation_tips"] = "No specific automation suggestions available."
        
        return result


# Create global instance
ai_adapter = AIAdapter() 