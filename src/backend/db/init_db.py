from src.backend.db.database import engine, Base
import src.backend.models


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
