from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class TestCaseBase(BaseModel):
    id: Optional[int] = None
    input_text: str
    output_text: str
    is_sample: bool = False

    class Config:
        from_attributes = True


class TestCaseCreate(BaseModel):
    input_text: str
    output_text: str
    is_sample: bool = False
