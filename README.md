<div align="center">

# AI Tutor

**A fully autonomous, AI-powered personal tutor that builds your curriculum, generates study material, and teaches you — one chunk at a time.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![OpenAI](https://img.shields.io/badge/OpenAI-Responses_API-412991?style=for-the-badge&logo=openai&logoColor=white)](https://platform.openai.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.0-orange?style=for-the-badge)](https://langchain-ai.github.io/langgraph)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Documentation](./docs) • [Quick Start](#-quick-start) • [Architecture](#-architecture)

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| **Curriculum Agent** | Conversational AI that designs a full, personalized course structure for any topic |
| **Planner Agent** | Generates deep, cited instructional content for every chapter via a LangGraph research pipeline |
| **Teacher Agent** | Teaches chapter content in digestible chunks with inline quizzes and progress tracking |
| **Deep Research** | Multi-stage LangGraph pipeline: query → research → review → synthesize with Tavily web search |
| **Quiz System** | Auto-generated per-outline and per-chapter quizzes with scoring (70% pass threshold) |
| **Auth** | Email OTP verification, Google OAuth 2.0, forgot-password with reset OTP |
| **Dashboard** | Course progress tracking with chapter completion & learning time metrics |
| **Real-time Streaming** | Server-Sent Events (SSE) for live AI response streaming with reconnect support |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│            Vite · React Router · Tailwind CSS                │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST + SSE
┌──────────────────────────▼──────────────────────────────────┐
│                     Backend (FastAPI)                        │
│   /api/auth  /api/agents  /api/dashboard  /api/quiz          │
│                  SQLAlchemy · PostgreSQL                      │
│                  Redis (OTP cache + rate limit)               │
└──────────┬─────────────────┬──────────────────┬─────────────┘
           │                 │                  │
    ┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐
    │ Curriculum  │  │   Planner     │  │   Teacher   │
    │   Agent     │  │   Agent       │  │   Agent     │
    │             │  │  LangGraph    │  │             │
    │ web_search  │  │  DeepResearch │  │ get_chapter │
    │ upsert_curr │  │  + Tavily     │  │ create_quiz │
    │ finalize    │  │               │  │ update_status│
    └─────────────┘  └───────────────┘  └─────────────┘
                           │
                    OpenAI Responses API
```

### Agent Workflow

```
User → [1] CurriculumAgent → designs course → finalize
      → [2] PlannerAgent   → generates chapter content (background)
      → [3] TeacherAgent   → teaches chunk by chunk + quizzes
```

---

## Project Structure

```
ai-tutor/
├── backend/
│   ├── src/
│   │   ├── backend/           # FastAPI app
│   │   │   ├── api/           # Route handlers (auth, agents, dashboard, quiz)
│   │   │   ├── auth/          # OTP, password hashing, email utils
│   │   │   ├── db/            # SQLAlchemy engine & session
│   │   │   ├── enums/         # Status, WorkflowStage, AgentType
│   │   │   ├── models/        # SQLAlchemy ORM models
│   │   │   └── schemas/       # Pydantic request/response schemas
│   │   └── llm/               # AI layer
│   │       ├── agent_core/    # Base Agent class (sync/async/stream)
│   │       ├── curriculum_agent/
│   │       ├── planner/
│   │       ├── teacher_agent/
│   │       ├── quiz_agent/
│   │       └── deep_research/ # LangGraph research pipeline
│   ├── alembic/               # Database migrations
│   ├── tests/
│   ├── .env.sample
│   ├── requirments.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── assets/
│   ├── package.json
│   └── Dockerfile
├── docs/                      # MkDocs documentation site
└── .github/workflows/         # CI/CD
```

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | OTP caching & rate limiting |
| Git | Any | Version control |

### Option A — Manual Setup

#### 1. Clone the repository

```bash
git clone https://github.com/Akshumishra/Ai_tutor.git
cd Ai_tutor
```

#### 2. Backend Setup

```bash
# From the project root, create & activate virtual environment
python -m venv .aitutorvenv

# Windows
.\.aitutorvenv\Scripts\activate

# macOS / Linux
source .aitutorvenv/bin/activate

# Navigate to backend and install dependencies
cd backend
pip install -r requirments.txt
```

#### 3. Configure Backend Environment

Copy the sample env file and fill in your values:

```bash
cp .env.sample .env
```

Open `.env` and set the following (see [Environment Variables](#-environment-variables) for details):

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:password@localhost:5432/aitutor
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SMTP_USERNAME=your@gmail.com
SMTP_PASSWORD=your_app_password
TAVILY_API_KEY=tvly-...
```

#### 4. Run Database Migrations

Ensure PostgreSQL is running, then:

```bash
# From the backend/ directory
alembic upgrade head
```

#### 5. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env   # or create manually — see below
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

#### 6. Start the Servers

We have provided convenient scripts to launch both the frontend and backend servers simultaneously. Run the appropriate command for your OS from the project root:

**For Windows:**
```bash
.\run.bat
```
*(This will open two separate command windows. Close those windows to stop the servers.)*

**For macOS / Linux:**
```bash
chmod +x run.sh
./run.sh
```
*(This runs both servers in the same terminal. Press `Ctrl+C` to stop them.)*

---

### Option B — Docker Compose (Recommended)

Run the entire stack with a single command:

```bash
# From the project root — create a docker-compose.yml if not present,
# or run each service independently using their Dockerfiles

# Backend
cd backend
docker build -t aitutor-backend .
docker run -p 8000:8000 --env-file .env aitutor-backend

# Frontend
cd frontend
docker build -t aitutor-frontend .
docker run -p 80:80 aitutor-frontend
```

> **Note**: The backend Dockerfile expects environment variables to be provided at runtime via `--env-file`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key for all LLM agents |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | `redis://localhost:6379/0` | Redis for OTP caching |
| `TAVILY_API_KEY` | ✅ | — | Tavily search API for deep research |
| `GOOGLE_CLIENT_ID` | ✅ | — | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | — | Google OAuth 2.0 client secret |
| `SMTP_SERVER` | ⚠️ | `smtp.gmail.com` | SMTP host for sending OTP emails |
| `SMTP_PORT` | ⚠️ | `587` | SMTP port |
| `SMTP_USERNAME` | ⚠️ | — | Email address for sending OTPs |
| `SMTP_PASSWORD` | ⚠️ | — | App password (Gmail: generate in Account settings) |
| `EMAILS_FROM` | ⚠️ | `no-reply@aitutor.com` | Sender display address |
| `OTP_EXPIRY_SECONDS` | ❌ | `600` | OTP validity window (10 min) |
| `OTP_LOCK_SECONDS` | ❌ | `60` | Cooldown between OTP requests |
| `LOG_LEVEL` | ❌ | `INFO` | Logging verbosity |
| `ALLOWED_ORIGINS` | ❌ | localhost ports | Comma-separated CORS origins |
| `ENABLE_QUERY_EXPANSION` | ❌ | — | Enable Tavily query expansion |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID (same as backend) |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/send-otp` | Send OTP to email |
| `POST` | `/api/auth/verify-otp` | Verify OTP code |
| `POST` | `/api/auth/register` | Register with OTP |
| `POST` | `/api/auth/login` | Email/password login |
| `POST` | `/api/auth/google` | Google OAuth login |
| `POST` | `/api/auth/forgot-password` | Initiate password reset |
| `POST` | `/api/auth/reset-password` | Reset password with OTP |
| `POST` | `/api/agents/curriculum` | Start curriculum chat (SSE stream) |
| `POST` | `/api/agents/teacher` | Start teaching session (SSE stream) |
| `POST` | `/api/agents/planner` | Trigger content generation (background) |
| `GET` | `/api/agents/chat-history` | Retrieve chat history |
| `GET` | `/api/agents/reconnect/{id}` | Reconnect to live SSE stream |
| `GET` | `/api/dashboard/courses` | List user's courses with progress |
| `POST` | `/api/dashboard/topics/create` | Create a new topic |
| `DELETE` | `/api/dashboard/topics/{id}` | Soft-delete a topic |
| `GET` | `/api/dashboard/chapters/{id}` | Get chapters with plan status |
| `GET` | `/api/dashboard/curriculum/{id}` | Get curriculum structure |
| `POST` | `/api/dashboard/curriculum/{id}/sync-chapters` | Save chapters from frontend |
| `POST` | `/api/dashboard/curriculum/{id}/finalize` | Finalize curriculum |
| `GET` | `/api/dashboard/workflow-status/{id}` | Get per-stage workflow status |
| `POST` | `/api/quiz/generate` | Generate quiz for a chapter |
| `POST` | `/api/quiz/submit` | Submit answers & mark chapter complete |

Full interactive API docs: `http://localhost:8000/docs`

---

## 🗄 Database Schema (Overview)

```
users
  id · name · email · hashed_password · is_verified
  └── topics (1:N)
        id · title · status · user_summary · learning_time_seconds
        ├── chapters (1:N, ordered by sequence)
        │     id · title · sequence · status · outline
        │     └── chapter_plans (1:N)
        │           id · title · sequence · status · content
        ├── agent_chats (1:N)
        │     id · agent_type · role · content · status · chapter_id
        └── workflow_status (1:N, one per WorkflowStage)
              id · stage · status · last_error
```

See [Database Schema Documentation](./docs/docs/database/schema.md) for the full ER diagram.

---

## Running Tests

```bash
cd backend

# Run all tests
pytest tests/

# Run a specific test file
pytest tests/test_dummy.py -v
```

---

## Documentation

Full project documentation (agents, database schema, API reference, deployment) is available in the [`docs/`](./docs) folder.

The documentation is deployed via GitHub Pages and can be viewed online.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ using FastAPI, React, OpenAI & LangGraph
</div>