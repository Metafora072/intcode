from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import Base


class UserCode(Base):
    __tablename__ = "user_codes"
    __allow_unmapped__ = True
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uq_user_code"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(32), nullable=False, default="cpp17")
    code = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="user_codes")
    problem = relationship("Problem", back_populates="user_codes")
