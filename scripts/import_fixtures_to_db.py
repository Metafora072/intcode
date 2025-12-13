"""将 backend/data/problems 下的 JSON 题目与样例迁移到数据库及文件用例目录."""
from pathlib import Path
import sys
import json

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import settings  # noqa: E402
from app.models.base import SessionLocal  # noqa: E402
from app.schemas.problem import ProblemCreate  # noqa: E402
from app.services import problem_service  # noqa: E402


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    fixture_dir = repo_root / "backend" / "data" / "problems"
    if not fixture_dir.exists():
        raise FileNotFoundError(f"未找到题目夹具目录: {fixture_dir}")
    settings.testcase_root.mkdir(parents=True, exist_ok=True)
    created, updated = 0, 0
    for path in sorted(fixture_dir.glob("*.json")):
        db = SessionLocal()
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            problem = problem_service.get_problem_by_slug(db, payload["slug"])
            data = ProblemCreate(**payload)
            if problem:
                problem_service.upsert_problem(db, data)
                updated += 1
            else:
                problem_service.create_problem(db, data)
                created += 1
            print(f"已导入: {path.name}")
        finally:
            db.close()
    print(f"完成导入，新增 {created}，道更新 {updated} 道。")


if __name__ == "__main__":
    main()
