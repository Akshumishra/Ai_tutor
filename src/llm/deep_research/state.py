from typing import List, Dict, Optional, Any
from typing_extensions import TypedDict


class ResearchState(TypedDict):
    # User input
    query: str
    subtopics:  List[str]
    success_criteria: Dict
    sources: List[Dict]
    scratchpad: str
    covered_subtopics: Dict
    current_subtopic: str
    approved: bool
    evaluation: Optional[Dict]
    reviewer_attempts: int
    queries_used: List[str]
    subtopic_coverage: Dict[str, float]
    extra: Optional[Any]
    
    scores: Dict
    final_score: float
    

    is_complete: bool

    # Synthesis
    draft: str

    # Evaluation
    
    

    # Control
    iteration: int
    max_iterations: int
    critique: Optional[str]
    missing: List[str]
    improvement_instructions: List[str]
