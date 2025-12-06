FROM python:3.10-slim-bookworm

# 全局清空代理相关环境变量，防止构建期走宿主机代理
ENV HTTP_PROXY= \
    HTTPS_PROXY= \
    http_proxy= \
    https_proxy=

# 安装评测需要的编译工具，先清空宿主机可能传入的代理
RUN unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy && \
    DEBIAN_FRONTEND=noninteractive apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制依赖文件并安装，充分利用缓存
COPY requirements.txt .
RUN unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy && \
    PIP_DISABLE_PIP_VERSION_CHECK=1 pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

ENV INTCODE_DATABASE_URL=sqlite:////app/data/intcode.db \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
