@echo off
echo ==========================================
echo Starting AI Tutor Services...
echo ==========================================

echo Starting Backend in a new window...
start cmd /k "cd backend && ..\.aitutorvenv\Scripts\activate && uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Frontend in a new window...
start cmd /k "cd frontend && npm run dev"

echo Both services have been launched in separate windows!
echo Close those windows to stop the servers.
