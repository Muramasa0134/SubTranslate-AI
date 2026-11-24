import React, { useRef, useState, useEffect } from 'react';
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

// Format millisecond timestamp to WebVTT timestamp (00:00:00.000)
function formatVttTime(ms) {
  const safeMs = Math.max(0, ms || 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const milliseconds = safeMs % 1000;
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

// Generate valid WebVTT string from subtitle items
function generateVttContent(items, mode) {
  if (!items || items.length === 0 || mode === 'none') return '';
  const lines = ['WEBVTT\n'];
  items.forEach((it, idx) => {
    let text = '';
    if (mode === 'original') {
      text = it.original || it.text || '';
    } else if (mode === 'both') {
      text = `${it.original || ''}\n${it.translated || ''}`.trim();
    } else {
      text = it.translated || it.text || '';
    }
    if (!text.trim()) return;

    lines.push(String(idx + 1));
    lines.push(`${formatVttTime(it.start_ms)} --> ${formatVttTime(it.end_ms)}`);
    lines.push(`${text.trim()}\n`);
  });
  return lines.join('\n');
}

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
  const [vttBlobUrl, setVttBlobUrl] = useState(null);

  // Auto-switch to subtitled version whenever a new one is provided
  useEffect(() => {
    if (subtitledVideoUrl) {
      setActiveSource('subtitled');
    }
  }, [subtitledVideoUrl]);

  // Generate WebVTT blob track so browser native player & native fullscreen ALWAYS show subtitles
  useEffect(() => {
    if (!items || items.length === 0 || activeSource === 'subtitled' || subtitleMode === 'none') {
      if (vttBlobUrl) {
        URL.revokeObjectURL(vttBlobUrl);
        setVttBlobUrl(null);
      }
      return;
    }

    const vttText = generateVttContent(items, subtitleMode);
    if (!vttText) {
      if (vttBlobUrl) {
        URL.revokeObjectURL(vttBlobUrl);
        setVttBlobUrl(null);
      }
      return;
    }

    const blob = new Blob([vttText], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    setVttBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [items, subtitleMode, activeSource]);

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

  // Handle Fullscreen events and auto-reroute native video fullscreen to container
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
      
      // If the user clicked the browser's native fullscreen button on the <video> tag,
      // reroute fullscreen to containerRef so the custom overlay & controls stay visible!
      if (fsEl === videoRef.current && containerRef.current) {
        document.exitFullscreen().then(() => {
          containerRef.current.requestFullscreen().catch(() => {});
        }).catch(() => {});
        return;
      }

      setIsFullscreen(fsEl === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Toggle fullscreen mode on the container
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        // Fallback to video tag if container fullscreen fails
        videoRef.current?.requestFullscreen?.();
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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

          {/* Dedicated Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="taste-button p-1.5 rounded-lg bg-taste-card hover:bg-taste-hover border border-taste-border text-taste-ink transition-colors"
            title={isFullscreen ? 'Thu nhỏ (Esc)' : 'Phóng to toàn màn hình (F)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-taste-accent" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Video Viewport Container (Enters Fullscreen seamlessly with subtitles) */}
      <div 
        ref={containerRef}
        className={`relative w-full bg-black flex items-center justify-center group ${
          isFullscreen ? 'h-screen w-screen' : 'aspect-video'
        }`}
      >
        <video
          key={currentPlayingUrl}
          ref={videoRef}
          src={currentPlayingUrl}
          controls
          autoPlay={false}
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
        >
          {/* Native WebVTT Track for browser native engine & fallback */}
          {vttBlobUrl && activeSource === 'raw' && subtitleMode !== 'none' && (
            <track
              key={vttBlobUrl}
              label="Tiếng Việt (SubTranslate AI)"
              kind="subtitles"
              srcLang="vi"
              src={vttBlobUrl}
              default
            />
          )}
        </video>

        {/* Live Subtitle Overlay: Visible in both normal and fullscreen modes */}
        {activeSource === 'raw' && subtitleMode !== 'none' && activeSubtitle && (
          <div 
            className={`absolute left-0 right-0 text-center pointer-events-none transition-all z-40 ${
              isFullscreen 
                ? 'bottom-20 sm:bottom-24 px-10' 
                : 'bottom-14 px-6'
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
                    isFullscreen ? 'text-xl sm:text-2xl md:text-3xl' : 'text-base'
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
            <span className="font-semibold text-taste-ink">Overlay:</span>
            <div className="inline-flex rounded-lg bg-taste-bg p-1 border border-taste-border">
              {['translated', 'original', 'both', 'none'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSubtitleMode(mode)}
                  className={`taste-button px-2 py-0.5 rounded capitalize font-medium text-[11px] transition-colors ${
                    subtitleMode === mode
                      ? 'bg-taste-card text-taste-accent border border-taste-borderLight shadow-sm'
                      : 'text-taste-muted hover:text-taste-ink'
                  }`}
                >
                  {mode}
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
