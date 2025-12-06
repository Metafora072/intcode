from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.problem import Difficulty
from app.schemas.testcase import TestCaseBase, TestCaseCreate


class ProblemBase(BaseModel):
    slug: str
    title: str
    difficulty: Difficulty = Difficulty.EASY
    tags: List[str] = Field(default_factory=list)
    content: str
    input_description: str = ""
    output_description: str = ""
    constraints: str = ""
    is_spj: bool = False
    spj_code: Optional[str] = None


class ProblemCreate(ProblemBase):
    testcases: List[TestCaseCreate] = Field(default_factory=list)


class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    tags: Optional[List[str]] = None
    content: Optional[str] = None
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    constraints: Optional[str] = None
    is_spj: Optional[bool] = None
    spj_code: Optional[str] = None


class ProblemOut(ProblemBase):
    id: int
    created_at: datetime
    updated_at: datetime
    testcases: List[TestCaseBase] = Field(default_factory=list)
    acceptance_rate: float = 0.0
    submit_total: int = 0
    ac_total: int = 0
    is_spj: bool = False
    spj_code: Optional[str] = None

    class Config:
        from_attributes = True
