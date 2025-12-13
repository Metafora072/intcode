from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, relationship

from app.models.base import Base


class TestCase(Base):
    __tablename__ = "testcases"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False, index=True)
    case_no = Column(Integer, default=1, nullable=False)
    in_path = Column(String(255), nullable=True)
    out_path = Column(String(255), nullable=True)
    in_size_bytes = Column(Integer, nullable=True)
    out_size_bytes = Column(Integer, nullable=True)
    in_sha256 = Column(String(64), nullable=True)
    out_sha256 = Column(String(64), nullable=True)
    score_weight = Column(Integer, nullable=True)
    is_sample = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # 兼容旧数据：不再使用 input_text/output_text 存储大字段，仅保留防止旧字段缺失
    input_text = Column(Text, nullable=True)
    output_text = Column(Text, nullable=True)

    problem: Mapped["Problem"] = relationship("Problem", back_populates="testcases")
