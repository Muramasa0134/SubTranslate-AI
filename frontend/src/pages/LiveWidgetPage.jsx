import React, { useState, useRef } from 'react';
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
  Info
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
                  Trực tiếp
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Phát hiện và dịch trực tiếp âm thanh từ video thành phụ đề chèn ngay bên dưới mà không cần tải về
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

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Video Screen / Player Area (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
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
                  Chọn Nguồn Video để Bắt đầu Dịch Trực Tiếp
                </h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                  Bạn có thể phát hiện âm thanh trực tiếp từ bất kỳ <b>Tab trình duyệt (YouTube, Netflix)</b>, hoặc mở một video từ máy tính để xem kèm phụ đề AI.
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

          {/* THE LIVE SUBTITLE WIDGET ATTACHED DIRECTLY UNDERNEATH */}
          <LiveSubtitleWidget
            sourceLang={sourceLang}
            targetLang={targetLang}
            translationStyle={translationStyle}
            apiKey={config?.gemini_api_key}
            videoElementRef={videoRef}
            localVideoLoaded={Boolean(localVideoUrl)}
          />
        </div>

        {/* Right Column: Instructions & Capabilities Guide (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Guide Card */}
          <div className="p-5 rounded-3xl bg-dark-900/90 border border-dark-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Cách sử dụng Widget Dịch Trực Tiếp</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800/80 space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  1. Dịch Video trên Web (YouTube, Netflix)
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bấm <b>"Tab / Màn hình"</b> ➔ bấm <b>"Bật Dịch Trực Tiếp"</b> ➔ Chọn tab chứa video và <b>tích chọn "Chia sẻ âm thanh"</b>. Phụ đề sẽ tự động xuất hiện theo thời gian thực!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800/80 space-y-1">
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  2. Cửa sổ Nổi Luôn Trên Cùng (PiP)
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bấm nút <b>"Cửa sổ nổi PiP"</b> để tách thanh phụ đề thành một cửa sổ nhỏ luôn nổi trên mọi ứng dụng khác (kể cả khi bạn mở video toàn màn hình).
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800/80 space-y-1">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  3. Xem kèm Video từ Máy tính
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bấm <b>"Mở Video từ máy tính"</b> để phát video trực tiếp trong trình phát. Thanh phụ đề sẽ chèn ngay bên dưới khung hình video.
                </p>
              </div>
            </div>
          </div>

          {/* AI Tech Specs Card */}
          <div className="p-5 rounded-3xl bg-dark-900/90 border border-dark-800 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-accent-400" />
              <span>Công nghệ Xử lý Trực tiếp</span>
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li className="flex items-center justify-between py-1 border-b border-dark-800">
                <span>Nhận diện giọng nói</span>
                <span className="font-mono text-emerald-400 font-bold">Whisper Tiny (In-Memory)</span>
              </li>
              <li className="flex items-center justify-between py-1 border-b border-dark-800">
                <span>Dịch ngữ cảnh trực tiếp</span>
                <span className="font-mono text-cyan-400 font-bold">Gemini 3.5 Flash (0s thinking)</span>
              </li>
              <li className="flex items-center justify-between py-1 border-b border-dark-800">
                <span>Độ trễ trung bình</span>
                <span className="font-mono text-amber-400 font-bold">&lt; 0.8 giây / câu</span>
              </li>
              <li className="flex items-center justify-between py-1">
                <span>Lưu trữ ổ cứng</span>
                <span className="font-mono text-slate-300">0 MB (Không tốn bộ nhớ)</span>
              </li>
            </ul>
          </div>

          {/* API Key Status Notice */}
          {!config?.has_gemini_api_key && (
            <div className="p-4 rounded-3xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-semibold">
                <Key className="w-4 h-4" />
                <span>Cần nhập Gemini API Key</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Để dịch trực tiếp sang tiếng Việt chất lượng cao, bạn cần cấu hình Gemini API Key.
              </p>
              <button
                onClick={onOpenKeyModal}
                className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-colors"
              >
                Nhập API Key
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
