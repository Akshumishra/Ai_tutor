import logging
import json

from src.llm.agent_core.agent import Agent
from src.llm.deep_research.state import ResearchState
from src.llm.deep_research.constant import DeepResearchConstants
from src.llm.deep_research.prompt import REVIEWER_SYSTEM_PROMPT, REVIEWER_USER_PROMPT

logger = logging.getLogger(__name__)

class Reviewer(Agent):
    def __init__(
        self,
        state: ResearchState,
        model=DeepResearchConstants.DEFAULT_MODEL,
        temperature=DeepResearchConstants.DEFAULT_TEMPERATURE,
        max_iteration=DeepResearchConstants.DEFAULT_MAX_RETRIES,
    ):
        self.state = state
        logger.info("Initializing Reviewer Agent")

        super().__init__(
            system_prompt=REVIEWER_SYSTEM_PROMPT,
            user_prompt=REVIEWER_USER_PROMPT.format(
                subtopics=state["subtopics"],
                current_coverage=state.get("covered_subtopics", {}),
                scratchpad=state.get("scratchpad", ""),
            ),
            model=model,
            temperature=temperature,
            max_iteration=max_iteration,
        )

        logger.info("Reviewer Agent initialized successfully")


def reviewer_node(state: ResearchState) -> ResearchState:
    reviewer_agent = Reviewer(
        state=state,
        model=DeepResearchConstants.MODEL,
        temperature=DeepResearchConstants.TEMPERATURE,
        max_iteration=DeepResearchConstants.MAX_RETRIES,
    )

    ai_response, _ = reviewer_agent.invoke([])

    try:
        data = json.loads(ai_response)
    except json.JSONDecodeError:
        logger.exception("Reviewer returned invalid JSON")
        state["approved"] = False
        return state

    # ✅ DEBUG prints from data (NOT state)
    print("Reviewer approved:", data["approved"])
    print("Reviewer scores:", data["scores"])
    print("Reviewer missing:", data.get("missing", []))
    print("Reviewer final score:", data["final_score"])

    if( data["final_score"] > 0.85):
        state["approved"]=True

    # ✅ Write to state
    state["scores"] = data["scores"]
    state["final_score"] = data["final_score"]
    # state["approved"] = data["approved"]
    state["critique"] = data["critique"]
    state["missing"] = data.get("missing", [])
    state["improvement_instructions"] = data["improvement_instructions"]

    # 🔥 critical fix (you did this correctly)
    if not state["approved"] and state["missing"]:
        state["current_subtopic"] = state["missing"][0]

    # 🛑 safety guard
    state["reviewer_attempts"] = state.get("reviewer_attempts", 0) + 1
    if state["reviewer_attempts"] >= 3:
        state["approved"] = True

    return state


def route_after_reviewer(state: ResearchState):
    return "synthesizer" if state.get("approved") else "researcher"
