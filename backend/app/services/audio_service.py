import os
import shutil
import subprocess
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

def get_ffmpeg_binary() -> Optional[str]:
    """Finds available FFmpeg executable from system PATH or imageio-ffmpeg."""
    # Check system PATH
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    # Fallback to imageio_ffmpeg
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as e:
        logger.warning(f"Failed to get imageio_ffmpeg binary: {e}")

    return None

class AudioService:
    @staticmethod
    def is_ffmpeg_available() -> bool:
        return get_ffmpeg_binary() is not None

    @staticmethod
    def extract_audio(video_path: Path, output_wav_path: Path) -> Path:
        """
        Extracts audio from a video file and converts it to 16kHz mono WAV,
        ideal for Whisper transcription.
        """
        ffmpeg_bin = get_ffmpeg_binary()
        if not ffmpeg_bin:
            raise RuntimeError(
                "FFmpeg executable not found. Please ensure FFmpeg is installed or imageio-ffmpeg is available."
            )

        output_wav_path.parent.mkdir(parents=True, exist_ok=True)

        # ffmpeg -y -i input.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
        cmd = [
            ffmpeg_bin,
            "-y",
            "-i", str(video_path),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            str(output_wav_path)
        ]

        logger.info(f"Extracting audio using FFmpeg: {' '.join(cmd)}")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr}")

        if not output_wav_path.exists() or output_wav_path.stat().st_size == 0:
            raise RuntimeError("FFmpeg completed but the output audio file is empty or missing.")

        return output_wav_path
