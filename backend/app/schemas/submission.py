from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class CaseResult(BaseModel):
    case_id: int
    status: str
    input_preview: Optional[str] = None
    expected_preview: Optional[str] = None
    output_preview: Optional[str] = None
    runtime_ms: Optional[float] = None
    error: Optional[str] = None
    full_output: Optional[str] = None


class SubmissionCreate(BaseModel):
    problem_id: int
    language: str
    code: str
    mode: str = "submit"  # submit | run_sample | custom
    custom_input: Optional[str] = None
    user_id: Optional[int] = None


class SubmissionOut(BaseModel):
    id: int
    problem_id: int
    language: str
    code: str
    status: str
    score: int
    runtime_ms: float
    created_at: datetime
    detail_json: Optional[Any] = None

    class Config:
        from_attributes = True


class SubmissionResult(BaseModel):
    status: str
    runtime_ms: float
    compile_error: Optional[str] = None
    runtime_error: Optional[str] = None
    cases: List[CaseResult] = Field(default_factory=list)
    submission_id: Optional[int] = None
