from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

from src.backend.api.agents import router as agents_router
from src.backend.api.auth import router as auth_router
from src.backend.api.dashboard import router as dashboard_router
from src.backend.api.quiz import router as quiz_router

app = FastAPI(
    title="AI Tutor Backend API",
    description="Backend API for AI Tutor LLM Agents",
    version="1.0.0"
)

# Set up CORS middleware.
# ALLOWED_ORIGINS env var should be a comma-separated list of allowed frontend origins.
# Example: "https://aitutor-frontend-app.xxx.azurecontainerapps.io"
# If not set, defaults to common localhost ports for local development.
# NOTE: allow_credentials=True requires explicit origins (not "*") per the CORS spec.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    or [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.azurecontainerapps\.io",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the routers
app.include_router(agents_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("src.backend.main:app", host="0.0.0.0", port=8000, reload=True)  # nosec B104
