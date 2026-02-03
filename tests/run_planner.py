import logging

from src.llm.main import run_planner_agent
from src.llm.logger import setup_logging


logger = logging.getLogger(__name__)

def main():
    TOPIC_ID = "40e3bc9a-fe83-4400-bb53-e38bc1f7d078"
    run_planner_agent(TOPIC_ID)


if __name__ == "__main__":
    setup_logging()
    main()
