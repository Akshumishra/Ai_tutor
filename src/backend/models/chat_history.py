from sqlalchemy import Column, String, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.backend.models.base import BaseModel
from src.backend.enums.agent_type import AgentType


class AgentChat(BaseModel):
    __tablename__ = "agent_chats"

    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    agent_type = Column(
        Enum(AgentType, values_callable=lambda e: [member.value for member in e]),
        nullable=False,
        index=True
    )
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)

    topic = relationship("Topic", back_populates="chats")
    user = relationship("User")
