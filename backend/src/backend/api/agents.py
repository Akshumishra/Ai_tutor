import asyncio
import json
from uuid import UUID
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.backend.db.database import SessionLocal
from src.backend.models.topic import Topic
from src.backend.models.chapter import Chapter
from src.backend.models.chat_history import AgentChat
from src.backend.models.workflow_status import WorkflowStatus
from src.backend.enums.workflow_stage import WorkflowStage
from src.backend.enums.status import Status
from src.backend.enums.agent_type import AgentType
from src.backend.schemas.agent_schemas import CurriculumRequest, TeacherRequest, PlannerRequest
from src.backend.api.stream_manager import stream_manager
from src.llm.main import run_planner_agent, arun_curriculum_agent, arun_teacher_agent

router = APIRouter(prefix="/agents", tags=["Agents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def save_chat_message(db: Session, topic_id: str, role: str, content: str, agent_type: AgentType, user_id: str = None, status: str = "completed", message_id: UUID = None, chapter_id: str = None):
    try:
        topic_uuid = UUID(topic_id)
        user_uuid = UUID(user_id) if user_id else None
        chapter_uuid = UUID(chapter_id) if chapter_id else None
        topic = db.query(Topic).filter(Topic.id == topic_uuid).first()
        if not topic and agent_type == AgentType.CURRICULUM and user_uuid:
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
            
            initial_chat = AgentChat(
                topic_id=topic_uuid,
                user_id=user_uuid,
                role="assistant",
                content="I am the Curriculum Agent. Tell me your subject and goals, and I will generate a course structure for you.",
                agent_type=AgentType.CURRICULUM,
                status="completed"
            )
            db.add(initial_chat)
            db.commit()

        if not topic:
             print(f"Skipping chat save: Topic {topic_id} not found and cannot be created.")
             return None

        if message_id:
            chat = db.query(AgentChat).filter(AgentChat.id == message_id).first()
            if chat:
                chat.content = content
                chat.status = status
                db.commit()
                return chat

        chat = AgentChat(
            topic_id=topic_uuid,
            chapter_id=chapter_uuid,
            user_id=user_uuid,
            role=role,
            content=content,
            agent_type=agent_type,
            status=status
        )
        db.add(chat)
        db.commit()
        db.refresh(chat)
        return chat
    except Exception as e:
        print(f"Error saving chat: {e}")
        db.rollback()
        return None

def sync_workflow_status(db: Session, topic_id: str, stage: WorkflowStage, status: Status, error: str = None):
    try:
        topic_uuid = UUID(topic_id)
        stage_val  = stage.value  if hasattr(stage,  'value') else stage
        status_val = status.value if hasattr(status, 'value') else status

        ws = db.query(WorkflowStatus).filter(
            WorkflowStatus.topic_id == topic_uuid,
            WorkflowStatus.stage    == stage_val,
        ).first()
        
        if not ws:
            ws = WorkflowStatus(topic_id=topic_uuid, stage=stage_val)
            db.add(ws)
        
        ws.status = status_val
        if error:
            ws.last_error = error
        db.commit()
    except Exception as e:
        print(f"Error syncing workflow status: {e}")
        db.rollback()

@router.get("/chat-history")
async def get_chat_history(topic_id: str, agent_type: AgentType = None, chapter_id: str = None, db: Session = Depends(get_db)):
    try:
        topic_uuid = UUID(topic_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid topic_id format")

    query = db.query(AgentChat).filter(AgentChat.topic_id == topic_uuid)
    if agent_type:
        query = query.filter(AgentChat.agent_type == agent_type)
    if chapter_id:
        try:
            chapter_uuid = UUID(chapter_id)
            query = query.filter(AgentChat.chapter_id == chapter_uuid)
        except ValueError:
            pass

    chats = query.order_by(AgentChat.created_at.asc()).all()
    return [{"id": str(c.id), "role": c.role, "text": c.content, "status": c.status, "chapter_id": str(c.chapter_id) if c.chapter_id else None} for c in chats]

async def _stream_events(message_id: str, request: Request):
    queue = asyncio.Queue()
    if message_id not in stream_manager.clients:
        stream_manager.clients[message_id] = set()
    stream_manager.clients[message_id].add(queue)

    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1.0)
                if event is None:
                    break
                yield event
            except asyncio.TimeoutError:
                continue
    finally:
        if message_id in stream_manager.clients:
            stream_manager.clients[message_id].discard(queue)

@router.get("/reconnect/{message_id}")
async def reconnect_stream(message_id: str, request: Request, db: Session = Depends(get_db)):
    try:
        msg_uuid = UUID(message_id)
        chat = db.query(AgentChat).filter(AgentChat.id == msg_uuid).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Message not found")
        
        if chat.status != "generating" and stream_manager.is_done(message_id):
            return StreamingResponse(iter([]), media_type="text/event-stream")
            
        async def _reconnect_generator():
            if message_id in stream_manager.buffers:
                for event in stream_manager.buffers[message_id]:
                    yield event

            if not stream_manager.is_done(message_id):
                async for event in _stream_events(message_id, request):
                    yield event

        return StreamingResponse(_reconnect_generator(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


async def _background_curriculum(
    message_id: str, req: CurriculumRequest
):
    db = SessionLocal()
    full_assistant_text = ""
    current_topic_id = req.topic_id
    try:
        async for event in arun_curriculum_agent(
            user_id=req.user_id,
            topic_id=req.topic_id,
            chat_history=req.chat_history,
            user_input=req.user_input,
        ):
            if isinstance(event, dict):
                if event.get("type") == "tool_call" and event.get("data", {}).get("output"):
                    try:
                        output = json.loads(event["data"]["output"])
                        if output.get("topic_id"):
                            current_topic_id = output["topic_id"]
                            if current_topic_id != req.topic_id:
                                save_chat_message(db, current_topic_id, "user", req.user_input, AgentType.CURRICULUM, req.user_id)
                    except: pass
                
                if event.get("type") == "text":
                    full_assistant_text += event.get("data", "")
                
                event_str = f"data: {json.dumps(event)}\n\n"
            else:
                event_str = f"data: {event}\n\n"
            
            await stream_manager.push_event(message_id, event_str)

        try:
            UUID(current_topic_id)
            chat = db.query(AgentChat).filter(AgentChat.id == UUID(message_id)).first()
            if chat:
                chat.content = full_assistant_text
                chat.status = "completed"
                if current_topic_id != req.topic_id:
                    chat.topic_id = UUID(current_topic_id)
                db.commit()
        except:
            pass
    except Exception as e:
        error_data = json.dumps({"error": str(e)})
        event_str = f"data: {error_data}\n\n"
        await stream_manager.push_event(message_id, event_str)
        chat = db.query(AgentChat).filter(AgentChat.id == UUID(message_id)).first()
        if chat:
            chat.status = "failed"
            db.commit()
    finally:
        await stream_manager.finish_stream(message_id)
        db.close()

@router.post("/curriculum")
async def curriculum_endpoint(req: CurriculumRequest, request: Request, db: Session = Depends(get_db)):
    try:
        save_chat_message(db, req.topic_id, "user", req.user_input, AgentType.CURRICULUM, req.user_id)
        sync_workflow_status(db, req.topic_id, WorkflowStage.CURRICULUM, Status.IN_PROGRESS)
    except:
        pass

    ast_msg = save_chat_message(db, req.topic_id, "assistant", "", AgentType.CURRICULUM, req.user_id, status="generating")
    if not ast_msg:
        raise HTTPException(status_code=500, detail="Could not initialize assistant message.")
    message_id = str(ast_msg.id)
    
    stream_manager.initialize_stream(message_id)
    asyncio.create_task(_background_curriculum(message_id, req))

    async def _start_stream():
        yield f"data: {json.dumps({'type': 'init', 'message_id': message_id})}\n\n"
        async for event in _stream_events(message_id, request):
            yield event

    return StreamingResponse(_start_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})

async def _background_teacher(message_id: str, topic_id: str, req: TeacherRequest):
    db = SessionLocal()
    full_assistant_text = ""
    try:
        async for event in arun_teacher_agent(
            chapter_id=req.chapter_id,
            chat_history=req.chat_history,
            user_message=req.user_message,
        ):
            if isinstance(event, dict):
                if event.get("type") == "text":
                    full_assistant_text += event.get("data", "")
                event_str = f"data: {json.dumps(event)}\n\n"
            else:
                event_str = f"data: {event}\n\n"
            
            await stream_manager.push_event(message_id, event_str)

        chat = db.query(AgentChat).filter(AgentChat.id == UUID(message_id)).first()
        if chat:
            chat.content = full_assistant_text
            chat.status = "completed"
            db.commit()
    except Exception as e:
        error_data = json.dumps({"error": str(e)})
        event_str = f"data: {error_data}\n\n"
        await stream_manager.push_event(message_id, event_str)
        chat = db.query(AgentChat).filter(AgentChat.id == UUID(message_id)).first()
        if chat:
            chat.status = "failed"
            db.commit()
    finally:
        await stream_manager.finish_stream(message_id)
        db.close()

@router.post("/teacher")
async def teacher_endpoint(req: TeacherRequest, request: Request, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == UUID(req.chapter_id)).first()
    if not chapter:
         raise HTTPException(status_code=404, detail="Chapter not found")
    
    topic = db.query(Topic).filter(Topic.id == chapter.topic_id).first()
    if not topic or topic.status != Status.COMPLETED:
        raise HTTPException(
            status_code=403, 
            detail="Curriculum not finalized. Please finish curriculum design before teaching."
        )

    save_chat_message(db, str(topic.id), "user", req.user_message, AgentType.TEACHER, req.user_id, chapter_id=req.chapter_id)
    sync_workflow_status(db, str(topic.id), WorkflowStage.TEACHING, Status.IN_PROGRESS)

    ast_msg = save_chat_message(db, str(topic.id), "assistant", "", AgentType.TEACHER, req.user_id, status="generating", chapter_id=req.chapter_id)
    message_id = str(ast_msg.id)
    
    stream_manager.initialize_stream(message_id)
    asyncio.create_task(_background_teacher(message_id, str(topic.id), req))

    async def _start_stream():
        yield f"data: {json.dumps({'type': 'init', 'message_id': message_id})}\n\n"
        async for event in _stream_events(message_id, request):
            yield event

    return StreamingResponse(_start_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})

@router.post("/planner", status_code=202)
async def planner_endpoint(req: PlannerRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == UUID(req.topic_id)).first()
    if not topic or topic.status != Status.COMPLETED:
        raise HTTPException(
            status_code=403, 
            detail="Curriculum not finalized. Please finish curriculum design before planning."
        )

    save_chat_message(db, req.topic_id, "user", "Generate study plan", AgentType.PLANNER, req.user_id)
    sync_workflow_status(db, req.topic_id, WorkflowStage.PLANNING, Status.IN_PROGRESS)
    
    background_tasks.add_task(run_planner_agent, req.topic_id)
    
    msg = "Planner agent started in the background."
    save_chat_message(db, req.topic_id, "assistant", msg, AgentType.PLANNER, req.user_id)
    
    return {
        "status": "started",
        "message": msg
    }
