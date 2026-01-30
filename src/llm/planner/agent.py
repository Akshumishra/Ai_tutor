import logging

from src.llm.agent_core.agent import Agent
from src.llm.planner.prompt import SYSTEM_PROMPT, USER_PROMPT
from src.llm.planner.constant import PlannerConstants
from src.llm.planner.db_query import get_chapters, save_plan
from src.llm.deep_research.graph import app
from src.llm.utils import parse_outline

logger = logging.getLogger(__name__)


class PlannerAgent(Agent):
    def __init__(
        self,
        topic_id:str,
        model: str = PlannerConstants.DEFAULT_MODEL,
        temperature: float = PlannerConstants.DEFAULT_TEMPERATURE,
    ):
        self.topic_id = topic_id
        super().__init__(
            system_prompt=SYSTEM_PROMPT,
            user_prompt="",
            model=model,
            temperature=temperature,
        )

    def _run_deep_research(self, chapter: dict):
        initial_state = {
            "query": f"Research evidence for: {chapter['chapter_title']}",
            "extra": chapter["outline"],
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

        if not final_state.get("draft"):
            raise RuntimeError(
                f"No draft generated for chapter: {chapter['chapter_title']}"
            )
        return final_state

    def _build_user_prompt(
            self,
            state,
            *,
            data: dict,
            chapter: dict,
            outline: str,
        ) -> None:
        self.user_prompt = USER_PROMPT.format(
            topic_title=data["topic_title"],
            user_summary=data["user_summary"],
            all_chapters=[
                {"title": c["chapter_title"], "sequence": c["sequence"]}
                for c in data["chapters"]
            ],
            draft=state["draft"],
            sources=state["sources"],
            current_chapter_title=chapter["chapter_title"],
            chapter_outline=outline,
        )


    def run(self):
        data = get_chapters(self.topic_id)
        print(data)
        for chapter in data["chapters"]:
            state=self._run_deep_research(chapter)

            outlines = parse_outline(chapter["outline"])
            print(outlines)

            for idx, outline in enumerate(outlines, start=1):

                self._build_user_prompt(
                    state=state,
                    data=data,
                    chapter=chapter,
                    outline=outline,
                )
                final_content,_ = self.invoke()

                save_plan(
                    chapter_id=chapter["chapter_id"],
                    title=outline,
                    sequence=idx,
                    plan=final_content,
                )
