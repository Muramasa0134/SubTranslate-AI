import os
import shutil
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from app.services.audio_service import get_ffmpeg_binary

logger = logging.getLogger(__name__)

def ensure_ffmpeg_ready() -> Optional[str]:
    """
    Ensures FFmpeg is available and named ffmpeg.exe so yt-dlp and system tools
    can discover it via PATH.
    """
    ffmpeg_bin = get_ffmpeg_binary()
    if not ffmpeg_bin:
        return None

    ffmpeg_path = Path(ffmpeg_bin)
    ffmpeg_dir = ffmpeg_path.parent

    # On Windows, if imageio_ffmpeg has a name like ffmpeg-win-x86_64-v9.0.2.exe,
    # make sure a copy or hardlink named ffmpeg.exe exists in that folder.
    target_ffmpeg_exe = ffmpeg_dir / "ffmpeg.exe"
    if not target_ffmpeg_exe.exists() and ffmpeg_path.exists():
        try:
            # Try hardlink first to save disk space
            os.link(str(ffmpeg_path), str(target_ffmpeg_exe))
        except Exception:
            try:
                shutil.copy2(str(ffmpeg_path), str(target_ffmpeg_exe))
            except Exception as e:
                logger.warning(f"Failed to create ffmpeg.exe copy: {e}")

    # Add directory to os.environ["PATH"] if not present
    str_dir = str(ffmpeg_dir)
    current_path = os.environ.get("PATH", "")
    if str_dir not in current_path:
        os.environ["PATH"] = str_dir + os.pathsep + current_path

    return str(ffmpeg_dir)

class DownloadService:
    @staticmethod
    def get_video_info(url: str) -> Dict[str, Any]:
        """
        Extracts metadata (title, duration, thumbnail, uploader) without downloading.
        """
        import yt_dlp

        ensure_ffmpeg_ready()
        clean_url = url.strip()

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "socket_timeout": 15,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=False)
                if not info:
                    raise RuntimeError("Không thể trích xuất thông tin video từ URL này.")

                duration = info.get("duration")
                duration_str = None
                if duration:
                    mins = int(duration // 60)
                    secs = int(duration % 60)
                    duration_str = f"{mins:02d}:{secs:02d}"

                return {
                    "title": info.get("title") or "Video",
                    "duration": duration,
                    "duration_string": duration_str,
                    "thumbnail": info.get("thumbnail"),
                    "uploader": info.get("uploader") or info.get("channel") or "Unknown",
                    "webpage_url": info.get("webpage_url") or clean_url,
                }
        except Exception as e:
            logger.error(f"Error extracting video info from {clean_url}: {e}")
            raise RuntimeError(f"Không thể đọc thông tin video: {str(e)}")

    @staticmethod
    def download_video(url: str, output_mp4_path: Path, max_height: int = 1080) -> Dict[str, Any]:
        """
        Downloads video and merges to a standard MP4 file at output_mp4_path.
        Returns metadata dictionary.
        """
        import yt_dlp

        ffmpeg_dir = ensure_ffmpeg_ready()
        clean_url = url.strip()

        output_mp4_path.parent.mkdir(parents=True, exist_ok=True)
        # Template without extension
        base_template = str(output_mp4_path.parent / output_mp4_path.stem)

        ydl_opts = {
            # Prefer MP4 container with H.264/AAC for HTML5 player compatibility
            "format": f"bestvideo[height<={max_height}][ext=mp4]+bestaudio[ext=m4a]/best[height<={max_height}][ext=mp4]/best[height<={max_height}]/best",
            "outtmpl": base_template + ".%(ext)s",
            "merge_output_format": "mp4",
            "noplaylist": True,
            "quiet": False,
            "no_warnings": True,
            "socket_timeout": 30,
        }

        if ffmpeg_dir:
            ydl_opts["ffmpeg_location"] = ffmpeg_dir

        logger.info(f"Downloading video from URL: {clean_url} -> {output_mp4_path}")

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=True)
                if not info:
                    raise RuntimeError("Không thể tải video từ URL được cung cấp.")

                # Locate the downloaded file
                expected_mp4 = output_mp4_path.parent / f"{output_mp4_path.stem}.mp4"
                if not expected_mp4.exists():
                    # Check if saved with another extension
                    matches = list(output_mp4_path.parent.glob(f"{output_mp4_path.stem}.*"))
                    if matches:
                        actual_file = matches[0]
                        if actual_file.suffix.lower() != ".mp4":
                            # Transcode to mp4
                            from app.services.video_service import VideoService
                            VideoService.convert_to_web_mp4(actual_file, expected_mp4)
                            try:
                                actual_file.unlink()
                            except Exception:
                                pass
                        else:
                            actual_file.rename(expected_mp4)

                if not expected_mp4.exists() or expected_mp4.stat().st_size == 0:
                    raise RuntimeError("File video tải về bị lỗi hoặc rỗng.")

                duration = info.get("duration")
                duration_str = None
                if duration:
                    mins = int(duration // 60)
                    secs = int(duration % 60)
                    duration_str = f"{mins:02d}:{secs:02d}"

                return {
                    "title": info.get("title") or "Video",
                    "duration": duration,
                    "duration_string": duration_str,
                    "thumbnail": info.get("thumbnail"),
                    "uploader": info.get("uploader") or info.get("channel"),
                    "file_path": expected_mp4,
                }
        except Exception as e:
            logger.error(f"Download video failed for {clean_url}: {e}")
            raise RuntimeError(f"Lỗi khi tải video từ link: {str(e)}")
