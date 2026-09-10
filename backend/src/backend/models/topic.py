from sqlalchemy import Column, String, ForeignKey, Enum, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from src.backend.models.base import BaseModel
from src.backend.enums.status import Status


class Topic(BaseModel):
    __tablename__ = "topics"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String, nullable=False)
    status = Column(
        Enum(Status, values_callable=lambda e: [member.value for member in e]),
        nullable=False,
        default=Status.PENDING.value
    )
    user_summary = Column(Text, nullable=False)
    learning_time_seconds = Column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="topics")
    chapters = relationship(
        "Chapter",
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="Chapter.sequence",
    )
    chats = relationship(
        "AgentChat",
        back_populates="topic",
        cascade="all, delete-orphan",
    )