from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class SubtitleItem(BaseModel):
    index: int
    start: str  # "00:00:01,000"
    end: str    # "00:00:04,500"
    start_ms: int
    end_ms: int
    text: str

class SubtitlePairItem(BaseModel):
    index: int
    start: str
    end: str
    start_ms: int
    end_ms: int
    original: str
    translated: str

class ParseSrtResponse(BaseModel):
    file_name: str
    subtitles_count: int
    items: List[SubtitleItem]

class TranslateSrtRequest(BaseModel):
    file_name: str = "subtitle.srt"
    source_language: str = "auto"
    target_language: str = "vi"
    translation_style: Optional[str] = "cinematic"
    context_hint: Optional[str] = None
    items: List[SubtitleItem]
    api_key: Optional[str] = None
    model_name: Optional[str] = None

class TranslationResultResponse(BaseModel):
    job_id: str
    file_name: str
    file_type: str
    source_language: str
    target_language: str
    subtitles_count: int
    items: List[SubtitlePairItem]
    video_url: Optional[str] = None
    subtitled_video_url: Optional[str] = None
    translated_srt: Optional[str] = None

class UpdateTranslationRequest(BaseModel):
    items: List[SubtitlePairItem]

class ExportSrtRequest(BaseModel):
    items: List[SubtitlePairItem]
    file_name: Optional[str] = "translated_subtitles.srt"
    use_translated: bool = True  # If False, export original

class HistoryItemResponse(BaseModel):
    id: int
    job_id: str
    file_name: str
    file_type: str
    source_language: str
    target_language: str
    status: str
    subtitles_count: int
    error_message: Optional[str] = None
    created_at: datetime
    video_path: Optional[str] = None
    subtitled_video_path: Optional[str] = None

    class Config:
        from_attributes = True

class ConfigStatusResponse(BaseModel):
    has_gemini_api_key: bool
    gemini_model: str
    whisper_model: str
    ffmpeg_available: bool

class SetApiKeyRequest(BaseModel):
    api_key: str

class Mp4ExportConfig(BaseModel):
    font_size: int = 22
    font_color: str = "#FFFFFF"
    outline_color: str = "#000000"
    border_style: int = 1  # 1 = outline, 3 = opaque box
    position: str = "bottom"  # "bottom", "top", "middle"
    preset: str = "fast"      # "ultrafast", "fast", "medium"
    subtitles_source: str = "translated"  # "translated" or "original"

class ExportMp4Request(BaseModel):
    job_id: str
    config: Optional[Mp4ExportConfig] = None
    items: Optional[List[SubtitlePairItem]] = None

