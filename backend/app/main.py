import os

# Set thread limits and duplicate lib flags before any CTranslate2/MKL import
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.utils.config import settings
from app.database.connection import init_db
from app.api.endpoints import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database schema
    logger.info("Initializing SQLite database tables...")
    init_db()
    logger.info(f"SubTranslate AI backend started. Storage dir: {settings.STORAGE_DIR}")
    yield
    logger.info("Shutting down SubTranslate AI backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SubTranslate AI - AI-powered Subtitle & Video Translation with Gemini & Whisper",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all during dev or match settings.CORS_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount storage directory for video streaming
app.mount("/storage/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR)), name="uploads")

# Include API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
