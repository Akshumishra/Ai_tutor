from typing import List

from src.llm.agent_core.agent import Agent
from src.llm.curriculum_agent.prompt import SYSTEM_PROMPT
from src.llm.curriculum_agent.constant import CurriculumConstants
from src.llm.curriculum_agent.tools.upsert_curriculum import make_upsert_curriculum_tool
from src.llm.curriculum_agent.tools.get_curriculum import make_get_curriculum_tool
from src.llm.curriculum_agent.tools.web_search import make_web_search_tool

class CurriculumAgent(Agent):
    def __init__(
        self,
        user_id: str,
        topic_id: str,
        model: str = CurriculumConstants.DEFAULT_MODEL,
        temperature: float = CurriculumConstants.DEFAULT_TEMPERATURE,
        max_iteration: int = CurriculumConstants.DEFAULT_MAX_ITERATION,
    ):
        super().__init__(
            system_prompt=SYSTEM_PROMPT,
            model=model,
            temperature=temperature,
            max_iteration=max_iteration
        )
        self.user_id = user_id
        self.topic_id = topic_id
        self.saved_chapters = set()
        self.save_failures = 0

    def run(self, user_input: str, chat_history: list[dict] = None):
        self.add_tool(make_upsert_curriculum_tool(self.user_id, self.topic_id))
        self.add_tool(make_get_curriculum_tool(self.topic_id))
        self.add_tool(make_web_search_tool())
        if user_input == "":
            raise ValueError(CurriculumConstants.VALUE_ERROR)
        user_input={"role":"user", "content":user_input}
        chat_history.append(user_input)
        return self.stream(chat_history)
                

    def on_tool_result(self, tool_name: str, args: dict, result: dict):
        if tool_name != "upsert_curriculum":
            return
        chapter_number = args.get("chapter_number")
        status = result.get("status")
        if status == "success":
            self.saved_chapters.add(chapter_number)
            self.save_failures = 0
        else:
            self.save_failures += 1
        if self.save_failures > 1:
            raise RuntimeError(CurriculumConstants.ERROR_SAVE_CURRICULUM)
