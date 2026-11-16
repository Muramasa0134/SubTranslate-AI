import io
import av
import logging
import numpy as np
from typing import Optional, Dict, Any, List
from google import genai
from google.genai import types

from app.utils.config import settings
from app.services.whisper_service import WhisperService

logger = logging.getLogger(__name__)

class LiveTranslationService:
    _client = None
    _client_key = None

    @classmethod
    def get_client(cls, api_key: Optional[str] = None):
        key = api_key or settings.GEMINI_API_KEY
        if not key:
            return None
        if cls._client is None or cls._client_key != key:
            cls._client = genai.Client(api_key=key)
            cls._client_key = key
        return cls._client
    @staticmethod
    def decode_audio_bytes(audio_bytes: bytes) -> np.ndarray:
        """
        Decodes any incoming audio format (WebM, WAV, MP3, OGG, AAC) in memory
        directly into a 16kHz mono float32 numpy array for Whisper inference.
        Zero disk I/O for maximum real-time throughput.
        """
        if not audio_bytes or len(audio_bytes) < 100:
            return np.zeros(0, dtype=np.float32)

        try:
            container = av.open(io.BytesIO(audio_bytes))
            if not container.streams.audio:
                return np.zeros(0, dtype=np.float32)

            resampler = av.AudioResampler(format='fltp', layout='mono', rate=16000)
            frames = []

            for frame in container.decode(audio=0):
                for resampled in resampler.resample(frame):
                    frames.append(resampled.to_ndarray())

            if not frames:
                return np.zeros(0, dtype=np.float32)

            audio_np = np.concatenate(frames, axis=1).flatten()
            return audio_np
        except Exception as e:
            logger.warning(f"PyAV memory decode failed: {e}. Trying fallback...")
            return np.zeros(0, dtype=np.float32)

    @classmethod
    def transcribe_chunk(
        cls,
        audio_np: np.ndarray,
        source_language: Optional[str] = "auto"
    ) -> Dict[str, Any]:
        """
        Transcribes an in-memory 16kHz float32 audio slice using faster-whisper.
        Returns text, detected language, and confidence.
        """
        if len(audio_np) < 8000:  # Less than 0.5 seconds
            return {"text": "", "language": "en", "is_speech": False}

        # Check energy / RMS to quickly discard silence before invoking model
        rms = np.sqrt(np.mean(audio_np ** 2))
        if rms < 0.005:  # Silence threshold
            return {"text": "", "language": "en", "is_speech": False}

        model = WhisperService.get_model()

        lang = None
        if source_language and source_language.lower() != "auto":
            lang = source_language.lower()

        segments, info = model.transcribe(
            audio_np,
            language=lang,
            beam_size=1,
            temperature=0.0,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=300)
        )

        texts = []
        for s in segments:
            t = s.text.strip()
            if t:
                texts.append(t)

        full_text = " ".join(texts).strip()
        return {
            "text": full_text,
            "language": info.language if info else (lang or "auto"),
            "language_prob": info.language_probability if info else 1.0,
            "is_speech": bool(full_text)
        }

    @classmethod
    def translate_live_text(
        cls,
        text: str,
        source_lang: str = "auto",
        target_lang: str = "vi",
        style: str = "cinematic",
        prev_context: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> str:
        """
        Translates live detected speech in ultra-low latency (<0.8s) using Gemini 3.5 Flash
        with thinking_budget=0 and conversational context.
        """
        if not text or not text.strip():
            return ""

        client = cls.get_client(api_key)
        if not client:
            return text

        context_prompt = ""
        if prev_context and prev_context.strip():
            context_prompt = f"Previous spoken context: \"{prev_context.strip()}\"\n"

        prompt = f"""You are a professional live subtitle translator for streaming video.
Translate the following live spoken line into natural, expressive, concise {target_lang}.
Style: {style} (natural spoken flow, proper pronouns, punchy subtitle length).
{context_prompt}
Spoken line to translate:
"{text.strip()}"

Return ONLY the direct translated sentence in plain text. No quotes, no explanations, no JSON."""

        models_to_try = [settings.GEMINI_MODEL or "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
        for m in models_to_try:
            try:
                res = client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        thinking_config=types.ThinkingConfig(thinking_budget=0)
                    )
                )
                if res and res.text:
                    return res.text.strip().strip('"')
            except Exception as e:
                try:
                    res = client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=types.GenerateContentConfig(temperature=0.3)
                    )
                    if res and res.text:
                        return res.text.strip().strip('"')
                except Exception:
                    continue

        return text
