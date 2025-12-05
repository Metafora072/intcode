from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional, Tuple

WRAPPER = """import importlib.util, json, sys
from pathlib import Path

def main():
    target = Path(sys.argv[1])
    spec = importlib.util.spec_from_file_location("checker", target)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if not hasattr(mod, "check"):
        sys.exit(2)
    payload = json.loads(sys.stdin.read())
    input_str = payload.get("input", "")
    user_output = payload.get("user_output", "")
    try:
        ok = bool(mod.check(input_str, user_output))
        sys.exit(0 if ok else 1)
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(str(exc))
        sys.exit(2)

if __name__ == "__main__":
    main()
"""


def run_checker(spj_code: str, input_text: str, user_output: str, timeout: int = 2) -> Tuple[bool, Optional[str]]:
    """运行自定义判题脚本，返回 (是否通过, 错误信息)."""
    workdir = Path(tempfile.mkdtemp(prefix="spj_"))
    checker_path = workdir / "checker.py"
    wrapper_path = workdir / "runner.py"
    checker_path.write_text(spj_code, encoding="utf-8")
    wrapper_path.write_text(WRAPPER, encoding="utf-8")
    try:
        proc = subprocess.run(
          [sys.executable, str(wrapper_path), str(checker_path)],
          input=json.dumps({"input": input_text, "user_output": user_output}),
          text=True,
          capture_output=True,
          timeout=timeout,
        )
        if proc.returncode == 0:
            return True, None
        if proc.returncode == 1:
            return False, None
        return False, proc.stderr.strip() or "SPJ 运行错误"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
