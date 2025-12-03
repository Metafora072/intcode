"""初始化数据库并插入示例数据."""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.models.base import Base, SessionLocal, engine  # noqa: E402
from app.models.problem import Difficulty, Problem  # noqa: E402
from app.models.testcase import TestCase  # noqa: E402


def seed_sample():
    db = SessionLocal()
    if db.query(Problem).count() > 0:
        db.close()
        print("数据库已存在数据，跳过示例插入")
        return
    problem = Problem(
        slug="two-sum",
        title="Two Sum",
        difficulty=Difficulty.EASY,
        tags="数组,哈希",
        content="给定整数数组 nums 和目标值 target，请返回两数之和等于 target 的任意一组下标。",
        input_description="第一行 n，第二行 n 个整数，第三行 target。",
        output_description="输出两个下标，升序。",
        constraints="2 <= n <= 1e5, -1e9 <= nums[i] <= 1e9",
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)

    samples = [
        TestCase(
            problem_id=problem.id,
            input_text="4\n2 7 11 15\n9\n",
            output_text="0 1\n",
            is_sample=True,
        ),
        TestCase(
            problem_id=problem.id,
            input_text="3\n3 2 4\n6\n",
            output_text="1 2\n",
            is_sample=True,
        ),
    ]
    hidden = [
        TestCase(
            problem_id=problem.id,
            input_text="5\n1 5 3 7 9\n10\n",
            output_text="1 3\n",
            is_sample=False,
        )
    ]
    db.add_all(samples + hidden)
    db.commit()
    db.close()
    print("示例题目插入完成")


def main():
    Base.metadata.create_all(bind=engine)
    seed_sample()


if __name__ == "__main__":
    main()
