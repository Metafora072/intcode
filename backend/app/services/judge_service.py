from __future__ import annotations

import json
import shutil
import tempfile
import time
from pathlib import Path
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.config import settings
from app.models.problem import Problem
from app.models.submission import Submission
from app.schemas.submission import CaseResult, SubmissionCreate, SubmissionResult
from app.services import problem_service
from app.runner import cpp_runner, py_runner, sandbox
from app.utils.logger import logger


def _prepare_workdir() -> Path:
    settings.work_dir.mkdir(parents=True, exist_ok=True)
    return Path(tempfile.mkdtemp(dir=settings.work_dir))


def _select_cases(problem: Problem, mode: str):
    if mode == "run_sample":
        return [tc for tc in problem.testcases if tc.is_sample]
    return problem.testcases


def _compile_code(language: str, code: str, workdir: Path) -> Tuple[Optional[List[str]], Optional[str]]:
    if language == "cpp17":
        return cpp_runner.compile_code(code, workdir)
    if language == "python3":
        return py_runner.prepare_script(code, workdir)
    return None, "不支持的语言"


def judge(db: Session, payload: SubmissionCreate) -> SubmissionResult:
    problem = problem_service.get_problem(db, payload.problem_id)
    if not problem:
        return SubmissionResult(status="NOT_FOUND", runtime_ms=0.0, runtime_error="题目不存在")

    workdir = _prepare_workdir()
    logger.info("开始评测: problem=%s language=%s mode=%s", payload.problem_id, payload.language, payload.mode)
    exec_cmd, compile_err = _compile_code(payload.language, payload.code, workdir)
    if compile_err:
        shutil.rmtree(workdir, ignore_errors=True)
        return SubmissionResult(status="CE", runtime_ms=0.0, compile_error=compile_err)

    cases = _select_cases(problem, payload.mode)
    results: List[CaseResult] = []
    overall_status = "AC"
    max_runtime = 0.0
    runtime_error = None

    for tc in cases:
        start = time.perf_counter()
        status, output, err = sandbox.run_process(
            exec_cmd,
            tc.input_text,
            timeout=settings.case_timeout,
            output_limit=settings.output_limit,
            memory_limit_mb=settings.memory_limit_mb,
        )
        elapsed = (time.perf_counter() - start) * 1000
        max_runtime = max(max_runtime, elapsed)
        case_status = "AC"
        case_error = None
        if status == "TLE":
            case_status = "TLE"
            overall_status = "TLE"
            case_error = "超时"
            runtime_error = "存在超时用例"
        elif status == "RE":
            case_status = "RE"
            overall_status = "RE"
            case_error = err or "运行时错误"
            runtime_error = case_error
        else:
            if output.strip() != tc.output_text.strip():
                case_status = "WA"
                overall_status = "WA"
                case_error = "输出不一致"
        results.append(
            CaseResult(
                case_id=tc.id,
                status=case_status,
                input_preview=tc.input_text[:200],
                expected_preview=tc.output_text[:200],
                output_preview=output[:200] if output else "",
                runtime_ms=elapsed,
                error=case_error,
            )
        )
        if overall_status != "AC":
            # 简化：发现第一个失败即可停止
            break

    detail = SubmissionResult(
        status=overall_status,
        runtime_ms=max_runtime,
        compile_error=None,
        runtime_error=runtime_error,
        cases=results,
    )

    if payload.mode == "submit":
        db_submission = Submission(
            problem_id=payload.problem_id,
            language=payload.language,
            code=payload.code,
            status=overall_status,
            score=100 if overall_status == "AC" else 0,
            runtime_ms=max_runtime,
            detail_json=json.dumps([c.model_dump() for c in results], ensure_ascii=False),
        )
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
        detail.submission_id = db_submission.id

    shutil.rmtree(workdir, ignore_errors=True)
    logger.info("评测结束: problem=%s status=%s time=%.2fms", payload.problem_id, overall_status, max_runtime)
    return detail
