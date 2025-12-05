# API 速览

所有接口默认前缀 `/api`，返回 JSON。

## Authentication
- `POST /auth/register`
  - Body: `username`, `email`, `password`
- `POST /auth/token`
  - Form: `username`, `password`（`application/x-www-form-urlencoded`）
  - 返回：`{ access_token, token_type }`
- `GET /auth/users/me`（需要登录）
  - 返回：当前用户信息

## Problem
- `GET /problems`
  - Query：`keyword`(可选)、`difficulty` = EASY/MEDIUM/HARD、`limit`(默认20，<=100)、`offset`(默认0)
  - 返回：题目数组（含 tags、created_at、updated_at、testcases）
- `GET /problems/{id}`
  - 返回：题目详情与全部用例（包含样例标记）

## Admin（本地管理员使用）
> 需要管理员 Bearer Token
- `POST /admin/problems`
  - Body：`slug`, `title`, `difficulty`, `tags`(数组), `content`, `input_description`, `output_description`, `constraints`
  - 返回：创建后的题目
- `PUT /admin/problems/{id}`
  - Body：同上，字段可选
- `POST /admin/problems/{id}/testcases`
  - Body：`input_text`, `output_text`, `is_sample`

## Submissions
- `GET /submissions`
  - Query：`problem_id`(可选)，`limit` 默认 20
  - 返回：提交摘要列表
- `GET /submissions/{id}`
  - 返回：单次提交详情（源代码、用例结果）
- `POST /submissions`（需要登录）
  - Body：
    ```json
    {
      "problem_id": 1,
      "language": "cpp17" | "python3",
      "code": "<source>",
      "mode": "run_sample" | "submit"
    }
    ```
  - 返回：评测结果
    - `status`: AC/WA/RE/TLE/CE/ERROR
    - `compile_error` / `runtime_error`
    - `cases`: `[ { case_id, status, input_preview, expected_preview, output_preview, runtime_ms, error } ]`
    - `submission_id`: submit 模式下的记录 ID

## 示例状态码/字段
- WA：输出与标准答案不一致。
- RE：程序异常退出或 runtime error。
- TLE：子进程执行超时。
- CE：编译失败（仅 C++17）。
