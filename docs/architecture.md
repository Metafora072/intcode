# 架构概览

## 技术栈
- 前端：React + TypeScript + Vite + Tailwind CSS + Monaco Editor。
- 后端：FastAPI + SQLAlchemy + SQLite（本地文件）。
- 评测：子进程编译/执行，基础沙箱（超时、输出长度限制），支持 `cpp17` / `python3`。

## 模块划分
- `app/api/`：REST 路由，按功能拆分 `problems`、`admin`、`submissions`。
- `app/models/`：ORM 模型 `Problem`、`TestCase`、`Submission`。
- `app/schemas/`：Pydantic 模型/返回体定义。
- `app/services/`：业务逻辑与编排。
  - `problem_service`：题目 CRUD、标签转换、序列化。
  - `judge_service`：评测流程（取用例 -> 编译/执行 -> 比对 -> 聚合 -> 记录提交）。
- `app/runner/`：语言适配层。
  - `cpp_runner`：写入临时 `.cpp` 并调用 `g++ -std=c++17` 编译。
  - `py_runner`：写入 `.py`，直接 `python3` 执行。
  - `sandbox`：统一的子进程运行封装，限制 timeout 与输出长度。
- `app/config.py`：使用 `pydantic-settings` 读取配置（数据库路径、workdir、超时、输出限制）。

## 数据流
1. 前端调用 `/api/problems`、`/api/problems/{id}` 获取题面与样例。
2. 用户在前端编辑代码，点击「运行样例」或「提交评测」，POST `/api/submissions`。
3. 后端 `judge_service`：
   - 读取对应用例（样例/全部）。
   - 调用 runner 编译或准备脚本，失败则返回 CE。
   - 对每个用例执行：超时判定、输出截断、比对期望值。
   - 聚合最先失败状态（AC/WA/RE/TLE），计算耗时。
   - 若为提交模式，写入 `Submission` 记录。
4. 结果返回前端，前端以卡片形式展示总结果与逐用例摘要。

## 数据模型
- Problem(id, slug, title, difficulty, tags, content, input_description, output_description, constraints, created_at, updated_at)
- TestCase(id, problem_id, input_text, output_text, is_sample)
- Submission(id, problem_id, language, code, status, score, runtime_ms, created_at, detail_json)

## 运行与存储
- SQLite 文件 `backend/intcode.db` 默认生成于 backend 目录。
- 评测临时目录 `backend/runs/`，每次请求创建子目录完成后清理。

## 可扩展点
- 增加语言 runner（Java/Go 等）并在 `judge_service._compile_code` 注册。
- 替换/升级沙箱策略（cgroup、nsjail 等）。
- 引入用户体系与权限校验。
- 使用 Alembic 维护数据库迁移。
