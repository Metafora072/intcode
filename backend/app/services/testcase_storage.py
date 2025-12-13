from __future__ import annotations

import hashlib
import os
import zipfile
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException, UploadFile

from app.config import settings
from app.utils.logger import logger

CHUNK_SIZE = 64 * 1024


def ensure_root() -> Path:
    """确保测试数据根目录存在."""
    settings.testcase_root.mkdir(parents=True, exist_ok=True)
    return settings.testcase_root


def _safe_name(name: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-._" else "_" for ch in name) or "unknown"


def get_problem_dir(problem_key: str) -> Path:
    root = ensure_root()
    problem_dir = root / _safe_name(problem_key)
    problem_dir.mkdir(parents=True, exist_ok=True)
    return problem_dir


def build_case_paths(problem_key: str, case_no: int) -> Tuple[Path, Path]:
    """返回当前用例 in/out 文件绝对路径."""
    base_dir = get_problem_dir(problem_key)
    return base_dir / f"{case_no}.in", base_dir / f"{case_no}.out"


def _write_upload_to_file(upload: UploadFile, target: Path) -> Tuple[int, str]:
    """将上传文件流式写入并返回 (大小, sha256)."""
    hasher = hashlib.sha256()
    size = 0
    with target.open("wb") as f:
        while True:
            chunk = upload.file.read(CHUNK_SIZE)
            if not chunk:
                break
            size += len(chunk)
            hasher.update(chunk)
            f.write(chunk)
    return size, hasher.hexdigest()


def resolve_path(path_str: str) -> Path:
    """将存储的相对路径解析为绝对路径."""
    path = Path(path_str)
    if not path.is_absolute():
        path = settings.testcase_root / path
    return path


def save_single_testcase(
    problem_id: int,
    case_no: int,
    input_file: UploadFile,
    output_file: UploadFile,
    problem_slug: Optional[str] = None,
) -> Dict[str, object]:
    """保存单个测试点文件，返回元数据."""
    problem_key = problem_slug or str(problem_id)
    in_path, out_path = build_case_paths(problem_key, case_no)
    try:
        in_size, in_sha = _write_upload_to_file(input_file, in_path)
        out_size, out_sha = _write_upload_to_file(output_file, out_path)
    except Exception as exc:  # noqa: BLE001
        logger.error("写入测试数据失败，清理文件: %s", exc, exc_info=True)
        safe_delete_files([in_path, out_path])
        raise HTTPException(status_code=500, detail="保存测试数据失败")
    return {
        "case_no": case_no,
        "in_path": str(in_path.relative_to(settings.testcase_root)),
        "out_path": str(out_path.relative_to(settings.testcase_root)),
        "in_size_bytes": in_size,
        "out_size_bytes": out_size,
        "in_sha256": in_sha,
        "out_sha256": out_sha,
    }


def replace_testcase_files(
    testcase,
    new_case_no: Optional[int],
    input_file: Optional[UploadFile],
    output_file: Optional[UploadFile],
    problem_slug: Optional[str],
) -> Dict[str, object]:
    """替换或重命名测试点文件，返回最新元数据."""
    case_no = new_case_no or testcase.case_no
    problem_key = problem_slug or str(testcase.problem_id)
    in_path, out_path = build_case_paths(problem_key, case_no)

    # 若只改 case_no，重命名原文件
    if new_case_no and not input_file and testcase.in_path:
        old_in = resolve_path(testcase.in_path)
        if old_in.exists():
            in_path.parent.mkdir(parents=True, exist_ok=True)
            old_in.rename(in_path)
    if new_case_no and not output_file and testcase.out_path:
        old_out = resolve_path(testcase.out_path)
        if old_out.exists():
            out_path.parent.mkdir(parents=True, exist_ok=True)
            old_out.rename(out_path)

    if input_file:
        safe_delete_files([in_path])
        _write_upload_to_file(input_file, in_path)
    if output_file:
        safe_delete_files([out_path])
        _write_upload_to_file(output_file, out_path)

    in_size = in_path.stat().st_size if in_path.exists() else None
    out_size = out_path.stat().st_size if out_path.exists() else None
    in_sha = _file_sha256(in_path) if in_path.exists() else None
    out_sha = _file_sha256(out_path) if out_path.exists() else None
    return {
        "case_no": case_no,
        "in_path": str(in_path.relative_to(settings.testcase_root)) if in_path.exists() else testcase.in_path,
        "out_path": str(out_path.relative_to(settings.testcase_root)) if out_path.exists() else testcase.out_path,
        "in_size_bytes": in_size,
        "out_size_bytes": out_size,
        "in_sha256": in_sha,
        "out_sha256": out_sha,
    }


def safe_delete_files(paths: Iterable[Path]) -> None:
    for p in paths:
        try:
            p.unlink(missing_ok=True)
        except Exception as exc:  # noqa: BLE001
            logger.warning("删除文件失败 %s: %s", p, exc)


def _validate_zip_entry(name: str) -> None:
    if ".." in name or name.startswith("/") or name.startswith("\\"):
        raise HTTPException(status_code=400, detail="ZIP 中存在非法路径")


def _iter_valid_members(zf: zipfile.ZipFile) -> Iterable[zipfile.ZipInfo]:
    total_uncompressed = 0
    for info in zf.infolist():
        _validate_zip_entry(info.filename)
        total_uncompressed += info.file_size
        if total_uncompressed > settings.max_zip_extract_bytes:
            raise HTTPException(status_code=400, detail="ZIP 解压大小超限")
        if info.is_dir():
            continue
        yield info


def import_zip_cases(
    problem_id: int,
    zip_file: UploadFile,
    strategy: str = "overwrite",
    problem_slug: Optional[str] = None,
) -> Dict[str, object]:
    """导入 zip 中的 1.in/1.out 格式测试点."""
    problem_key = problem_slug or str(problem_id)
    get_problem_dir(problem_key)
    success = 0
    failed: List[dict] = []
    seen_cases: set[int] = set()
    imported: List[dict] = []
    try:
        with zipfile.ZipFile(zip_file.file) as zf:
            entries = list(_iter_valid_members(zf))
            grouped: Dict[int, dict] = {}
            for info in entries:
                name = Path(info.filename).name
                if not name:
                    continue
                stem = name.split(".")[0]
                try:
                    case_no = int(stem)
                except ValueError:
                    continue
                suffix = Path(name).suffix.lower()
                if suffix not in [".in", ".out"]:
                    continue
                meta = grouped.setdefault(case_no, {})
                meta[suffix] = info
            for case_no, meta in grouped.items():
                if ".in" not in meta or ".out" not in meta:
                    failed.append({"case_no": case_no, "reason": "缺少成对的 in/out"})
                    continue
                if case_no in seen_cases:
                    failed.append({"case_no": case_no, "reason": "重复 case_no"})
                    continue
                seen_cases.add(case_no)
                in_target, out_target = build_case_paths(problem_key, case_no)
                if strategy == "skip" and in_target.exists() and out_target.exists():
                    continue
                try:
                    with zf.open(meta[".in"]) as src:
                        in_size, in_sha = _write_stream_to_file(src, in_target)
                    with zf.open(meta[".out"]) as src:
                        out_size, out_sha = _write_stream_to_file(src, out_target)
                except HTTPException as exc:
                    failed.append({"case_no": case_no, "reason": exc.detail})
                    continue
                except Exception as exc:  # noqa: BLE001
                    logger.error("解压测试点失败: %s", exc, exc_info=True)
                    failed.append({"case_no": case_no, "reason": "写入失败"})
                    safe_delete_files([in_target, out_target])
                    continue
                success += 1
                imported.append(
                    {
                        "case_no": case_no,
                        "in_path": str(in_target.relative_to(settings.testcase_root)),
                        "out_path": str(out_target.relative_to(settings.testcase_root)),
                        "in_size_bytes": in_size,
                        "out_size_bytes": out_size,
                        "in_sha256": in_sha,
                        "out_sha256": out_sha,
                    }
                )
    except HTTPException:
        raise
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="无效的 ZIP 文件")
    except Exception as exc:  # noqa: BLE001
        logger.error("处理 ZIP 失败: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="导入 ZIP 失败")
    finally:
        try:
            zip_file.file.seek(0)
        except Exception:
            pass
    return {"success": success, "failed": failed, "items": imported}


def _write_stream_to_file(src, target: Path) -> Tuple[int, str]:
    """从 zip 流写文件并返回 (大小, sha256)."""
    hasher = hashlib.sha256()
    size = 0
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("wb") as f:
        while True:
            chunk = src.read(CHUNK_SIZE)
            if not chunk:
                break
            size += len(chunk)
            hasher.update(chunk)
            f.write(chunk)
    return size, hasher.hexdigest()


def _file_sha256(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    hasher = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(CHUNK_SIZE), b""):
            hasher.update(chunk)
    return hasher.hexdigest()
