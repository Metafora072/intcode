import subprocess
from typing import List, Tuple


def run_process(
    exec_cmd: List[str],
    input_text: str,
    timeout: int = 2,
    output_limit: int = 20000,
) -> Tuple[str, str, str | None]:
    """执行子进程，限制时间和输出."""
    try:
        proc = subprocess.Popen(
            exec_cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        out, err = proc.communicate(input=input_text, timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        return "TLE", "", "超时"
    except Exception as exc:  # noqa: BLE001
        return "RE", "", str(exc)

    if len(out) > output_limit:
        out = out[:output_limit]
        err = (err or "") + " 输出超出限制"

    if proc.returncode != 0:
        return "RE", out, err
    return "OK", out, err
