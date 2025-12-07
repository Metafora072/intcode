from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api import deps
from app.config import settings
from app.core.security import create_access_token, get_password_hash
from app.models.base import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserOut
from app.services import email_service

router = APIRouter(prefix="/auth", tags=["auth"])


class SendCodePayload(BaseModel):
    email: EmailStr
    type: Literal["register", "reset"]


@router.post("/send-code")
async def send_code(payload: SendCodePayload, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if payload.type == "register" and existing_user:
        raise HTTPException(status_code=400, detail="该邮箱已被注册")
    if payload.type == "reset" and not existing_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    code = email_service.generate_code()
    email_service.verification_store.set_code(payload.email, code)
    try:
        await email_service.send_verification_code(payload.email, code)
    except Exception as exc:
        # 记录具体异常便于排查 SMTP 连接/认证问题
        from app.utils.logger import logger

        logger.error("发送验证码失败: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="邮件发送失败，请检查邮箱地址或稍后重试")
    return {"message": "验证码已发送"}


@router.post("/register", response_model=UserOut)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="该用户名已被占用")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="该邮箱已被注册")
    if not email_service.verification_store.verify_code(payload.email, payload.verification_code):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        is_admin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = deps.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(deps.get_current_user)):
    return current_user
