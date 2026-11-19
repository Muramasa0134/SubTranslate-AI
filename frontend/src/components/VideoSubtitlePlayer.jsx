import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Video, Download, Sparkles, Film } from 'lucide-react';

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
  const [activeSource, setActiveSource] = useState(subtitledVideoUrl ? 'subtitled' : 'raw');
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitleMode, setSubtitleMode] = useState('translated'); // 'translated', 'original', 'both', 'none'
  const [activeSubtitle, setActiveSubtitle] = useState(null);

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
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center group">
        <video
          key={currentPlayingUrl}
          ref={videoRef}
          src={currentPlayingUrl}
          controls
          autoPlay={false}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
        />

        {/* Live Subtitle Overlay ONLY when viewing raw video */}
        {activeSource === 'raw' && subtitleMode !== 'none' && activeSubtitle && (
          <div className="absolute bottom-14 left-0 right-0 px-6 text-center pointer-events-none transition-all">
            <div className="inline-block max-w-[85%] bg-taste-bg/90 backdrop-blur-md px-5 py-2.5 rounded-xl border border-taste-border shadow-2xl">
              {(subtitleMode === 'original' || subtitleMode === 'both') && (
                <p className="text-xs font-medium text-taste-muted">
                  {activeSubtitle.original}
                </p>
              )}
              {(subtitleMode === 'translated' || subtitleMode === 'both') && (
                <p className="text-base font-bold text-taste-accent mt-0.5 tracking-tight">
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
