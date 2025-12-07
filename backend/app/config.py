from pathlib import Path
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
    mail_username: str = "your_email@example.com"
    mail_password: str = "your_password"
    mail_from: str = "your_email@example.com"
    mail_port: int = 587
    mail_server: str = "smtp.gmail.com"
    mail_from_name: str = "intcode OJ"
    mail_starttls: bool = True
    mail_ssl_tls: bool = False
    use_credentials: bool = True
    validate_certs: bool = True
    mail_use_mock: bool = True

    class Config:
        env_prefix = "INTCODE_"


settings = Settings()
