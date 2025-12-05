from __future__ import annotations

from datetime import datetime
from typing import List

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, relationship

from app.models.base import Base
import enum


class Difficulty(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class Problem(Base):
    __tablename__ = "problems"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(128), nullable=False)
    difficulty = Column(Enum(Difficulty), default=Difficulty.EASY, nullable=False)
    tags = Column(String(256), default="", nullable=False)
    content = Column(Text, nullable=False)
    input_description = Column(Text, default="", nullable=False)
    output_description = Column(Text, default="", nullable=False)
    constraints = Column(Text, default="", nullable=False)
    is_spj = Column(Boolean, default=False, nullable=False)
    spj_code = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    testcases: Mapped[List["TestCase"]] = relationship(
        "TestCase", back_populates="problem", cascade="all, delete-orphan"
    )
    submissions: Mapped[List["Submission"]] = relationship(
        "Submission", back_populates="problem", cascade="all, delete-orphan"
    )
