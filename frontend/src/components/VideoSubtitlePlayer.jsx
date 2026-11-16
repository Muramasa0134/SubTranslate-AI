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
    <div className="relative bg-dark-950 rounded-2xl overflow-hidden border border-dark-700 shadow-2xl flex flex-col">
      {/* Top Source Switcher Bar */}
      <div className="px-4 py-2.5 bg-dark-900 border-b border-dark-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Film className="w-4 h-4 text-accent-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trình phát Video:</span>
        </div>

        <div className="flex items-center space-x-2">
          {subtitledVideoUrl && (
            <div className="inline-flex rounded-lg bg-dark-950 p-0.5 border border-dark-700">
              <button
                onClick={() => setActiveSource('subtitled')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeSource === 'subtitled'
                    ? 'bg-gradient-to-r from-purple-600 to-accent-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Video đã gắn sub</span>
              </button>

              <button
                onClick={() => setActiveSource('raw')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeSource === 'raw'
                    ? 'bg-dark-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video gốc</span>
              </button>
            </div>
          )}

          {subtitledVideoUrl && (
            <a
              href={subtitledVideoUrl}
              download={downloadName}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
              title="Tải video MP4 đã gắn phụ đề trực tiếp"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Video MP4</span>
            </a>
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
            <div className="inline-block max-w-[85%] bg-black/85 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 shadow-lg">
              {(subtitleMode === 'original' || subtitleMode === 'both') && (
                <p className="text-sm font-medium text-slate-300">
                  {activeSubtitle.original}
                </p>
              )}
              {(subtitleMode === 'translated' || subtitleMode === 'both') && (
                <p className="text-base font-bold text-accent-400 mt-0.5">
                  {activeSubtitle.translated}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status & Controls Bar */}
      <div className="px-4 py-2.5 bg-dark-900 border-t border-dark-800 flex items-center justify-between text-xs">
        {activeSource === 'subtitled' ? (
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Phụ đề đã được gắn cứng (Hardsub) trực tiếp vào khung hình video</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="font-semibold text-slate-300">Overlay:</span>
            <div className="inline-flex rounded-lg bg-dark-950 p-1 border border-dark-800">
              {['translated', 'original', 'both', 'none'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSubtitleMode(mode)}
                  className={`px-2 py-0.5 rounded capitalize font-medium text-[11px] transition-colors ${
                    subtitleMode === mode
                      ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                      : 'text-slate-400 hover:text-white'
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
              className="px-2.5 py-1 rounded-lg bg-purple-950/50 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 font-semibold text-[11px] flex items-center space-x-1 transition-colors"
              title="Đổi kiểu chữ, màu sắc, vị trí hoặc render lại video"
            >
              <Video className="w-3 h-3 text-purple-400" />
              <span>Đổi kiểu phụ đề</span>
            </button>
          )}

          {activeSubtitle && (
            <div className="text-slate-400 truncate max-w-xs text-[11px]">
              <span className="text-accent-400 font-mono font-bold">#{activeSubtitle.index}</span> {activeSubtitle.start}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
