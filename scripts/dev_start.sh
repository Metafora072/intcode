#!/usr/bin/env bash
# 一键启动前后端（WSL2 本地环境）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> 准备 Python 虚拟环境"
if [ ! -d "backend/.venv" ]; then
  python3 -m venv backend/.venv
fi
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

echo "==> 初始化数据库（如已存在会跳过）"
PYTHONPATH=backend python scripts/init_db.py

echo "==> 启动后端: http://127.0.0.1:8000"
PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload &
BACK_PID=$!

echo "==> 准备前端依赖"
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi

echo "==> 启动前端: http://127.0.0.1:5173"
npm run dev -- --host --port 5173 &
FRONT_PID=$!

cleanup() {
  echo "==> 正在退出，停止进程..."
  kill $BACK_PID $FRONT_PID 2>/dev/null || true
}
trap cleanup EXIT

wait
