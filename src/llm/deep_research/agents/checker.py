import logging
from src.llm.deep_research.state import ResearchState

logger = logging.getLogger(__name__)

def checker_node(state: ResearchState) -> ResearchState:
    subtopics = state.get("subtopics", [])
    covered = state.get("covered_subtopics", {})
    criteria = state.get("success_criteria", {})

    min_sources = criteria.get("min_sources_per_subtopic", 1)

    incomplete = []

    for subtopic in subtopics:
        count = covered.get(subtopic, 0)
        if count < min_sources:
            incomplete.append(subtopic)

    if incomplete:
        next_subtopic = incomplete[0]   # deterministic choice
        logger.info(
            "Checker: research incomplete | next_subtopic=%s",
            next_subtopic,
        )
        state["is_complete"] = False
        state["current_subtopic"] = next_subtopic
    else:
        logger.info("Checker: all subtopics satisfied")
        state["is_complete"] = True
        state["current_subtopic"] = None

    return state

def route_after_checker(state: ResearchState):
    return "reviewer" if state.get("is_complete") else "researcher"

