from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class CaseResult(BaseModel):
    case_id: int
    status: str
    input_preview: str | None = None
    expected_preview: str | None = None
    output_preview: str | None = None
    runtime_ms: float | None = None
    error: str | None = None


class SubmissionCreate(BaseModel):
    problem_id: int
    language: str
    code: str
    mode: str = "submit"  # submit | run_sample


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
    compile_error: str | None = None
    runtime_error: str | None = None
    cases: List[CaseResult] = Field(default_factory=list)
    submission_id: Optional[int] = None
