from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from fastapi.responses import StreamingResponse
import json
from sqlalchemy.orm import Session
from uuid import UUID

from src.backend.db.database import SessionLocal
from src.backend.models.topic import Topic
from src.backend.models.chapter import Chapter
from src.backend.models.chat_history import AgentChat
from src.backend.models.workflow_status import WorkflowStatus
from src.backend.enums.workflow_stage import WorkflowStage
from src.backend.enums.status import Status
from src.backend.enums.agent_type import AgentType
from src.backend.schemas.agent_schemas import CurriculumRequest, TeacherRequest, PlannerRequest
from src.llm.main import run_curriculum_agent, run_teacher_agent, run_planner_agent

router = APIRouter(prefix="/agents", tags=["Agents"])

def save_chat_message(db: Session, topic_id: str, role: str, content: str, agent_type: AgentType, user_id: str = None):
    try:
        topic_uuid = UUID(topic_id)
        user_uuid = UUID(user_id) if user_id else None
        
        # Ensure topic exists to avoid ForeignKeyViolation (common for New Journeys)
        topic = db.query(Topic).filter(Topic.id == topic_uuid).first()
        if not topic and agent_type == AgentType.CURRICULUM and user_uuid:
            # Create placeholder topic
            placeholder = Topic(
                id=topic_uuid,
                user_id=user_uuid,
                title="New Journey",
                user_summary="Initial goal setting...",
                status=Status.PENDING.value
            )
            db.add(placeholder)
            db.commit()
            topic = placeholder

        if not topic:
             print(f"Skipping chat save: Topic {topic_id} not found and cannot be created.")
             return

        chat = AgentChat(
            topic_id=topic_uuid,
            user_id=user_uuid,
            role=role,
            content=content,
            agent_type=agent_type
        )
        db.add(chat)
        db.commit()
    except Exception as e:
        print(f"Error saving chat: {e}")
        db.rollback()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/chat-history")
async def get_chat_history(topic_id: str, agent_type: str, db: Session = Depends(get_db)):
    try:
        topic_uuid = UUID(topic_id)
        chats = db.query(AgentChat).filter(
            AgentChat.topic_id == topic_uuid,
            AgentChat.agent_type == agent_type
        ).order_by(AgentChat.created_at.asc()).all()
        return [{"role": c.role, "text": c.content} for c in chats]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def sync_workflow_status(db: Session, topic_id: str, stage: WorkflowStage, status: Status, error: str = None):
    try:
        topic_uuid = UUID(topic_id)
        ws = db.query(WorkflowStatus).filter(
            WorkflowStatus.topic_id == topic_uuid,
            WorkflowStatus.stage == stage
        ).first()
        
        if not ws:
            ws = WorkflowStatus(topic_id=topic_uuid, stage=stage)
            db.add(ws)
        
        ws.status = status
        if error:
            ws.last_error = error
        db.commit()
    except Exception as e:
        print(f"Error syncing workflow status: {e}")
        db.rollback()

@router.post("/curriculum")
async def curriculum_endpoint(req: CurriculumRequest):
    db = SessionLocal()
    # Save user message and update status
    topic_uuid = None
    try:
        topic_uuid = UUID(req.topic_id)
        save_chat_message(db, req.topic_id, "user", req.user_input, AgentType.CURRICULUM, req.user_id)
        sync_workflow_status(db, req.topic_id, WorkflowStage.CURRICULUM, Status.IN_PROGRESS)
    except:
        pass

    def event_stream():
        # ... (stays same)
        current_topic_id = req.topic_id
        full_assistant_text = ""
        try:
            for event in run_curriculum_agent(
                user_id=req.user_id,
                topic_id=req.topic_id,
                chat_history=req.chat_history,
                user_input=req.user_input,
            ):
                if isinstance(event, dict):
                    # Check for tool results that might contain the updated topic_id
                    if event.get("type") == "tool_call" and event.get("data", {}).get("output"):
                        try:
                            output = json.loads(event["data"]["output"])
                            if output.get("topic_id"):
                                current_topic_id = output["topic_id"]
                                # If we didn't save the user message yet (because of placeholder), save it now
                                if current_topic_id != req.topic_id:
                                     save_chat_message(db, current_topic_id, "user", req.user_input, AgentType.CURRICULUM, req.user_id)
                        except: pass
                    
                    if event.get("type") == "text":
                        full_assistant_text += event.get("data", "")
                    
                    yield f"data: {json.dumps(event)}\n\n"
                else:
                    yield f"data: {event}\n\n"
            
            # End of stream: Save assistant message
            if full_assistant_text:
                try:
                    UUID(current_topic_id)
                    save_chat_message(db, current_topic_id, "assistant", full_assistant_text, AgentType.CURRICULUM, req.user_id)
                except:
                    pass
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"
        finally:
            db.close()
            
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@router.post("/teacher")
async def teacher_endpoint(req: TeacherRequest, db: Session = Depends(get_db)):
    # Check if the topic associated with this chapter is completed
    chapter = db.query(Chapter).filter(Chapter.id == UUID(req.chapter_id)).first()
    if not chapter:
         raise HTTPException(status_code=404, detail="Chapter not found")
    
    topic = db.query(Topic).filter(Topic.id == chapter.topic_id).first()
    if not topic or topic.status != Status.COMPLETED.value:
        raise HTTPException(
            status_code=403, 
            detail="Curriculum not finalized. Please finish curriculum design before teaching."
        )

    def event_stream():
        full_assistant_text = ""
        try:
            # Save user message and update status
            save_chat_message(db, str(topic.id), "user", req.user_message, AgentType.TEACHER, req.user_id)
            sync_workflow_status(db, str(topic.id), WorkflowStage.TEACHING, Status.IN_PROGRESS)
            
            for event in run_teacher_agent(
                chapter_id=req.chapter_id,
                chat_history=req.chat_history,
                user_message=req.user_message,
            ):
                if isinstance(event, dict):
                    if event.get("type") == "text":
                        full_assistant_text += event.get("data", "")
                    yield f"data: {json.dumps(event)}\n\n"
                else:
                    yield f"data: {event}\n\n"
            
            # Save assistant message
            if full_assistant_text:
                save_chat_message(db, str(topic.id), "assistant", full_assistant_text, AgentType.TEACHER, req.user_id)
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"
            
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@router.post("/planner", status_code=202)
async def planner_endpoint(req: PlannerRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if the topic is completed
    topic = db.query(Topic).filter(Topic.id == UUID(req.topic_id)).first()
    if not topic or topic.status != Status.COMPLETED.value:
        raise HTTPException(
            status_code=403, 
            detail="Curriculum not finalized. Please finish curriculum design before planning."
        )

    # Save user trigger (simulated as message) and update status
    save_chat_message(db, req.topic_id, "user", "Generate study plan", AgentType.PLANNER, req.user_id)
    sync_workflow_status(db, req.topic_id, WorkflowStage.PLANNING, Status.IN_PROGRESS)
    
    background_tasks.add_task(run_planner_agent, req.topic_id)
    
    msg = "Planner agent started in the background."
    # Save assistant confirmation
    save_chat_message(db, req.topic_id, "assistant", msg, AgentType.PLANNER, req.user_id)
    
    return {
        "status": "started",
        "message": msg
    }
