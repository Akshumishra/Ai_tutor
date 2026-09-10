from pydantic import BaseModel, Field
from typing import List, Dict, Any

class CurriculumRequest(BaseModel):
    user_id: str
    topic_id: str
    chat_history: List[Dict[str, Any]] = Field(default_factory=list)
    user_input: str

class TeacherRequest(BaseModel):
    user_id: str
    chapter_id: str
    chat_history: List[Dict[str, Any]] = Field(default_factory=list)
    user_message: str

class PlannerRequest(BaseModel):
    user_id: str
    topic_id: str
