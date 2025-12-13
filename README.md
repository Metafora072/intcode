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
- 用户体系：注册/登录（JWT），管理员权限控制后台路由；access token + refresh token 自动续期与登出失效。
- 题目管理：创建题目、添加/管理测试用例（管理员）。
- 测试数据：测试点以 `{problem_id}/{case_no}.in/.out` 落盘，数据库仅存元信息，评测与判题均为流式读写。

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
- `scripts/migrate_testcases_to_files.py`：将旧版内联测试用例迁移为独立 .in/.out 文件并回写元数据。

## 认证与登录态

- Access Token：默认 60 分钟过期，可通过环境变量 `INTCODE_ACCESS_TOKEN_EXPIRE_MINUTES` 配置，JWT `sub`/`token_type=access`。
- Refresh Token：默认 14 天过期，可通过 `INTCODE_REFRESH_TOKEN_EXPIRE_DAYS` 配置；HttpOnly Cookie `refresh_token` 下发，默认 SameSite=Lax，`INTCODE_COOKIE_SECURE` 控制是否仅限 HTTPS。
- 服务端 `refresh_tokens` 表只保存 refresh token 的 SHA256 摘要，刷新会轮换：`/auth/refresh` 校验签名 + 摘要 + 过期 + revoked 状态，通过后生成新 access/refresh，旧 token 标记 revoked。
- 登出：`/auth/logout` 会清理 Cookie 并将当前 refresh token 标记失效。
- CORS/凭证：如前后端不同源，需设置 `INTCODE_CORS_ORIGINS`（逗号分隔）并保持 `allow_credentials=True`，前端 axios 已默认 `withCredentials: true`。

## 登录态验证建议

1. 将 `INTCODE_ACCESS_TOKEN_EXPIRE_MINUTES=1`，`INTCODE_REFRESH_TOKEN_EXPIRE_DAYS=1` 启动后端并登录。
2. 等待 access token 过期后继续调用需鉴权接口（如 `/api/users/me` 或提交代码），请求应自动刷新并返回 200。
3. 在浏览器开发者工具手动清理或等待 refresh token 过期后，再访问接口应被重定向至登录（页面提示“登录已过期，请重新登录”）。
4. 点击前端“退出登录”后再次访问接口，同样会触发登出逻辑且不再使用旧 refresh token。

## 测试数据存储与评测说明

- 环境变量：
  - `INTCODE_TESTCASE_ROOT`：测试数据根目录，默认 `backend/storage/testcases`。
  - `INTCODE_MAX_OUTPUT_BYTES`：单用例 stdout 允许的最大体积（默认 64MB），超过判定 OLE。
  - `INTCODE_MAX_ZIP_EXTRACT_BYTES`：ZIP 批量导入的解压上限（默认 1GB）。
- 文件组织：`{TESTCASE_ROOT}/{problem_id}/{case_no}.in/.out`，DB 只存路径/大小/hash/样例标记/权重。
- 导入：
  - 单点上传：`POST /admin/problems/{id}/testcases`（form-data，input_file/output_file，支持 case_no/score_weight/is_sample）。
  - ZIP 导入：`POST /admin/problems/{id}/testcases/import_zip`，支持 1.in/1.out…，默认覆盖同号。
  - 删除：`DELETE /admin/testcases/{testcase_id}` 同时清理文件。
- 评测：
  - 子进程 stdin 直接绑定 .in 文件，stdout 写入临时文件；超时/内存限制沿用原逻辑，输出超限判 OLE。
  - 判题使用流式字节对比（或 SPJ）；提供预览与 mismatch 位置摘要。
- 迁移：老库含 input_text/output_text 时运行 `PYTHONPATH=backend python3 scripts/migrate_testcases_to_files.py`，将文本写入文件并更新元数据。

## 大数据/性能验证建议

1. 设置短超时与适中限制启动后端：如 `INTCODE_MAX_OUTPUT_BYTES=67108864`。
2. 创建题目后通过 ZIP 上传 3 个大用例（1MB/50MB/200MB），提交能够逐点评测且服务内存稳定。
3. 模拟输出超限（程序死循环输出）应得到 OLE；删除用例后对应文件应被移除。

## 文档

- `docs/architecture.md`：架构与模块说明。
- `docs/api.md`：接口列表与示例。

欢迎在此基础上扩展用户体系、更强沙箱或更多语言支持。
