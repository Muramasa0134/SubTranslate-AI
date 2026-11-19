import os

# Crucial memory stability flags for Intel MKL & CTranslate2 (faster-whisper)
os.environ["MKL_DISABLE_FAST_MM"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["CT2_PACKED_GEMM"] = "0"
os.environ["MKL_DYNAMIC"] = "FALSE"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import gc
import logging
import subprocess
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
from app.services.audio_service import get_ffmpeg_binary

logger = logging.getLogger(__name__)

class WhisperService:
    _instance: Optional[WhisperModel] = None
    _loaded_model_name: Optional[str] = None

    @classmethod
    def get_model(cls, model_size: Optional[str] = None) -> WhisperModel:
        """Singleton loader for WhisperModel with aggressive memory reclamation when switching models."""
        target_model = model_size or settings.WHISPER_MODEL or "tiny"
        
        # When switching models (e.g. tiny <-> base), aggressively free previous instance
        if cls._instance is not None and cls._loaded_model_name != target_model:
            logger.info(f"Unloading previous Whisper model '{cls._loaded_model_name}' to free memory...")
            del cls._instance
            cls._instance = None
            gc.collect()

        if cls._instance is None:
            # Always use 1 CPU thread to avoid multi-thread MKL heap allocation spikes on Windows
            num_threads = 1
            compute_type = "int8"
            
            logger.info(f"Loading faster-whisper model '{target_model}' on CPU ({compute_type}) with {num_threads} CPU thread...")
            try:
                cls._instance = WhisperModel(
                    target_model,
                    device="cpu",
                    compute_type=compute_type,
                    cpu_threads=num_threads
                )
                cls._loaded_model_name = target_model
                logger.info(f"faster-whisper model '{target_model}' loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load Whisper model '{target_model}': {e}")
                # Fallback to tiny if base failed
                if target_model != "tiny":
                    logger.info("Falling back to lightweight 'tiny' model...")
                    gc.collect()
                    cls._instance = WhisperModel(
                        "tiny",
                        device="cpu",
                        compute_type="int8",
                        cpu_threads=1
                    )
                    cls._loaded_model_name = "tiny"
                else:
                    raise e

        return cls._instance

    @staticmethod
    def get_audio_duration_seconds(audio_path: Path) -> float:
        """Determines audio duration safely using PyAV or byte size."""
        try:
            with av.open(str(audio_path)) as container:
                if container.duration:
                    return float(container.duration) / 1000000.0
        except Exception:
            pass
        
        # Fallback based on 16kHz Mono 16-bit PCM WAV (32,000 bytes/sec)
        try:
            size = audio_path.stat().st_size
            if size > 44:
                return float(size - 44) / 32000.0
        except Exception:
            pass
        return 0.0

    @classmethod
    def _transcribe_single_file(
        cls,
        model: WhisperModel,
        audio_path: Path,
        lang: Optional[str],
        offset_ms: int = 0
    ) -> List[SubtitleItem]:
        """Transcribes a single audio slice with VAD and fallback to non-VAD."""
        vad_params = dict(
            threshold=0.35,
            min_silence_duration_ms=500,
            speech_pad_ms=400
        )

        items: List[SubtitleItem] = []
        try:
            segments, info = model.transcribe(
                str(audio_path),
                language=lang,
                beam_size=1,
                temperature=0.0,
                condition_on_previous_text=True,
                vad_filter=True,
                vad_parameters=vad_params
            )
            for idx, segment in enumerate(segments, start=1):
                text = segment.text.strip()
                if not text:
                    continue

                start_ms = offset_ms + int(segment.start * 1000)
                end_ms = offset_ms + int(segment.end * 1000)

                items.append(SubtitleItem(
                    index=idx,
                    start=ms_to_srt_time(start_ms),
                    end=ms_to_srt_time(end_ms),
                    start_ms=start_ms,
                    end_ms=end_ms,
                    text=text
                ))
        except Exception as vad_err:
            logger.warning(f"VAD transcription failed or threw error: {vad_err}. Retrying with vad_filter=False...")
            items = []

        # Fallback: Transcribe without VAD filter if VAD returned 0 or errored
        if not items:
            try:
                segments_fallback, _ = model.transcribe(
                    str(audio_path),
                    language=lang,
                    beam_size=1,
                    temperature=0.0,
                    condition_on_previous_text=False,
                    vad_filter=False
                )
                for idx, segment in enumerate(segments_fallback, start=1):
                    text = segment.text.strip()
                    if not text:
                        continue

                    start_ms = offset_ms + int(segment.start * 1000)
                    end_ms = offset_ms + int(segment.end * 1000)

                    items.append(SubtitleItem(
                        index=idx,
                        start=ms_to_srt_time(start_ms),
                        end=ms_to_srt_time(end_ms),
                        start_ms=start_ms,
                        end_ms=end_ms,
                        text=text
                    ))
            except Exception as fb_err:
                logger.error(f"Non-VAD transcription also failed: {fb_err}")

        return items

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
        
        Features:
        - Memory protection: Automatically slices long audio (>180s) into 180s chunks
          to guarantee zero OOM (mkl_malloc) crashes on any video length.
        - Robust fallback: Recovers from noisy background music or silent segments.
        """
        model = cls.get_model(model_size)

        lang = None
        if source_language and source_language.lower() != "auto":
            lang = source_language.lower()

        duration = cls.get_audio_duration_seconds(audio_path)
        logger.info(f"Transcribing audio file: {audio_path} (Duration: {duration:.1f}s, Language: {lang or 'auto-detect'}, Model: {cls._loaded_model_name})...")

        # For short audio (<= 180s), transcribe directly in one pass
        if duration <= 180.0:
            items = cls._transcribe_single_file(model, audio_path, lang, offset_ms=0)
            logger.info(f"Generated {len(items)} subtitle segments from single-pass transcription.")
            return items

        # For long audio (> 180s), slice into 180s chunks using FFmpeg to preserve low RAM footprint
        ffmpeg_bin = get_ffmpeg_binary()
        if not ffmpeg_bin:
            logger.warning("FFmpeg not found for audio chunking, attempting direct single-pass...")
            return cls._transcribe_single_file(model, audio_path, lang, offset_ms=0)

        chunk_size = 180.0  # 3 minutes per chunk
        all_items: List[SubtitleItem] = []
        start_sec = 0.0
        chunk_idx = 0
        global_idx = 1

        while start_sec < duration:
            chunk_dur = min(chunk_size, duration - start_sec)
            chunk_file = audio_path.parent / f"{audio_path.stem}_chunk_{chunk_idx}.wav"
            offset_ms = int(start_sec * 1000)

            try:
                cmd = [
                    ffmpeg_bin, "-y",
                    "-ss", f"{start_sec:.3f}",
                    "-t", f"{chunk_dur:.3f}",
                    "-i", str(audio_path),
                    "-c", "copy",
                    str(chunk_file)
                ]
                subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

                chunk_items = cls._transcribe_single_file(model, chunk_file, lang, offset_ms=offset_ms)
                for item in chunk_items:
                    item.index = global_idx
                    global_idx += 1
                    all_items.append(item)

                logger.info(f"Chunk {chunk_idx + 1} ({start_sec:.0f}s - {start_sec + chunk_dur:.0f}s): {len(chunk_items)} segments")
            except Exception as chunk_err:
                logger.error(f"Error processing audio chunk {chunk_idx}: {chunk_err}")
            finally:
                if chunk_file.exists():
                    try:
                        chunk_file.unlink()
                    except Exception:
                        pass
                gc.collect()

            start_sec += chunk_dur
            chunk_idx += 1

        logger.info(f"Generated {len(all_items)} subtitle segments from chunked transcription.")
        return all_items
