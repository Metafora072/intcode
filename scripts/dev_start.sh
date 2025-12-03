#!/usr/bin/env bash
set -e

# 后端
cd "$(dirname "$0")/.." || exit 1
if [ ! -d "backend/.venv" ]; then
  python3 -m venv backend/.venv
fi
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload &
BACK_PID=$!

# 前端
cd frontend
npm install
npm run dev -- --host

kill $BACK_PID
