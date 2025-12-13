from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple

CHUNK_SIZE = 64 * 1024


def _read_preview(path: Path, limit: int = 200) -> str:
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        return f.read(limit)


def compare_files(expected_path: Path, actual_path: Path) -> Tuple[bool, Dict[str, object]]:
    """流式对比输出，返回 (是否一致, 摘要)."""
    mismatch_pos = None
    expected_preview = _read_preview(expected_path)
    output_preview = _read_preview(actual_path)
    with expected_path.open("rb") as f_exp, actual_path.open("rb") as f_out:
        offset = 0
        while True:
            b1 = f_exp.read(CHUNK_SIZE)
            b2 = f_out.read(CHUNK_SIZE)
            if not b1 and not b2:
                break
            if b1 != b2:
                mismatch_pos = offset
                break
            offset += len(b1)
    detail = {
        "expected_preview": expected_preview,
        "output_preview": output_preview,
        "mismatch_pos": mismatch_pos,
    }
    return mismatch_pos is None, detail
