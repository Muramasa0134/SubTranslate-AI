# SubTranslate AI - TODO

## Project Goal
Build a portfolio-grade, high-performance AI Video & Subtitle Translation platform with real-time audio capture, live PiP overlay, and instant multi-language translation.

### Priority Ranking:
1. **Accuracy & Real-Time Sync**: Flawless timestamp alignment and natural conversational translation.
2. **Speed & Latency**: Instant Softsub delivery and sub-second live streaming translation.
3. **Stability & Error Resilience**: Graceful fallbacks for noisy audio, protected streams, and hardware limits.
4. **UI/UX Polish**: Sleek dark cyberpunk aesthetics with seamless controls.

---

# Sprints Overview

| Sprint | Description | Status |
|---|---|---|
| **Sprint 0** | Architecture, Foundation & Environment Setup | `Completed` |
| **Sprint 1** | SRT Parsing & Google Gemini Batch Translation | `Completed` |
| **Sprint 2** | Audio Extraction & Whisper STT Pipeline | `Completed` |
| **Sprint 3** | Video Subtitle Player & FFmpeg Hardsub Burning | `Completed` |
| **Sprint 4** | Live Subtitle Widget & Document PiP Floating Window | `Completed` |
| **Sprint 5** | Video URL Translation (`yt-dlp`) & DRM Handling | `Completed` |
| **Sprint 6** | Silero VAD Tuning & Intel MKL Memory Allocation Fixes | `Completed` |
| **Sprint 7** | Long Video Speed Optimization (Softsub & Parallel Gemini) | `Completed` |
| **Sprint 8** | Advanced Subtitle Export (.ASS, .VTT, Dual-SRT) | `Pending` |
| **Sprint 9** | Batch Processing & Translation Queue Management | `Pending` |
| **Sprint 10** | Dockerization & GPU Acceleration Setup | `Pending` |

---

# Sprint Details

## Sprint 0 - Architecture & Foundation
Status: `Completed`

- [x] Design multi-tier architecture (FastAPI backend + React SPA frontend).
- [x] Configure Python 3.12 virtual environment and `requirements.txt`.
- [x] Configure Vite 6, TailwindCSS 3, and React 18 frontend.
- [x] Setup SQLite database and SQLAlchemy session management.
- [x] Implement `/api/config` health check and API key validation.

---

## Sprint 1 - SRT Parsing & Google Gemini Translation
Status: `Completed`

- [x] Implement `SRTService` with `pysubs2` for parsing and exporting `.srt` files.
- [x] Integrate `google-genai` SDK with structured JSON batch prompts.
- [x] Build `SubtitleEditor.jsx` for side-by-side bilingual editing.
- [x] Implement `/api/srt/parse` and `/api/srt/translate` endpoints.
- [x] Preserve 100% of start and end millisecond timestamps.

---

## Sprint 2 - Audio Extraction & Whisper STT Pipeline
Status: `Completed`

- [x] Implement `AudioService.extract_audio` converting video audio to 16kHz Mono 16-bit PCM WAV.
- [x] Setup `faster-whisper` (CTranslate2) for CPU inference.
- [x] Implement automatic temporary WAV cleanup to save disk storage.
- [x] Add language auto-detection and custom glossary/context hint support.
- [x] Handle PyAV 14+ compatibility via monkey patch.

---

## Sprint 3 - Video Subtitle Player & FFmpeg Hardsub Burning
Status: `Completed`

- [x] Build `VideoSubtitlePlayer.jsx` with synchronized subtitle highlight.
- [x] Implement `VideoService.burn_subtitles_to_mp4` with customizable font size, color, and position.
- [x] Build `Mp4ConfigModal.jsx` for live visual subtitle preview before exporting.
- [x] Implement web-compatible MP4 transcoding (H.264/AAC + faststart).
- [x] Implement `/api/video/export-mp4` on-demand rendering endpoint.

---

## Sprint 4 - Live Subtitle Widget & Document PiP Floating Window
Status: `Completed`

- [x] Implement browser tab audio capture via Web Audio API (`getDisplayMedia`).
- [x] Pre-warm `faster-whisper` `tiny` model on server startup to eliminate cold-start delay.
- [x] Implement Document Picture-in-Picture (PiP) window for floating subtitle HUD.
- [x] Create transparent, non-intrusive floating subtitle bar for video watching.
- [x] Add interactive live subtitle side panel with search and auto-scroll.
- [x] Add non-blocking chunk queue to prevent audio drops.

---

## Sprint 5 - Video URL Translation (`yt-dlp`) & DRM Handling
Status: `Completed`

- [x] Integrate `yt-dlp` in `DownloadService` with automatic FFmpeg discovery.
- [x] Add `POST /api/video/info` for instant video title, duration, and thumbnail preview.
- [x] Add `POST /api/video/translate-url` for end-to-end link downloading and translation.
- [x] Add quick-select badges for YouTube, TikTok, Facebook, X, and MP4 links.
- [x] Detect DRM / HTTP 403 blocks on OTT platforms (FPT Play, Netflix, VieON) and strip ANSI escape codes.
- [x] Add 1-click button in UI to launch Live Subtitle Widget when DRM-protected links are pasted.

---

## Sprint 6 - Stability, VAD Tuning & Memory Allocation Fixes
Status: `Completed`

- [x] Resolve `mkl_malloc: failed to allocate memory` by setting `OMP_NUM_THREADS=2`, `MKL_NUM_THREADS=2`.
- [x] Tune Silero VAD threshold to `0.35` for speech over background music.
- [x] Implement automatic non-VAD fallback: Re-transcribe with `vad_filter=False` if VAD returns 0 segments.
- [x] Fix Gemini 400 Bad Request by removing unsupported `thinking_budget` on `gemini-3.5-flash-lite`.

---

## Sprint 7 - Long Video Speed Optimization
Status: `Completed`

- [x] Diagnose bottleneck: FFmpeg `libx264` hardsubbing 45,000 frames takes 20+ minutes on CPU.
- [x] Implement **⚡ Chế độ Dịch siêu tốc (Softsub)** as default (`burn_subtitles=False`), reducing total wait time for a 25-minute video to **2-3 minutes**.
- [x] Re-architect Gemini translation with `ThreadPoolExecutor` for parallel batch translation (cutting Gemini latency from 30s to 3-5s).
- [x] Set default video download resolution to 720p to cut download time by 50%.
- [x] Add interactive mode toggle in `TranslatePage.jsx` and on-demand "Xuất Video MP4 (Hardsub)" button in `VideoSubtitlePlayer.jsx`.

---

## Sprint 8 - Enhanced Subtitle Styling & Export Formats (Next)
Status: `Pending`

- [ ] Implement `.ass` (Advanced SubStation Alpha) export with karaoke and custom typography styles.
- [ ] Implement `.vtt` (WebVTT) export for web player integration.
- [ ] Implement dual-subtitle SRT export (both original and translated lines in one file).
- [ ] Add subtitle search and filter bar in `HistoryPage.jsx`.

---

## Sprint 9 - Batch Processing & Translation Queue Management
Status: `Pending`

- [ ] Support multiple video URL submissions in a batch queue.
- [ ] Add pause/resume controls for batch jobs.
- [ ] Provide estimated completion countdown timer based on video length.

---

## Sprint 10 - Dockerization & GPU Acceleration Setup
Status: `Pending`

- [ ] Create `Dockerfile` and `docker-compose.yml` for unified fullstack deployment.
- [ ] Add optional NVIDIA CUDA runtime profile for sub-second Whisper transcription on GPU.
- [ ] Setup volume mounts for persistent history and temporary media storage.

---

# Future Ideas & Backlog

- [ ] Multi-speaker diarization (Speaker 1, Speaker 2 tagging).
- [ ] Voice cloning / AI Text-to-Speech audio dubbing track generation.
- [ ] Browser extension for automatic 1-click live subtitle injection into Netflix / FPT Play web players.
- [ ] Mobile responsive layout optimizations for tablet and smartphone viewports.

---

# Current Priority & Immediate Action

```
Next Task: Sprint 8 - Advanced Subtitle Export & History Search
First Action: Implement dual-subtitle SRT generation in SRTService and add search filtering in HistoryPage.jsx.
```
