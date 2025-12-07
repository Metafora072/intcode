from datetime import datetime
from typing import Optional, List
import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    username: str
    email: EmailStr
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)
    verification_code: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        """用户名仅允许字母、数字与下划线."""
        if not re.match(r"^[a-zA-Z0-9_]+$", value):
            raise ValueError("用户名只能包含字母、数字或下划线")
        return value


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(UserBase):
    id: int
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class RecentSubmission(BaseModel):
    id: int
    problem_id: int
    problem_title: str
    status: str
    runtime_ms: float
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileOut(UserOut):
    solved_count: int
    submission_count: int
    acceptance_rate: float
    rank: int
    recent_submissions: List[RecentSubmission]
