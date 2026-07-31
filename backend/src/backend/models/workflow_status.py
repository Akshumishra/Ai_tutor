from sqlalchemy import Column, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from src.backend.models.base import BaseModel
from src.backend.enums.workflow_stage import WorkflowStage
from src.backend.enums.status import Status


class WorkflowStatus(BaseModel):
    __tablename__ = "workflow_status"

    topic_id = Column(
        UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    stage = Column(
        Enum(WorkflowStage, values_callable=lambda e: [member.value for member in e]),
        nullable=False,
    )
    status = Column(
        Enum(Status, values_callable=lambda e: [member.value for member in e]),
        nullable=False,
        default=Status.PENDING.value,
    )
    last_error = Column(Text, nullable=True)

    topic = relationship("Topic", backref="workflow_status")
