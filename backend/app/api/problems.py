from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.models.base import get_db
from app.models.problem import Difficulty
from app.models.user_code import UserCode
from app.models.submission import Submission
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
    current_user=Depends(deps.get_current_user_optional),
):
    problems, total = problem_service.list_problems(
        db,
        keyword=keyword,
        difficulty=difficulty,
        tag=tag,
        limit=limit,
        offset=offset,
        user_id=current_user.id if current_user else None,
    )
    return {"items": [problem_service.serialize_problem(p) for p in problems], "total": total}


@router.get("/tags/trending")
def get_trending_tags(db: Session = Depends(get_db)):
    tags = problem_service.get_trending_tags(db)
    return [{"tag": tag, "count": count} for tag, count in tags]


@router.get("/{problem_id}")
def get_problem_detail(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user_optional),
):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    if current_user:
        solved = (
            db.query(Submission.id)
            .filter(Submission.user_id == current_user.id, Submission.problem_id == problem_id, Submission.status == "AC")
            .first()
        )
        problem.solved = bool(solved)
    return problem_service.serialize_problem(problem)


class SaveCodePayload(BaseModel):
    language: str
    code: str


@router.get("/{problem_id}/code")
def get_user_code(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    code_row = (
        db.query(UserCode)
        .filter(UserCode.problem_id == problem_id, UserCode.user_id == current_user.id)
        .first()
    )
    if not code_row:
        return {"code": "", "language": "cpp17", "updated_at": None}
    return {"code": code_row.code, "language": code_row.language, "updated_at": code_row.updated_at}


@router.put("/{problem_id}/code")
def save_user_code(
    problem_id: int,
    payload: SaveCodePayload,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    code_row = (
        db.query(UserCode)
        .filter(UserCode.problem_id == problem_id, UserCode.user_id == current_user.id)
        .first()
    )
    if code_row:
        code_row.language = payload.language
        code_row.code = payload.code
    else:
        code_row = UserCode(
            problem_id=problem_id,
            user_id=current_user.id,
            language=payload.language,
            code=payload.code,
        )
        db.add(code_row)
    db.commit()
    return {"message": "saved"}
