from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.problem import Difficulty, Problem
from app.models.testcase import TestCase
from app.schemas.problem import ProblemCreate, ProblemUpdate
from app.schemas.testcase import TestCaseCreate


def _tags_to_str(tags: List[str]) -> str:
    return ",".join([t.strip() for t in tags if t.strip()])


def _tags_from_str(tags: str) -> List[str]:
    return [t for t in tags.split(",") if t] if tags else []


def list_problems(
    db: Session,
    keyword: Optional[str] = None,
    difficulty: Optional[Difficulty] = None,
    tag: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[Problem], int]:
    query = db.query(Problem)
    if keyword:
        query = query.filter(Problem.title.ilike(f"%{keyword}%"))
    if difficulty:
        query = query.filter(Problem.difficulty == difficulty)
    if tag:
        query = query.filter(Problem.tags.ilike(f"%{tag}%"))
    total = query.count()
    items = query.order_by(Problem.updated_at.desc()).offset(offset).limit(limit).all()
    return items, total


def get_problem(db: Session, problem_id: int) -> Optional[Problem]:
    return db.query(Problem).filter(Problem.id == problem_id).first()


def get_problem_by_slug(db: Session, slug: str) -> Optional[Problem]:
    return db.query(Problem).filter(Problem.slug == slug).first()


def _replace_testcases(db: Session, problem: Problem, testcases: List[TestCaseCreate]) -> None:
    db.query(TestCase).filter(TestCase.problem_id == problem.id).delete()
    db.flush()
    objs = [
        TestCase(
            problem_id=problem.id,
            input_text=tc.input_text,
            output_text=tc.output_text,
            is_sample=tc.is_sample,
        )
        for tc in testcases
    ]
    if objs:
        db.add_all(objs)
    db.commit()
    db.refresh(problem)


def create_problem(db: Session, payload: ProblemCreate) -> Problem:
    db_problem = Problem(
        slug=payload.slug,
        title=payload.title,
        difficulty=payload.difficulty,
        tags=_tags_to_str(payload.tags),
        content=payload.content,
        input_description=payload.input_description,
        output_description=payload.output_description,
        constraints=payload.constraints,
        is_spj=payload.is_spj,
        spj_code=payload.spj_code,
    )
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    if getattr(payload, "testcases", None) is not None:
        _replace_testcases(db, db_problem, payload.testcases)
    return db_problem


def update_problem(db: Session, problem: Problem, payload: ProblemUpdate) -> Problem:
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "tags" and value is not None:
            setattr(problem, field, _tags_to_str(value))
        elif value is not None:
            setattr(problem, field, value)
    db.commit()
    db.refresh(problem)
    return problem


def upsert_problem(db: Session, payload: ProblemCreate) -> Problem:
    problem = get_problem_by_slug(db, payload.slug)
    if not problem:
        return create_problem(db, payload)

    # 更新题目字段
    problem.title = payload.title
    problem.difficulty = payload.difficulty
    problem.tags = _tags_to_str(payload.tags)
    problem.content = payload.content
    problem.input_description = payload.input_description
    problem.output_description = payload.output_description
    problem.constraints = payload.constraints
    problem.is_spj = payload.is_spj
    problem.spj_code = payload.spj_code
    db.commit()
    db.refresh(problem)

    # 全量替换测试用例
    _replace_testcases(db, problem, payload.testcases or [])
    return problem


def delete_problem(db: Session, problem: Problem) -> None:
    db.delete(problem)
    db.commit()


def add_testcase(db: Session, problem: Problem, payload: TestCaseCreate) -> TestCase:
    testcase = TestCase(
        problem_id=problem.id,
        input_text=payload.input_text,
        output_text=payload.output_text,
        is_sample=payload.is_sample,
    )
    db.add(testcase)
    db.commit()
    db.refresh(testcase)
    return testcase


def serialize_problem(problem: Problem):
    tags = _tags_from_str(problem.tags)
    if getattr(problem, "is_spj", False) and "SPJ" not in tags:
        tags.append("SPJ")
    data = {
        "id": problem.id,
        "slug": problem.slug,
        "title": problem.title,
        "difficulty": problem.difficulty,
        "tags": tags,
        "content": problem.content,
        "input_description": problem.input_description,
        "output_description": problem.output_description,
        "constraints": problem.constraints,
        "is_spj": getattr(problem, "is_spj", False),
        "spj_code": getattr(problem, "spj_code", None),
        "created_at": problem.created_at,
        "updated_at": problem.updated_at,
        "testcases": [
            {
                "id": tc.id,
                "input_text": tc.input_text,
                "output_text": tc.output_text,
                "is_sample": tc.is_sample,
            }
            for tc in problem.testcases
        ],
    }
    return data
