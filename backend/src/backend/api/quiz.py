import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from typing import List

from src.backend.db.database import SessionLocal
from src.backend.models.chapter import Chapter
from src.backend.enums.status import Status
from src.backend.config import Config
from src.llm.quiz_agent.agent import QuizAgent

router = APIRouter(prefix="/quiz", tags=["Quiz"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class QuizGenerateRequest(BaseModel):
    chapter_id: str

class QuizSubmitRequest(BaseModel):
    chapter_id: str
    answers: List[int]
    questions: List[dict]



@router.post("/generate")
async def generate_quiz(req: QuizGenerateRequest, db: Session = Depends(get_db)):
    try:
        chapter_uuid = UUID(req.chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter_id format")

    chapter = db.query(Chapter).filter(Chapter.id == chapter_uuid).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    agent = QuizAgent(chapter_id=str(chapter_uuid), mode="summary", outline=chapter.outline)
    try:
        raw, _ = agent.invoke()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        questions = json.loads(raw)
        return {"chapter_id": req.chapter_id, "chapter_title": chapter.title, "questions": questions}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse quiz from LLM: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")


@router.post("/submit")
async def submit_quiz(req: QuizSubmitRequest, db: Session = Depends(get_db)):
    try:
        chapter_uuid = UUID(req.chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter_id format")

    chapter = db.query(Chapter).filter(Chapter.id == chapter_uuid).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    if len(req.answers) != len(req.questions):
        raise HTTPException(status_code=400, detail="Answers count must match questions count")

    correct_count = 0
    results = []
    for i, (q, ans) in enumerate(zip(req.questions, req.answers)):
        is_correct = ans == q.get("correct", -1)
        if is_correct:
            correct_count += 1
        results.append({
            "question": q["question"],
            "selected": ans,
            "correct": q.get("correct"),
            "is_correct": is_correct,
        })

    total = len(req.questions)
    score = int((correct_count / total) * 100)
    passed = score >= 70

    if passed:
        chapter.status = Status.COMPLETED.value
        db.commit()

    return {
        "score": score,
        "passed": passed,
        "correct_count": correct_count,
        "total": total,
        "results": results,
    }
