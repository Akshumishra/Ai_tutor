from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from src.backend.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    reset_otp = Column(String, nullable=True)
    reset_otp_expires_at = Column(DateTime, nullable=True)

    topics = relationship("Topic", back_populates="user", cascade="all, delete-orphan")
