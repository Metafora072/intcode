from datetime import datetime, timedelta
from typing import Optional
import hashlib

from jose import jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    expire = expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    return _create_token(data, expire, "access")


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    expire = expires_delta or timedelta(days=settings.refresh_token_expire_days)
    return _create_token(data, expire, "refresh")


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + expires_delta, "token_type": token_type})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
