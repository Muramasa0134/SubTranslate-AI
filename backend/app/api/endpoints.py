import os
import uuid
import shutil
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse, FileResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.schemas import (
    SubtitleItem,
    SubtitlePairItem,
    ParseSrtResponse,
    TranslateSrtRequest,
    TranslationResultResponse,
    UpdateTranslationRequest,
    ExportSrtRequest,
    HistoryItemResponse,
    ConfigStatusResponse,
    SetApiKeyRequest,
    Mp4ExportConfig,
    ExportMp4Request
)
from app.utils.config import settings
from app.services.srt_service import SRTService
from app.services.gemini_service import GeminiTranslationService
from app.services.audio_service import AudioService
from app.services.whisper_service import WhisperService
from app.services.video_service import VideoService
from app.services.history_service import HistoryService
from app.services.live_service import LiveTranslationService

logger = logging.getLogger(__name__)

router = APIRouter()

# -------------------------------------------------------------
# Configuration & Health Endpoints
# -------------------------------------------------------------

@router.get("/config", response_model=ConfigStatusResponse)
def get_config():
    return ConfigStatusResponse(
        has_gemini_api_key=bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip()),
        gemini_model=settings.GEMINI_MODEL,
        whisper_model=settings.WHISPER_MODEL,
        ffmpeg_available=AudioService.is_ffmpeg_available()
    )

@router.post("/config/api-key")
def set_api_key(payload: SetApiKeyRequest):
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty.")
    
    settings.GEMINI_API_KEY = key
    os.environ["GEMINI_API_KEY"] = key

    # Persist to .env file if possible
    env_file = Path(__file__).resolve().parent.parent.parent / ".env"
    try:
        content = ""
        if env_file.exists():
            content = env_file.read_text(encoding="utf-8")
        
        if "GEMINI_API_KEY=" in content:
            import re
            content = re.sub(r'GEMINI_API_KEY=.*', f'GEMINI_API_KEY={key}', content)
        else:
            content += f"\nGEMINI_API_KEY={key}\n"
        
        env_file.write_text(content, encoding="utf-8")
    except Exception as e:
        # Non-fatal if .env update fails
        pass

    return {"message": "Gemini API Key updated successfully.", "has_key": True}


# -------------------------------------------------------------
# SRT Upload & Translation Endpoints
# -------------------------------------------------------------

@router.post("/srt/parse", response_model=ParseSrtResponse)
async def parse_srt(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".srt"):
        raise HTTPException(status_code=400, detail="Only .srt subtitle files are supported.")

    raw_bytes = await file.read()
    
    # Try different encodings
    content = None
    for encoding in ["utf-8-sig", "utf-8", "cp1252", "latin-1"]:
        try:
            content = raw_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if content is None:
        raise HTTPException(status_code=400, detail="Could not decode the SRT file. Please check file encoding.")

    items = SRTService.parse_srt_content(content)
    if not items:
        raise HTTPException(status_code=400, detail="No valid subtitle entries found in the file.")

    return ParseSrtResponse(
        file_name=file.filename,
        subtitles_count=len(items),
        items=items
    )

@router.post("/srt/translate", response_model=TranslationResultResponse)
async def translate_srt(request: TranslateSrtRequest, db: Session = Depends(get_db)):
    if not request.items:
        raise HTTPException(status_code=400, detail="Subtitle items list is empty.")

    job_id = str(uuid.uuid4())
    api_key = request.api_key or settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail="Gemini API Key is not configured. Please provide it in settings or in your request."
        )

    # Initialize Gemini service
    try:
        gemini = GeminiTranslationService(
            api_key=api_key,
            model_name=request.model_name or settings.GEMINI_MODEL
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Save initial pending history record
    original_srt = SRTService.generate_srt_from_items(request.items)
    HistoryService.create_record(
        db=db,
        job_id=job_id,
        file_name=request.file_name,
        file_type="srt",
        source_language=request.source_language,
        target_language=request.target_language,
        status="processing",
        original_srt_content=original_srt,
        subtitles_count=len(request.items)
    )

    try:
        pair_items = gemini.translate_all(
            items=request.items,
            source_lang=request.source_language,
            target_lang=request.target_language,
            translation_style=request.translation_style or "cinematic",
            context_hint=request.context_hint
        )

        translated_srt = SRTService.generate_srt_from_pairs(pair_items, use_translated=True)

        # Update history to completed
        HistoryService.update_record(
            db=db,
            job_id=job_id,
            status="completed",
            translated_srt_content=translated_srt
        )

        return TranslationResultResponse(
            job_id=job_id,
            file_name=request.file_name,
            file_type="srt",
            source_language=request.source_language,
            target_language=request.target_language,
            subtitles_count=len(pair_items),
            items=pair_items,
            translated_srt=translated_srt
        )

    except Exception as e:
        HistoryService.update_record(
            db=db,
            job_id=job_id,
            status="failed",
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


# -------------------------------------------------------------
# Video Direct Translation Endpoints
# -------------------------------------------------------------

@router.post("/video/translate", response_model=TranslationResultResponse)
async def translate_video(
    file: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("vi"),
    api_key: Optional[str] = Form(None),
    model_name: Optional[str] = Form(None),
    whisper_model: Optional[str] = Form(None),
    translation_style: str = Form("cinematic"),
    context_hint: Optional[str] = Form(None),
    font_size: int = Form(22),
    font_color: str = Form("#FFFFFF"),
    outline_color: str = Form("#000000"),
    border_style: int = Form(1),
    position: str = Form("bottom"),
    preset: str = Form("ultrafast"),
    db: Session = Depends(get_db)
):
    valid_extensions = (".mp4", ".mkv", ".mov", ".webm", ".avi", ".m4v")
    ext = Path(file.filename).suffix.lower()
    if ext not in valid_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format. Allowed formats: {', '.join(valid_extensions)}"
        )

    if not AudioService.is_ffmpeg_available():
        raise HTTPException(
            status_code=500,
            detail="FFmpeg is not available on the server. Audio extraction cannot proceed."
        )

    resolved_api_key = api_key or settings.GEMINI_API_KEY
    if not resolved_api_key:
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is missing. Please provide it in settings or request."
        )

    job_id = str(uuid.uuid4())
    video_filename = f"{job_id}{ext}"
    video_save_path = settings.UPLOADS_DIR / video_filename
    audio_wav_path = settings.AUDIO_DIR / f"{job_id}.wav"

    # Step 1: Save video to storage
    try:
        with open(video_save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    # Convert to web-compatible MP4 if not already MP4 (e.g. MKV, MOV, WebM, AVI)
    if ext != ".mp4":
        web_mp4_filename = f"{job_id}.mp4"
        web_mp4_path = settings.UPLOADS_DIR / web_mp4_filename
        try:
            VideoService.convert_to_web_mp4(video_save_path, web_mp4_path)
            try:
                video_save_path.unlink()
            except Exception:
                pass
            video_save_path = web_mp4_path
            video_filename = web_mp4_filename
        except Exception as e:
            # Fallback if transcode failed, keep original
            pass

    video_relative_url = f"/storage/uploads/{video_filename}"

    # Create history entry
    HistoryService.create_record(
        db=db,
        job_id=job_id,
        file_name=file.filename,
        file_type="video",
        source_language=source_language,
        target_language=target_language,
        status="processing",
        video_path=video_relative_url
    )

    try:
        # Step 2: Extract audio with FFmpeg
        AudioService.extract_audio(video_save_path, audio_wav_path)

        # Step 3: Transcribe audio with faster-whisper
        raw_subtitle_items = WhisperService.transcribe(
            audio_path=audio_wav_path,
            source_language=source_language,
            model_size=whisper_model
        )

        if not raw_subtitle_items:
            raise RuntimeError("No speech detected in the video audio.")

        original_srt = SRTService.generate_srt_from_items(raw_subtitle_items)

        # Step 4: Translate with Gemini API
        gemini = GeminiTranslationService(
            api_key=resolved_api_key,
            model_name=model_name or settings.GEMINI_MODEL
        )

        pair_items = gemini.translate_all(
            items=raw_subtitle_items,
            source_lang=source_language,
            target_lang=target_language,
            translation_style=translation_style,
            context_hint=context_hint
        )

        translated_srt = SRTService.generate_srt_from_pairs(pair_items, use_translated=True)

        # Clean up temporary audio file to save disk space
        if audio_wav_path.exists():
            try:
                audio_wav_path.unlink()
            except Exception:
                pass

        # Step 5: Burn subtitles directly into video (Hardsub MP4)
        subtitled_filename = f"{job_id}_subtitled.mp4"
        subtitled_save_path = settings.UPLOADS_DIR / subtitled_filename
        subtitled_video_url = None

        try:
            VideoService.burn_subtitles_to_mp4(
                input_video_path=video_save_path,
                srt_content=translated_srt,
                output_mp4_path=subtitled_save_path,
                font_size=font_size,
                font_color=font_color,
                outline_color=outline_color,
                border_style=border_style,
                position=position,
                preset=preset
            )
            subtitled_video_url = f"/storage/uploads/{subtitled_filename}"
        except Exception as burn_err:
            logger.warning(f"Could not automatically burn subtitles to MP4: {burn_err}")

        # Update History
        HistoryService.update_record(
            db=db,
            job_id=job_id,
            status="completed",
            original_srt_content=original_srt,
            translated_srt_content=translated_srt,
            subtitles_count=len(pair_items),
            subtitled_video_path=subtitled_video_url
        )

        return TranslationResultResponse(
            job_id=job_id,
            file_name=file.filename,
            file_type="video",
            source_language=source_language,
            target_language=target_language,
            subtitles_count=len(pair_items),
            items=pair_items,
            video_url=video_relative_url,
            subtitled_video_url=subtitled_video_url,
            translated_srt=translated_srt
        )

    except Exception as e:
        # Clean up orphaned audio on failure
        if audio_wav_path.exists():
            try:
                audio_wav_path.unlink()
            except Exception:
                pass
        HistoryService.update_record(
            db=db,
            job_id=job_id,
            status="failed",
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Video translation process failed: {str(e)}")


# -------------------------------------------------------------
# Subtitle Export & Edit Endpoints
# -------------------------------------------------------------

@router.post("/subtitles/export")
def export_subtitles(request: ExportSrtRequest):
    srt_content = SRTService.generate_srt_from_pairs(
        request.items,
        use_translated=request.use_translated
    )

    filename = request.file_name or "subtitles.srt"
    if not filename.endswith(".srt"):
        filename += ".srt"

    return Response(
        content=srt_content,
        media_type="application/x-subrip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

@router.post("/video/export-mp4")
async def export_mp4_with_subtitles(request: ExportMp4Request, db: Session = Depends(get_db)):
    record = HistoryService.get_by_job_id(db, request.job_id)
    if not record or not record.video_path:
        raise HTTPException(status_code=404, detail="No video found for this translation job.")

    # Locate source video file
    video_filename = Path(record.video_path).name
    source_video_path = settings.UPLOADS_DIR / video_filename
    if not source_video_path.exists():
        raise HTTPException(status_code=404, detail="Source video file not found in storage.")

    cfg = request.config or Mp4ExportConfig()
    use_trans = (cfg.subtitles_source == "translated")

    # Get subtitles content
    if request.items:
        srt_content = SRTService.generate_srt_from_pairs(request.items, use_translated=use_trans)
    else:
        srt_content = record.translated_srt_content if use_trans else record.original_srt_content

    if not srt_content:
        raise HTTPException(status_code=400, detail="No subtitles available for this video.")

    base_name = Path(record.file_name).stem
    output_filename = f"{request.job_id}_{cfg.subtitles_source}_subtitled.mp4"
    output_mp4_path = settings.UPLOADS_DIR / output_filename

    try:
        VideoService.burn_subtitles_to_mp4(
            input_video_path=source_video_path,
            srt_content=srt_content,
            output_mp4_path=output_mp4_path,
            font_size=cfg.font_size,
            font_color=cfg.font_color,
            outline_color=cfg.outline_color,
            border_style=cfg.border_style,
            position=cfg.position,
            preset=cfg.preset
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MP4 subtitle burn-in failed: {str(e)}")

    download_name = f"{base_name}_{cfg.subtitles_source}_subtitled.mp4"
    return FileResponse(
        path=str(output_mp4_path),
        media_type="video/mp4",
        filename=download_name
    )

@router.post("/video/render-subtitled")
def render_subtitled_video_endpoint(request: ExportMp4Request, db: Session = Depends(get_db)):
    """
    Renders/re-burns subtitles directly into the video file and returns the static URL
    so the web video player can immediately stream the subtitled video.
    """
    record = HistoryService.get_by_job_id(db, request.job_id)
    if not record:
        raise HTTPException(status_code=404, detail="Job not found.")

    if not record.video_path:
        raise HTTPException(status_code=400, detail="Job does not have an associated video.")

    rel_path = record.video_path.lstrip("/").replace("storage/uploads/", "")
    source_video_path = settings.UPLOADS_DIR / rel_path
    if not source_video_path.exists():
        raise HTTPException(status_code=404, detail="Source video file not found on server.")

    cfg = request.config or Mp4ExportConfig()
    use_trans = (cfg.subtitles_source == "translated")

    if request.items:
        srt_content = SRTService.generate_srt_from_pairs(request.items, use_translated=use_trans)
    else:
        srt_content = record.translated_srt_content if use_trans else record.original_srt_content

    if not srt_content:
        raise HTTPException(status_code=400, detail="No subtitles available for this video.")

    output_filename = f"{request.job_id}_subtitled.mp4"
    output_mp4_path = settings.UPLOADS_DIR / output_filename

    try:
        VideoService.burn_subtitles_to_mp4(
            input_video_path=source_video_path,
            srt_content=srt_content,
            output_mp4_path=output_mp4_path,
            font_size=cfg.font_size,
            font_color=cfg.font_color,
            outline_color=cfg.outline_color,
            border_style=cfg.border_style,
            position=cfg.position,
            preset=cfg.preset
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MP4 subtitle burn-in failed: {str(e)}")

    subtitled_video_url = f"/storage/uploads/{output_filename}"

    # Update DB record with subtitled_video_path and latest edited SRT
    HistoryService.update_record(
        db=db,
        job_id=request.job_id,
        subtitled_video_path=subtitled_video_url,
        translated_srt_content=srt_content if use_trans else None
    )

    return {
        "message": "Subtitled video generated successfully.",
        "subtitled_video_url": subtitled_video_url
    }

@router.put("/history/{job_id}/subtitles")
def update_job_subtitles(job_id: str, payload: UpdateTranslationRequest, db: Session = Depends(get_db)):
    record = HistoryService.get_by_job_id(db, job_id)
    if not record:
        raise HTTPException(status_code=404, detail="Job not found.")

    translated_srt = SRTService.generate_srt_from_pairs(payload.items, use_translated=True)
    original_srt = SRTService.generate_srt_from_pairs(payload.items, use_translated=False)

    HistoryService.update_record(
        db=db,
        job_id=job_id,
        translated_srt_content=translated_srt,
        original_srt_content=original_srt,
        subtitles_count=len(payload.items)
    )

    return {"message": "Subtitles saved successfully.", "subtitles_count": len(payload.items)}


# -------------------------------------------------------------
# History Management Endpoints
# -------------------------------------------------------------

@router.get("/history", response_model=List[HistoryItemResponse])
def get_history(db: Session = Depends(get_db)):
    return HistoryService.get_all(db)

@router.get("/history/{job_id}")
def get_history_detail(job_id: str, db: Session = Depends(get_db)):
    record = HistoryService.get_by_job_id(db, job_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")

    original_items = SRTService.parse_srt_content(record.original_srt_content or "")
    translated_items = SRTService.parse_srt_content(record.translated_srt_content or "")

    # Combine into pairs
    pairs: List[SubtitlePairItem] = []
    trans_map = {item.index: item.text for item in translated_items}

    for item in original_items:
        pairs.append(SubtitlePairItem(
            index=item.index,
            start=item.start,
            end=item.end,
            start_ms=item.start_ms,
            end_ms=item.end_ms,
            original=item.text,
            translated=trans_map.get(item.index, item.text)
        ))

    return {
        "id": record.id,
        "job_id": record.job_id,
        "file_name": record.file_name,
        "file_type": record.file_type,
        "source_language": record.source_language,
        "target_language": record.target_language,
        "status": record.status,
        "subtitles_count": record.subtitles_count,
        "error_message": record.error_message,
        "video_url": record.video_path,
        "subtitled_video_url": record.subtitled_video_path,
        "created_at": record.created_at,
        "items": pairs,
        "original_srt": record.original_srt_content,
        "translated_srt": record.translated_srt_content
    }

@router.delete("/history/{job_id}")
def delete_history_item(job_id: str, db: Session = Depends(get_db)):
    record = HistoryService.get_by_job_id(db, job_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")

    # Delete video files if exist
    if record.video_path:
        raw_name = record.video_path.lstrip("/").replace("storage/uploads/", "")
        p = settings.UPLOADS_DIR / raw_name
        if p.exists():
            try:
                p.unlink()
            except Exception:
                pass

    if record.subtitled_video_path:
        sub_name = record.subtitled_video_path.lstrip("/").replace("storage/uploads/", "")
        p_sub = settings.UPLOADS_DIR / sub_name
        if p_sub.exists():
            try:
                p_sub.unlink()
            except Exception:
                pass
    if record.video_path:
        filename = Path(record.video_path).name
        video_file = settings.UPLOADS_DIR / filename
        if video_file.exists():
            try:
                video_file.unlink()
            except Exception:
                pass

    HistoryService.delete_by_job_id(db, job_id)
    return {"message": "Record deleted successfully."}


# -------------------------------------------------------------
# Live Real-Time Subtitle Widget Endpoints
# -------------------------------------------------------------

@router.post("/live/translate-chunk")
async def live_translate_chunk(
    audio: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("vi"),
    translation_style: str = Form("cinematic"),
    prev_context: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None)
):
    """
    Ultra-low-latency endpoint for live video audio chunks.
    Decodes audio chunk in memory, runs Whisper voice detection,
    and streams back translated subtitle text in real-time.
    """
    raw_bytes = await audio.read()
    if not raw_bytes or len(raw_bytes) < 200:
        return {"is_speech": False, "original_text": "", "translated_text": ""}

    # Step 1: In-memory audio decode to 16kHz float32
    audio_np = LiveTranslationService.decode_audio_bytes(raw_bytes)
    if len(audio_np) == 0:
        return {"is_speech": False, "original_text": "", "translated_text": ""}

    # Step 2: Whisper fast speech detection & transcription
    trans_res = LiveTranslationService.transcribe_chunk(audio_np, source_language=source_language)
    if not trans_res.get("is_speech") or not trans_res.get("text"):
        return {
            "is_speech": False,
            "original_text": "",
            "translated_text": "",
            "detected_language": trans_res.get("language", "auto")
        }

    original_text = trans_res["text"]

    # Step 3: Fast contextual translation with Gemini 3.5 Flash
    translated_text = LiveTranslationService.translate_live_text(
        text=original_text,
        source_lang=source_language,
        target_lang=target_language,
        style=translation_style,
        prev_context=prev_context,
        api_key=api_key
    )

    return {
        "is_speech": True,
        "original_text": original_text,
        "translated_text": translated_text or original_text,
        "detected_language": trans_res.get("language", "auto")
    }


@router.websocket("/live/ws")
async def live_websocket_stream(websocket: WebSocket):
    """
    Bi-directional streaming WebSocket for live video subtitle widget.
    Clients send raw audio bytes (WebM/WAV) or JSON config, and receive live subtitles instantly.
    """
    await websocket.accept()
    source_lang = "auto"
    target_lang = "vi"
    style = "cinematic"
    prev_context = ""
    api_key = None

    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
                audio_np = LiveTranslationService.decode_audio_bytes(raw_bytes)
                if len(audio_np) > 0:
                    trans_res = LiveTranslationService.transcribe_chunk(audio_np, source_language=source_lang)
                    if trans_res.get("is_speech") and trans_res.get("text"):
                        orig = trans_res["text"]
                        trans = LiveTranslationService.translate_live_text(
                            text=orig,
                            source_lang=source_lang,
                            target_lang=target_lang,
                            style=style,
                            prev_context=prev_context,
                            api_key=api_key
                        )
                        prev_context = orig
                        await websocket.send_json({
                            "type": "subtitle",
                            "is_speech": True,
                            "original_text": orig,
                            "translated_text": trans,
                            "detected_language": trans_res.get("language", "auto")
                        })
                    else:
                        await websocket.send_json({"type": "silence", "is_speech": False})

            elif "text" in message and message["text"]:
                import json
                try:
                    cfg = json.loads(message["text"])
                    if cfg.get("type") == "config":
                        source_lang = cfg.get("source_language", source_lang)
                        target_lang = cfg.get("target_language", target_lang)
                        style = cfg.get("translation_style", style)
                        api_key = cfg.get("api_key", api_key)
                        await websocket.send_json({"type": "config_ack", "status": "ok"})
                except Exception:
                    pass

    except WebSocketDisconnect:
        logger.info("Live subtitle WebSocket disconnected.")
    except Exception as e:
        logger.warning(f"Live subtitle WebSocket exception: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
