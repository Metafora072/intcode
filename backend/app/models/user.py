from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship("Submission", back_populates="user")
