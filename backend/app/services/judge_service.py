from __future__ import annotations

import json
import shutil
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.config import settings
from app.models.problem import Problem
from app.models.submission import Submission
from app.schemas.submission import CaseResult, SubmissionCreate, SubmissionResult
from app.services import problem_service
from app.services import testcase_storage
from app.runner import checker, compare, cpp_runner, py_runner, sandbox
from app.utils.logger import logger


def _prepare_workdir() -> Path:
    settings.work_dir.mkdir(parents=True, exist_ok=True)
    return Path(tempfile.mkdtemp(dir=settings.work_dir))


def _select_cases(problem: Problem, mode: str):
    if mode == "custom":
        return []
    if mode == "run_sample":
        return sorted([tc for tc in problem.testcases if tc.is_sample], key=lambda x: x.case_no or 0)
    return sorted(problem.testcases, key=lambda x: x.case_no or 0)


def _compile_code(language: str, code: str, workdir: Path) -> Tuple[Optional[List[str]], Optional[str]]:
    if language == "cpp17":
        return cpp_runner.compile_code(code, workdir)
    if language == "python3":
        return py_runner.prepare_script(code, workdir)
    return None, "不支持的语言"


def _read_preview(path: Path, limit: int = 200) -> str:
    if not path.exists():
        return ""
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as f:
            return f.read(limit)
    except Exception:
        return ""


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
    if payload.mode == "custom":
        cases = [
            SimpleNamespace(id=0, input_text=payload.custom_input or "", output_text="", is_sample=True)  # type: ignore[arg-type]
        ]
    results: List[CaseResult] = []
    max_runtime = 0.0
    runtime_error = None

    for tc in cases:
        start = time.perf_counter()
        case_status = "AC" if payload.mode != "custom" else "OK"
        case_error = None
        output_preview = ""
        expected_preview = ""
        input_preview = ""
        user_output_full = ""
        elapsed = 0.0
        if payload.mode == "custom":
            status, output, err = sandbox.run_process(
                exec_cmd,
                tc.input_text,
                timeout=settings.case_timeout,
                output_limit=settings.output_limit,
                memory_limit_mb=settings.memory_limit_mb,
            )
            elapsed = (time.perf_counter() - start) * 1000
            max_runtime = max(max_runtime, elapsed)
            output_preview = output[:200] if output else ""
            input_preview = tc.input_text[:200]
            expected_preview = ""
            user_output_full = output if len(output) <= 1000 else output[:1000]
            if status == "TLE":
                case_status = "TLE"
                case_error = "超时"
                runtime_error = runtime_error or "存在超时用例"
            elif status == "RE":
                err_lower = (err or "").lower()
                if "memory" in err_lower or "内存" in err_lower or "cannot allocate memory" in err_lower:
                    case_status = "MLE"
                    case_error = err or "内存超限"
                    runtime_error = runtime_error or "存在内存超限用例"
                else:
                    case_status = "RE"
                    case_error = err or "运行时错误"
                    runtime_error = runtime_error or case_error
            elif status == "MLE":
                case_status = "MLE"
                case_error = "内存超限"
                runtime_error = runtime_error or "存在内存超限用例"
        else:
            input_path = testcase_storage.resolve_path(tc.in_path) if tc.in_path else None
            expected_path = testcase_storage.resolve_path(tc.out_path) if tc.out_path else None
            if not input_path or not expected_path or (not input_path.exists()) or (not expected_path.exists()):
                case_status = "RE"
                case_error = "测试数据缺失"
            else:
                output_path = Path(tempfile.mktemp(dir=str(workdir)))
                status, err = sandbox.run_process_stream(
                    exec_cmd,
                    input_path,
                    output_path,
                    timeout=settings.case_timeout,
                    memory_limit_mb=settings.memory_limit_mb,
                )
                elapsed = (time.perf_counter() - start) * 1000
                max_runtime = max(max_runtime, elapsed)
                if status == "TLE":
                    case_status = "TLE"
                    case_error = "超时"
                    runtime_error = runtime_error or "存在超时用例"
                elif status == "RE":
                    err_lower = (err or "").lower() if err else ""
                    if "memory" in err_lower or "内存" in err_lower:
                        case_status = "MLE"
                        case_error = err or "内存超限"
                        runtime_error = runtime_error or "存在内存超限用例"
                    else:
                        case_status = "RE"
                        case_error = err or "运行时错误"
                        runtime_error = runtime_error or case_error
                else:
                    actual_size = output_path.stat().st_size if output_path.exists() else 0
                    if actual_size > settings.max_output_bytes:
                        case_status = "OLE"
                        case_error = "输出超出限制"
                        output_preview = _read_preview(output_path)
                        runtime_error = runtime_error or "存在输出超限用例"
                    else:
                        if problem.is_spj and problem.spj_code:
                            user_output_full = output_path.read_text(encoding="utf-8", errors="ignore")
                            ok, spj_err = checker.run_checker(
                                problem.spj_code,
                                input_path.read_text(encoding="utf-8", errors="ignore"),
                                user_output_full,
                            )
                            if not ok:
                                case_status = "WA"
                                case_error = spj_err or "答案未通过特殊判题"
                        else:
                            ok, diff = compare.compare_files(expected_path, output_path)
                            expected_preview = diff.get("expected_preview", "")
                            output_preview = diff.get("output_preview", "")
                            user_output_full = output_preview
                            if not ok:
                                case_status = "WA"
                                pos = diff.get("mismatch_pos")
                                case_error = f"输出不一致，偏移 {pos}" if pos is not None else "输出不一致"
                        if not expected_preview:
                            expected_preview = _read_preview(expected_path)
                        if not output_preview:
                            output_preview = _read_preview(output_path)
                        input_preview = _read_preview(input_path)
                try:
                    output_path.unlink(missing_ok=True)
                except Exception:
                    pass
        results.append(
            CaseResult(
                case_id=tc.id,
                status=case_status,
                input_preview=input_preview,
                expected_preview=expected_preview,
                output_preview=output_preview,
                runtime_ms=elapsed,
                error=case_error,
                full_output=user_output_full,
            )
        )
    overall_status = "CUSTOM" if payload.mode == "custom" else "AC"
    if payload.mode != "custom":
        statuses = {c.status for c in results}
        for label in ["RE", "MLE", "TLE", "WA"]:
            if label in statuses:
                overall_status = label
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
            user_id=payload.user_id,
        )
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
        detail.submission_id = db_submission.id

    shutil.rmtree(workdir, ignore_errors=True)
    logger.info("评测结束: problem=%s status=%s time=%.2fms", payload.problem_id, overall_status, max_runtime)
    return detail
