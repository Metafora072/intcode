from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api import admin, auth, problems, submissions, users
from app.models import base, problem, refresh_token, submission, testcase, user, user_code  # noqa: F401
from app.utils.logger import init_logging, logger

app = FastAPI(title="intcode OJ")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings.uploads_dir.mkdir(parents=True, exist_ok=True)
settings.testcase_root.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.uploads_dir)), name="uploads")


@app.on_event("startup")
def on_startup():
    init_logging()
    logger.info("启动服务，初始化数据库...")
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    base.Base.metadata.create_all(bind=base.engine)


app.include_router(problems.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "intcode api running"}
