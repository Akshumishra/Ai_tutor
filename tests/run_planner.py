from uuid import UUID
import logging

from src.backend.db.database import SessionLocal
from src.backend.models.chapter import Chapter
from src.backend.models.topic import Topic
from src.backend.models.chapter_plan import ChapterPlan
from src.llm.utils import parse_outline
from src.llm.main import run_planner
from src.llm.deep_research.graph import app

from src.llm.logger import setup_logging


logger = logging.getLogger(__name__)

def get_topic_with_chapters(topic_id: str):
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
                for row in sorted(data, key=lambda r: r.sequence)
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
            db.refresh(existing_plan)

            return {
                "status": "success",
                "message": "Chapter plan saved successfully",
                "chapter_id": str(chapter_uuid),
            }

        finally:
            db.close()


def main():
    TOPIC_ID = "40e3bc9a-fe83-4400-bb53-e38bc1f7d078"

    data = get_topic_with_chapters(TOPIC_ID)

    for ch in data["chapters"]:
        initial_state = {
            "query": f"Research evidence for: {ch['chapter_title']}",
            "extra": ch["outline"],
            "approved": False,
            "forced_progress": False,
            "reviewer_attempts": 0,
            "subtopics": [],
            "sources": [],
            "covered_subtopics": {},
            "scratchpad": "",
            "success_criteria": {},
            "index": 0,
            "current_subtopic": None,
        }
        final_state = app.invoke(initial_state, {"recursion_limit": 100})

        draft = final_state.get("draft")
        fact = final_state.get("sources")

        if not draft:
            raise RuntimeError(
                f"No draft generated for chapter: {ch['chapter_title']}"
            )

        logger.info(
            "Completed research for chapter '%s' | total_sources=%d",
            ch["chapter_title"],
            len(fact),
        )

        
        outlines = parse_outline(ch["outline"])

        for idx, outline in enumerate(outlines, start=1):
            final_content, _ = run_planner(
                draft = draft,
                sources = fact,
                topic_title=data["topic_title"],
                user_summary=data["user_summary"],
                all_chapters= [
                        {
                            "title": c["chapter_title"],
                            "sequence": c["sequence"],
                        }
                        for c in data["chapters"]
                    ],
                current_chapter_title=ch["chapter_title"],
                outline_title=outline,
            )

            save_plan(
                chapter_id=ch["chapter_id"],
                title=outline,
                sequence=idx,
                plan=final_content,
            )

            print(final_content)


if __name__ == "__main__":
    setup_logging()
    main()
