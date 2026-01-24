import logging
from src.llm.agent_core.agent import Agent
from src.llm.planner.prompt import SYSTEM_PROMPT, USER_PROMPT
from src.llm.planner.constant import PlannerConstants
from src.llm.deep_research.state import ResearchState

logger = logging.getLogger(__name__)


class PlannerAgent(Agent):
    def __init__(
        self,
        state: ResearchState,
        model: str = PlannerConstants.DEFAULT_MODEL,
        temperature: float = PlannerConstants.DEFAULT_TEMPERATURE,
    ):
        if not isinstance(state, dict):
            raise TypeError(
                f"PlannerAgent expected ResearchState dict, got {type(state)}"
            )

        logger.info(
            "Initializing PlannerAgent | query=%s",
            state.get("query"),
        )
        super().__init__(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=USER_PROMPT.format(
                query=state["query"],
                extra=state.get("extra", "None provided"),
                researcher_scratchpad = state.get("scratchpad") or "No sources were required.",
            ),
            model=model,
            temperature=temperature,
        )

        logger.info("PlannerAgent initialized successfully")
