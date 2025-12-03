from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.base import get_db
from app.schemas.problem import ProblemCreate, ProblemUpdate
from app.schemas.testcase import TestCaseCreate
from app.services import problem_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/problems")
def create_problem(payload: ProblemCreate, db: Session = Depends(get_db)):
    if problem_service.get_problem_by_slug(db, payload.slug):
        raise HTTPException(status_code=400, detail="slug 已存在")
    problem = problem_service.create_problem(db, payload)
    return problem_service.serialize_problem(problem)


@router.put("/problems/{problem_id}")
def update_problem(problem_id: int, payload: ProblemUpdate, db: Session = Depends(get_db)):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    problem = problem_service.update_problem(db, problem, payload)
    return problem_service.serialize_problem(problem)


@router.post("/problems/{problem_id}/testcases")
def add_testcase(problem_id: int, payload: TestCaseCreate, db: Session = Depends(get_db)):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    tc = problem_service.add_testcase(db, problem, payload)
    return {
        "id": tc.id,
        "problem_id": tc.problem_id,
        "input_text": tc.input_text,
        "output_text": tc.output_text,
        "is_sample": tc.is_sample,
    }
