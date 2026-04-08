from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from src.backend.enums.workflow_stage import WorkflowStage
from src.backend.enums.status import Status


class TopicProgress(BaseModel):
    topic_id: UUID
    title: str
    overall_status: Status
    current_stage: Optional[WorkflowStage]
    completed_chapters: int
    total_chapters: int
    progress_percentage: float
    last_updated: datetime


class DashboardData(BaseModel):
    user_name: str
    courses: List[TopicProgress]
