"""
Authentication endpoints for user management and JWT token handling
Implements secure login, registration, and token management for NIST 800-53 compliance
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any

from models.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    LoginRequest,
    LoginResponse,
    TokenResponse,
    PasswordChangeRequest
)
from services.user_store import user_store
from core.security import (
    JWTManager,
    get_current_user,
    require_admin,
    UserRole
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user account

    Args:
        user_data: User registration data including username, email, password

    Returns:
        Created user information (no sensitive data)

    Raises:
        HTTPException 400: If username or email already exists
        HTTPException 422: If password doesn't meet security requirements
    """
    try:
        user = user_store.create_user(user_data)

        # Return user response without sensitive data
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """
    Authenticate user and generate JWT access token

    Args:
        credentials: Username and password

    Returns:
        JWT access token and user information

    Raises:
        HTTPException 401: If credentials are invalid or user is inactive
    """
    user = user_store.authenticate_user(credentials.username, credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT token with user claims
    token_data = {
        "sub": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    }

    access_token = JWTManager.create_access_token(token_data)

    # Return token and user info
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current authenticated user information

    Args:
        current_user: User data from JWT token (injected by dependency)

    Returns:
        Current user information

    Raises:
        HTTPException 401: If token is invalid or expired
        HTTPException 404: If user not found (deleted after token issued)
    """
    user = user_store.get_user_by_id(current_user["sub"])

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Refresh JWT access token

    Allows extending session by generating new token with extended expiration.
    Useful for keeping users logged in without re-authentication.

    Args:
        current_user: User data from current JWT token (injected by dependency)

    Returns:
        New JWT access token with extended expiration

    Raises:
        HTTPException 401: If current token is invalid
        HTTPException 404: If user not found or inactive
    """
    user = user_store.get_user_by_id(current_user["sub"])

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or inactive"
        )

    # Create new token with refreshed claims
    token_data = {
        "sub": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    }

    access_token = JWTManager.create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Change current user's password

    Args:
        password_data: Current and new password
        current_user: User data from JWT token (injected by dependency)

    Returns:
        Success message

    Raises:
        HTTPException 401: If current password is incorrect
        HTTPException 404: If user not found
        HTTPException 422: If new password doesn't meet security requirements
    """
    success = user_store.change_password(
        user_id=current_user["sub"],
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    return {"message": "Password changed successfully"}


# Admin-only endpoints for user management

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    List all users (admin only)

    Args:
        skip: Number of users to skip (pagination)
        limit: Maximum number of users to return
        current_user: Admin user from JWT token (injected by dependency)

    Returns:
        List of users

    Raises:
        HTTPException 403: If user is not admin
    """
    users = user_store.list_users(skip=skip, limit=limit)

    return [
        UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        for user in users
    ]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Get user by ID (admin only)

    Args:
        user_id: User ID to retrieve
        current_user: Admin user from JWT token (injected by dependency)

    Returns:
        User information

    Raises:
        HTTPException 403: If user is not admin
        HTTPException 404: If user not found
    """
    user = user_store.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Update user (admin only)

    Args:
        user_id: User ID to update
        user_update: Fields to update
        current_user: Admin user from JWT token (injected by dependency)

    Returns:
        Updated user information

    Raises:
        HTTPException 403: If user is not admin
        HTTPException 404: If user not found
        HTTPException 400: If email already exists
    """
    try:
        user = user_store.update_user(user_id, user_update)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Delete user (admin only)

    Args:
        user_id: User ID to delete
        current_user: Admin user from JWT token (injected by dependency)

    Returns:
        No content on success

    Raises:
        HTTPException 403: If user is not admin
        HTTPException 404: If user not found
        HTTPException 400: If attempting to delete self
    """
    # Prevent admin from deleting themselves
    if user_id == current_user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    success = user_store.delete_user(user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return None


@router.get("/stats")
async def get_auth_stats(current_user: Dict[str, Any] = Depends(require_admin)):
    """
    Get authentication system statistics (admin only)

    Args:
        current_user: Admin user from JWT token (injected by dependency)

    Returns:
        System statistics including user counts

    Raises:
        HTTPException 403: If user is not admin
    """
    return {
        "total_users": user_store.get_user_count(),
        "active_users": len([u for u in user_store.users.values() if u.is_active]),
        "inactive_users": len([u for u in user_store.users.values() if not u.is_active]),
        "admin_users": len([u for u in user_store.users.values() if u.role == UserRole.ADMIN]),
        "editor_users": len([u for u in user_store.users.values() if u.role == UserRole.EDITOR]),
        "viewer_users": len([u for u in user_store.users.values() if u.role == UserRole.VIEWER])
    }
