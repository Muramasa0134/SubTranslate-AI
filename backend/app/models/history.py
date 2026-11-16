from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database.connection import Base

class TranslationHistory(Base):
    __tablename__ = "translation_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # "srt" or "video"
    source_language = Column(String(50), default="auto")
    target_language = Column(String(50), default="vi")
    status = Column(String(50), default="completed")  # "completed", "failed", "processing"
    error_message = Column(Text, nullable=True)
    subtitles_count = Column(Integer, default=0)
    original_srt_content = Column(Text, nullable=True)
    translated_srt_content = Column(Text, nullable=True)
    video_path = Column(String(500), nullable=True)  # Original video path
    subtitled_video_path = Column(String(500), nullable=True)  # Video with hardcoded subtitles
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
