import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  Monitor, 
  Mic, 
  Upload, 
  Video, 
  Sparkles, 
  Play, 
  Pause, 
  Volume2, 
  Layers, 
  ExternalLink,
  ShieldAlert,
  Key,
  Info,
  Clock,
  Download,
  Trash2,
  Copy,
  Check,
  Search,
  ArrowDownCircle,
  Globe,
  Tv,
  Users,
  Compass,
  FileText
} from 'lucide-react';
import LiveSubtitleWidget from '../components/LiveSubtitleWidget';
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../utils/languages';

export default function LiveWidgetPage({ config, onOpenKeyModal }) {
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('vi');
  const [translationStyle, setTranslationStyle] = useState('cinematic');

  // Video player state
  const [localVideoUrl, setLocalVideoUrl] = useState(null);
  const [localVideoName, setLocalVideoName] = useState('');
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Live dialogue & transcript state
  const [liveHistory, setLiveHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [currentSpeakingEntry, setCurrentSpeakingEntry] = useState(null);

  // Side Tab state
  const [activeSideTab, setActiveSideTab] = useState('subtitles'); // 'subtitles', 'platforms'
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const transcriptBottomRef = useRef(null);

  // Auto-scroll to bottom when new subtitle appears
  useEffect(() => {
    if (autoScroll && transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveHistory, autoScroll]);

  // Handle local video drop/selection
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (localVideoUrl) {
      URL.revokeObjectURL(localVideoUrl);
    }

    const url = URL.createObjectURL(file);
    setLocalVideoUrl(url);
    setLocalVideoName(file.name);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const jumpToVideoTime = (startSec) => {
    if (videoRef.current && typeof startSec === 'number') {
      videoRef.current.currentTime = startSec;
      videoRef.current.play();
    }
  };

  const exportAsSrt = () => {
    if (liveHistory.length === 0) {
      alert('Chưa có câu thoại nào để xuất file.');
      return;
    }

    let srtText = '';
    const reversed = [...liveHistory].reverse();
    reversed.forEach((item, index) => {
      const idx = index + 1;
      const start = item.startSrt || '00:00:00,000';
      const end = item.endSrt || '00:00:03,000';
      srtText += `${idx}\n${start} --> ${end}\n${item.translated}\n\n`;
    });

    const blob = new Blob([srtText], { type: 'application/x-subrip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live_subtitles_${new Date().toISOString().slice(0, 10)}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsTxt = () => {
    if (liveHistory.length === 0) {
      alert('Chưa có câu thoại nào để xuất file.');
      return;
    }

    let txtContent = `SUBTRANSLATE AI - LIVE TRANSCRIPT\nNgày xuất: ${new Date().toLocaleString()}\n`;
    txtContent += `Ngôn ngữ đích: ${targetLang.toUpperCase()} | Phong cách: ${translationStyle}\n`;
    txtContent += '='.repeat(50) + '\n\n';

    const reversed = [...liveHistory].reverse();
    reversed.forEach((item) => {
      txtContent += `[${item.timestamp || item.time}] ${item.original ? `(${item.original}) ` : ''}==> ${item.translated}\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live_transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredHistory = liveHistory.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.translated?.toLowerCase().includes(q) ||
      item.original?.toLowerCase().includes(q) ||
      item.timestamp?.includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Live Subtitle Widget
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                  {isListening ? 'Đang chạy' : 'Sẵn sàng'}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Phát hiện và hiển thị phụ đề theo thời gian thực bên cạnh video trên <b>mọi nền tảng</b> (Web, App Desktop, Zoom, VLC, Video file)
              </p>
            </div>
          </div>
        </div>

        {/* Global Config Options */}
        <div className="flex items-center flex-wrap gap-2.5 bg-dark-900/80 p-2 rounded-2xl border border-dark-800 backdrop-blur-md">
          {/* Target Language */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400 font-medium pl-1">Dịch sang:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="px-2.5 py-1.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-accent-500"
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Translation Style */}
          <div className="flex items-center space-x-1.5">
            <select
              value={translationStyle}
              onChange={(e) => setTranslationStyle(e.target.value)}
              className="px-2.5 py-1.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-accent-500"
            >
              <option value="cinematic">🍿 Điện ảnh / Phim truyện</option>
              <option value="anime">🎬 Anime / Tokusatsu</option>
              <option value="casual">🎙️ Vlog / Đời thường</option>
              <option value="tech">💻 Công nghệ / Coding</option>
              <option value="formal">📰 Thời sự / Trang trọng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Video Player / Stream Screen + Bottom Subtitle Bar (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl bg-dark-900 border border-dark-800 overflow-hidden shadow-2xl relative group">
            {localVideoUrl ? (
              <div className="relative aspect-video bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={localVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-b from-dark-950 to-dark-900 flex flex-col items-center justify-center p-8 text-center border-b border-dark-800 relative">
                <div className="p-4 rounded-3xl bg-dark-800/60 border border-dark-700/60 mb-4 text-slate-400 group-hover:scale-105 transition-transform">
                  <Monitor className="w-12 h-12 text-accent-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">
                  Chọn Nguồn Âm thanh Video để Bắt đầu
                </h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                  Hoạt động trên <b>mọi nền tảng</b>: YouTube, Netflix, Zoom, VLC, Teams, Bilibili, TikTok hoặc mở bất kỳ video nào từ máy tính.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/*,.mp4,.mkv,.webm,.mov,.avi"
                    onChange={handleVideoSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold shadow-lg shadow-accent-600/20 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Mở Video từ máy tính</span>
                  </button>
                </div>
              </div>
            )}

            {/* Video File Label Header if loaded */}
            {localVideoName && (
              <div className="px-4 py-2.5 bg-dark-950/90 border-t border-dark-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center space-x-2 truncate">
                  <Video className="w-4 h-4 text-accent-400 shrink-0" />
                  <span className="truncate font-medium">{localVideoName}</span>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-accent-400 hover:text-accent-300 font-semibold shrink-0"
                >
                  Đổi video khác
                </button>
              </div>
            )}
          </div>

          {/* THE LIVE SUBTITLE WIDGET BAR (ATTACHED UNDERNEATH VIDEO) */}
          <LiveSubtitleWidget
            sourceLang={sourceLang}
            targetLang={targetLang}
            translationStyle={translationStyle}
            apiKey={config?.gemini_api_key}
            videoElementRef={videoRef}
            localVideoLoaded={Boolean(localVideoUrl)}
            externalHistory={liveHistory}
            setExternalHistory={setLiveHistory}
            onSpeechStatusChange={(active, entry) => {
              setIsSpeechActive(active);
              if (active && entry) {
                setCurrentSpeakingEntry(entry);
              }
            }}
            onListeningChange={(listening) => setIsListening(listening)}
          />
        </div>

        {/* RIGHT COLUMN: THE DEDICATED LIVE SUBTITLE SIDE PANEL TAB (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-dark-900/95 border border-dark-800 shadow-2xl flex flex-col h-[650px] overflow-hidden">
            {/* Side Panel Tabs Header */}
            <div className="p-3 border-b border-dark-800 bg-dark-950/80 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5 bg-dark-900 p-1 rounded-2xl border border-dark-800">
                <button
                  onClick={() => setActiveSideTab('subtitles')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeSideTab === 'subtitles'
                      ? 'bg-accent-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Phụ đề Trực tiếp</span>
                  {liveHistory.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                      {liveHistory.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveSideTab('platforms')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeSideTab === 'platforms'
                      ? 'bg-accent-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Mọi nền tảng</span>
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center space-x-2 pr-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isListening
                      ? isSpeechActive ? 'bg-emerald-400 animate-ping' : 'bg-red-500 animate-pulse'
                      : 'bg-slate-600'
                  }`}
                />
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  {isListening ? (isSpeechActive ? 'Đang nói' : 'Đang nghe') : 'Tạm dừng'}
                </span>
              </div>
            </div>

            {/* TAB CONTENT 1: REAL-TIME SUBTITLE TRANSCRIPT FEED */}
            {activeSideTab === 'subtitles' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search & Actions Bar */}
                <div className="p-3 border-b border-dark-800 bg-dark-950/40 flex items-center justify-between gap-2 text-xs">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm câu thoại..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-dark-900 border border-dark-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                    />
                  </div>

                  {/* Auto-scroll Switch */}
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2.5 py-1.5 rounded-xl border flex items-center space-x-1 font-semibold text-[11px] transition-all ${
                      autoScroll
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-dark-900 text-slate-400 border-dark-800'
                    }`}
                    title="Tự động cuộn xuống khi nhân vật nói câu mới"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tự cuộn</span>
                  </button>

                  {/* Export SRT */}
                  <button
                    onClick={exportAsSrt}
                    disabled={liveHistory.length === 0}
                    className="p-1.5 rounded-xl bg-dark-900 border border-dark-800 text-slate-300 hover:text-white disabled:opacity-30"
                    title="Xuất file phụ đề .SRT có timestamp"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Clear */}
                  <button
                    onClick={() => setLiveHistory([])}
                    disabled={liveHistory.length === 0}
                    className="p-1.5 rounded-xl bg-dark-900 border border-dark-800 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                    title="Xóa danh sách thoại"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* The Dialogue Feed List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                  {filteredHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
                      <div className="p-3.5 rounded-2xl bg-dark-950 border border-dark-800">
                        <Radio className="w-8 h-8 text-slate-600 animate-pulse" />
                      </div>
                      <p className="text-xs max-w-xs leading-relaxed">
                        Chưa có câu thoại nào. Bấm <b>"Bật Dịch Trực Tiếp"</b> và phát video bất kỳ, phụ đề và thời gian nói sẽ tự động hiện lên tại đây theo từng câu!
                      </p>
                    </div>
                  ) : (
                    filteredHistory.map((item) => {
                      const isCurrent = currentSpeakingEntry?.id === item.id && isSpeechActive;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all duration-200 relative group ${
                            isCurrent
                              ? 'bg-dark-950 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                              : 'bg-dark-950/70 border-dark-800/80 hover:border-dark-700'
                          }`}
                        >
                          {/* Top Meta Line: Timestamp & Badges */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center space-x-2">
                              {/* Timestamp Pill */}
                              <button
                                onClick={() => item.startSec && jumpToVideoTime(item.startSec)}
                                className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-dark-900 border border-dark-800 text-[10px] font-mono text-cyan-400 font-bold hover:border-cyan-500/50 transition-colors"
                                title="Bấm để tua video tới mốc thời gian này"
                              >
                                <Clock className="w-3 h-3 text-cyan-400" />
                                <span>{item.timestamp || '00:00'}</span>
                              </button>

                              <span className="text-[10px] text-slate-500 font-mono">
                                {item.time}
                              </span>

                              {item.lang && (
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-dark-900 text-slate-400 border border-dark-800">
                                  {item.lang}
                                </span>
                              )}
                            </div>

                            {/* Active speech indicator or copy button */}
                            <div className="flex items-center space-x-1.5">
                              {isCurrent && (
                                <span className="flex items-center space-x-1 text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  <span>Đang nói...</span>
                                </span>
                              )}

                              <button
                                onClick={() => copyToClipboard(item.translated, item.id)}
                                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Sao chép câu dịch"
                              >
                                {copiedId === item.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Original spoken line (Bilingual) */}
                          {item.original && (
                            <p className="text-slate-400 text-xs italic mb-1 leading-relaxed">
                              "{item.original}"
                            </p>
                          )}

                          {/* Vietnamese Translated Subtitle */}
                          <p className="text-white font-bold text-xs sm:text-sm text-amber-200/95 leading-relaxed tracking-wide">
                            {item.translated}
                          </p>
                        </div>
                      );
                    })
                  )}
                  <div ref={transcriptBottomRef} />
                </div>

                {/* Footer Quick Actions */}
                <div className="p-3 border-t border-dark-800 bg-dark-950 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1 text-[11px]">
                    <span>Tổng số câu:</span>
                    <span className="font-mono font-bold text-white">{liveHistory.length}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={exportAsTxt}
                      disabled={liveHistory.length === 0}
                      className="text-[11px] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      Xuất .TXT
                    </button>
                    <span className="text-dark-700">|</span>
                    <button
                      onClick={exportAsSrt}
                      disabled={liveHistory.length === 0}
                      className="text-[11px] text-accent-400 hover:text-accent-300 font-bold disabled:opacity-30 transition-colors"
                    >
                      Xuất .SRT
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: UNIVERSAL PLATFORMS GUIDE */}
            {activeSideTab === 'platforms' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs text-slate-300">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-dark-950 to-dark-900 border border-dark-800 space-y-1">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                    <Globe className="w-4 h-4" />
                    <span>Hỗ Trợ Mọi Nền Tảng Video & Ứng Dụng</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Hệ thống thu và xử lý âm thanh qua luồng chuẩn Web Audio & Display Media, cho phép dịch trực tiếp trên bất kỳ trang web hay phần mềm máy tính nào:
                  </p>
                </div>

                {/* Platform Categories */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800/80 space-y-1.5">
                    <div className="flex items-center space-x-2 text-rose-400 font-bold">
                      <Tv className="w-4 h-4" />
                      <span>1. Web Video (YouTube, Netflix, Bilibili, TikTok, Twitch)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Chọn <b>"Tab / Màn hình"</b> ➔ Chọn tab video ➔ <b>Tích chọn ô "Chia sẻ âm thanh"</b> (Share audio). Phụ đề sẽ lập tức nhảy vào bảng bên cạnh theo từng câu nói!
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800/80 space-y-1.5">
                    <div className="flex items-center space-x-2 text-purple-400 font-bold">
                      <Users className="w-4 h-4" />
                      <span>2. Họp Trực Tuyến (Zoom, Teams, Google Meet, Discord)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Chọn <b>"Toàn bộ màn hình"</b> + <b>"Chia sẻ âm thanh hệ thống"</b> khi họp bằng app Zoom/Teams. Giọng người tham gia nói đến đâu, tab phụ đề dịch sang tiếng Việt đến đó.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800/80 space-y-1.5">
                    <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                      <Video className="w-4 h-4" />
                      <span>3. Xem Phim trên Desktop (VLC, PotPlayer, Windows Media)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Bật phim trên VLC/PotPlayer, chọn <b>"Toàn bộ màn hình"</b> có chia sẻ âm thanh, sau đó bấm <b>"Cửa sổ nổi PiP"</b> để đặt bảng phụ đề nhỏ ngay bên dưới phim!
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800/80 space-y-1.5">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold">
                      <Upload className="w-4 h-4" />
                      <span>4. Mở File Video trực tiếp (.MP4, .MKV, .WebM, .AVI)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Bấm <b>"Mở Video từ máy tính"</b> để phát ngay trong trình duyệt. Bảng bên cạnh sẽ hiển thị thời gian phát và cho phép bấm vào câu thoại để tua video đến đúng đoạn nói!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
