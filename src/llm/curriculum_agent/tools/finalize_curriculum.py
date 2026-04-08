import logging
from uuid import UUID
from src.backend.models.topic import Topic
from src.backend.db.database import SessionLocal
from src.llm.agent_core.args_schema import ArgsSchema as Args
from src.llm.agent_core.tool import Tool
from src.backend.enums.status import Status

logger = logging.getLogger(__name__)

class FinalizeCurriculumArgs:
    args = [
        ("topic_id", Args(type=str, description="The UUID of the topic to finalize")),
        ("confirmation", Args(type=bool, description="Set to true to confirm finalization")),
    ]

def make_finalize_curriculum_tool(topic_id_fixed: str):
    def finalize_curriculum_tool(topic_id: str, confirmation: bool):
        if not confirmation:
            return {"status": "error", "message": "Finalization not confirmed."}
        
        db = SessionLocal()
        try:
            topic_uuid = None
            try:
                topic_uuid = UUID(topic_id_fixed)
            except (ValueError, TypeError):
                # If topic_id is a placeholder, try to find it in the DB (agent should have updated it by now, but just in case)
                # Actually, if the agent updated its self.topic_id, this shouldn't happen.
                # But we'll try to find any pending topic for the user if it's a new journey.
                topic = db.query(Topic).filter(Topic.status == Status.PENDING.value).order_by(Topic.created_at.desc()).first()
                if topic:
                    topic_uuid = topic.id
            
            if not topic_uuid:
                 return {"status": "error", "message": "Topic not found or invalid ID."}

            topic = db.query(Topic).filter(Topic.id == topic_uuid).first()
            if not topic:
                return {"status": "error", "message": "Topic not found."}
            
            topic.status = Status.COMPLETED.value
            
            # Update workflow status
            from src.backend.models.workflow_status import WorkflowStatus
            from src.backend.enums.workflow_stage import WorkflowStage
            
            ws = db.query(WorkflowStatus).filter(
                WorkflowStatus.topic_id == topic_uuid,
                WorkflowStatus.stage == WorkflowStage.CURRICULUM
            ).first()
            if not ws:
                ws = WorkflowStatus(topic_id=topic_uuid, stage=WorkflowStage.CURRICULUM)
                db.add(ws)
            
            # Use Enum member for safety
            ws.status = Status.COMPLETED
            
            db.commit()
            logger.info(f"Curriculum finalized for topic {topic_id}. Workflow status updated to COMPLETED.")
            return {"status": "success", "message": "Curriculum finalized! Happy learning journey! You can now proceed to the Planning stage."}
        except Exception as e:
            db.rollback()
            return {"status": "error", "reason": str(e)}
        finally:
            db.close()

    return Tool(
        func=finalize_curriculum_tool,
        description="Finalize the curriculum generation process. Call this ONLY when the user approves the curriculum structure.",
        args_schema=FinalizeCurriculumArgs,
    )
