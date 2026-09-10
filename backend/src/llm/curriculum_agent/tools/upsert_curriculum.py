import logging
import uuid
from uuid import UUID

from src.backend.models.topic import Topic
from src.backend.models.chapter import Chapter
from src.backend.db.database import SessionLocal
from src.llm.agent_core.args_schema import ArgsSchema as Args
from src.llm.agent_core.tool import Tool
from src.backend.enums.status import Status

logger = logging.getLogger(__name__)


class UpsertCurriculumArgs:
    args = [
        ("topic", Args(type=str, description="A meaningful and descriptive title for the overall curriculum course (e.g. 'Advanced Python Web Development'). Do NOT use generic names like 'New Journey'.")),
        (
            "chapter_number",
            Args(type=int, description="Chapter sequence number"),
        ),
        ("chapter_title", Args(type=str, description="Chapter title")),
        (
            "chapter_outline",
            Args(type=str, description="Detailed chapter outline"),
        ),
        (
            "user_summary",
            Args(
                type=str,
                description="Generated summary of user's learning intent",
            ),
        ),
    ]


def make_upsert_curriculum_tool(user_id: str, topic_id: str):
    logger.debug(
        "Creating upsert curriculum tool",
        extra={"user_id": user_id, "topic_id": topic_id},
    )

    def upsert_curriculum_tool(
        topic: str,
        chapter_number: int,
        chapter_title: str,
        chapter_outline: str,
        user_summary: str,
    ):
        logger.info(
            "Starting curriculum upsert",
            extra={
                "user_id": user_id,
                "topic_id": topic_id,
                "chapter_number": chapter_number,
            },
        )

        db = SessionLocal()
        try:
            user_uuid = UUID(user_id)
            
            try:
                topic_uuid = UUID(topic_id)
            except (ValueError, TypeError):
                logger.error(f"Invalid topic_id provided: {topic_id}")
                return {"status": "error", "message": "Invalid topic_id format"}
            
            logger.debug("Checking for existing topic")

            existing_topic = db.query(Topic).filter(Topic.id == topic_uuid).first()

            if existing_topic:
                logger.info(
                    "Existing topic found, updating metadata",
                    extra={"topic_id": str(existing_topic.id)},
                )
                existing_topic.title = topic
                existing_topic.user_summary = user_summary
                topic_uuid = existing_topic.id
            else:
                logger.error(f"Topic {topic_uuid} not found in database. Cannot upsert curriculum.")
                return {"status": "error", "message": "Topic not found"}

            logger.debug("Checking for existing chapter")

            existing_chapter = (
                db.query(Chapter)
                .filter(
                    Chapter.topic_id == topic_uuid,
                    Chapter.sequence == chapter_number,
                )
                .first()
            )

            if existing_chapter:
                logger.info(
                    "Updating existing chapter",
                    extra={
                        "chapter_sequence": chapter_number,
                        "topic_id": str(topic_uuid),
                    },
                )
                existing_chapter.title = chapter_title
                existing_chapter.outline = chapter_outline
            else:
                logger.info(
                    "Creating new chapter",
                    extra={
                        "chapter_sequence": chapter_number,
                        "topic_id": str(topic_uuid),
                    },
                )
                chapter = Chapter(
                    topic_id=topic_uuid,
                    title=chapter_title,
                    sequence=chapter_number,
                    status=Status.PENDING.value,
                    outline=chapter_outline,
                )
                db.add(chapter)

            db.commit()

            logger.info(
                "Curriculum upsert successful",
                extra={
                    "topic_id": str(topic_uuid),
                    "chapter_number": chapter_number,
                },
            )

            return {
                "status": "success",
                "message": "Curriculum saved successfully",
                "topic_id": str(topic_uuid),
            }

        except Exception as e:
            logger.exception(
                "Failed to upsert curriculum",
                extra={
                    "user_id": user_id,
                    "topic_id": topic_id,
                    "chapter_number": chapter_number,
                },
            )
            db.rollback()
            return {"status": "error", "reason": str(e)}

        finally:
            logger.debug("Closing database session")
            db.close()


    return Tool(
        func=upsert_curriculum_tool,
        description="Save or update a curriculum chapter based on the provided input.",
        args_schema=UpsertCurriculumArgs,
    )
