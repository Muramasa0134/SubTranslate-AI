# PROJECT_CONTEXT.md

## Project Name
SubTranslate AI

---

# Role
You are the AI engineering assistant responsible for developing and maintaining SubTranslate AI.

Your responsibility:
- Write clean, maintainable, production-ready code.
- Follow the modular FastAPI and React component architecture.
- Maintain real-time audio synchronization and sub-second latency for live processing.
- Prioritize memory safety on Windows (Intel MKL/CTranslate2 thread limits).
- Explain your plan before modifying critical media or AI inference services.
- Never hardcode API keys, secrets, or host-specific absolute paths in tracked files.

---

# Project Overview
SubTranslate AI is a fullstack AI-powered video and subtitle translation platform that bridges language barriers in multimedia content.

Key capabilities:
1. **SRT Subtitle Translation**: Batch-translates SRT files with context awareness via Google Gemini API while strictly preserving index numbers and millisecond timestamps.
2. **Video URL Translation**: Paste any public video URL (YouTube, TikTok, Facebook, X, direct MP4) to automatically download, extract 16kHz mono audio, transcribe with `faster-whisper`, translate with Gemini, and play immediately.
3. **Local Video Upload**: Supports MP4, MKV, MOV, WebM, AVI files with automatic web-compatible MP4 transcoding.
4. **Live Subtitle Widget (`/live-widget`)**: Real-time floating Picture-in-Picture (PiP) transparent subtitle window for live streams and DRM-protected OTT platforms (FPT Play, Netflix, VieON) by capturing browser tab audio.
5. **Fast Softsub Preview**: Instant 0ms subtitle overlay in HTML5/React video player, cutting processing time for a 25-minute video from 20+ minutes down to 2-3 minutes by skipping heavy CPU hardsub encoding.
6. **On-Demand Hardsub MP4 Export**: Custom font size, color, background box, and position rendering via FFmpeg `libx264`.
7. **Translation History**: SQLite-backed history tracking with full playback, subtitle editing, and export capabilities.

---

# Development Goal & Principles
Priority:
1. **High Accuracy & Natural Translation**: Cinematic, context-aware translations matching tone and character dialogue.
2. **Exact Timestamp Synchronization**: Subtitles must align perfectly with spoken dialogue.
3. **Speed & Low Latency**: Fast softsub delivery, parallel batch translation, and streaming audio processing.
4. **Resilience & Memory Safety**: Automatic fallbacks for noisy audio/BGM and thread limiting to prevent MKL memory crashes.
5. **Clean Portfolio-Grade Architecture**: Modular service layer, typed schemas, and responsive dark cyberpunk UI.

---

# Technology Stack

## Backend
- **Language**: Python 3.12+ (Virtual environment in `backend/.venv`)
- **Web Framework**: FastAPI & Uvicorn (Asynchronous REST API)
- **Database**: SQLite with SQLAlchemy ORM (`backend/storage/subtranslate.db`)
- **Validation**: Pydantic v2 schemas
- **Configuration**: `pydantic-settings` & `python-dotenv`

## AI & Machine Learning
- **LLM Engine**: Google Gemini API via official `google-genai` SDK
  - Default Model: `gemini-3.5-flash-lite` (Ultra-fast, cost-effective, high translation quality)
  - Execution: Multi-threaded parallel batch translation via `concurrent.futures.ThreadPoolExecutor`
- **Speech-to-Text (STT)**: `faster-whisper` powered by CTranslate2
  - Default Model: `tiny` (Pre-warmed on server startup for instant inference)
  - Optional Model: `base` (Selectable in UI for higher transcription accuracy)
  - Voice Activity Detection (VAD): Silero VAD with 0.35 threshold + automatic non-VAD fallback

## Media & Audio Processing
- **Video Downloader**: `yt-dlp` (Default max height 720p, format merge to MP4)
- **Audio & Video Engine**: `FFmpeg` (Auto-discovered and hardlinked to `ffmpeg.exe` via `imageio-ffmpeg`)
- **Subtitle Parser/Writer**: `pysubs2` for SRT manipulation
- **Container Handling**: `av` (PyAV monkey-patched for PyAV 14+ compatibility)

## Frontend
- **Framework**: React 18
- **Build Tool**: Vite 6
- **Design System & Skill**: Integrated with `taste-skill` (`Leonxlnx/taste-skill` anti-slop frontend guidelines)
  - Selected Theme: `blue-black-cornflower` ("Night and sky blue", `#0a0d14` background, `#131824` surface, `#5ab9fc` Sky Blue accent)
  - Typography: `Geist` + `Geist Mono` / `Inter` with tight tracking (`-0.025em`)
  - Micro-interactions: Tactile button steps on hover (`active:scale-[0.98]`), high-contrast subtitle overlays, glass panels
- **Styling**: TailwindCSS 3
- **Icons**: `lucide-react`
- **Routing**: `react-router-dom` v6
- **HTTP Client**: Axios with baseURL `/api`
- **Real-Time Audio**: Web Audio API (`AudioContext`, `MediaStream`, PCM 16kHz WAV encoding)
- **Video UI**: HTML5 Video Player + Custom React Subtitle Overlay + Document Picture-in-Picture (PiP)

---

# Architecture Rules

Follow this strict layered architecture:

```
[ Frontend (React + Vite) ]
        │  HTTP REST / Audio Stream
        ▼
[ FastAPI Routing Layer (endpoints.py) ]
        │  Typed Pydantic Schemas
        ▼
[ Service Layer ]
  ├── DownloadService      (yt-dlp, metadata preview, 720p download)
  ├── AudioService         (FFmpeg audio extraction, 16kHz mono WAV)
  ├── WhisperService       (faster-whisper STT, VAD filtering & fallback)
  ├── GeminiService        (Parallel batch translation, cinematic styling)
  ├── LiveService          (In-memory audio chunking, live translation)
  ├── VideoService         (Web MP4 transcoding, FFmpeg libx264 hardsub)
  ├── SRTService           (pysubs2 parsing, SRT formatting)
  └── HistoryService       (SQLite CRUD operations)
        │
        ▼
[ Data & Storage Layer ]
  ├── SQLite Database (`subtranslate.db`)
  └── Local Storage (`storage/uploads/`, `storage/audio/`)
```

- **Rule 1**: Do NOT put heavy processing or AI inference directly inside route handlers; delegate strictly to the service layer.
- **Rule 2**: Temporary audio WAV files created for transcription must be cleaned up in a `finally` block or right after Whisper finishes.
- **Rule 3**: PyAV `av.open` must retain compatibility patches for versions >= 14.
- **Rule 4**: Always keep OpenMP and MKL thread counts constrained to 2 (`OMP_NUM_THREADS=2`, `MKL_NUM_THREADS=2`) to prevent Windows memory exhaustion.

---

# Directory Structure

```
SubTranslate-AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py              # REST routes for SRT, Video, Live, History, Config
│   │   ├── database/
│   │   │   └── connection.py             # SQLite engine & sessionmaker
│   │   ├── models/
│   │   │   ├── history.py                # SQLAlchemy model for translation history
│   │   │   └── schemas.py                # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── audio_service.py          # FFmpeg audio extraction & validation
│   │   │   ├── download_service.py       # yt-dlp video downloading & DRM error detection
│   │   │   ├── gemini_service.py         # Gemini API parallel batch translation
│   │   │   ├── history_service.py        # History database operations
│   │   │   ├── live_service.py           # Real-time chunk translation for live widget
│   │   │   ├── live_whisper_service.py   # Pre-warmed Whisper engine for live audio
│   │   │   ├── srt_service.py            # SRT file parse and generate
│   │   │   ├── video_service.py          # Web MP4 conversion & hardsub burn-in
│   │   │   └── whisper_service.py        # Batch audio transcription with VAD fallback
│   │   ├── utils/
│   │   │   └── config.py                 # Pydantic Settings & environment loader
│   │   └── main.py                       # FastAPI application & startup pre-warming
│   ├── storage/                          # Uploads, extracted audio, sqlite db
│   ├── requirements.txt                  # Python package dependencies
│   ├── run.py                            # Entry script for backend
│   └── .env                              # Environment configuration (ignored by git)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ApiKeyModal.jsx           # Modal for configuring Gemini API key
│   │   │   ├── Footer.jsx                # Application footer
│   │   │   ├── LiveSubtitleWidget.jsx    # Real-time PiP audio capture & transparent UI
│   │   │   ├── Mp4ConfigModal.jsx        # Hardsub font, color, position & export modal
│   │   │   ├── Navbar.jsx                # Header navigation & API key status badge
│   │   │   ├── SubtitleEditor.jsx        # Dual-column interactive subtitle editor
│   │   │   ├── SubtitleOverlay.jsx       # 0ms real-time video subtitle overlay
│   │   │   └── VideoSubtitlePlayer.jsx   # Video player with softsub & hardsub switching
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx             # Analytics dashboard & system status
│   │   │   ├── HistoryDetailPage.jsx     # Detail view for past translation jobs
│   │   │   ├── HistoryPage.jsx           # Paginated translation history list
│   │   │   ├── Home.jsx                  # Landing page & feature showcase
│   │   │   ├── LiveWidgetPage.jsx        # Fullpage container for live subtitle widget
│   │   │   └── TranslatePage.jsx         # Primary translation workspace (URL/File/SRT)
│   │   ├── services/
│   │   │   └── api.js                    # Axios API client functions
│   │   ├── utils/
│   │   │   └── languages.js              # Supported source & target languages
│   │   ├── App.jsx                       # Route provider & navigation layout
│   │   ├── index.css                     # Tailwind styles & custom animations
│   │   └── main.jsx                      # React 18 DOM root
│   ├── package.json                      # NPM dependencies & scripts
│   ├── vite.config.js                    # Vite bundler configuration
│   └── tailwind.config.js                # Tailwind CSS palette & extensions
│
├── PROJECT_CONTEXT.md                    # Core architecture & context rules
├── DEVELOPMENT_LOG.md                    # Detailed milestone progress & decisions
├── PROJECT_SPEC.md                       # Comprehensive product specifications
├── TODO.md                               # Roadmap, sprint tracking & backlog
└── README.md                             # Repository readme & setup guide
```

---

# Coding Rules

## Python Backend
- Always use type hints (`typing.List`, `typing.Optional`, `typing.Dict`).
- Never run synchronous blocking I/O inside asynchronous FastAPI endpoints without `ThreadPoolExecutor` or `run_in_threadpool`.
- Use structured logging (`logger = logging.getLogger(__name__)`) instead of raw `print` statements.
- Handle all file paths with Python's standard `pathlib.Path`.
- Never expose raw stack traces in HTTP responses; wrap errors in descriptive `HTTPException(status_code=..., detail=...)`.

## React Frontend
- Prefer clean, modular components with single responsibility.
- Encapsulate all backend HTTP calls in `frontend/src/services/api.js`.
- Always provide immediate visual feedback (loading spinners, progress bars, error alerts) during asynchronous operations.
- Ensure all video controls and PiP elements remain responsive during playback.
- Format all user-facing strings, alerts, and instructions in clear Vietnamese.

---

# Environment Rules
Secrets and configuration reside in `backend/.env`.

Required variables:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
WHISPER_MODEL=tiny
DEBUG=False
KMP_DUPLICATE_LIB_OK=TRUE
OMP_NUM_THREADS=2
MKL_NUM_THREADS=2
```

- Never commit `.env` or temporary video/audio files to Git.
- Always use `backend/.env.example` as a sanitized template.

---

# Git Rules
- Branch: `main`.
- Remote: `https://github.com/Muramasa0134/SubTranslate-AI.git`.
- Commit convention: Conventional Commits (`feat:`, `fix:`, `perf:`, `chore:`, `refactor:`).
- Verify builds before pushing:
  - Backend: Python import and endpoint check.
  - Frontend: `npm run build` must complete with zero errors.

---

# Token Optimization Rules for AI Assistance
When working on this repository:
- Always read `PROJECT_CONTEXT.md`, `DEVELOPMENT_LOG.md`, `PROJECT_SPEC.md`, and `TODO.md` first to understand active state and constraints.
- Provide targeted, incremental code edits; avoid rewrites of unchanged modules.
- Preserve established fixes (PyAV monkey patch, MKL thread limits, parallel Gemini translation).
- Respond in clear, professional Vietnamese when explaining results to the user.
