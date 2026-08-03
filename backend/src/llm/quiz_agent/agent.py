from src.llm.quiz_agent.constant import QuizConstants
from src.llm.quiz_agent.prompt import SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT, USER_PROMPT
from src.llm.agent_core.agent import Agent


class QuizAgent(Agent):
    def __init__(
        self,
        chapter_id: str,
        mode: str = "interactive",
        outline: str = "",
        model: str = QuizConstants.DEFAULT_MODEL_NAME,
        temperature: float = QuizConstants.DEFAULT_MODEL_TEMPERATURE,
        max_iteration: int = QuizConstants.DEFAULT_MAX_ITERATION,
    ):
        sys_prompt = SYSTEM_PROMPT if mode == "interactive" else SUMMARY_SYSTEM_PROMPT
        user_prompt = USER_PROMPT if mode == "interactive" else f"Chapter Outline:\n{outline}\n\nGenerate the chapter summary quiz."
        super().__init__(
            system_prompt=sys_prompt,
            model=model,
            temperature=temperature,
            max_iteration=max_iteration,
        )
        self.user_prompt = user_prompt
        self.chapter_id = chapter_id
        self.mode = mode

    def invoke(self, chat_history=None):
        if not chat_history:
            chat_history = [{"role": "user", "content": self.user_prompt}]
        return super().invoke(chat_history)

    def stream(self, chat_history=None):
        if not chat_history:
            chat_history = [{"role": "user", "content": self.user_prompt}]
        return super().stream(chat_history)

    def astream(self, chat_history=None):
        if not chat_history:
            chat_history = [{"role": "user", "content": self.user_prompt}]
        return super().astream(chat_history)

