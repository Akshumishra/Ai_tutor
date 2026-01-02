from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from src.backend.models.base import BaseModel


class ChapterPlan(BaseModel):
    __tablename__ = "chapter_plans"

    chapter_id = Column(
        Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False
    )
    content = Column(Text, nullable=False)

    chapter = relationship("Chapter", back_populates="plans")
