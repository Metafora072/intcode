from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False, index=True)
    language = Column(String(32), nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String(16), default="PENDING", nullable=False)
    score = Column(Integer, default=0)
    runtime_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    detail_json = Column(Text, nullable=True)

    problem = relationship("Problem", back_populates="submissions")
