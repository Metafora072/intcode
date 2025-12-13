from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api import deps
from app.config import settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash, hash_token
from app.models.base import get_db
from app.models.refresh_token import RefreshToken
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
    response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = deps.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.refresh_token_expire_days)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(data={"sub": str(user.id)}, expires_delta=refresh_token_expires)
    _store_refresh_token(db, user.id, refresh_token, refresh_token_expires)
    _set_refresh_cookie(response, refresh_token, refresh_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(deps.get_current_user)):
    return current_user


@router.post("/refresh", response_model=Token)
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")
    if not raw_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未提供 refresh token")
    try:
        payload = jwt.decode(raw_refresh, settings.secret_key, algorithms=[settings.algorithm])
        sub_val = payload.get("sub")
        token_type = payload.get("token_type")
        user_id: Optional[int] = int(sub_val) if sub_val is not None else None
        exp: Optional[int] = payload.get("exp")
        if user_id is None or exp is None or token_type != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh token 无效")
        if datetime.utcfromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh token 已过期")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh token 无效")

    token_record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_token(raw_refresh), RefreshToken.revoked_at.is_(None))
        .first()
    )
    if (
        token_record is None
        or token_record.user_id != user_id
        or token_record.expires_at < datetime.utcnow()
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh token 已失效")

    token_record.last_used_at = datetime.utcnow()
    token_record.revoked_at = datetime.utcnow()
    access_token = create_access_token(data={"sub": str(user_id)})
    refresh_token_expires = timedelta(days=settings.refresh_token_expire_days)
    new_refresh_token = create_refresh_token(data={"sub": str(user_id)}, expires_delta=refresh_token_expires)
    _store_refresh_token(db, user_id, new_refresh_token, refresh_token_expires, commit=False)
    db.commit()
    _set_refresh_cookie(response, new_refresh_token, refresh_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")
    if raw_refresh:
        token_record = (
            db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(raw_refresh)).first()
        )
        if token_record and token_record.revoked_at is None:
            token_record.revoked_at = datetime.utcnow()
            token_record.last_used_at = datetime.utcnow()
            db.commit()
    _clear_refresh_cookie(response)
    return {"message": "已退出登录"}


def _store_refresh_token(
    db: Session, user_id: int, refresh_token: str, expires_delta: timedelta, commit: bool = True
) -> None:
    expires_at = datetime.utcnow() + expires_delta
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_token(refresh_token),
            expires_at=expires_at,
            last_used_at=datetime.utcnow(),
        )
    )
    if commit:
        db.commit()


def _set_refresh_cookie(response: Response, refresh_token: str, expires_delta: timedelta) -> None:
    max_age = int(expires_delta.total_seconds())
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
        max_age=max_age,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        "refresh_token",
        path="/",
        samesite="lax",
        secure=settings.cookie_secure,
    )
