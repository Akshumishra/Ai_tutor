from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship

from src.backend.enums.status import Status
from src.backend.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)

    curriculums = relationship(
        "Curriculum", back_populates="user", cascade="all, delete-orphan"
    )


class Curriculum(Base):
    __tablename__ = "curriculums"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    user_summary = Column(Text, nullable=False)
    plan = Column(JSON, nullable=False)

    user = relationship("User", back_populates="curriculums")

    chapters = relationship(
        "Chapter",
        back_populates="curriculum",
        cascade="all, delete-orphan",
        order_by="Chapter.sequence_order",
    )


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    curriculum_id = Column(Integer, ForeignKey("curriculums.id", ondelete="CASCADE"))
    sequence_order = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    status = Column(Enum(Status), nullable=False)
    content = Column(Text, nullable=False)

    curriculum = relationship("Curriculum", back_populates="chapters")
