#!/bin/bash
echo "=========================================="
echo "Starting AI Tutor Services..."
echo "=========================================="

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Catch Ctrl+C and call the cleanup function
trap cleanup INT TERM

echo "Starting Backend..."
cd backend
source ../.aitutorvenv/bin/activate
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Both services are running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID
