"""
Development middleware for hot reload and cache prevention
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import os


class NoCacheMiddleware(BaseHTTPMiddleware):
    """
    Middleware to prevent caching during development

    Adds cache-control headers to all responses to ensure
    browsers and proxies don't cache responses during development.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Only apply no-cache in development mode
        if os.getenv("ENV", "development") == "development":
            # Prevent all caching
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

            # Add ETag to help with conditional requests (only if response has body)
            if hasattr(response, 'body'):
                response.headers["ETag"] = f'"{hash(response.body)}"'

        return response


class HotReloadHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add headers that help with hot reload
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Add CORS headers for dev (already in main.py but this ensures it)
        response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response.headers["Access-Control-Allow-Credentials"] = "true"

        # Add development mode indicator
        if os.getenv("ENV", "development") == "development":
            response.headers["X-Dev-Mode"] = "true"

        return response
