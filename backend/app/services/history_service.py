from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.history import TranslationHistory

class HistoryService:
    @staticmethod
    def create_record(
        db: Session,
        job_id: str,
        file_name: str,
        file_type: str,
        source_language: str,
        target_language: str,
        status: str = "processing",
        original_srt_content: Optional[str] = None,
        translated_srt_content: Optional[str] = None,
        subtitles_count: int = 0,
        video_path: Optional[str] = None,
        subtitled_video_path: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> TranslationHistory:
        record = TranslationHistory(
            job_id=job_id,
            file_name=file_name,
            file_type=file_type,
            source_language=source_language,
            target_language=target_language,
            status=status,
            original_srt_content=original_srt_content,
            translated_srt_content=translated_srt_content,
            subtitles_count=subtitles_count,
            video_path=video_path,
            subtitled_video_path=subtitled_video_path,
            error_message=error_message
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def update_record(
        db: Session,
        job_id: str,
        status: Optional[str] = None,
        translated_srt_content: Optional[str] = None,
        original_srt_content: Optional[str] = None,
        subtitles_count: Optional[int] = None,
        video_path: Optional[str] = None,
        subtitled_video_path: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> Optional[TranslationHistory]:
        record = db.query(TranslationHistory).filter(TranslationHistory.job_id == job_id).first()
        if not record:
            return None
        if status is not None:
            record.status = status
        if translated_srt_content is not None:
            record.translated_srt_content = translated_srt_content
        if original_srt_content is not None:
            record.original_srt_content = original_srt_content
        if subtitles_count is not None:
            record.subtitles_count = subtitles_count
        if video_path is not None:
            record.video_path = video_path
        if subtitled_video_path is not None:
            record.subtitled_video_path = subtitled_video_path
        if error_message is not None:
            record.error_message = error_message
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_all(db: Session, limit: int = 100) -> List[TranslationHistory]:
        return db.query(TranslationHistory).order_by(TranslationHistory.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_by_job_id(db: Session, job_id: str) -> Optional[TranslationHistory]:
        return db.query(TranslationHistory).filter(TranslationHistory.job_id == job_id).first()

    @staticmethod
    def delete_by_job_id(db: Session, job_id: str) -> bool:
        record = db.query(TranslationHistory).filter(TranslationHistory.job_id == job_id).first()
        if not record:
            return False
        db.delete(record)
        db.commit()
        return True
