from src.backend.models.chapter import Chapter
from src.backend.models.topic import Topic

class ChapterQuery:
    def get_chapter(db, chapter_id):
        chapter = (
            db.query(Chapter)
            .filter(
                Chapter.id == chapter_id,
            )
            .first()
        )
        return chapter
    
    def insert_topic(db, topic_id, chapter_title, chapter_sequence):
        new_topic = Topic(
            id = topic_id,
            title = chapter_title,
            sequence = chapter_sequence,
        )
        db.add(new_topic)
        db.commit(new_topic)
