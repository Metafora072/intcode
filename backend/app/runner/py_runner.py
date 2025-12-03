from pathlib import Path
from typing import List, Tuple


def prepare_script(code: str, workdir: Path) -> Tuple[List[str] | None, str | None]:
    """准备 Python 脚本."""
    script_path = workdir / "main.py"
    script_path.write_text(code)
    return ["python3", str(script_path)], None
