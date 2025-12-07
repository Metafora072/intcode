from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, relationship

from app.models.base import Base


class Submission(Base):
    __tablename__ = "submissions"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False, index=True)
    language = Column(String(32), nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String(16), default="PENDING", nullable=False)
    score = Column(Integer, default=0)
    runtime_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    detail_json = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    problem: Mapped["Problem"] = relationship("Problem", back_populates="submissions")
    user = relationship("User", back_populates="submissions")
