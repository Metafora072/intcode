import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.models.base import get_db
from app.models.submission import Submission
from app.schemas.submission import SubmissionCreate
from app.services import judge_service, problem_service

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.get("")
def list_submissions(
    problem_id: int | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Submission)
    if problem_id:
        query = query.filter(Submission.problem_id == problem_id)
    subs = query.order_by(Submission.created_at.desc()).limit(limit).all()
    return [
        {
            "id": s.id,
            "problem_id": s.problem_id,
            "language": s.language,
            "status": s.status,
            "runtime_ms": s.runtime_ms,
            "score": s.score,
            "created_at": s.created_at,
        }
        for s in subs
    ]


@router.get("/{submission_id}")
def get_submission(submission_id: int, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="记录不存在")
    detail = json.loads(sub.detail_json) if sub.detail_json else []
    return {
        "id": sub.id,
        "problem_id": sub.problem_id,
        "language": sub.language,
        "code": sub.code,
        "status": sub.status,
        "runtime_ms": sub.runtime_ms,
        "score": sub.score,
        "created_at": sub.created_at,
        "cases": detail,
    }


@router.post("")
def submit_code(payload: SubmissionCreate, db: Session = Depends(get_db)):
    if not problem_service.get_problem(db, payload.problem_id):
        raise HTTPException(status_code=404, detail="题目不存在")
    result = judge_service.judge(db, payload)
    return result
