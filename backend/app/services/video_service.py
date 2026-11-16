import re
import shutil
import subprocess
import logging
from pathlib import Path
from typing import Optional
from app.utils.config import settings
from app.services.audio_service import get_ffmpeg_binary

logger = logging.getLogger(__name__)

def hex_to_ass_color(hex_str: str) -> str:
    """
    Converts a web hex color (#RRGGBB or RRGGBB) to ASS color format (&H00BBGGRR&).
    ASS colors are stored in BGR order with leading alpha &H<alpha><blue><green><red>&.
    """
    clean_hex = hex_str.strip().lstrip("#")
    if len(clean_hex) == 3:
        clean_hex = "".join([c * 2 for c in clean_hex])
    if len(clean_hex) != 6:
        clean_hex = "FFFFFF"  # Default white

    r = clean_hex[0:2]
    g = clean_hex[2:4]
    b = clean_hex[4:6]
    return f"&H00{b.upper()}{g.upper()}{r.upper()}&"

class VideoService:
    @staticmethod
    def convert_to_web_mp4(input_path: Path, output_mp4_path: Path) -> Path:
        """
        Converts/transcodes any video format (MKV, MOV, WebM, AVI, etc.) to 
        standard web-optimized MP4 (H.264 + AAC + faststart) for HTML5 video player compatibility.
        """
        ffmpeg_bin = get_ffmpeg_binary()
        if not ffmpeg_bin:
            raise RuntimeError("FFmpeg executable not found.")

        output_mp4_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            ffmpeg_bin, "-y",
            "-threads", "4",
            "-i", str(input_path),
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-threads", "4",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            str(output_mp4_path)
        ]

        logger.info(f"Transcoding video to web-compatible MP4: {' '.join(cmd)}")
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            logger.error(f"FFmpeg transcode failed: {res.stderr}")
            raise RuntimeError(f"Video MP4 transcoding failed: {res.stderr[-400:]}")

        return output_mp4_path

    @staticmethod
    def burn_subtitles_to_mp4(
        input_video_path: Path,
        srt_content: str,
        output_mp4_path: Path,
        font_size: int = 22,
        font_color: str = "#FFFFFF",
        outline_color: str = "#000000",
        border_style: int = 1,  # 1 = outline, 3 = background box
        position: str = "bottom",  # "bottom", "top", "middle"
        preset: str = "ultrafast"  # Default to ultrafast for maximum throughput
    ) -> Path:
        """
        Burns subtitles directly into an MP4 video (Hardsub) with customizable
        styling options using FFmpeg subtitles filter.
        """
        ffmpeg_bin = get_ffmpeg_binary()
        if not ffmpeg_bin:
            raise RuntimeError("FFmpeg executable not found.")

        # Ensure directories
        temp_srt_dir = settings.SUBTITLES_DIR
        temp_srt_dir.mkdir(parents=True, exist_ok=True)
        temp_srt_path = temp_srt_dir / f"temp_{output_mp4_path.stem}.srt"

        # Apply smart line-wrapping so long sentences wrap into balanced 2 lines
        try:
            from app.services.srt_service import SRTService
            parsed_items = SRTService.parse_srt_content(srt_content)
            if parsed_items:
                final_srt = SRTService.generate_srt_from_items(parsed_items, smart_wrap=True)
            else:
                final_srt = srt_content
        except Exception:
            final_srt = srt_content

        # Save SRT content with UTF-8
        temp_srt_path.write_text(final_srt, encoding="utf-8")

        # Alignment map: ASS alignment (2 = Bottom, 6 = Top, 10 = Middle)
        alignment_map = {
            "bottom": 2,
            "top": 6,
            "middle": 10
        }
        align_val = alignment_map.get(position.lower(), 2)

        # Convert hex colors to ASS format
        primary_ass = hex_to_ass_color(font_color)
        outline_ass = hex_to_ass_color(outline_color)

        # Style elements (commas must be escaped with \\, for FFmpeg filter parser)
        style_parts = [
            "FontName=Arial",
            f"FontSize={font_size}",
            f"PrimaryColour={primary_ass}",
            f"OutlineColour={outline_ass}",
            f"BorderStyle={border_style}",
            "Outline=2",
            "Shadow=1",
            f"MarginV={'30' if align_val == 2 else '20'}",
            f"Alignment={align_val}"
        ]
        if border_style == 3:
            # Semi-transparent background box
            style_parts.append("BackColour=&H80000000&")

        style_str = "\\,".join(style_parts)

        # Run with cwd set to temp_srt_path.parent to avoid Windows colon path escaping issues
        chosen_preset = preset if preset in ["ultrafast", "superfast", "veryfast"] else "ultrafast"
        cmd = [
            ffmpeg_bin, "-y",
            "-threads", "4",
            "-i", str(input_video_path.resolve()),
            "-vf", f"subtitles={temp_srt_path.name}:force_style={style_str}",
            "-c:v", "libx264",
            "-preset", chosen_preset,
            "-crf", "24",
            "-pix_fmt", "yuv420p",
            "-threads", "4",
            "-c:a", "copy",
            "-movflags", "+faststart",
            str(output_mp4_path.resolve())
        ]

        logger.info(f"Burning subtitles to MP4 (ultrafast multi-thread): {' '.join(cmd)}")
        res = subprocess.run(
            cmd,
            cwd=str(temp_srt_path.parent),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # If audio copy failed (e.g. incompatible source audio stream), fallback to aac re-encode
        if res.returncode != 0 and "could not find tag for codec" in res.stderr.lower():
            logger.info("Audio copy failed; falling back to AAC encoding...")
            cmd_fallback = [
                ffmpeg_bin, "-y",
                "-threads", "4",
                "-i", str(input_video_path.resolve()),
                "-vf", f"subtitles={temp_srt_path.name}:force_style={style_str}",
                "-c:v", "libx264",
                "-preset", chosen_preset,
                "-crf", "24",
                "-pix_fmt", "yuv420p",
                "-threads", "4",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                str(output_mp4_path.resolve())
            ]
            res = subprocess.run(
                cmd_fallback,
                cwd=str(temp_srt_path.parent),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

        # Clean up temporary SRT file
        try:
            if temp_srt_path.exists():
                temp_srt_path.unlink()
        except Exception:
            pass

        if res.returncode != 0:
            logger.error(f"FFmpeg subtitle burn failed: {res.stderr}")
            raise RuntimeError(f"FFmpeg subtitle burning failed: {res.stderr[-400:]}")

        if not output_mp4_path.exists() or output_mp4_path.stat().st_size == 0:
            raise RuntimeError("Generated MP4 file is empty or missing.")

        return output_mp4_path
