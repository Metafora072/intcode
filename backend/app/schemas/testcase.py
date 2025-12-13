from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class TestCaseBase(BaseModel):
    id: Optional[int] = None
    case_no: int
    in_path: Optional[str] = None
    out_path: Optional[str] = None
    in_size_bytes: Optional[int] = None
    out_size_bytes: Optional[int] = None
    in_sha256: Optional[str] = None
    out_sha256: Optional[str] = None
    score_weight: Optional[int] = None
    is_sample: bool = False

    class Config:
        from_attributes = True


class TestCaseCreate(BaseModel):
    case_no: Optional[int] = None
    score_weight: Optional[int] = None
    is_sample: bool = False
    input_text: Optional[str] = None
    output_text: Optional[str] = None
