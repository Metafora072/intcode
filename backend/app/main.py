from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, problems, submissions
from app.models import base, problem, submission, testcase  # noqa: F401

app = FastAPI(title="intcode OJ")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    base.Base.metadata.create_all(bind=base.engine)


app.include_router(problems.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "intcode api running"}
