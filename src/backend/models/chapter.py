from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship

from src.backend.enums.status import Status
from src.backend.models.base import BaseModel


class Chapter(BaseModel):
    __tablename__ = "chapters"

    topic_id = Column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(255), nullable=False)
    sequence = Column(Integer, nullable=False)
    status = Column(Enum(Status), nullable=False)
    outline = Column(Text, nullable=False)

    topic = relationship("Topic", back_populates="chapters")
    plans = relationship(
        "ChapterPlan", back_populates="chapter", cascade="all, delete-orphan"
    )
