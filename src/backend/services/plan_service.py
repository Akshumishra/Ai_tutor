from uuid import UUID
from src.backend.db.database import SessionLocal
from src.backend.repositories.plan_repository import PlanQuery


class PlanService:

    @staticmethod
    def save_plan(chapter_id: str,title:str, sequence:int, plan: str):
        db = SessionLocal()

        try:
            chapter_uuid = (
                chapter_id if isinstance(chapter_id, UUID)
                else UUID(chapter_id)
            )

            return PlanQuery.save_plan(
                db=db,
                chapter_id=chapter_uuid,
                title=title,
                sequence=sequence,
                plan=plan,
            )

        finally:
            db.close()
