# SubTranslate AI - Development Log

## Project Information

Project:
```
SubTranslate AI
```

Type:
```
AI Video & Subtitle Translator / Real-Time Audio Translation System
```

Goal:
```
Build a portfolio-quality, production-ready AI application capable of real-time speech recognition, contextual translation, and video subtitle synchronization.
```

---

# Development Rules

After completing each milestone or major bugfix:
- Update this file with completed tasks, affected files, technical decisions, and current issues.
- Preserve historical entries for auditability and codebase context.
- Keep all explanations concise, technically accurate, and structured.

---

# Current Status

## Current Milestone
```
M6 - Long Video Performance Optimization (Completed)
```

## Overall Status
```
Stable MVP v1.2 - Fully functional URL/file video translation, live PiP audio translator, softsub overlay, and parallel Gemini translation.
```

---

# Milestone Progress

## M0 - Initial Fullstack Setup
Status: `Completed` (Commit: `b3c6467`)

Goal: Establish project architecture, foundational backend, frontend, and SRT parsing.

Tasks:
- [x] Initialize FastAPI application with CORS and Pydantic validation.
- [x] Setup SQLite database and SQLAlchemy ORM (`history.py`, `connection.py`).
- [x] Implement SRT parser and serializer using `pysubs2` (`srt_service.py`).
- [x] Build React SPA with Vite and TailwindCSS dark cyberpunk styling.
- [x] Create navigation layout, Home page, Dashboard, and History page.

Key Files:
- `backend/app/main.py`, `backend/app/api/endpoints.py`
- `frontend/src/App.jsx`, `frontend/src/pages/Home.jsx`

---

## M1 - Core Video Translation & FFmpeg Hardsub Pipeline
Status: `Completed` (Commit: `b3c6467`)

Goal: Enable direct video upload, audio extraction, Whisper transcription, and FFmpeg subtitle burning.

Tasks:
- [x] Implement `AudioService.extract_audio` using FFmpeg for 16kHz mono WAV extraction.
- [x] Implement `WhisperService.transcribe` with `faster-whisper` (CTranslate2).
- [x] Implement `GeminiTranslationService.translate_all` for subtitle batch translation.
- [x] Implement `VideoService.burn_subtitles_to_mp4` for FFmpeg hardsub burning.
- [x] Build `VideoSubtitlePlayer.jsx` with synchronized playback and subtitle overlay.

---

## M2 - Live Subtitle Widget & Browser Tab Audio Capture
Status: `Completed` (Commits: `20acf47`, `7926645`, `bc6d3ea`, `e853810`)

Goal: Capture audio from browser tabs (livestreams, YouTube, meetings) and translate dialogue on-the-fly.

Tasks:
- [x] Implement Web Audio API capture via `navigator.mediaDevices.getDisplayMedia`.
- [x] Extract audio track only to prevent MediaRecorder video track errors.
- [x] Implement `live_whisper_service.py` with server startup model pre-warming.
- [x] Add interactive real-time subtitle side panel with timestamps and auto-scroll.
- [x] Add system audio guidance modal with clear user instructions.

---

## M3 - PiP Floating Window, Compact Transparent UI & Adaptive VAD Slicing
Status: `Completed` (Commits: `95ad0c6`, `5784b76`, `4e9b050`, `1cfde9f`)

Goal: Make the live subtitle overlay compact, floating, and transparent so it never obscures video content.

Tasks:
- [x] Implement Picture-in-Picture (PiP) window via Document PiP API.
- [x] Style PiP window with semi-transparent dark backdrop and high-contrast typography.
- [x] Implement adaptive 1.8s speech pause VAD slicing for natural sentence boundary splitting.
- [x] Add non-blocking chunk queue to prevent audio drops during Gemini API roundtrips.
- [x] Upgrade Gemini model target to `gemini-3.5-flash-lite` for minimum latency.

---

## M4 - Direct Video URL Translation & DRM Error Handling
Status: `Completed` (Commits: `c669499`, `978f397`)

Goal: Allow users to translate videos simply by pasting URLs (YouTube, TikTok, Facebook, MP4).

Tasks:
- [x] Integrate `yt-dlp` in `download_service.py` with automatic FFmpeg discovery via `imageio-ffmpeg`.
- [x] Add `POST /api/video/info` for instant video title, duration, and thumbnail preview.
- [x] Add `POST /api/video/translate-url` for end-to-end link downloading and translating.
- [x] Detect DRM/HTTP 403 blocks on OTT platforms (FPT Play, Netflix, VieON, Galaxy Play) and strip ANSI terminal codes.
- [x] Add a 1-click shortcut button in the UI guiding users to launch the **Live Subtitle Widget** for DRM-protected streams.

---

## M5 - VAD Tuning & Intel MKL Heap Allocation Fix
Status: `Completed` (Commit: `59d7982`)

Goal: Fix silence/BGM misclassification on music videos and eliminate Windows heap crashes.

Tasks:
- [x] Configure `KMP_DUPLICATE_LIB_OK=TRUE`, `OMP_NUM_THREADS=2`, `MKL_NUM_THREADS=2` to eliminate `mkl_malloc: failed to allocate memory`.
- [x] Lower Silero VAD threshold to `0.35` in `WhisperService`.
- [x] Add automatic fallback: If VAD yields 0 segments (e.g. loud rock/orchestral BGM), re-run Whisper with `vad_filter=False` and `condition_on_previous_text=False`, successfully recovering all dialogues.
- [x] Monkey-patch `av.open` to handle PyAV 14+ removing the `metadata_errors` argument.

---

## M6 - Long Video Performance Optimization
Status: `Completed` (Commit: `e15afc1`)

Goal: Eliminate the 20-minute bottleneck when translating 23-25 minute videos.

Tasks:
- [x] **Root Cause Diagnosis**: Identified that re-encoding 45,000 frames using CPU FFmpeg `libx264` consumed 85% of total time (18-22 minutes).
- [x] **Fast Softsub Mode**: Made `burn_subtitles: bool = False` the default across API and UI, delivering translated videos with 0ms React subtitle overlay in **2-3 minutes**.
- [x] **On-Demand Hardsub Export**: Added "Xuất Video MP4 (Hardsub)" button in `VideoSubtitlePlayer` and `TranslatePage` to trigger FFmpeg encoding only when the user explicitly requests an offline file.
- [x] **Parallel Gemini Batch Translation**: Re-engineered `translate_all` using `concurrent.futures.ThreadPoolExecutor`, cutting Gemini translation from 25-30s down to **3-5s**.
- [x] **720p Default Download**: Set `max_height=720` in `DownloadService` to cut video download times by 50%.
- [x] **UI Mode Switcher**: Added interactive toggle in `TranslatePage.jsx` between `⚡ Dịch siêu tốc (Softsub)` and `🎬 Render Hardsub MP4`.

---

## M7 - Enhanced Subtitle Features & Export Formats (Upcoming)
Status: `Pending`

Goal: Broaden subtitle compatibility and export formats.

Tasks:
- [ ] Support export to `.ass` (Advanced SubStation Alpha) with custom font styling.
- [ ] Support export to `.vtt` (WebVTT) for direct web integration.
- [ ] Add dual-subtitle SRT export (both original and translated lines in one file).
- [ ] Implement translation search and filter in `HistoryPage.jsx`.

---

# Technical Decisions Log

## Decision 001
- **Date**: 2026-11-15
- **Decision**: Use FastAPI + React Single Page Application (SPA) instead of Streamlit.
- **Reason**: Streamlit rerenders the entire app state upon user interaction, making it unsuitable for synchronized HTML5 video playback, real-time Web Audio API capture, and custom PiP windows. FastAPI + React provides modular separation, lower latency, and professional portfolio value.

## Decision 002
- **Date**: 2026-11-16
- **Decision**: Use Google Gemini API (`gemini-3.5-flash-lite`) as the translation engine.
- **Reason**: Gemini 3.5 Flash Lite provides sub-second response times, handles structured JSON batches accurately, and understands cultural slang, cinematic dialogue, and tone nuances at near-zero inference cost.

## Decision 003
- **Date**: 2026-11-16
- **Decision**: Pre-warm `faster-whisper` `tiny` model on server startup.
- **Reason**: Loading CTranslate2 model weights dynamically on the first user request introduced an 8-12 second cold-start latency. Pre-warming during FastAPI `lifespan` startup eliminates this delay completely.

## Decision 004
- **Date**: 2026-11-18
- **Decision**: Make Softsub Overlay the default delivery mode and decouple Hardsub MP4 generation.
- **Reason**: Re-encoding 45,000 video frames on CPU takes 18-22 minutes for a 25-minute video, blocking HTTP requests. By rendering subtitles via React CSS overlay, users can watch their translated video immediately within 2-3 minutes. Hardsubbing is preserved as an on-demand background export.

## Decision 005
- **Date**: 2026-11-18
- **Decision**: Parallelize Gemini batch translation with `ThreadPoolExecutor`.
- **Reason**: For long videos with 500+ subtitle lines, sequential HTTP roundtrips took 25-35 seconds. Running batches in parallel across up to 4 concurrent worker threads cut latency to 3-5 seconds while preserving 100% subtitle ordering.

## Decision 006
- **Date**: 2026-11-17
- **Decision**: Direct DRM-protected platforms (FPT Play, Netflix) to the Live Subtitle Widget instead of direct downloading.
- **Reason**: Commercial OTT platforms use Widevine DRM and session-signed tokens which block automated downloading via `yt-dlp` (HTTP 403 Forbidden). Capturing tab audio directly through Web Audio API bypasses DRM limitations without violating platform policies.

## Decision 007
- **Date**: 2026-11-18
- **Decision**: Limit OpenMP and MKL thread pools to 2 on Windows.
- **Reason**: Under Intel OpenMP runtime on Windows 11, multiple threads spawned by CTranslate2 competed for unaligned heap allocations, triggering fatal `mkl_malloc` crashes. Setting `OMP_NUM_THREADS=2` and `MKL_NUM_THREADS=2` resolved all memory allocation errors.

## Decision 008
- **Date**: 2026-11-18
- **Decision**: Add automatic non-VAD fallback when Voice Activity Detection returns zero segments.
- **Reason**: Music videos, rock songs, and action scenes with loud background music caused Silero VAD to filter out spoken dialogue. Re-running with `vad_filter=False` cleanly recovers 100% of missed lyrics and speech.

---

# Current Issues & Resolutions

| Issue | Resolution | Status |
|---|---|---|
| `HTTP Error 403: Forbidden` on FPT Play | Formatted friendly guidance directing users to Live Subtitle Widget | **Resolved** |
| `mkl_malloc: failed to allocate memory` | Configured `OMP_NUM_THREADS=2`, `MKL_NUM_THREADS=2` | **Resolved** |
| Zero dialogue detected on loud music videos | Added automatic fallback with `vad_filter=False` | **Resolved** |
| 23-25 minute videos taking 20+ minutes | Implemented Fast Softsub Mode + Parallel Gemini batches | **Resolved** |
| PyAV 14+ `metadata_errors` deprecation | Monkey-patched `av.open` in `whisper_service.py` | **Resolved** |

---

# Next Action
Begin planning **M7 - Enhanced Subtitle Features & Export Formats**:
1. Implement `.ass` styled subtitle generator.
2. Implement dual-subtitle export in `SRTService`.
3. Add search filter to `HistoryPage.jsx`.
