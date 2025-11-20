from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from openai import OpenAI
import os
from datetime import datetime
from fastapi import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

router = APIRouter(
    prefix="/api",
    tags=["assistant"],
    responses={404: {"description": "Not found"}},
)

class AssistantRequest(BaseModel):
    question: str
    control_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class AssistantResponse(BaseModel):
    response: str
    timestamp: datetime
    control_id: Optional[str] = None

# Initialize OpenAI client lazily to avoid startup crashes
def get_openai_client():
    """Get OpenAI client with proper error handling"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )
    if api_key.startswith("dummy") or api_key.startswith("sk-dummy"):
        raise HTTPException(
            status_code=503, 
            detail="Demo mode: OpenAI assistant is disabled. Please configure a real API key for AI features."
        )
    return OpenAI(api_key=api_key)

# In-memory store for question counts by IP (demo only, not production safe)
user_question_counts = {}
MAX_QUESTIONS_PER_SESSION = 3

@router.post("/assistant", response_model=AssistantResponse)
async def ask_assistant(request: Request):
    """
    GPT-powered assistant for NIST 800-53 compliance questions
    """
    data = await request.json()
    user_ip = request.client.host
    count = user_question_counts.get(user_ip, 0)
    if count >= MAX_QUESTIONS_PER_SESSION:
        return JSONResponse(
            status_code=HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "You have reached the maximum of 3 Spud AI questions for this session. Please contact an admin for more access."}
        )
    user_question_counts[user_ip] = count + 1

    try:
        # Get OpenAI client (will raise HTTPException if no API key)
        client = get_openai_client()
        
        # Build the prompt based on context
        if data.get("control_id") and data.get("context"):
            system_prompt = f"""You are a security compliance expert specializing in NIST 800-53 controls. 
You have deep knowledge of cybersecurity frameworks, implementation strategies, and real-world compliance scenarios.

Current Context:
- Control ID: {data["control_id"]}
- Control Title: {data["context"].get('title', 'N/A')}
- Control Family: {data["context"].get('family', 'N/A')}
- Control Description: {data["context"].get('description', 'N/A')}

User Question: "{data["question"]}"

Provide a clear, accurate, and actionable response in under 300 words. When possible:
- Reference real-world cloud environments (AWS, Azure, GCP)
- Include specific implementation steps
- Mention common pitfalls and best practices
- Use technical but accessible language
- Format your response with markdown for better readability"""
        else:
            system_prompt = f"""You are a security compliance expert specializing in NIST 800-53 controls. 
You have deep knowledge of cybersecurity frameworks, implementation strategies, and real-world compliance scenarios.

User Question: "{data["question"]}"

Provide a clear, accurate, and actionable response in under 300 words. When possible:
- Reference real-world cloud environments (AWS, Azure, GCP)  
- Include specific implementation steps
- Mention common pitfalls and best practices
- Use technical but accessible language
- Format your response with markdown for better readability"""

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data["question"]}
            ],
            max_tokens=400,
            temperature=0.7,
            top_p=1.0,
            frequency_penalty=0.0,
            presence_penalty=0.0
        )
        
        assistant_response = response.choices[0].message.content.strip()
        
        return AssistantResponse(
            response=assistant_response,
            timestamp=datetime.now(),
            control_id=data.get("control_id")
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like missing API key)
        raise
    except Exception as openai_error:
        if "authentication" in str(openai_error).lower():
            raise HTTPException(
                status_code=401,
                detail="Invalid OpenAI API key. Please check your configuration."
            )
        elif "rate limit" in str(openai_error).lower():
            raise HTTPException(
                status_code=429,
                detail="OpenAI API rate limit exceeded. Please try again later."
            )
        elif "api" in str(openai_error).lower():
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI API error: {str(openai_error)}"
            )
        else:
            # Handle other general errors
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(openai_error)}"
            ) 