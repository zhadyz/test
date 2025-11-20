"""
Security utilities for JWT authentication and password hashing
Implements secure authentication for NIST 800-53 compliance application
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Password hashing configuration using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "development-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

# Bearer token security scheme
security = HTTPBearer()


class PasswordHasher:
    """Secure password hashing using bcrypt"""

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using bcrypt

        Args:
            password: Plain text password

        Returns:
            Hashed password string

        Note:
            Bcrypt has a 72-byte password limit. Passwords are truncated
            to 72 bytes before hashing to prevent errors.
        """
        # Bcrypt has a 72-byte limit, truncate password if needed
        password_bytes = password.encode('utf-8')[:72]
        truncated_password = password_bytes.decode('utf-8', errors='ignore')
        return pwd_context.hash(truncated_password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash

        Args:
            plain_password: Plain text password to verify
            hashed_password: Bcrypt hash to verify against

        Returns:
            True if password matches, False otherwise

        Note:
            Bcrypt has a 72-byte password limit. Passwords are truncated
            to 72 bytes before verification to match hashing behavior.
        """
        # Bcrypt has a 72-byte limit, truncate password if needed
        password_bytes = plain_password.encode('utf-8')[:72]
        truncated_password = password_bytes.decode('utf-8', errors='ignore')
        return pwd_context.verify(truncated_password, hashed_password)


class JWTManager:
    """JWT token creation and validation"""

    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token

        Args:
            data: Dictionary of claims to encode in the token
            expires_delta: Optional custom expiration time

        Returns:
            Encoded JWT token string
        """
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

        to_encode.update({"exp": expire, "iat": datetime.utcnow()})

        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        """
        Verify and decode a JWT token

        Args:
            token: JWT token string

        Returns:
            Decoded token payload

        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication credentials: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user from JWT token

    Args:
        credentials: HTTP Bearer token from request

    Returns:
        User data from token payload

    Raises:
        HTTPException: If token is invalid or missing
    """
    token = credentials.credentials
    return JWTManager.verify_token(token)


def require_role(allowed_roles: list):
    """
    Dependency factory to require specific user roles

    Args:
        allowed_roles: List of allowed role names

    Returns:
        Dependency function that validates user role
    """
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )

        return current_user

    return role_checker


# Role constants
class UserRole:
    """User role definitions for RBAC"""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

    @classmethod
    def all_roles(cls):
        """Get list of all valid roles"""
        return [cls.ADMIN, cls.EDITOR, cls.VIEWER]

    @classmethod
    def can_write(cls, role: str) -> bool:
        """Check if role has write permissions"""
        return role in [cls.ADMIN, cls.EDITOR]

    @classmethod
    def can_admin(cls, role: str) -> bool:
        """Check if role has admin permissions"""
        return role == cls.ADMIN


# Convenience dependencies for common permission checks
require_admin = require_role([UserRole.ADMIN])
require_editor = require_role([UserRole.ADMIN, UserRole.EDITOR])
require_viewer = require_role(UserRole.all_roles())
