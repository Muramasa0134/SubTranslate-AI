# SubTranslate AI - Project Specification

## 1. Project Information

### Name
SubTranslate AI

### Type
AI-Powered Video & Subtitle Translation Platform / Real-Time Live Subtitle System

### Category
Audio & Video Processing, Speech-to-Text (STT), Large Language Model (LLM) Translation, Web Audio API

### Purpose
SubTranslate AI allows users to transcribe, translate, and synchronize subtitles for videos and audio streams using state-of-the-art AI. The system supports direct subtitle file translation (`.srt`), video translation from pasted URLs or local files, and live real-time dialogue translation from browser tabs via a floating Picture-in-Picture (PiP) window.

---

# 2. Product Vision

SubTranslate AI bridges language barriers in digital media by providing an ultra-fast, professional, and accessible translation experience.

The application demonstrates:
- End-to-end audio extraction and video transcoding with FFmpeg.
- Speech-to-Text inference using optimized CTranslate2 `faster-whisper`.
- Context-aware multilingual translation using Google Gemini API (`gemini-3.5-flash-lite`).
- Real-time tab audio streaming via Web Audio API and Document Picture-in-Picture.
- Modern fullstack architecture with FastAPI, React, and TailwindCSS.
- High portfolio and practical value for AI Engineers, translators, and media consumers.

---

# 3. Target Users & Use Cases

### Primary Users:
- **Foreign Film & Drama Enthusiasts**: Watch foreign films, anime, Tokusatsu, or YouTube videos in their native language.
- **Language Learners & Students**: Compare original spoken dialogue with translated subtitles side-by-side.
- **Content Creators & Subtitlers**: Generate and fine-tune subtitles with exact timestamps for YouTube, TikTok, and social media.
- **Live Stream Viewers**: Follow live broadcasts and DRM-protected streams (e.g. FPT Play, Netflix, Twitch) with floating real-time subtitles.

### Key Use Cases:
- Translate an existing `.srt` subtitle file from any language to Vietnamese or English.
- Paste a YouTube or TikTok link to get a translated video within 2 minutes.
- Upload an MKV/MOV video file and export an MP4 with burned-in subtitles (Hardsub).
- Open the Live Subtitle Widget in a floating PiP window while watching a live match or webinar.

---

# 4. System Scope & Core Features

## A. Subtitle File Translation (.SRT)
- Parse `.srt` files extracting index, start timestamp, end timestamp, and dialogue text.
- Preserve 100% of millisecond timestamps (`HH:MM:SS,mmm`).
- Batch translation with Google Gemini to optimize natural dialogue flow and minimize latency.
- Dual-column interactive editor: edit translations in real-time and download updated `.srt`.

## B. Video Translation from URL
- Support public URLs: YouTube, TikTok, Facebook, Twitter/X, and direct `.mp4` web links.
- Instant metadata extraction: title, duration, uploader, thumbnail preview in 2-3 seconds.
- Default 720p download optimization via `yt-dlp` to slash download time.
- Automated pipeline: URL Download -> FFmpeg Audio Extract -> Whisper STT -> Gemini Translate -> Softsub Playback.
- DRM / HTTP 403 detection (FPT Play, Netflix, VieON) with automated user guidance to the Live Widget.

## C. Video Translation from File Upload
- Support video formats: `.mp4`, `.mkv`, `.mov`, `.webm`, `.avi`, `.m4v`.
- Automatic standardization to web-compatible H.264/AAC MP4.
- Audio extraction to standard 16kHz Mono 16-bit PCM WAV.

## D. Fast Softsub Preview & On-Demand Hardsub MP4
- **⚡ Chế độ Dịch siêu tốc (Softsub)**: Subtitles rendered dynamically via React CSS overlay with 0ms latency. Translates a 25-minute video in **2-3 minutes** (skipping the 20-minute CPU re-encode).
- **🎬 Chế độ Render Hardsub MP4**: Hardcodes subtitles into video frames using FFmpeg `libx264`.
- **On-Demand Export**: Trigger hardsub MP4 export anytime via "Xuất Video MP4 (Hardsub)" with customizable font size, font color, position, and border style.

## E. Live Subtitle Widget (`/live-widget`)
- Capture audio from any browser tab or window using `navigator.mediaDevices.getDisplayMedia`.
- Real-time in-memory WAV chunking and adaptive 1.8s speech pause VAD slicing.
- Floating Picture-in-Picture (PiP) window using Document Picture-in-Picture API.
- Semi-transparent, compact HUD design that does not obstruct video playback.
- Subtitle side panel tab with auto-scroll and timestamp history.

## F. History Management
- Persistent SQLite storage (`subtranslate.db`) tracking all translation jobs.
- View job status, source/target languages, subtitle count, and video links.
- Re-open past translations for playback, subtitle editing, or file re-download.

---

# 5. Out of Scope

The following features are NOT part of the current MVP:
- User accounts, registration, and role-based permissions (single-user local tool).
- Paid subscription / payment gateway integrations.
- Distributed cloud worker queues (Celery/Redis) - local async threads are used.
- Real-time voice cloning / text-to-speech dubbing.
- Automatic video translation beyond audio dialogue (no OCR for on-screen text).

---

# 6. System Architecture

## High-Level Architecture Diagram

```
                                  USER
                                    │
                                    │
                    React 18 SPA (Vite + TailwindCSS)
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
           HTTP REST API                     Web Audio API Stream
                 │                                     │
                 ▼                                     ▼
        FastAPI Backend                    Live Audio Buffer (PCM 16k)
                 │                                     │
     ┌───────────┼───────────┐                         │
     │           │           │                         ▼
Download      Audio       Video               Live Whisper Service
 Service     Service     Service             (Pre-warmed in-memory)
(yt-dlp)    (FFmpeg)    (FFmpeg)                       │
     │           │           │                         ▼
     └───────────┼───────────┘                Live Gemini Service
                 │                                     │
                 ▼                                     ▼
        Whisper AI Engine                     PiP Floating Window
      (faster-whisper / STT)                (Transparent Softsub HUD)
                 │
                 ▼
         Gemini AI Engine
    (gemini-3.5-flash-lite / LLM)
                 │
                 ▼
       SQLite DB & Storage
```

## Translation Processing Pipelines

### Pipeline 1: Video from URL / File (Fast Softsub Mode)
```
Video Input (URL/File)
  ──> Audio Extract (FFmpeg 16kHz mono WAV)
  ──> Speech-to-Text (faster-whisper)
  ──> Context Translation (Gemini parallel batch)
  ──> Immediate Return (0ms Softsub Overlay Player)
  [Total time for 25-min video: 2 - 3 minutes]
```

### Pipeline 2: Live Tab Audio Translation (Live Widget)
```
Browser Tab Audio
  ──> Web Audio API (PCM 16kHz mono)
  ──> Adaptive VAD Slicing (1.8s pause detection)
  ──> In-Memory Whisper Inference
  ──> Gemini 3.5 Flash Lite Translation
  ──> Real-time PiP HUD Display (< 1.5s total latency)
```

---

# 7. Technology Stack Specifications

## Backend
- **Python**: 3.12+
- **Framework**: FastAPI 0.115+, Uvicorn 0.32+
- **ORM & DB**: SQLAlchemy 2.0+, SQLite
- **Validation**: Pydantic 2.10+
- **Environment**: `python-dotenv`, `pydantic-settings`

## AI Inference & Processing
- **LLM**: Google Gemini API (`google-genai` 1.0+)
  - Model: `gemini-3.5-flash-lite`
  - Concurrency: `ThreadPoolExecutor(max_workers=4)`
- **STT**: `faster-whisper` 1.1+ (CTranslate2)
  - Models: `tiny` (default, pre-warmed), `base` (optional)
  - VAD: Silero VAD (threshold 0.35 + non-VAD fallback)
- **Media**: `yt-dlp`, `imageio-ffmpeg`, `pysubs2`, `av` (PyAV)

## Frontend
- **Framework**: React 18.3, Vite 6
- **CSS**: TailwindCSS 3.4
- **Icons**: `lucide-react`
- **Routing**: `react-router-dom` 6.28
- **HTTP Client**: Axios 1.7

---

# 8. Functional Requirements

### FR-01: Video Metadata Extraction
- **Input**: Video URL (string).
- **Output**: JSON containing title, duration, duration_string, thumbnail, uploader, webpage_url.

### FR-02: Video URL Translation
- **Input**: Video URL, source/target languages, style, whisper model, burn_subtitles toggle.
- **Output**: JSON containing job_id, items (subtitle pairs), video_url, subtitled_video_url (optional), translated_srt.

### FR-03: Video File Translation
- **Input**: Video file (multipart/form-data), languages, style, whisper model, burn_subtitles.
- **Output**: TranslationResultResponse with synchronized subtitle pairs.

### FR-04: SRT Subtitle Translation
- **Input**: List of SubtitleItems (index, start, end, text), target language, style.
- **Output**: List of SubtitlePairItems (original + translated).

### FR-05: Live Audio Transcription & Translation
- **Input**: Audio WAV blob (multipart/form-data), languages, style, whisper model.
- **Output**: Recognized original text and translated text with millisecond timestamps.

### FR-06: On-Demand MP4 Hardsub Export
- **Input**: job_id, font styling config (font_size, font_color, outline_color, border_style, position, preset).
- **Output**: Downloadable MP4 file stream with burned subtitles.

### FR-07: Subtitle SRT Export
- **Input**: List of subtitle pairs, flag `use_translated` (bool).
- **Output**: Downloadable `.srt` file formatted in standard SubRip format.

### FR-08: History Logging & Retrieval
- **Input**: Query parameters (page, limit).
- **Output**: Paginated list of past translation records.

### FR-09: Gemini API Key Configuration
- **Input**: API Key string.
- **Output**: Config validation status and confirmation.

### FR-10: DRM Platform Detection & Handling
- **Input**: Protected URL (e.g. `fptplay.vn`, `netflix.com`).
- **Output**: User-friendly error message with direct link to Live Subtitle Widget.

---

# 9. Non-Functional Requirements

### Performance & Latency
- Fast Softsub Mode must deliver translated video within 2-3 minutes for a 25-minute video.
- Gemini parallel batch translation must complete under 5 seconds for 500 lines.
- Live widget chunk processing latency must remain under 1.5 seconds.

### Memory Safety & Stability
- Limit OpenMP/MKL threads to 2 (`OMP_NUM_THREADS=2`, `MKL_NUM_THREADS=2`) to prevent heap crashes on Windows.
- Automatically clean up temporary WAV files after transcription completes.

### Usability & UI/UX
- Consistent dark theme with clear visual hierarchy.
- Responsive Picture-in-Picture window with transparent backdrop.
- Informative progress messages for each step of the translation pipeline.

### Security
- Gemini API keys stored only in local `.env` or memory; never exposed in public responses.
- Validate video extensions and sanitize input URLs.

---

# 10. Backend API Design

## Video Operations

### Get Video Info
```
POST /api/video/info
Request:  { "url": "https://www.youtube.com/watch?v=..." }
Response: { "title": "...", "duration": 180, "thumbnail": "...", "uploader": "..." }
```

### Translate Video from URL
```
POST /api/video/translate-url
Request: {
  "url": "https://www.youtube.com/watch?v=...",
  "source_language": "auto",
  "target_language": "vi",
  "whisper_model": "tiny",
  "burn_subtitles": false
}
Response: TranslationResultResponse
```

### Translate Video from File
```
POST /api/video/translate
Request:  multipart/form-data (file, source_language, target_language, burn_subtitles)
Response: TranslationResultResponse
```

### Export Hardsub MP4
```
POST /api/video/export-mp4
Request: { "job_id": "...", "config": { "font_size": 22, "font_color": "#FFFFFF", "position": "bottom" } }
Response: MP4 File Stream
```

## SRT Operations

### Parse SRT
```
POST /api/srt/parse
Request:  multipart/form-data (file)
Response: { "file_name": "...", "subtitles_count": 50, "items": [...] }
```

### Translate SRT Items
```
POST /api/srt/translate
Request:  { "items": [...], "source_language": "auto", "target_language": "vi" }
Response: TranslationResultResponse
```

### Export SRT
```
POST /api/subtitles/export
Request:  { "items": [...], "use_translated": true }
Response: SRT File Stream
```

## Live Audio Operations

### Translate Audio Chunk
```
POST /api/live/chunk
Request:  multipart/form-data (audio: WAV blob, source_language, target_language, whisper_model)
Response: { "original_text": "...", "translated_text": "...", "start_ms": 0, "end_ms": 1800 }
```

## System & History Operations

### Get System Config
```
GET /api/config
Response: { "has_gemini_api_key": true, "gemini_model": "gemini-3.5-flash-lite", "whisper_model": "tiny", "ffmpeg_available": true }
```

### Set API Key
```
POST /api/config/api-key
Request:  { "api_key": "AIza..." }
Response: { "status": "success" }
```

### List History
```
GET /api/history?page=1&limit=20
Response: List[HistoryItemResponse]
```

---

# 11. AI & Media Processing Configuration

### Whisper Settings
```python
model_size = "tiny"          # Default, fast inference on CPU
beam_size = 3                # Balance between speed and accuracy
vad_filter = True            # Silero VAD
vad_parameters = dict(
    threshold=0.35,          # Lowered for music/soundtrack speech
    min_silence_duration_ms=400
)
# Fallback when 0 segments: vad_filter=False, condition_on_previous_text=False
```

### Gemini Translation Settings
```python
model = "gemini-3.5-flash-lite"
temperature = 0.2
batch_size = 60              # Items per batch
max_workers = 4              # Concurrent threads in ThreadPoolExecutor
```

### FFmpeg Settings
```bash
# Audio extraction
ffmpeg -y -i input_video -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav

# Hardsub burning
ffmpeg -y -i input_video -vf subtitles=sub.srt:force_style='FontSize=22,PrimaryColour=&H00FFFFFF' -c:a copy output_subtitled.mp4
```

---

# 12. Future Improvements
- Multi-speaker diarization (labeling Speaker 1, Speaker 2).
- Direct YouTube subtitle track import without re-transcription.
- Advanced SubStation Alpha (`.ass`) and WebVTT (`.vtt`) styling exports.
- Cloud deployment with Docker and GPU acceleration (`CUDA / TensorRT`).

---

# 13. Definition of Done

The project is considered complete and production-grade when:
1. **User can**:
   - Paste a video link or upload a file and watch the translated video within 2-3 minutes.
   - Edit subtitles and download `.srt` or `.mp4` on demand.
   - Open the Live Subtitle Widget in a floating PiP window to translate live streaming audio.
2. **Technical standards**:
   - Frontend builds cleanly (`npm run build` exits 0).
   - Backend APIs respond without unhandled 500 errors.
   - Memory limits prevent MKL heap exhaustion on Windows.
   - Git repository is cleanly tracked with accurate documentation.
