"""从本地问题文件目录批量同步题目到后台管理接口。"""
import json
import os
from pathlib import Path

import requests


API_BASE = os.environ.get("INTCODE_API_BASE", "http://localhost:8000/api")
LOGIN_URL = f"{API_BASE}/auth/token"
SYNC_URL = f"{API_BASE}/admin/problems/sync"
PROBLEM_DIR = Path(__file__).resolve().parents[1] / "backend" / "data" / "problems"


def login(username: str = "admin", password: str = "admin") -> str:
    resp = requests.post(
        LOGIN_URL,
        data={
            "username": username,
            "password": password,
            "grant_type": "password",
        },
    )
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise RuntimeError("登录失败，未获得 access_token")
    return token


def sync_file(path: Path, token: str) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    headers = {"Authorization": f"Bearer {token}"}
    slug = data.get("slug", path.stem)
    resp = requests.post(SYNC_URL, json=data, headers=headers)
    if resp.status_code // 100 == 2:
        print(f"✅ [{slug}] 同步成功")
    else:
        print(f"❌ [{slug}] 同步失败: {resp.status_code} {resp.text}")


def main():
    if not PROBLEM_DIR.exists():
        raise FileNotFoundError(f"问题目录不存在: {PROBLEM_DIR}")

    token = login()
    files = sorted(PROBLEM_DIR.glob("*.json"))
    if not files:
        print(f"目录 {PROBLEM_DIR} 下未找到题目文件")
        return

    for f in files:
        sync_file(f, token)


if __name__ == "__main__":
    main()
