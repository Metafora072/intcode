from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """基础配置."""

    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent / 'intcode.db'}"
    work_dir: Path = Path(__file__).resolve().parent.parent / "runs"
    compile_timeout: int = 15
    case_timeout: int = 2
    output_limit: int = 20000

    class Config:
        env_prefix = "INTCODE_"


settings = Settings()
