import logging

from src.llm.deep_research.state import ResearchState
from src.llm.deep_research.prompt import REACT_SYSTEM_PROMPT, REACT_HUMAN_PROMPT
from src.llm.agent_core.agent import Agent
from src.llm.deep_research.tools.web_search import make_web_search_tool
from src.llm.deep_research.constant import DeepResearchConstants

logger = logging.getLogger(__name__)

class Researcher(Agent):
    def __init__(
        self,
        state: ResearchState,
        model: str = DeepResearchConstants.DEFAULT_MODEL,
        temperature: float = DeepResearchConstants.DEFAULT_TEMPERATURE,
        max_iteration: int = DeepResearchConstants.DEFAULT_MAX_RETRIES,
    ):
        self.state = state
        logger.info(
            "Initializing Researcher Agent"
        )
        logger.info(
        "Researcher received %d subtopics | existing_sources=%d",
        len(state.get("subtopics",[])),
        len(state.get("sources",[])),
        )
        current = state.get("current_subtopic")
        if not current:
            raise ValueError("Researcher invoked without current_subtopic")
        super().__init__(
            system_prompt=REACT_SYSTEM_PROMPT,
            user_prompt=REACT_HUMAN_PROMPT.format(
                query=state["query"],
                topic=state["current_subtopic"],
                evidence=[
                    s["content"]
                    for s in state.get("sources",[])
                    if s.get("subtopic") == state["current_subtopic"]
                ],
                scratchpad=state.get("scratchpad",""),
            ),
            model=model,
            temperature=temperature,
            max_iteration=max_iteration,
        )
        logger.info("Researcher Agent initialized successfully")

    def on_tool_result(self, tool_name: str, args: dict, result: dict):
        scratchpad = self.state.setdefault("scratchpad", "")
        sources = self.state.setdefault("sources", [])
        covered = self.state.setdefault("covered_subtopics", {})
        executed = self.state.setdefault("executed_searches", set())
        search_count = self.state.setdefault("search_count", {})
        logger.debug("Tool result keys: %s", result.keys())

        subtopic = self.state["current_subtopic"]
        query = args.get("query")

        # Deduplicate searches
        if query in executed:
            logger.info("Skipping duplicate search: %s", query)
            return
        executed.add(query)

        # Max search guard
        count = search_count.get(subtopic, 0)
        if count >= 5:
            logger.warning("Max searches reached for subtopic: %s", subtopic)
            return
        search_count[subtopic] = count + 1

        payload = result.get("results", {})
        responses = payload.get("responses", [])


        if not responses:
            logger.warning("No responses returned for subtopic: %s", subtopic)
            return
        logger.debug(
            "WebSearch responses sample: %s",
            responses[:1] if isinstance(responses, list) else responses
        )

        facts = extract_atomic_facts(responses, subtopic)

        sources.extend(facts)
        covered[subtopic] = covered.get(subtopic, 0) + len(facts)

        scratchpad += f"\nSEARCH executed for subtopic: {subtopic}"

        self.state["sources"] = sources
        self.state["covered_subtopics"] = covered
        self.state["scratchpad"] = scratchpad



def research_node(state: ResearchState) -> ResearchState:
    
    research_agent = Researcher(
        state=state,
        model=DeepResearchConstants.MODEL,
        temperature=DeepResearchConstants.TEMPERATURE,
        max_iteration=DeepResearchConstants.MAX_RETRIES,
    )
    logger.info("Researcher Agent object created sucessfully")
    chat_history = []
    research_agent.add_tool(make_web_search_tool())
    _, _ = research_agent.invoke(chat_history)
    logger.info("Researcher Agent invoke completed sucessfully")
    return state

def extract_atomic_facts(results: list, subtopic: str) -> list[dict]:
    facts = []

    for r in results:
        if not isinstance(r, dict):
            continue

        content = r.get("content")
        url = r.get("url")

        # 🚫 Skip entries without URL
        if not content or not url:
            continue

        facts.append({
            "content": content.strip(),
            "url": url,
            "source": r.get("source", "web"),
            "subtopic": subtopic,
        })

    return facts
