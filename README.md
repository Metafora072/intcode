# intcode 本地算法练习平台

本项目在 WSL2/Ubuntu 环境下运行，提供题库、在线编辑、评测和题目管理的完整闭环。

> 默认管理员账号：`admin` / `admin`（运行 `scripts/init_db.py` 会自动创建，可登录后自行修改密码）

## 快速启动

```bash
# 1) 准备 Python 虚拟环境
cd intcode
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# 2) 初始化数据库与示例题目
PYTHONPATH=backend python scripts/init_db.py

# 3) 启动后端
uvicorn app.main:app --app-dir backend --reload --port 8000

# 4) 启动前端（新终端）
cd frontend
npm install
npm run dev -- --host --port 5173
# 打开 http://localhost:5173

# 一键启动前后端（包含依赖与初始化）
cd intcode
./scripts/dev_start.sh
```

## 目录结构

```
backend/            # FastAPI + SQLite 服务端
  app/
    api/            # REST 路由
    models/         # SQLAlchemy ORM 模型
    schemas/        # Pydantic 模型
    services/       # 业务逻辑（题目、评测）
    runner/         # 代码编译/运行及沙箱
    config.py       # 配置
frontend/           # React + TS + Vite + Tailwind 前端
scripts/            # 初始化/启动脚本
docs/               # 架构与 API 文档
```

## 功能摘要

- 题目列表、搜索与难度筛选。
- 题目详情：Markdown 题面 + 样例展示。
- 在线编辑器（Monaco）：支持 C++17 / Python 3 模板，运行样例与提交评测。
- 评测反馈：编译/运行错误提示、逐用例结果、耗时统计。
- 提交记录：登录后按用户查看个人提交，管理员可查看全部。
- 用户体系：注册/登录（JWT），管理员权限控制后台路由。
- 题目管理：创建题目、添加/管理测试用例（管理员）。

## 后端说明

- 框架：FastAPI + SQLAlchemy + SQLite。
- 路由前缀 `/api`，详见 `docs/api.md`。
- 评测流程：根据语言写入临时代码 -> 编译/执行 -> 限时与输出限制 -> 比对标准答案 -> 聚合结果。
- 支持语言：`cpp17`（g++ 需要已安装）、`python3`。
- 基础沙箱：子进程超时、输出长度限制、临时目录隔离。

## 前端说明

- 技术栈：React + TypeScript + Vite + Tailwind。
- 组件：Monaco Editor、React Router、Axios、React Markdown。
- 主要页面：题库、题目详情/编辑器、题目管理、提交记录。
- 开发代理：Vite 将 `/api` 代理到 `http://localhost:8000`。

## 脚本

- `scripts/init_db.py`：创建表并插入 Two Sum 示例题目与用例。
- `scripts/dev_start.sh`：示例一键启动脚本（含依赖安装），可按需使用。

## 文档

- `docs/architecture.md`：架构与模块说明。
- `docs/api.md`：接口列表与示例。

欢迎在此基础上扩展用户体系、更强沙箱或更多语言支持。
