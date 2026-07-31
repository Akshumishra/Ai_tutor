from src.llm.curriculum_agent.agent import CurriculumAgent
from src.llm.curriculum_agent.constant import CurriculumConstants

from src.llm.teacher_agent.agent import TeacherAgent
from src.llm.teacher_agent.constant import TeacherConstants

from src.llm.planner.agent import PlannerAgent
from src.llm.planner.constant import PlannerConstants


from src.llm.logger import setup_logging

setup_logging()
def run_curriculum_agent(user_id: str, topic_id: str, chat_history: list[dict], user_input):
    agent = CurriculumAgent(
        user_id=user_id,
        topic_id=topic_id,
        model=CurriculumConstants.MODEL,
        temperature=CurriculumConstants.TEMPERATURE,
        max_iteration=CurriculumConstants.MAX_ITERATION,
    )
    try:
        for event in agent.run(chat_history=chat_history,user_input=user_input):
            yield event
    except Exception as e:
        raise e


def run_teacher_agent(chapter_id, chat_history, user_message):
    agent = TeacherAgent(
        chapter_id=chapter_id,
        model=TeacherConstants.MODEL_NAME,
        max_iteration=TeacherConstants.MAX_ITERATION,
        temperature=TeacherConstants.MODEL_TEMPERATURE,
    )
    try:
        for event in agent.run(chat_history=chat_history, user_message=user_message):
            yield event
    except Exception as e:
        raise e
        

def run_planner_agent(topic_id: str):
    from src.backend.db.database import SessionLocal
    from src.backend.models.workflow_status import WorkflowStatus
    from src.backend.enums.workflow_stage import WorkflowStage
    from src.backend.enums.status import Status
    from uuid import UUID

    db = SessionLocal()
    try:
        plan = PlannerAgent(
                topic_id=topic_id,
                temperature=PlannerConstants.DEFAULT_TEMPERATURE,
                model=PlannerConstants.DEFAULT_MODEL,
            )
        plan.run()
        
        # Update status to COMPLETED
        ws = db.query(WorkflowStatus).filter(
            WorkflowStatus.topic_id == UUID(topic_id),
            WorkflowStatus.stage == WorkflowStage.PLANNING
        ).first()
        if not ws:
            ws = WorkflowStatus(topic_id=UUID(topic_id), stage=WorkflowStage.PLANNING)
            db.add(ws)
        ws.status = Status.COMPLETED.value
        db.commit()
    except Exception as e:
        # Update status to FAILED
        ws = db.query(WorkflowStatus).filter(
            WorkflowStatus.topic_id == UUID(topic_id),
            WorkflowStatus.stage == WorkflowStage.PLANNING
        ).first()
        if not ws:
            ws = WorkflowStatus(topic_id=UUID(topic_id), stage=WorkflowStage.PLANNING)
            db.add(ws)
        ws.status = Status.FAILED.value
        ws.last_error = str(e)
        db.commit()
        raise e
    finally:
        db.close()
    
