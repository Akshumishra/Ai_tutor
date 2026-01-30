import logging

from src.llm.agent_core.agent import Agent
from src.llm.planner.prompt import SYSTEM_PROMPT, USER_PROMPT
from src.llm.planner.constant import PlannerConstants

logger = logging.getLogger(__name__)


class PlannerAgent(Agent):
    def __init__(
        self,
        draft: str,
        sources:list,
        topic_title:str,
        user_summary:str,
        all_chapters:list,
        current_chapter_title:str,
        outline_title : str,
        model: str = PlannerConstants.DEFAULT_MODEL,
        temperature: float = PlannerConstants.DEFAULT_TEMPERATURE,
    ):
        super().__init__(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=USER_PROMPT.format(
                topic_title= topic_title,
                user_summary = user_summary,
                all_chapters= all_chapters,
                draft=draft,
                sources=sources,
                current_chapter_title=current_chapter_title,
                chapter_outline=outline_title
            ),
            model=model,
            temperature=temperature,
        )

        logger.info("PlannerAgent initialized successfully")
