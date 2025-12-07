from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session
from PIL import Image, UnidentifiedImageError

from app.api.deps import get_current_user
from app.config import settings
from app.core.security import get_password_hash
from app.models.base import get_db
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User
from app.schemas.user import UserProfileOut
from app.services import email_service

router = APIRouter(prefix="/users", tags=["users"])


class ResetPasswordPayload(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=8)


@router.get("/me", response_model=UserProfileOut)
def read_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    solved_count = (
        db.query(Submission.problem_id)
        .filter(Submission.user_id == current_user.id, Submission.status == "AC")
        .distinct()
        .count()
    )
    submission_count = db.query(Submission).filter(Submission.user_id == current_user.id).count()
    acceptance_rate = (solved_count / submission_count) if submission_count else 0.0

    solved_subq = (
        db.query(
            Submission.user_id.label("uid"),
            func.count(distinct(Submission.problem_id)).label("solved"),
        )
        .filter(Submission.status == "AC")
        .group_by(Submission.user_id)
        .subquery()
    )
    higher = db.query(func.count()).filter(solved_subq.c.solved > solved_count).scalar() or 0
    rank = higher + 1

    recent = (
        db.query(
            Submission.id,
            Submission.problem_id,
            Submission.status,
            Submission.runtime_ms,
            Submission.created_at,
            Problem.title.label("problem_title"),
        )
        .join(Problem, Problem.id == Submission.problem_id)
        .filter(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .limit(5)
        .all()
    )

    return UserProfileOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_admin=current_user.is_admin,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        solved_count=solved_count,
        submission_count=submission_count,
        acceptance_rate=acceptance_rate,
        rank=rank,
        recent_submissions=[
            {
                "id": r.id,
                "problem_id": r.problem_id,
                "problem_title": r.problem_title,
                "status": r.status,
                "runtime_ms": r.runtime_ms,
                "created_at": r.created_at,
            }
            for r in recent
        ],
    )


@router.post("/avatar")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        image = Image.open(file.file)
        image.verify()
        file.file.seek(0)
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="无效的图片文件")
    ext = Path(file.filename or "").suffix.lower() or ".png"
    filename = f"user_{current_user.id}{ext}"
    save_path = settings.uploads_dir / filename
    with open(save_path, "wb") as f:
        f.write(await file.read())
    avatar_url = f"{request.base_url}uploads/{filename}"
    current_user.avatar_url = avatar_url
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {"avatar_url": avatar_url}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not email_service.verification_store.verify_code(payload.email, payload.code):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    user.hashed_password = get_password_hash(payload.new_password)
    db.add(user)
    db.commit()
    return {"message": "密码重置成功"}
