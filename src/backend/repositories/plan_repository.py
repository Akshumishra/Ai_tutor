from uuid import UUID
from src.backend.models.chapter_plan import ChapterPlan


class PlanQuery:

    @staticmethod
    def save_plan(db, chapter_id: UUID, title:str, sequence: int, plan: str):
        """
        Save or update a chapter-level plan.

        - One plan per (chapter_id, sequence)
        - Idempotent (safe to re-run agent)
        """

        existing_plan = (
            db.query(ChapterPlan)
            .filter(
                ChapterPlan.chapter_id == chapter_id,
                ChapterPlan.sequence==sequence,
                ChapterPlan.title==title,
            )
            .first()
        )

        if existing_plan:
            existing_plan.content = plan
        else:
            existing_plan = ChapterPlan(
                title=title,
                sequence=sequence,
                chapter_id=chapter_id,
                content=plan,
            )
            db.add(existing_plan)

        db.commit()
        db.refresh(existing_plan)

        return {
            "status": "success",
            "message": "Chapter plan saved successfully",
            "chapter_id": str(chapter_id),
        }
