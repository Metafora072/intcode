from datetime import datetime, timedelta
import random
import string
from typing import Dict, Tuple

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.config import settings


class VerificationStore:
    """内存验证码存储，包含过期时间控制。"""

    def __init__(self, ttl_minutes: int = 10):
        self.ttl = ttl_minutes
        self._data: Dict[str, Tuple[str, datetime]] = {}

    def set_code(self, email: str, code: str) -> None:
        expire_at = datetime.utcnow() + timedelta(minutes=self.ttl)
        self._data[email] = (code, expire_at)

    def verify_code(self, email: str, code: str) -> bool:
        saved = self._data.get(email)
        if not saved:
            return False
        saved_code, expire_at = saved
        if datetime.utcnow() > expire_at:
            self._data.pop(email, None)
            return False
        if saved_code != code:
            return False
        self._data.pop(email, None)
        return True


verification_store = VerificationStore()

mail_conf = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=settings.mail_port,
    MAIL_SERVER=settings.mail_server,
    MAIL_FROM_NAME=settings.mail_from_name,
    MAIL_STARTTLS=settings.mail_starttls,
    MAIL_SSL_TLS=settings.mail_ssl_tls,
    USE_CREDENTIALS=settings.use_credentials,
    VALIDATE_CERTS=settings.validate_certs,
)


def generate_code(length: int = 6) -> str:
    """生成指定长度的数字验证码。"""
    return "".join(random.choices(string.digits, k=length))


async def send_verification_code(email: str, code: str) -> None:
    """发送验证码邮件，开发模式下仅打印。"""
    html_body = f"""
    <div style="background-color:#f8fafc; padding:20px; font-family: sans-serif;">
      <div style="max-width:600px; margin:0 auto; background:white; padding:30px; border-radius:10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
         <h2 style="color:#0f172a;">验证您的邮箱</h2>
         <p style="color:#64748b;">您好，您的验证码是：</p>
         <p style="font-size:32px; font-weight:bold; color:#4f46e5; margin: 20px 0;">{code}</p>
         <p style="color:#94a3b8; font-size:12px;">验证码 10 分钟内有效，请勿泄露给他人。</p>
      </div>
    </div>
    """
    message = MessageSchema(
        subject="intcode 验证码",
        recipients=[email],
        body=html_body,
        subtype=MessageType.html,
    )
    if settings.mail_use_mock:
        print(f"[mock email] send code {code} to {email}")
        return
    fm = FastMail(mail_conf)
    await fm.send_message(message)
