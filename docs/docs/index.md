<div class="hero-banner">
  <h1>🎓 AI Tutor</h1>
  <p>A fully autonomous, AI-powered personal tutor — from curriculum design to real-time teaching.</p>
</div>

<div class="badge-row" markdown>
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![OpenAI](https://img.shields.io/badge/OpenAI-Responses_API-412991?style=flat&logo=openai)](https://platform.openai.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.0-orange?style=flat)](https://langchain-ai.github.io/langgraph)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)
</div>

## What is AI Tutor?

**AI Tutor** is a three-agent platform that takes a learner from zero to mastery on any topic:

1. **Curriculum Agent** — Converses with the learner, does a live web search, and designs a complete course structure.
2. **Planner Agent** — Runs a multi-step deep-research pipeline to generate rich, cited instructional content for every chapter.
3. **Teacher Agent** — Teaches content chunk-by-chunk with adaptive conversation, inline quizzes, and chapter completion tracking.

---

## Key Features

<div class="feature-grid" markdown>

<div class="feature-card" markdown>
**Curriculum Agent**  
Designs personalized courses using OpenAI + Tavily web search
</div>

<div class="feature-card" markdown>
**Deep Research**  
LangGraph pipeline: plan → search → review → synthesize
</div>

<div class="feature-card" markdown>
**Teacher Agent**  
Chunk-based adaptive teaching with per-outline quiz generation
</div>

<div class="feature-card" markdown>
**Real-time SSE**  
Live streaming responses with reconnect support
</div>

<div class="feature-card" markdown>
**Auth System**  
Email OTP + Google OAuth 2.0 with Redis rate limiting
</div>

<div class="feature-card" markdown>
**Dashboard**  
Course progress, chapter tracking, learning time metrics
</div>

</div>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Tailwind CSS, React Router |
| **Backend** | FastAPI 0.111, SQLAlchemy 2.0, Pydantic v2 |
| **Database** | PostgreSQL 15+, Alembic migrations |
| **Cache** | Redis 7 (OTP store, rate limiting) |
| **LLM** | OpenAI Responses API (custom agent loop) |
| **Research** | LangGraph + Tavily Search |
| **Auth** | Google OAuth 2.0, SMTP OTP via Gmail |
| **Deployment** | Docker, GitHub Actions → GitHub Pages |

---

## Documentation Map

| Section | What's Inside |
|---------|--------------|
| [Architecture](architecture.md) | System design, agent pipeline, data flow |
| [Setup Guide](setup/prerequisites.md) | Step-by-step local & Docker setup |
| [Database](database/schema.md) | ER diagram, table definitions, enums |
| [AI Agents](agents/overview.md) | How each agent works, tools, prompts |
| [API Reference](api/auth.md) | All REST + SSE endpoints |
| [Deployment](deployment.md) | Docker, GitHub Pages, GitHub Actions |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Akshumishra/Ai_tutor.git && cd Ai_tutor

# 2. Backend
cd backend && python -m venv .venv && .venv\Scripts\activate
pip install -r requirments.txt
cp .env.sample .env   # fill in your keys
alembic upgrade head
uvicorn src.backend.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend && npm install
npm run dev           # http://localhost:5173
```

→ See the full [Setup Guide](setup/prerequisites.md) for detailed instructions.
