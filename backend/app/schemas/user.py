from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class UserBase(BaseModel):
    username: str
    email: str
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str


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
