import os
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "SubTranslate AI"
    VERSION: str = "1.0.0"
    
    # Storage paths
    STORAGE_DIR: Path = BASE_DIR / os.getenv("STORAGE_DIR", "storage")
    UPLOADS_DIR: Path = STORAGE_DIR / "uploads"
    AUDIO_DIR: Path = STORAGE_DIR / "audio"
    SUBTITLES_DIR: Path = STORAGE_DIR / "subtitles"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{STORAGE_DIR / 'subtranslate.db'}"
    
    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    
    # Whisper
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    
    # CORS
    CORS_ORIGINS: list[str] = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

settings = Settings()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.AUDIO_DIR.mkdir(parents=True, exist_ok=True)
settings.SUBTITLES_DIR.mkdir(parents=True, exist_ok=True)
