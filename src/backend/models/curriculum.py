from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship

from src.backend.models.base import BaseModel


class Curriculum(BaseModel):
    __tablename__ = "curriculums"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    user_summary = Column(Text, nullable=False)
    plan = Column(JSON, nullable=False)

    user = relationship("User", back_populates="curriculums")

    chapters = relationship(
        "Chapter",
        back_populates="curriculum",
        cascade="all, delete-orphan",
        order_by="Chapter.sequence_order",
    )
