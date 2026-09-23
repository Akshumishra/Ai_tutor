# Backend Setup

Follow these steps to configure the FastAPI backend locally.

## 1. Virtual Environment & Dependencies

From the project root, create a virtual environment and install dependencies:

```bash
# Create and activate environment
python -m venv .aitutorvenv
# Windows: .\.aitutorvenv\Scripts\activate
# Mac/Linux: source .aitutorvenv/bin/activate

# Install dependencies
cd backend
pip install -r requirments.txt
```

## 2. Configuration
Copy the sample environment file and fill in your API keys:
```bash
cp .env.sample .env
```
*(Refer to `.env.sample` for all required variables like `OPENAI_API_KEY`, DB/Redis URLs, and SMTP details.)*

## 3. Database Setup
Ensure PostgreSQL is running, then create a database named `aitutor`:
```sql
CREATE DATABASE aitutor;
```

Run Alembic migrations to create the tables:
```bash
alembic upgrade head
```

## 4. Running the Backend
You can run the backend manually:
```bash
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```
*Alternatively, you can launch both frontend and backend simultaneously from the project root using `.\run.bat` (Windows) or `./run.sh` (Mac/Linux).*

---

## Next Step
→ [Frontend Setup](frontend.md)
