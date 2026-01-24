from langgraph.graph import StateGraph, START, END
from src.llm.deep_research.state import ResearchState

from src.llm.deep_research.agents.query_maker import query_node
from src.llm.deep_research.agents.research_agent import research_node
from src.llm.deep_research.agents.checker import checker_node ,route_after_checker
from src.llm.deep_research.agents.reviewer import reviewer_node, route_after_reviewer
from src.llm.deep_research.agents.synthesizer import synthesizer_node


graph = StateGraph(ResearchState)

graph.add_node("planner", query_node)
graph.add_node("researcher", research_node)
graph.add_node("checker", checker_node)
graph.add_node("reviewer", reviewer_node)
graph.add_node("synthesizer", synthesizer_node)

graph.add_edge(START, "planner")
graph.add_edge("planner", "researcher")

graph.add_edge("researcher", "checker")

# # 🔥 REQUIRED explicit edges
# graph.add_edge("checker", "researcher")
# graph.add_edge("checker", "reviewer")

graph.add_conditional_edges(
    "checker",
    route_after_checker,
    {
        "researcher": "researcher",
        "reviewer": "reviewer",
    },
)


graph.add_conditional_edges(
    "reviewer",
    route_after_reviewer,
    {
        "researcher": "researcher",
        "synthesizer": "synthesizer",
    },
)

graph.add_edge("synthesizer", END)

app = graph.compile()

print(app)
