"""
User management service with in-memory storage
For production, replace with database backend
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict
from models.user import UserCreate, UserInDB, UserUpdate, UserRoleEnum
from core.security import PasswordHasher


class UserStore:
    """In-memory user storage service"""

    def __init__(self):
        self.users: Dict[str, UserInDB] = {}
        self.username_index: Dict[str, str] = {}  # username -> user_id
        self.email_index: Dict[str, str] = {}  # email -> user_id

        # Create default admin user for development
        self._create_default_users()

    def _create_default_users(self):
        """Create default users for development/testing"""
        default_users = [
            {
                "username": "admin",
                "email": "admin@example.com",
                "full_name": "System Administrator",
                "password": "Admin123!",
                "role": UserRoleEnum.ADMIN
            },
            {
                "username": "editor",
                "email": "editor@example.com",
                "full_name": "Security Editor",
                "password": "Editor123!",
                "role": UserRoleEnum.EDITOR
            },
            {
                "username": "viewer",
                "email": "viewer@example.com",
                "full_name": "Security Viewer",
                "password": "Viewer123!",
                "role": UserRoleEnum.VIEWER
            }
        ]

        for user_data in default_users:
            try:
                user_create = UserCreate(**user_data)
                self.create_user(user_create)
            except Exception as e:
                print(f"Warning: Could not create default user {user_data['username']}: {e}")

    def create_user(self, user_data: UserCreate) -> UserInDB:
        """
        Create a new user

        Args:
            user_data: User creation data

        Returns:
            Created user

        Raises:
            ValueError: If username or email already exists
        """
        # Check for existing username
        if user_data.username.lower() in self.username_index:
            raise ValueError(f"Username '{user_data.username}' already exists")

        # Check for existing email
        if user_data.email.lower() in self.email_index:
            raise ValueError(f"Email '{user_data.email}' already exists")

        # Generate user ID
        user_id = str(uuid.uuid4())

        # Hash password
        hashed_password = PasswordHasher.hash_password(user_data.password)

        # Create user
        now = datetime.utcnow()
        user = UserInDB(
            id=user_id,
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            role=user_data.role,
            is_active=user_data.is_active,
            hashed_password=hashed_password,
            created_at=now,
            updated_at=now
        )

        # Store user
        self.users[user_id] = user
        self.username_index[user_data.username.lower()] = user_id
        self.email_index[user_data.email.lower()] = user_id

        return user

    def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        """Get user by ID"""
        return self.users.get(user_id)

    def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        """Get user by username"""
        user_id = self.username_index.get(username.lower())
        if user_id:
            return self.users.get(user_id)
        return None

    def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """Get user by email"""
        user_id = self.email_index.get(email.lower())
        if user_id:
            return self.users.get(user_id)
        return None

    def authenticate_user(self, username: str, password: str) -> Optional[UserInDB]:
        """
        Authenticate a user

        Args:
            username: Username
            password: Plain text password

        Returns:
            User if authentication successful, None otherwise
        """
        user = self.get_user_by_username(username)

        if not user:
            return None

        if not user.is_active:
            return None

        if not PasswordHasher.verify_password(password, user.hashed_password):
            return None

        return user

    def update_user(self, user_id: str, user_update: UserUpdate) -> Optional[UserInDB]:
        """
        Update user data

        Args:
            user_id: User ID
            user_update: Update data

        Returns:
            Updated user or None if not found

        Raises:
            ValueError: If email already exists
        """
        user = self.users.get(user_id)
        if not user:
            return None

        # Check email uniqueness if changing
        if user_update.email and user_update.email.lower() != user.email.lower():
            if user_update.email.lower() in self.email_index:
                raise ValueError(f"Email '{user_update.email}' already exists")

            # Update email index
            del self.email_index[user.email.lower()]
            self.email_index[user_update.email.lower()] = user_id

        # Update fields
        update_data = user_update.dict(exclude_unset=True)

        # Handle password update
        if "password" in update_data:
            hashed_password = PasswordHasher.hash_password(update_data["password"])
            update_data["hashed_password"] = hashed_password
            del update_data["password"]

        # Update user
        for field, value in update_data.items():
            setattr(user, field, value)

        user.updated_at = datetime.utcnow()

        return user

    def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str
    ) -> bool:
        """
        Change user password

        Args:
            user_id: User ID
            current_password: Current password
            new_password: New password

        Returns:
            True if successful, False otherwise
        """
        user = self.users.get(user_id)
        if not user:
            return False

        # Verify current password
        if not PasswordHasher.verify_password(current_password, user.hashed_password):
            return False

        # Update password
        user.hashed_password = PasswordHasher.hash_password(new_password)
        user.updated_at = datetime.utcnow()

        return True

    def delete_user(self, user_id: str) -> bool:
        """
        Delete a user

        Args:
            user_id: User ID

        Returns:
            True if deleted, False if not found
        """
        user = self.users.get(user_id)
        if not user:
            return False

        # Remove from indexes
        del self.username_index[user.username.lower()]
        del self.email_index[user.email.lower()]

        # Remove user
        del self.users[user_id]

        return True

    def list_users(self, skip: int = 0, limit: int = 100) -> List[UserInDB]:
        """
        List all users with pagination

        Args:
            skip: Number of users to skip
            limit: Maximum number of users to return

        Returns:
            List of users
        """
        all_users = list(self.users.values())
        return all_users[skip:skip + limit]

    def get_user_count(self) -> int:
        """Get total number of users"""
        return len(self.users)


# Global user store instance
user_store = UserStore()
