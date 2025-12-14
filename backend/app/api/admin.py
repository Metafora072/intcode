from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.models.base import get_db
from app.models.testcase import TestCase
from app.models.user import User
from app.schemas.problem import ProblemCreate, ProblemUpdate
from app.schemas.testcase import TestCaseCreate
from app.services import problem_service, testcase_storage
from app.api.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


@router.post("/problems")
def create_problem(payload: ProblemCreate, db: Session = Depends(get_db)):
    if problem_service.get_problem_by_slug(db, payload.slug):
        raise HTTPException(status_code=400, detail="slug 已存在")
    problem = problem_service.create_problem(db, payload)
    return problem_service.serialize_problem(problem)


@router.put("/problems/{problem_id}")
def update_problem(problem_id: int, payload: ProblemUpdate, db: Session = Depends(get_db)):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    problem = problem_service.update_problem(db, problem, payload)
    return problem_service.serialize_problem(problem)


@router.get("/problems/{problem_id}/testcases")
def list_testcases(problem_id: int, db: Session = Depends(get_db)):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    testcases = problem_service.list_testcases(db, problem_id)
    return [
        {
            "id": tc.id,
            "case_no": tc.case_no,
            "in_path": tc.in_path,
            "out_path": tc.out_path,
            "in_size_bytes": tc.in_size_bytes,
            "out_size_bytes": tc.out_size_bytes,
            "is_sample": tc.is_sample,
            "score_weight": tc.score_weight,
        }
        for tc in testcases
    ]


@router.post("/problems/{problem_id}/testcases")
def add_testcase(
    problem_id: int,
    case_no: Optional[int] = Form(None),
    is_sample: bool = Form(False),
    score_weight: Optional[int] = Form(None),
    input_file: UploadFile = File(...),
    output_file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    next_case_no = case_no or problem_service.get_next_case_no(db, problem_id)
    meta = testcase_storage.save_single_testcase(
        problem_id, next_case_no, input_file, output_file, problem_slug=problem.slug
    )
    testcase = (
        db.query(TestCase).filter(TestCase.problem_id == problem_id, TestCase.case_no == next_case_no).first()
    )
    if not testcase:
        testcase = TestCase(problem_id=problem_id)
        db.add(testcase)
    for key, value in meta.items():
        setattr(testcase, key, value)
    # 兼容旧表结构：input_text/output_text 可能非空约束，文件上传场景存空字符串
    testcase.input_text = testcase.input_text or ""
    testcase.output_text = testcase.output_text or ""
    testcase.is_sample = is_sample
    testcase.score_weight = score_weight
    db.commit()
    db.refresh(testcase)
    return {
        "id": testcase.id,
        "case_no": testcase.case_no,
        "in_path": testcase.in_path,
        "out_path": testcase.out_path,
        "in_size_bytes": testcase.in_size_bytes,
        "out_size_bytes": testcase.out_size_bytes,
        "is_sample": testcase.is_sample,
        "score_weight": testcase.score_weight,
    }


@router.post("/problems/{problem_id}/testcases/import_zip")
def import_testcases_zip(
    problem_id: int,
    strategy: str = Form("overwrite"),
    zip_file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    problem = problem_service.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    result = testcase_storage.import_zip_cases(problem_id, zip_file, strategy=strategy, problem_slug=problem.slug)
    imported_cases = []
    for meta in result["items"]:
        testcase = (
            db.query(TestCase)
            .filter(TestCase.problem_id == problem_id, TestCase.case_no == meta["case_no"])
            .first()
        )
        if not testcase:
            testcase = TestCase(problem_id=problem_id)
            db.add(testcase)
        for key, value in meta.items():
            setattr(testcase, key, value)
        db.flush()
        imported_cases.append(testcase.case_no)
    db.commit()
    return {
        "imported": imported_cases,
        "failed": result["failed"],
        "success": result["success"],
    }


@router.post("/problems/sync")
def sync_problem(payload: ProblemCreate, db: Session = Depends(get_db)):
    problem = problem_service.upsert_problem(db, payload)
    return problem_service.serialize_problem(problem)


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    return problem_service.list_users_with_stats(db)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return {"message": "User and associated data deleted"}


@router.delete("/testcases/{testcase_id}")
def delete_testcase(testcase_id: int, db: Session = Depends(get_db)):
    testcase = db.query(TestCase).filter(TestCase.id == testcase_id).first()
    if not testcase:
        raise HTTPException(status_code=404, detail="用例不存在")
    problem_service.delete_testcase(db, testcase)
    return {"message": "删除成功"}


@router.put("/testcases/{testcase_id}")
def update_testcase(
    testcase_id: int,
    case_no: Optional[int] = Form(None),
    is_sample: Optional[bool] = Form(None),
    score_weight: Optional[int] = Form(None),
    input_file: Optional[UploadFile] = File(None),
    output_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    testcase = db.query(TestCase).filter(TestCase.id == testcase_id).first()
    if not testcase:
        raise HTTPException(status_code=404, detail="用例不存在")
    problem = problem_service.get_problem(db, testcase.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    updated = problem_service.update_testcase(
        db,
        testcase,
        problem,
        case_no=case_no,
        is_sample=is_sample,
        score_weight=score_weight,
        input_file=input_file,
        output_file=output_file,
    )
    return {
        "id": updated.id,
        "case_no": updated.case_no,
        "is_sample": updated.is_sample,
        "score_weight": updated.score_weight,
        "in_path": updated.in_path,
        "out_path": updated.out_path,
        "in_size_bytes": updated.in_size_bytes,
        "out_size_bytes": updated.out_size_bytes,
    }


@router.get("/testcases/{testcase_id}/download")
def download_testcase_file(testcase_id: int, kind: str, db: Session = Depends(get_db)):
    testcase = db.query(TestCase).filter(TestCase.id == testcase_id).first()
    if not testcase:
        raise HTTPException(status_code=404, detail="用例不存在")
    path_str = testcase.in_path if kind == "in" else testcase.out_path if kind == "out" else None
    if not path_str:
        raise HTTPException(status_code=404, detail="文件不存在")
    path = testcase_storage.resolve_path(path_str)
    if not path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(path, filename=path.name)
