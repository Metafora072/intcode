"""初始化数据库并插入基础用户数据（题目数据改为外部同步）。"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.models.base import Base, SessionLocal, engine  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models import refresh_token  # noqa: F401,E402
from app.config import settings  # noqa: E402
from app.services import testcase_storage  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from sqlalchemy import text  # noqa: E402

DEFAULT_SPJ = """def check(input_str, user_output_str):
    try:
        lines = input_str.strip().split('\\n')
        n = int(lines[0])
        nums = list(map(int, lines[1].split()))
        target = int(lines[2])
        user_indices = list(map(int, user_output_str.strip().split()))
        if len(user_indices) != 2:
            return False
        i, j = user_indices
        if i < 0 or i >= n or j < 0 or j >= n or i == j:
            return False
        return nums[i] + nums[j] == target
    except Exception:
        return False
"""

def seed_sample():
    db = SessionLocal()
    try:
        ensure_user_columns()
        ensure_testcase_columns()
        ensure_admin(db)
        settings.testcase_root.mkdir(parents=True, exist_ok=True)
        print("基础用户初始化完成（题目请通过同步脚本导入）")
    finally:
        db.close()


def ensure_admin(db: SessionLocal) -> None:
    if not db.query(User).filter(User.username == "admin").first():
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin"),
            is_admin=True,
            avatar_url=None,
        )
        db.add(admin_user)
    if not db.query(User).filter(User.username == "user").first():
        normal_user = User(
            username="user",
            email="user@example.com",
            hashed_password=get_password_hash("user"),
            is_admin=False,
            avatar_url=None,
        )
        db.add(normal_user)
    db.commit()


def ensure_user_columns() -> None:
    """在 SQLite 环境下确保新增列存在，避免旧库缺列报错。"""
    with engine.begin() as conn:
        # users.avatar_url
        user_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users);")).fetchall()]
        if "avatar_url" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);"))
        # submissions.user_id
        sub_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(submissions);")).fetchall()]
        if "user_id" not in sub_cols:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN user_id INTEGER;"))


def ensure_testcase_columns() -> None:
    """确保测试用例表的文件元数据列存在."""
    with engine.begin() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(testcases);")).fetchall()]
        alters = []
        if "case_no" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN case_no INTEGER DEFAULT 1;")
        if "in_path" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN in_path VARCHAR(255);")
        if "out_path" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN out_path VARCHAR(255);")
        if "in_size_bytes" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN in_size_bytes INTEGER;")
        if "out_size_bytes" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN out_size_bytes INTEGER;")
        if "in_sha256" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN in_sha256 VARCHAR(64);")
        if "out_sha256" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN out_sha256 VARCHAR(64);")
        if "score_weight" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN score_weight INTEGER;")
        if "created_at" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN created_at DATETIME;")
        if "updated_at" not in cols:
            alters.append("ALTER TABLE testcases ADD COLUMN updated_at DATETIME;")
        for stmt in alters:
            conn.execute(text(stmt))


def main():
    Base.metadata.create_all(bind=engine)
    seed_sample()


if __name__ == "__main__":
    main()
