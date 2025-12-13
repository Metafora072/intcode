import tempfile
from pathlib import Path
from typing import List, Optional, Tuple

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.models.problem import Difficulty, Problem
from app.models.submission import Submission
from app.models.testcase import TestCase
from app.models.user import User
from app.schemas.problem import ProblemCreate, ProblemUpdate
from app.schemas.testcase import TestCaseCreate
from app.services import testcase_storage
from app.utils.logger import logger


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
    user_id: Optional[int] = None,
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
    solved_ids: set[int] = set()
    if user_id:
        solved_ids = {
            pid
            for (pid,) in db.query(Submission.problem_id)
            .filter(Submission.user_id == user_id, Submission.status == "AC")
            .distinct()
            .all()
        }
    items: List[Problem] = []
    for problem, submit_total, ac_total in rows:
        problem.submit_total = submit_total or 0
        problem.ac_total = ac_total or 0
        problem.acceptance_rate = (ac_total / submit_total) if submit_total else 0.0
        problem.solved = problem.id in solved_ids
        items.append(problem)
    return items, total


def get_problem(db: Session, problem_id: int) -> Optional[Problem]:
    return db.query(Problem).filter(Problem.id == problem_id).first()


def get_problem_by_slug(db: Session, slug: str) -> Optional[Problem]:
    return db.query(Problem).filter(Problem.slug == slug).first()


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
    if getattr(payload, "testcases", None):
        _hydrate_testcases_from_inline(db, db_problem, payload.testcases)
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
    db.query(TestCase).filter(TestCase.problem_id == problem.id).delete()
    db.commit()
    _hydrate_testcases_from_inline(db, problem, payload.testcases or [])
    return problem


def delete_problem(db: Session, problem: Problem) -> None:
    db.delete(problem)
    db.commit()


def list_testcases(db: Session, problem_id: int) -> List[TestCase]:
    return (
        db.query(TestCase)
        .filter(TestCase.problem_id == problem_id)
        .order_by(TestCase.case_no.asc(), TestCase.id.asc())
        .all()
    )


def delete_testcase(db: Session, testcase: TestCase) -> None:
    from app.services import testcase_storage

    if testcase.in_path:
        testcase_storage.safe_delete_files([testcase_storage.resolve_path(testcase.in_path)])
    if testcase.out_path:
        testcase_storage.safe_delete_files([testcase_storage.resolve_path(testcase.out_path)])
    db.delete(testcase)
    db.commit()


def update_testcase(
    db: Session,
    testcase: TestCase,
    problem: Problem,
    case_no: Optional[int] = None,
    is_sample: Optional[bool] = None,
    score_weight: Optional[int] = None,
    input_file=None,
    output_file=None,
) -> TestCase:
    meta = testcase_storage.replace_testcase_files(
        testcase,
        case_no,
        input_file,
        output_file,
        problem_slug=problem.slug,
    )
    for key, value in meta.items():
        setattr(testcase, key, value)
    if is_sample is not None:
        testcase.is_sample = is_sample
    if score_weight is not None:
        testcase.score_weight = score_weight
    if input_file is not None:
        testcase.input_text = ""
    if output_file is not None:
        testcase.output_text = ""
    db.add(testcase)
    db.commit()
    db.refresh(testcase)
    return testcase


def add_testcase(db: Session, problem: Problem, payload: TestCaseCreate) -> TestCase:
    case_no = payload.case_no or (_max_case_no(db, problem.id) + 1)
    temp_in = Path(tempfile.mktemp())
    temp_out = Path(tempfile.mktemp())
    try:
        temp_in.write_text(getattr(payload, "input_text", "") or "", encoding="utf-8")
        temp_out.write_text(getattr(payload, "output_text", "") or "", encoding="utf-8")
        meta = testcase_storage.save_single_testcase(
            problem.id,
            case_no,
            _string_to_upload(temp_in, filename=f"{case_no}.in"),
            _string_to_upload(temp_out, filename=f"{case_no}.out"),
            problem_slug=problem.slug,
        )
    finally:
        temp_in.unlink(missing_ok=True)
        temp_out.unlink(missing_ok=True)
    testcase = TestCase(
        problem_id=problem.id,
        **meta,
        is_sample=payload.is_sample,
        score_weight=payload.score_weight,
        input_text=getattr(payload, "input_text", "") or "",
        output_text=getattr(payload, "output_text", "") or "",
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
        "solved": getattr(problem, "solved", False),
        "testcases": [
            {
                "id": tc.id,
                "case_no": tc.case_no,
                "in_path": tc.in_path,
                "out_path": tc.out_path,
                "in_size_bytes": tc.in_size_bytes,
                "out_size_bytes": tc.out_size_bytes,
                "is_sample": tc.is_sample,
                "input_text": _preview_file(tc.in_path) if tc.is_sample else None,
                "output_text": _preview_file(tc.out_path) if tc.is_sample else None,
            }
            for tc in sorted(problem.testcases, key=lambda x: x.case_no or 0)
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


def _max_case_no(db: Session, problem_id: int) -> int:
    val = db.query(func.coalesce(func.max(TestCase.case_no), 0)).filter(TestCase.problem_id == problem_id).scalar()
    return int(val or 0)


def get_next_case_no(db: Session, problem_id: int) -> int:
    return _max_case_no(db, problem_id) + 1


def _preview_file(path_str: Optional[str], limit: int = 500) -> Optional[str]:
    if not path_str:
        return None
    path = testcase_storage.resolve_path(path_str)
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as f:
            return f.read(limit)
    except Exception:
        return None


def _string_to_upload(path: Path, filename: str):
    """将临时文件包装成类似 UploadFile 的对象."""
    from starlette.datastructures import UploadFile as StarletteUploadFile  # 避免循环引用

    f = path.open("rb")
    upload = StarletteUploadFile(filename=filename, file=f)
    return upload


def _hydrate_testcases_from_inline(db: Session, problem: Problem, testcases: List[TestCaseCreate]) -> None:
    """兼容旧的内联用例，落盘到文件存储."""
    for idx, tc in enumerate(testcases, start=1):
        try:
            add_testcase(
                db,
                problem,
                TestCaseCreate(
                    case_no=tc.case_no or idx,
                    is_sample=tc.is_sample,
                    input_text=getattr(tc, "input_text", None),
                    output_text=getattr(tc, "output_text", None),
                    score_weight=tc.score_weight if hasattr(tc, "score_weight") else None,
                ),
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("迁移内联测试用例失败: %s", exc, exc_info=True)
