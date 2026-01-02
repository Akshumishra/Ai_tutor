from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship

from src.backend.enums.status import Status
from src.backend.models.base import BaseModel


class Chapter(BaseModel):
    __tablename__ = "chapters"

    curriculum_id = Column(Integer, ForeignKey("curriculums.id", ondelete="CASCADE"))
    sequence_order = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    status = Column(Enum(Status), nullable=False)
    content = Column(Text, nullable=False)

    curriculum = relationship("Curriculum", back_populates="chapters")
