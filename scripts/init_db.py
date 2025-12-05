"""初始化数据库并插入示例数据."""
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.models.base import Base, SessionLocal, engine  # noqa: E402
from app.models.problem import Difficulty, Problem  # noqa: E402
from app.models.testcase import TestCase  # noqa: E402
from app.models.submission import Submission  # noqa: E402,F401
from app.models.user import User  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402

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
        ensure_admin(db)
        ensure_two_sum(db)
        load_hot100(db)
        refresh_hot100(db)
        print("示例题目插入完成")
    finally:
        db.close()


def ensure_admin(db: SessionLocal) -> None:
    if db.query(User).filter(User.username == "admin").first():
        return
    admin_user = User(
        username="admin",
        email="admin@example.com",
        hashed_password=get_password_hash("admin"),
        is_admin=True,
    )
    db.add(admin_user)
    db.commit()


def ensure_two_sum(db: SessionLocal) -> None:
    exists = db.query(Problem).filter(Problem.slug == "two-sum").first()
    if exists:
        return
    fixture_path = Path(__file__).resolve().parents[1] / "backend" / "app" / "fixtures" / "two_sum.json"
    if not fixture_path.exists():
        print("未找到 two_sum.json 夹具文件，无法插入 two-sum")
        return
    problem = Problem(
        slug="two-sum",
        title="Two Sum",
        difficulty=Difficulty.EASY,
        tags="数组,哈希",
        content="给定整数数组 nums 和目标值 target，请返回两数之和等于 target 的任意一组下标。",
        input_description="第一行 n，第二行 n 个整数，第三行 target。",
        output_description="输出两个下标，升序。",
        constraints=r"$2 \le n \le 10^{5},\;-10^{9} \le \text{nums}[i] \le 10^{9}$",
        is_spj=True,
        spj_code=DEFAULT_SPJ,
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)

    fixtures = json.loads(fixture_path.read_text(encoding="utf-8"))
    testcases = [
        TestCase(
            problem_id=problem.id,
            input_text=item["input_text"],
            output_text=item["output_text"],
            is_sample=item.get("is_sample", False),
        )
        for item in fixtures
    ]
    db.add_all(testcases)
    db.commit()


def refresh_hot100(db: SessionLocal) -> None:
    """使用夹具内容刷新已有 hot100 题目（更新题面、清空并重建用例）."""
    fixture_path = Path(__file__).resolve().parents[1] / "backend" / "app" / "fixtures" / "leetcode_hot100.json"
    if not fixture_path.exists():
        return
    data = json.loads(fixture_path.read_text(encoding="utf-8"))
    for item in data:
        problem = db.query(Problem).filter(Problem.slug == item["slug"]).first()
        if not problem:
            continue
        tags = ",".join(item.get("tags", []))
        problem.title = item.get("title", problem.title)
        problem.difficulty = Difficulty(item.get("difficulty", problem.difficulty))
        problem.tags = tags
        problem.content = item.get("content", problem.content)
        problem.input_description = item.get("input_description", problem.input_description)
        problem.output_description = item.get("output_description", problem.output_description)
        problem.constraints = item.get("constraints", problem.constraints)
        problem.is_spj = item.get("is_spj", problem.is_spj)
        problem.spj_code = item.get("spj_code", problem.spj_code)
        # 重建用例
        db.query(TestCase).filter(TestCase.problem_id == problem.id).delete()
        tcs = [
            TestCase(
                problem_id=problem.id,
                input_text=tc["input_text"],
                output_text=tc["output_text"],
                is_sample=tc.get("is_sample", False),
            )
            for tc in item.get("testcases", [])
        ]
        db.add_all(tcs)
    db.commit()


def load_hot100(db: SessionLocal) -> None:
    fixture_path = Path(__file__).resolve().parents[1] / "backend" / "app" / "fixtures" / "leetcode_hot100.json"
    if not fixture_path.exists():
        print("未找到 leetcode_hot100.json 夹具文件，跳过")
        return
    data = json.loads(fixture_path.read_text(encoding="utf-8"))
    for item in data:
        if db.query(Problem).filter(Problem.slug == item["slug"]).first():
            continue
        tags = ",".join(item.get("tags", []))
        problem = Problem(
            slug=item["slug"],
            title=item["title"],
            difficulty=Difficulty(item.get("difficulty", "EASY")),
            tags=tags,
            content=item.get("content", ""),
            input_description=item.get("input_description", ""),
            output_description=item.get("output_description", ""),
            constraints=item.get("constraints", ""),
            is_spj=item.get("is_spj", False),
            spj_code=item.get("spj_code"),
        )
        db.add(problem)
        db.commit()
        db.refresh(problem)
        tcs = [
            TestCase(
                problem_id=problem.id,
                input_text=tc["input_text"],
                output_text=tc["output_text"],
                is_sample=tc.get("is_sample", False),
            )
            for tc in item.get("testcases", [])
        ]
        db.add_all(tcs)
        db.commit()


def main():
    Base.metadata.create_all(bind=engine)
    seed_sample()


if __name__ == "__main__":
    main()
