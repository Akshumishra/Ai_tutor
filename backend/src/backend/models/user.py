from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from src.backend.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    topics = relationship("Topic", back_populates="user", cascade="all, delete-orphan")
