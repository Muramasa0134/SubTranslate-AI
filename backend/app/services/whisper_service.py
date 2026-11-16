import logging
import av
from pathlib import Path
from typing import List, Optional

# Compatibility fix for newer PyAV (av>=14) where 'metadata_errors' parameter was removed
_orig_av_open = av.open
def _safe_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _orig_av_open(*args, **kwargs)

av.open = _safe_av_open
try:
    import faster_whisper.audio
    faster_whisper.audio.av.open = _safe_av_open
except Exception:
    pass

from faster_whisper import WhisperModel
from app.utils.config import settings
from app.models.schemas import SubtitleItem
from app.services.srt_service import ms_to_srt_time

logger = logging.getLogger(__name__)

class WhisperService:
    _instance: Optional[WhisperModel] = None
    _loaded_model_name: Optional[str] = None

    @classmethod
    def get_model(cls, model_size: Optional[str] = None) -> WhisperModel:
        """Singleton loader for WhisperModel to prevent redundant re-loading into memory."""
        target_model = model_size or settings.WHISPER_MODEL
        
        if cls._instance is None or cls._loaded_model_name != target_model:
            logger.info(f"Loading faster-whisper model '{target_model}' on {settings.WHISPER_DEVICE} ({settings.WHISPER_COMPUTE_TYPE})...")
            try:
                cls._instance = WhisperModel(
                    target_model,
                    device=settings.WHISPER_DEVICE,
                    compute_type=settings.WHISPER_COMPUTE_TYPE,
                    cpu_threads=4
                )
                cls._loaded_model_name = target_model
                logger.info(f"faster-whisper model '{target_model}' loaded successfully with 4 CPU threads.")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                # Fallback to int8 on CPU if target failed
                if settings.WHISPER_DEVICE != "cpu":
                    logger.info("Falling back to CPU device...")
                    cls._instance = WhisperModel(target_model, device="cpu", compute_type="int8")
                    cls._loaded_model_name = target_model
                else:
                    raise e

        return cls._instance

    @classmethod
    def transcribe(
        cls,
        audio_path: Path,
        source_language: Optional[str] = None,
        model_size: Optional[str] = None
    ) -> List[SubtitleItem]:
        """
        Transcribes audio file using faster-whisper into a list of SubtitleItem
        with accurate timestamps.
        """
        model = cls.get_model(model_size)

        lang = None
        if source_language and source_language.lower() != "auto":
            lang = source_language.lower()

        logger.info(f"Transcribing audio file: {audio_path} (language: {lang or 'auto-detect'})...")
        segments, info = model.transcribe(
            str(audio_path),
            language=lang,
            beam_size=1,                       # Reduced from 5 — saves ~400 MB RAM
            temperature=0.0,                   # Deterministic greedy decoding — fastest
            condition_on_previous_text=True,   # Improves sentence continuity
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        detected_lang = info.language
        logger.info(f"Detected language: {detected_lang} with probability {info.language_probability:.2f}")

        items: List[SubtitleItem] = []
        for idx, segment in enumerate(segments, start=1):
            text = segment.text.strip()
            if not text:
                continue

            start_ms = int(segment.start * 1000)
            end_ms = int(segment.end * 1000)

            items.append(SubtitleItem(
                index=idx,
                start=ms_to_srt_time(start_ms),
                end=ms_to_srt_time(end_ms),
                start_ms=start_ms,
                end_ms=end_ms,
                text=text
            ))

        logger.info(f"Generated {len(items)} subtitle segments from transcription.")
        return items
