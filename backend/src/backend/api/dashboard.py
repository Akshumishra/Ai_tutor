from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from typing import List
from sqlalchemy.sql import func
from pydantic import BaseModel

from src.backend.db.database import SessionLocal
from src.backend.models.topic import Topic
from src.backend.models.chapter import Chapter
from src.backend.enums.status import Status
from src.backend.models.workflow_status import WorkflowStatus
from src.backend.models.chapter_plan import ChapterPlan
from src.backend.enums.workflow_stage import WorkflowStage

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

class SyncChapterItem(BaseModel):
    module: str           # chapter title
    topics: List[str]     # list of topic strings

class SyncChaptersRequest(BaseModel):
    chapters: List[SyncChapterItem]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CreateTopicRequest(BaseModel):
    user_id: str

class TimeUpdateRequest(BaseModel):
    delta_seconds: int

@router.post("/topics/create")
async def create_topic(req: CreateTopicRequest, db: Session = Depends(get_db)):
    """
    Creates a blank Topic record in the DB and returns its UUID.
    The frontend calls this BEFORE starting the curriculum agent,
    so that every subsequent API call (workflow-status, chat-history, etc.)
    can find a real row — no more dummy/auto-generated IDs.
    """
    try:
        user_uuid = UUID(req.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    topic = Topic(
        user_id=user_uuid,
        title="New Journey",
        user_summary="",
        status=Status.PENDING.value,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return {"topic_id": str(topic.id)}

@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str, db: Session = Depends(get_db)):
    try:
        topic_uuid = UUID(topic_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid topic_id format")
    
    topic = db.query(Topic).filter(Topic.id == topic_uuid).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    topic.deleted_at = func.now()
    db.commit()
    
    return {"message": "Topic deleted successfully"}

@router.post("/topics/{topic_id}/time")
async def update_learning_time(topic_id: str, req: TimeUpdateRequest, db: Session = Depends(get_db)):
    try:
        topic_uuid = UUID(topic_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid topic_id format")
        
    topic = db.query(Topic).filter(Topic.id == topic_uuid).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    if req.delta_seconds > 0:
        topic.learning_time_seconds += req.delta_seconds
        db.commit()
        
    return {"learning_time_seconds": topic.learning_time_seconds}


@router.get("/courses")
async def get_user_courses(user_id: str, db: Session = Depends(get_db)):
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    topics = db.query(Topic).filter(Topic.user_id == user_uuid, Topic.deleted_at.is_(None)).all()
    
    courses = []
    for topic in topics:
        chapters = db.query(Chapter).filter(Chapter.topic_id == topic.id).all()
        total_chapters = len(chapters)
        completed_chapters = sum(1 for c in chapters if c.status == Status.COMPLETED or c.status == Status.COMPLETED.value)
        
        progress = 0
        if total_chapters > 0:
            progress = int((completed_chapters / total_chapters) * 100)
            
        if progress == 100 and total_chapters > 0:
            topic_status = "completed"
        elif total_chapters > 0:
            topic_status = "in_progress"
        else:
            topic_status = "pending"
        courses.append({
            "id": str(topic.id),
            "title": topic.title,
            "status": topic_status,
            "progress": progress,
            "chapter_count": total_chapters,
            "completed_count": completed_chapters,
            "learning_time_seconds": topic.learning_time_seconds
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
        lines = ch.outline.split('\n')
        topics = []
        for line in lines:
            trimmed = line.strip()
            if not trimmed: continue
            clean_line = trimmed.lstrip("- *0123456789. ")
            if clean_line:
                topics.append(clean_line)
             
        result.append({
            "module": ch.title,
            "topics": topics
        })
    return result

@router.get("/chapters/{topic_id}")
async def get_chapters(topic_id: str, db: Session = Depends(get_db)):
    try:
        topic_uuid = UUID(topic_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid topic_id format")

    chapters = db.query(Chapter).filter(Chapter.topic_id == topic_uuid).order_by(Chapter.sequence).all()
    result = []
    for c in chapters:
        plans = db.query(ChapterPlan).filter(ChapterPlan.chapter_id == c.id).all()
        content_completed = False
        if plans:
            in_progress = any(p.status.value != Status.COMPLETED.value if hasattr(p.status, 'value') else p.status != 'completed' for p in plans)
            content_completed = not in_progress
        
        result.append({
            "id": str(c.id),
            "title": c.title,
            "sequence": c.sequence,
            "status": c.status.value if hasattr(c.status, 'value') else c.status,
            "outline": c.outline,
            "content_completed": content_completed,
            "is_planned": len(plans) > 0,
            "plans": [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "sequence": p.sequence,
                    "status": p.status.value if hasattr(p.status, 'value') else p.status
                }
                for p in sorted(plans, key=lambda x: x.sequence)
            ]
        })
    return result

@router.get("/workflow-status/{topic_id}")
async def get_workflow_status(topic_id: str, db: Session = Depends(get_db)):
    try:
        topic_uuid = UUID(topic_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid topic_id format")

    records = db.query(WorkflowStatus).filter(WorkflowStatus.topic_id == topic_uuid).all()
    result = {}
    for r in records:
        stage_key = r.stage.value if hasattr(r.stage, 'value') else str(r.stage)
        status_val = r.status.value if hasattr(r.status, 'value') else str(r.status)
        result[stage_key] = status_val
    return result


@router.post("/curriculum/{topic_id}/sync-chapters")
async def sync_chapters_endpoint(topic_id: str, req: SyncChaptersRequest, db: Session = Depends(get_db)):
    """
    Saves chapters parsed from the frontend canvas into the DB.
    Called before finalizing so the planner always has chapters to work with.
    Chapters are upserted by sequence number — existing ones are updated, new ones are created.
    """
    try:
        topic_uuid = UUID(topic_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid topic_id format")

    topic = db.query(Topic).filter(Topic.id == topic_uuid).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    saved_count = 0
    for i, ch in enumerate(req.chapters):
        outline = "\n".join(f"- {t}" for t in ch.topics) if ch.topics else ch.module
        
        existing = db.query(Chapter).filter(
            Chapter.topic_id == topic_uuid,
            Chapter.sequence == i + 1
        ).first()
        
        if existing:
            existing.title = ch.module
            existing.outline = outline
        else:
            new_chapter = Chapter(
                id=uuid4(),
                topic_id=topic_uuid,
                title=ch.module,
                sequence=i + 1,
                status=Status.PENDING.value,
                outline=outline,
            )
            db.add(new_chapter)
        saved_count += 1

    db.commit()
    return {"status": "success", "chapters_saved": saved_count}


@router.post("/curriculum/{topic_id}/finalize")
async def finalize_curriculum_endpoint(topic_id: str, db: Session = Depends(get_db)):
    try:
        topic_uuid = UUID(topic_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid topic_id format")

    topic = db.query(Topic).filter(Topic.id == topic_uuid).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    topic.status = Status.COMPLETED.value
    ws = db.query(WorkflowStatus).filter(
        WorkflowStatus.topic_id == topic_uuid,
        WorkflowStatus.stage    == WorkflowStage.CURRICULUM.value,
    ).first()
    if not ws:
        ws = WorkflowStatus(topic_id=topic_uuid, stage=WorkflowStage.CURRICULUM.value)
        db.add(ws)
    
    ws.status = Status.COMPLETED.value
    db.commit()
    
    return {"status": "success"}
