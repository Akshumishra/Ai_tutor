from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from src.backend.db.database import SessionLocal
from src.backend.models.topic import Topic
from src.backend.models.chapter import Chapter
from src.backend.enums.status import Status

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/courses")
async def get_user_courses(user_id: str, db: Session = Depends(get_db)):
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    topics = db.query(Topic).filter(Topic.user_id == user_uuid).all()
    
    courses = []
    for topic in topics:
        chapters = db.query(Chapter).filter(Chapter.topic_id == topic.id).all()
        total_chapters = len(chapters)
        completed_chapters = sum(1 for c in chapters if c.status == Status.COMPLETED.value)
        
        progress = 0
        if total_chapters > 0:
            progress = int((completed_chapters / total_chapters) * 100)
        
        courses.append({
            "id": str(topic.id),
            "title": topic.title,
            "status": topic.status,
            "progress": progress,
            "chapter_count": total_chapters,
            "completed_count": completed_chapters
        })
        
    return courses

@router.get("/curriculum/{topic_id}")
async def get_curriculum(topic_id: str, db: Session = Depends(get_db)):
    try:
        topic_uuid = UUID(topic_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid topic_id format")

    chapters = db.query(Chapter).filter(Chapter.topic_id == topic_uuid).order_by(Chapter.sequence).all()
    
    result = []
    for ch in chapters:
        # Simple parsing of outline into a list of topics
        # Assuming AI generated outline as a list of bullet points or numbered lines
        lines = ch.outline.split('\n')
        topics = []
        for line in lines:
            trimmed = line.strip()
            if not trimmed: continue
            # Handle bullet points or numbered lists
            clean_line = trimmed.lstrip("- *0123456789. ")
            if clean_line:
                topics.append(clean_line)
             
        result.append({
            "module": ch.title,
            "topics": topics
        })
    return result
