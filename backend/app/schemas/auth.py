from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 2 or len(v) > 100:
            raise ValueError("用户名长度需在 2-100 之间")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("密码长度不能少于 6 位")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("新密码长度不能少于 6 位")
        return v


class UserProfile(BaseModel):
    user_id: str
    username: str
    email: str
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None


class LoginRecord(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    login_at: datetime


class UserPreferences(BaseModel):
    theme: str = "light"
    notifications: Optional[dict] = None
