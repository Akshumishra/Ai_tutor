from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from src.backend.config import Config

Base = declarative_base()

# Guard against a missing DATABASE_URL (e.g., misconfigured secrets in CI).
# Without this, SQLAlchemy raises at import time and crashes the container
# before it can even bind the port, causing 504 on every request.
if not Config.DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Check your Azure Container Apps secrets / GitHub Actions secrets."
    )

engine = create_engine(Config.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
