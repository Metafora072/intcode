from __future__ import annotations

import os
import resource
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple


def _resource_limiter(timeout: int, memory_limit_mb: int):
    """预执行钩子：限制 CPU 时间、内存、禁用 core dump."""

    def _set_limits():
        cpu_time = max(1, timeout + 1)
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_time, cpu_time))
        mem_bytes = memory_limit_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
        resource.setrlimit(resource.RLIMIT_DATA, (mem_bytes, mem_bytes))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        # 适当收缩文件句柄数量，降低滥用风险
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
        os.setsid()

    return _set_limits


def run_process(
    exec_cmd: List[str],
    input_text: str,
    timeout: int = 2,
    output_limit: int = 20000,
    memory_limit_mb: int = 256,
) -> Tuple[str, str, Optional[str]]:
    """执行子进程，限制时间、内存与输出."""
    try:
        proc = subprocess.Popen(
            exec_cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            preexec_fn=_resource_limiter(timeout, memory_limit_mb),
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


def run_process_stream(
    exec_cmd: List[str],
    input_path: Path,
    stdout_path: Path,
    timeout: int = 2,
    memory_limit_mb: int = 256,
) -> Tuple[str, Optional[str]]:
    """使用文件流执行子进程，stdout 重定向到文件."""
    try:
        with input_path.open("rb") as stdin_f, stdout_path.open("wb") as stdout_f:
            proc = subprocess.Popen(
                exec_cmd,
                stdin=stdin_f,
                stdout=stdout_f,
                stderr=subprocess.PIPE,
                preexec_fn=_resource_limiter(timeout, memory_limit_mb),
            )
            _, err = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        return "TLE", "超时"
    except Exception as exc:  # noqa: BLE001
        return "RE", str(exc)
    if proc.returncode != 0:
        return "RE", err.decode(errors="ignore") if err else "运行失败"
    return "OK", None
