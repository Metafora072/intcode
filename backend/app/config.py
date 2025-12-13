from pathlib import Path
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """基础配置."""

    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent / 'intcode.db'}"
    work_dir: Path = Path(__file__).resolve().parent.parent / "runs"
    uploads_dir: Path = Path(__file__).resolve().parent.parent / "uploads"
    compile_timeout: int = 15
    case_timeout: int = 2
    output_limit: int = 20000
    memory_limit_mb: int = 256  # 评测内存限制
    secret_key: str = "dev_secret_key_fixed_for_stability_12345"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14
    cookie_secure: bool = False
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3716",
        "http://127.0.0.1:3716",
    ]
    mail_username: str = "2430093500@qq.com"
    mail_password: str = "bivthumactxrebfg"
    mail_from: str = "2430093500@qq.com"
    mail_port: int = 465
    mail_server: str = "smtp.qq.com"
    mail_from_name: str = "intcode OJ"
    mail_starttls: bool = False
    mail_ssl_tls: bool = True
    use_credentials: bool = True
    validate_certs: bool = True
    mail_use_mock: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors(cls, value: Union[str, List[str]]) -> List[str]:
        """支持以逗号分隔的 CORS 配置."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    class Config:
        env_prefix = "INTCODE_"
        env_file = ".env"


settings = Settings()
