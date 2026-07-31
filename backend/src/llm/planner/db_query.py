from uuid import UUID

from src.backend.db.database import SessionLocal
from src.backend.models.chapter import Chapter
from src.backend.models.topic import Topic
from src.backend.models.chapter_plan import ChapterPlan


def get_chapters(topic_id: str):
    db = SessionLocal()

    try:
        try:
            topic_uuid = UUID(topic_id)
        except ValueError:
            raise ValueError(f"Invalid topic_id UUID: {topic_id}")

        data = (
            db.query(
                Chapter.id.label("chapter_id"),
                Chapter.title.label("chapter_title"),
                Chapter.sequence,
                Chapter.status.label("chapter_status"),
                Chapter.outline.label("outline"),
                Topic.title.label("topic_title"),
                Topic.user_summary,
            )
            .join(Chapter, Chapter.topic_id == Topic.id)
            .filter(Topic.id == topic_id)
            .order_by(Chapter.sequence)
            .all()
        )

        if not data:
            raise ValueError(f"No chapters found for topic_id={topic_id}")

        first = data[0]

        return {
            "status": "success",
            "topic_title": first.topic_title,
            "user_summary": first.user_summary,
            "chapters": [
                {
                    "chapter_id": row.chapter_id,
                    "chapter_title": row.chapter_title,
                    "sequence": row.sequence,
                    "status": row.chapter_status.value,
                    "outline": row.outline,
                }
                for row in data
            ],
        }

    finally:
        db.close()

def save_plan(chapter_id: str,title:str, sequence:int, plan: str):
        db = SessionLocal()

        try:
            chapter_uuid = (
                chapter_id if isinstance(chapter_id, UUID)
                else UUID(chapter_id)
            )

            existing_plan = (
                db.query(ChapterPlan)
                .filter(
                    ChapterPlan.chapter_id == chapter_uuid,
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
                    chapter_id=chapter_uuid,
                    content=plan,
                )
                db.add(existing_plan)

            db.commit()

            return {
                "status": "success",
                "message": "Chapter plan saved successfully",
                "chapter_id": str(chapter_uuid),
            }

        finally:
            db.close()