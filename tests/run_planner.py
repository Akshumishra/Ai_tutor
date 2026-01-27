from src.backend.services.topic_service import TopicService
from src.backend.services.plan_service import PlanService
from src.llm.utils.helper_functions import parse_outline
from src.llm.planner.constant import PlannerConstants
from src.llm.main import run_planner
from src.llm.deep_research.graph import app

from src.llm.logger import setup_logging


def main():
    TOPIC_ID = "e0bb80b1-db7b-4897-81f8-da3fc829904b"

    data = TopicService.get_topic_with_chapters(TOPIC_ID)

    for ch in data["chapters"]:
        initial_state = {
            "query": f"Research evidence for: {ch['chapter_title']}",
            "extra": ch["outline"],
            "approved": False,
            "subtopics": [],
            "sources": [],
            "covered_subtopics": {},
            "scratchpad": "",
            "success_criteria": {},
            "index": 0,
            "current_subtopic": None,
        }
        final_state = app.invoke(initial_state)
        draft = final_state.get("draft")
        fact = final_state.get("sources")
        if not draft:
            raise RuntimeError(
                f"No draft generated for outline: {outline}"
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

            PlanService.save_plan(
                chapter_id=ch["chapter_id"],
                title=outline,
                sequence=idx,
                plan=final_content,
            )

            print(final_content)


if __name__ == "__main__":
    setup_logging()
    main()
