from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.models.base import get_db
from app.models.problem import Difficulty
from app.services import problem_service

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("")
def list_problems(
    keyword: Optional[str] = Query(default=None),
    difficulty: Optional[Difficulty] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    problems, total = problem_service.list_problems(
        db, keyword=keyword, difficulty=difficulty, tag=tag, limit=limit, offset=offset
    )
    return {"items": [problem_service.serialize_problem(p) for p in problems], "total": total}


@router.get("/{problem_id}")
def get_problem_detail(problem_id: int, db: Session = Depends(get_db)):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    return problem_service.serialize_problem(problem)
