from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, relationship

from app.models.base import Base


class TestCase(Base):
    __tablename__ = "testcases"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False, index=True)
    input_text = Column(Text, nullable=False)
    output_text = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=False)

    problem: Mapped["Problem"] = relationship("Problem", back_populates="testcases")
