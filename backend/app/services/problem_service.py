from typing import List, Optional, Tuple

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.models.problem import Difficulty, Problem
from app.models.submission import Submission
from app.models.testcase import TestCase
from app.models.user import User
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
    sub_submit = (
        db.query(Submission.problem_id, func.count(Submission.id).label("submit_total"))
        .group_by(Submission.problem_id)
        .subquery()
    )
    sub_ac = (
        db.query(Submission.problem_id, func.count(Submission.id).label("ac_total"))
        .filter(Submission.status == "AC")
        .group_by(Submission.problem_id)
        .subquery()
    )

    query = (
        db.query(
            Problem,
            func.coalesce(sub_submit.c.submit_total, 0).label("submit_total"),
            func.coalesce(sub_ac.c.ac_total, 0).label("ac_total"),
        )
        .outerjoin(sub_submit, Problem.id == sub_submit.c.problem_id)
        .outerjoin(sub_ac, Problem.id == sub_ac.c.problem_id)
    )
    if keyword:
        query = query.filter(Problem.title.ilike(f"%{keyword}%"))
    if difficulty:
        query = query.filter(Problem.difficulty == difficulty)
    if tag:
        query = query.filter(Problem.tags.ilike(f"%{tag}%"))
    total = query.count()
    rows = query.order_by(Problem.id.asc()).offset(offset).limit(limit).all()
    items: List[Problem] = []
    for problem, submit_total, ac_total in rows:
        problem.submit_total = submit_total or 0
        problem.ac_total = ac_total or 0
        problem.acceptance_rate = (ac_total / submit_total) if submit_total else 0.0
        items.append(problem)
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
    submit_total = getattr(problem, "submit_total", 0) or 0
    ac_total = getattr(problem, "ac_total", 0) or 0
    acceptance_rate = getattr(problem, "acceptance_rate", None)
    if acceptance_rate is None:
        acceptance_rate = ac_total / submit_total if submit_total else 0.0
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
        "submit_total": submit_total,
        "ac_total": ac_total,
        "acceptance_rate": acceptance_rate,
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


def get_trending_tags(db: Session, limit: int = 8) -> List[Tuple[str, int]]:
    tag_counter: dict[str, int] = {}
    for (tag_str,) in db.query(Problem.tags).all():
        if not tag_str:
            continue
        for tag in _tags_from_str(tag_str):
            tag_counter[tag] = tag_counter.get(tag, 0) + 1
    sorted_items = sorted(tag_counter.items(), key=lambda kv: kv[1], reverse=True)
    return sorted_items[:limit]


def list_users_with_stats(db: Session) -> List[dict]:
    solved_subq = (
        db.query(Submission.user_id, func.count(distinct(Submission.problem_id)).label("solved_count"))
        .filter(Submission.status == "AC")
        .group_by(Submission.user_id)
        .subquery()
    )
    submission_count_subq = (
        db.query(Submission.user_id, func.count(Submission.id).label("submission_count"))
        .group_by(Submission.user_id)
        .subquery()
    )
    query = (
        db.query(
            User,
            func.coalesce(solved_subq.c.solved_count, 0).label("solved_count"),
            func.coalesce(submission_count_subq.c.submission_count, 0).label("submission_count"),
        )
        .outerjoin(solved_subq, User.id == solved_subq.c.user_id)
        .outerjoin(submission_count_subq, User.id == submission_count_subq.c.user_id)
        .order_by(User.created_at.desc())
    )
    results = []
    for user, solved_count, submission_count in query.all():
        results.append(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_admin": user.is_admin,
                "created_at": user.created_at,
                "avatar_url": user.avatar_url,
                "solved_count": solved_count or 0,
                "submission_count": submission_count or 0,
            }
        )
    return results
