import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Video, 
  Download, 
  Sparkles, 
  Film 
} from 'lucide-react';

export default function VideoSubtitlePlayer({ 
  videoUrl, 
  subtitledVideoUrl, 
  items, 
  onTimeUpdate, 
  activeIndex, 
  onOpenMp4Config,
  fileName
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [activeSource, setActiveSource] = useState(subtitledVideoUrl ? 'subtitled' : 'raw');
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitleMode, setSubtitleMode] = useState('translated'); // 'translated', 'original', 'both', 'none'
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-switch to subtitled version whenever a new one is provided
  useEffect(() => {
    if (subtitledVideoUrl) {
      setActiveSource('subtitled');
    }
  }, [subtitledVideoUrl]);

  // Monitor video playback time
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const timeMs = Math.floor(videoRef.current.currentTime * 1000);
    setCurrentTimeMs(timeMs);
    if (onTimeUpdate) {
      onTimeUpdate(timeMs);
    }
  };

  // Find active subtitle matching current playback position (for raw video mode)
  useEffect(() => {
    if (!items || items.length === 0) {
      setActiveSubtitle(null);
      return;
    }
    const current = items.find(
      (it) => currentTimeMs >= it.start_ms && currentTimeMs <= it.end_ms
    );
    setActiveSubtitle(current || null);
  }, [currentTimeMs, items]);

  // Cross-browser Fullscreen Toggle on the entire Container (Video + Subtitle)
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const fsElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (!fsElement) {
      // Enter Fullscreen
      const req =
        container.requestFullscreen ||
        container.webkitRequestFullscreen ||
        container.mozRequestFullScreen ||
        container.msRequestFullscreen;

      if (req) {
        req.call(container).catch((err) => {
          console.warn('Native fullscreen blocked, using window fullscreen:', err);
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      // Exit Fullscreen
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;

      if (exit) {
        exit.call(document).catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      setIsFullscreen(!!fsElement);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Keyboard shortcut: Press 'F' for Fullscreen, 'Esc' to exit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  const currentPlayingUrl = (activeSource === 'subtitled' && subtitledVideoUrl) ? subtitledVideoUrl : videoUrl;

  const downloadName = fileName 
    ? `${fileName.replace(/\.[^/.]+$/, "")}_subtitled.mp4`
    : 'video_subtitled.mp4';

  return (
    <div className="relative bg-taste-bg rounded-2xl overflow-hidden border border-taste-border shadow-taste-card flex flex-col">
      {/* Top Source Switcher Bar */}
      <div className="px-4 py-2.5 bg-taste-surface border-b border-taste-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Film className="w-4 h-4 text-taste-accent" />
          <span className="text-xs font-bold text-taste-ink uppercase tracking-wider">Trình phát Video:</span>
        </div>

        <div className="flex items-center space-x-2">
          {subtitledVideoUrl ? (
            <>
              <div className="inline-flex rounded-lg bg-taste-bg p-0.5 border border-taste-border">
                <button
                  onClick={() => setActiveSource('subtitled')}
                  className={`taste-button flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    activeSource === 'subtitled'
                      ? 'bg-taste-accent text-taste-accentInk shadow-sm'
                      : 'text-taste-muted hover:text-taste-ink'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Video đã gắn sub</span>
                </button>

                <button
                  onClick={() => setActiveSource('raw')}
                  className={`taste-button flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    activeSource === 'raw'
                      ? 'bg-taste-card text-taste-ink shadow-sm'
                      : 'text-taste-muted hover:text-taste-ink'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video gốc</span>
                </button>
              </div>

              <a
                href={subtitledVideoUrl}
                download={downloadName}
                className="taste-button flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-taste-accent text-taste-accentInk font-bold text-xs hover:bg-taste-accentHover shadow-taste-accent"
                title="Tải video MP4 đã gắn phụ đề trực tiếp"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Video MP4</span>
              </a>
            </>
          ) : (
            <>
              <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] font-semibold text-taste-accent bg-taste-card border border-taste-borderLight px-2.5 py-1 rounded-lg">
                <Sparkles className="w-3 h-3 text-taste-accent" />
                <span>Softsub siêu tốc (Không độ trễ)</span>
              </span>
              {onOpenMp4Config && (
                <button
                  onClick={onOpenMp4Config}
                  className="taste-button flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-taste-accent text-taste-accentInk font-bold text-xs hover:bg-taste-accentHover shadow-taste-accent"
                  title="Ghi cứng phụ đề (Hardsub) và tải video MP4 về máy"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Video MP4 (Hardsub)</span>
                </button>
              )}
            </>
          )}

          {/* Fullscreen Button on Top Bar */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="taste-button flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-taste-card hover:bg-taste-hover border border-taste-border text-taste-ink font-semibold text-xs transition-colors"
            title={isFullscreen ? 'Thu nhỏ (Esc / F)' : 'Phóng to toàn màn hình (F)'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3.5 h-3.5 text-taste-accent" />
                <span className="hidden sm:inline">Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize className="w-3.5 h-3.5 text-taste-accent" />
                <span className="hidden sm:inline">Phóng to</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Viewport Container (Handles Fullscreen for BOTH Video + Single Subtitle) */}
      <div 
        ref={containerRef}
        onDoubleClick={toggleFullscreen}
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden group select-none ${
          isFullscreen 
            ? 'fixed inset-0 z-[9999] w-screen h-screen' 
            : 'aspect-video'
        }`}
      >
        <video
          key={currentPlayingUrl}
          ref={videoRef}
          src={currentPlayingUrl}
          controls
          autoPlay={false}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Floating Fullscreen Button on top-right of Video */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="absolute top-3 right-3 z-30 p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
          title={isFullscreen ? 'Thu nhỏ (Esc)' : 'Toàn màn hình (F)'}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4 text-taste-accent" />
          ) : (
            <Maximize className="w-4 h-4 text-white" />
          )}
        </button>

        {/* SINGLE Live Subtitle Overlay: Displayed cleanly in both normal and fullscreen */}
        {activeSource === 'raw' && subtitleMode !== 'none' && activeSubtitle && (
          <div 
            className={`absolute left-0 right-0 text-center pointer-events-none transition-all z-20 ${
              isFullscreen 
                ? 'bottom-20 sm:bottom-24 px-10' 
                : 'bottom-12 sm:bottom-14 px-6'
            }`}
          >
            <div 
              className={`inline-block bg-taste-bg/95 backdrop-blur-md rounded-2xl border border-taste-border shadow-2xl transition-all ${
                isFullscreen 
                  ? 'max-w-[90%] px-8 py-3.5' 
                  : 'max-w-[85%] px-5 py-2.5'
              }`}
            >
              {(subtitleMode === 'original' || subtitleMode === 'both') && (
                <p 
                  className={`font-medium text-taste-muted leading-relaxed ${
                    isFullscreen ? 'text-base sm:text-lg mb-1' : 'text-xs'
                  }`}
                >
                  {activeSubtitle.original}
                </p>
              )}
              {(subtitleMode === 'translated' || subtitleMode === 'both') && (
                <p 
                  className={`font-bold text-taste-accent tracking-tight leading-snug ${
                    isFullscreen ? 'text-xl sm:text-2xl md:text-3xl' : 'text-sm sm:text-base'
                  }`}
                >
                  {activeSubtitle.translated}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status & Controls Bar */}
      <div className="px-4 py-2.5 bg-taste-surface border-t border-taste-border flex items-center justify-between text-xs">
        {activeSource === 'subtitled' ? (
          <div className="flex items-center space-x-2 text-taste-accent font-semibold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-taste-accent" />
            <span>Phụ đề đã được gắn cứng (Hardsub) trực tiếp vào khung hình video</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-taste-muted">
            <span className="font-semibold text-taste-ink">Hiển thị:</span>
            <div className="inline-flex rounded-lg bg-taste-bg p-0.5 border border-taste-border">
              {[
                { id: 'translated', label: 'Bản dịch' },
                { id: 'original', label: 'Gốc' },
                { id: 'both', label: 'Song ngữ' },
                { id: 'none', label: 'Tắt' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSubtitleMode(mode.id)}
                  className={`taste-button px-2.5 py-0.5 rounded font-medium text-[11px] transition-colors ${
                    subtitleMode === mode.id
                      ? 'bg-taste-card text-taste-accent border border-taste-borderLight shadow-sm'
                      : 'text-taste-muted hover:text-taste-ink'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {onOpenMp4Config && (
            <button
              onClick={onOpenMp4Config}
              className="taste-button px-2.5 py-1 rounded-lg bg-taste-card hover:bg-taste-hover border border-taste-border text-taste-ink font-semibold text-[11px] flex items-center space-x-1"
              title="Đổi kiểu chữ, màu sắc, vị trí hoặc render lại video"
            >
              <Video className="w-3 h-3 text-taste-accent" />
              <span>Đổi kiểu phụ đề</span>
            </button>
          )}

          {activeSubtitle && (
            <div className="text-taste-muted truncate max-w-xs text-[11px] font-mono">
              <span className="text-taste-accent font-bold">#{activeSubtitle.index}</span> {activeSubtitle.start}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
