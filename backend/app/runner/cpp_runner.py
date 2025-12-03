import subprocess
from pathlib import Path
from typing import List, Tuple

from app.config import settings


def compile_code(code: str, workdir: Path) -> Tuple[List[str] | None, str | None]:
    """编译 C++17 代码."""
    source_path = workdir / "Main.cpp"
    binary_path = workdir / "main.out"
    source_path.write_text(code)
    try:
        result = subprocess.run(
            ["g++", "-std=c++17", "-O2", "-pipe", str(source_path), "-o", str(binary_path)],
            capture_output=True,
            text=True,
            timeout=settings.compile_timeout,
        )
    except subprocess.TimeoutExpired:
        return None, "编译超时"
    if result.returncode != 0:
        return None, result.stderr
    return [str(binary_path)], None
