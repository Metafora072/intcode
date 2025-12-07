import asyncio
import os
import random
import smtplib
import ssl
import string
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Dict, Tuple

from app.config import settings
from app.utils.logger import logger

# 禁用代理，避免 SMTP 走 HTTP 代理导致握手异常
for key in ["http_proxy", "https_proxy", "all_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"]:
    os.environ.pop(key, None)


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


def generate_code(length: int = 6) -> str:
    """生成指定长度的数字验证码。"""
    return "".join(random.choices(string.digits, k=length))


async def send_verification_code(email: str, code: str) -> None:
    """发送验证码邮件，开发模式下仅打印。"""
    # 调试输出，确认 SSL/端口配置（生产可移除）
    print(f"Mail Config: Port={settings.mail_port}, SSL={settings.mail_ssl_tls}, StartTLS={settings.mail_starttls}")
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
    if settings.mail_use_mock:
        print(f"[mock email] send code {code} to {email}")
        return
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, _send_via_smtplib, email, html_body)
        logger.info("邮件发送成功，收件人: %s", email)
    except Exception as exc:
        logger.error("邮件发送失败: %s", exc, exc_info=True)
        raise


def _send_via_smtplib(email: str, html_body: str) -> None:
    """使用 smtplib 直接发送，避免代理或 aiosmtplib 兼容性问题。"""
    msg = EmailMessage()
    msg["Subject"] = "intcode 验证码"
    msg["From"] = settings.mail_from
    msg["To"] = email
    msg.set_content("验证码", subtype="plain")
    msg.add_alternative(html_body, subtype="html")

    context = ssl.create_default_context()
    # 直接使用 SMTP_SSL，端口固定 465，避免 STARTTLS/代理干扰
    with smtplib.SMTP_SSL(settings.mail_server, 465, context=context, timeout=10) as server:
        server.login(settings.mail_username, settings.mail_password)
        server.send_message(msg)
