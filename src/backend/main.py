from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

load_dotenv()

from src.backend.api.agents import router as agents_router
from src.backend.api.auth import router as auth_router
from src.backend.api.dashboard import router as dashboard_router

app = FastAPI(
    title="AI Tutor Backend API",
    description="Backend API for AI Tutor LLM Agents",
    version="1.0.0"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, adjust if needed for production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Mount the routers
app.include_router(agents_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("src.backend.main:app", host="0.0.0.0", port=8000, reload=True)
