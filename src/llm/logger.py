import logging
from src.llm.config import LLMConfig


def setup_logging():
    logging.basicConfig(
        level=LLMConfig.LOG_LEVEL,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )