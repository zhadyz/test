import os
import json
import hashlib
import time
from typing import Optional, Dict, Any
from pathlib import Path

class GPTCache:
    def __init__(self, cache_dir: str = "cache", ttl_seconds: int = 30 * 24 * 60 * 60):  # 30 days default
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.ttl_seconds = ttl_seconds
    
    def _generate_cache_key(self, control_id: str, cloud: str, os: str, tools: list) -> str:
        """Generate a deterministic cache key from the request parameters."""
        # Sort tools to ensure consistent key generation
        sorted_tools = sorted([tool.lower().strip() for tool in tools])
        
        # Create a deterministic string from all parameters
        key_data = {
            "control_id": control_id.upper(),
            "cloud": cloud.lower(),
            "os": os.lower(), 
            "tools": sorted_tools
        }
        
        # Convert to JSON string (sorted keys for consistency)
        key_string = json.dumps(key_data, sort_keys=True)
        
        # Generate SHA256 hash for a clean, consistent key
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]  # First 16 chars for brevity
    
    def _get_cache_file_path(self, cache_key: str) -> Path:
        """Get the file path for a given cache key."""
        return self.cache_dir / f"{cache_key}.json"
    
    def _is_cache_valid(self, cache_data: Dict[str, Any]) -> bool:
        """Check if cached data is still valid based on TTL."""
        if "timestamp" not in cache_data:
            return False
        
        age_seconds = time.time() - cache_data["timestamp"]
        return age_seconds < self.ttl_seconds
    
    def get_cached_response(self, control_id: str, cloud: str, os: str, tools: list) -> Optional[str]:
        """Retrieve cached GPT response if it exists and is valid."""
        cache_key = self._generate_cache_key(control_id, cloud, os, tools)
        cache_file = self._get_cache_file_path(cache_key)
        
        if not cache_file.exists():
            return None
        
        try:
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)
            
            if self._is_cache_valid(cache_data):
                return cache_data.get("response")
            else:
                # Cache expired, remove file
                cache_file.unlink(missing_ok=True)
                return None
                
        except (json.JSONDecodeError, KeyError, IOError):
            # Corrupted cache file, remove it
            cache_file.unlink(missing_ok=True)
            return None
    
    def cache_response(self, control_id: str, cloud: str, os: str, tools: list, response: str) -> None:
        """Cache a GPT response with timestamp."""
        cache_key = self._generate_cache_key(control_id, cloud, os, tools)
        cache_file = self._get_cache_file_path(cache_key)
        
        cache_data = {
            "control_id": control_id,
            "cloud": cloud,
            "os": os,
            "tools": sorted([tool.lower().strip() for tool in tools]),
            "response": response,
            "timestamp": time.time()
        }
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
        except IOError as e:
            # Log error but don't fail the request
            print(f"Warning: Failed to cache GPT response: {e}")
    
    def clear_cache(self) -> int:
        """Clear all cached responses. Returns number of files removed."""
        count = 0
        for cache_file in self.cache_dir.glob("*.json"):
            try:
                cache_file.unlink()
                count += 1
            except IOError:
                pass
        return count
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about the cache."""
        cache_files = list(self.cache_dir.glob("*.json"))
        valid_count = 0
        expired_count = 0
        
        for cache_file in cache_files:
            try:
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
                
                if self._is_cache_valid(cache_data):
                    valid_count += 1
                else:
                    expired_count += 1
            except (json.JSONDecodeError, KeyError, IOError):
                expired_count += 1
        
        return {
            "total_entries": len(cache_files),
            "valid_entries": valid_count,
            "expired_entries": expired_count,
            "cache_dir": str(self.cache_dir),
            "ttl_hours": self.ttl_seconds / 3600
        }


# Global cache instance
gpt_cache = GPTCache()


async def get_or_generate_gpt_response(
    client, 
    control_id: str, 
    cloud: str, 
    os: str, 
    tools: list, 
    prompt: str,
    force_refresh: bool = False
) -> str:
    """
    Get cached GPT response or generate a new one.
    
    Args:
        client: OpenAI client instance
        control_id: NIST control ID
        cloud: Cloud provider
        os: Operating system
        tools: List of tools
        prompt: GPT prompt
        force_refresh: Skip cache if True
    
    Returns:
        GPT response string
    """
    # Check cache first (unless force refresh)
    if not force_refresh:
        cached_response = gpt_cache.get_cached_response(control_id, cloud, os, tools)
        if cached_response:
            return cached_response
    
    # Generate new response
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a DevOps and cybersecurity expert specializing in NIST 800-53 compliance implementation. Always provide specific, actionable guidance with code examples."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=400,
        temperature=0.3
    )
    
    gpt_response = response.choices[0].message.content.strip()
    
    # Cache the response
    gpt_cache.cache_response(control_id, cloud, os, tools, gpt_response)
    
    return gpt_response 