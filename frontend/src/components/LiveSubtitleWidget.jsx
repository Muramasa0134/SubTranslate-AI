import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Square, 
  Play, 
  Pause, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Layers, 
  Sparkles, 
  Download, 
  Trash2, 
  Move, 
  ChevronDown, 
  ChevronUp,
  Monitor,
  Mic,
  Video,
  Settings2,
  Copy,
  Check
} from 'lucide-react';
import { liveTranslateChunk } from '../services/api';

export default function LiveSubtitleWidget({
  sourceLang = 'auto',
  targetLang = 'vi',
  translationStyle = 'cinematic',
  apiKey = '',
  externalVideoStream = null
}) {
  // Capture states
  const [isListening, setIsListening] = useState(false);
  const [captureSource, setCaptureSource] = useState('display'); // 'display' (screen/tab), 'mic', 'video'
  const [currentOriginal, setCurrentOriginal] = useState('');
  const [currentTranslated, setCurrentTranslated] = useState('Đang chờ phát hiện âm thanh từ video...');
  const [detectedLang, setDetectedLang] = useState('');
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 - 100 for visualizer

  // Widget display settings
  const [isBilingual, setIsBilingual] = useState(true);
  const [fontSize, setFontSize] = useState(22);
  const [fontColor, setFontColor] = useState('#FDE047'); // Default vibrant yellow for high readability
  const [bgOpacity, setBgOpacity] = useState(85); // 0 - 100
  const [widgetPosition, setWidgetPosition] = useState('bottom'); // 'bottom', 'floating', 'pip'
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // History of spoken lines
  const [liveHistory, setLiveHistory] = useState([]);

  // Media & Audio Context references
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const prevContextRef = useRef('');
  const isProcessingChunkRef = useRef(false);
  const pipWindowRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
    };
  }, []);

  // Audio Level visualizer loop
  const startAudioVisualizer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn('Audio visualizer could not start:', err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Start Capturing Audio
  const startListening = async (overrideSource) => {
    const activeSource = overrideSource || captureSource;
    try {
      let stream = null;

      if (activeSource === 'display') {
        // Capture tab / screen audio (e.g. YouTube, Netflix, Coursera tab)
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });

        // Check if user selected audio
        if (stream.getAudioTracks().length === 0) {
          alert('Lưu ý: Bạn chưa chọn ô "Chia sẻ âm thanh hệ thống / tab" (Share audio) trong cửa sổ trình duyệt. Vui lòng thử lại và tích chọn chia sẻ âm thanh.');
          stream.getTracks().forEach(t => t.stop());
          return;
        }
      } else if (activeSource === 'mic') {
        // Capture microphone / speaker loopback
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          }
        });
      }

      if (!stream) return;
      mediaStreamRef.current = stream;

      // Handle stream stop by user from browser bar
      stream.getVideoTracks().forEach(track => {
        track.onended = () => stopListening();
      });
      stream.getAudioTracks().forEach(track => {
        track.onended = () => stopListening();
      });

      startAudioVisualizer(stream);

      // Create MediaRecorder with chunking every 3.2 seconds
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 1000) {
          handleAudioChunk(e.data);
        }
      };

      // Slice audio in 3.2s chunks
      recorder.start(3200);
      setIsListening(true);
      setCurrentTranslated('Đang lắng nghe âm thanh từ video...');
    } catch (err) {
      console.error('Error starting live capture:', err);
      if (err.name !== 'NotAllowedError') {
        alert('Không thể bắt đầu thu âm: ' + err.message);
      }
      stopListening();
    }
  };

  // Process incoming audio chunk
  const handleAudioChunk = async (blob) => {
    if (isProcessingChunkRef.current) return;
    isProcessingChunkRef.current = true;

    try {
      const result = await liveTranslateChunk({
        audioBlob: blob,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        translationStyle: translationStyle,
        prevContext: prevContextRef.current,
        apiKey: apiKey
      });

      if (result.is_speech && result.original_text) {
        setIsSpeechActive(true);
        setCurrentOriginal(result.original_text);
        setCurrentTranslated(result.translated_text || result.original_text);
        setDetectedLang(result.detected_language);
        prevContextRef.current = result.original_text;

        // Push to live history
        const newEntry = {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          original: result.original_text,
          translated: result.translated_text || result.original_text,
          lang: result.detected_language
        };
        setLiveHistory(prev => [newEntry, ...prev.slice(0, 99)]); // Keep last 100 lines
      } else {
        setIsSpeechActive(false);
      }
    } catch (err) {
      console.warn('Chunk translation error:', err);
    } finally {
      isProcessingChunkRef.current = false;
    }
  };

  // Stop Capturing
  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    stopAudioVisualizer();
    setIsListening(false);
    setIsSpeechActive(false);
    setCurrentTranslated('Đã tạm dừng dịch trực tiếp.');
  };

  // Pop-out into Always-on-top Picture-in-Picture window (Document PiP API)
  const togglePictureInPictureWindow = async () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setWidgetPosition('bottom');
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      alert('Trình duyệt của bạn hiện chưa hỗ trợ Document Picture-in-Picture. Bạn có thể sử dụng chế độ "Thanh nổi" (Floating Overlay) trực tiếp trên trang.');
      setWidgetPosition(widgetPosition === 'floating' ? 'bottom' : 'floating');
      return;
    }

    try {
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 720,
        height: 180,
      });
      pipWindowRef.current = pipWindow;
      setWidgetPosition('pip');

      // Copy stylesheets to PiP window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media;
          link.href = styleSheet.href;
          pipWindow.document.head.appendChild(link);
        }
      });

      // Render Subtitle inside PiP Window
      const container = pipWindow.document.createElement('div');
      container.id = 'pip-subtitle-root';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.backgroundColor = '#0b0f19';
      container.style.color = '#ffffff';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.padding = '12px 20px';
      container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.appendChild(container);

      // Periodic updater for PiP DOM
      const updatePipDom = () => {
        if (!pipWindowRef.current || pipWindowRef.current.closed) return;
        container.innerHTML = `
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${isListening ? '#ef4444' : '#64748b'};"></span>
            SubTranslate AI Live Widget ${detectedLang ? `(${detectedLang.toUpperCase()})` : ''}
          </div>
          ${isBilingual && currentOriginal ? `<div style="font-size: ${Math.max(13, fontSize - 7)}px; color: #94a3b8; margin-bottom: 4px; text-align: center; font-style: italic;">${currentOriginal}</div>` : ''}
          <div style="font-size: ${fontSize}px; font-weight: 700; color: ${fontColor}; text-align: center; text-shadow: 0 2px 4px rgba(0,0,0,0.8); line-height: 1.35;">
            ${currentTranslated}
          </div>
        `;
      };

      updatePipDom();
      const interval = setInterval(updatePipDom, 250);

      pipWindow.addEventListener('pagehide', () => {
        clearInterval(interval);
        pipWindowRef.current = null;
        setWidgetPosition('bottom');
      });
    } catch (err) {
      console.error('Failed to open PiP window:', err);
      setWidgetPosition('floating');
    }
  };

  // Export collected live subtitles to SRT file
  const exportLiveSrt = () => {
    if (liveHistory.length === 0) {
      alert('Chưa có câu thoại nào được dịch để xuất file.');
      return;
    }

    let srtText = '';
    const reversed = [...liveHistory].reverse();
    reversed.forEach((item, index) => {
      const idx = index + 1;
      srtText += `${idx}\n00:00:00,000 --> 00:00:03,000\n${item.translated}\n\n`;
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

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Controls Toolbar */}
      <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-800 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Source selector & Start button */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center bg-dark-950 p-1 rounded-xl border border-dark-800">
            <button
              onClick={() => { setCaptureSource('display'); if (isListening) startListening('display'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                captureSource === 'display'
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Phát hiện và dịch trực tiếp âm thanh từ bất kỳ Tab (YouTube, Netflix) hoặc Màn hình máy tính"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Tab / Màn hình</span>
            </button>

            <button
              onClick={() => { setCaptureSource('mic'); if (isListening) startListening('mic'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                captureSource === 'mic'
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Thu âm trực tiếp từ Microphone hoặc Loa ngoài máy tính"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Microphone</span>
            </button>
          </div>

          {/* Main Action Button */}
          {!isListening ? (
            <button
              onClick={() => startListening()}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Bật Dịch Trực Tiếp (Live)</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Dừng Dịch</span>
            </button>
          )}

          {/* Audio Visualizer Level Bar */}
          {isListening && (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-dark-950 border border-dark-800">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((bar) => {
                  const active = audioLevel > bar * 16;
                  return (
                    <div
                      key={bar}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        active ? 'bg-emerald-400 h-4' : 'bg-dark-700 h-1.5'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {audioLevel > 15 ? 'Đang phát hiện âm thanh' : 'Đang lắng nghe...'}
              </span>
            </div>
          )}
        </div>

        {/* Right Settings & Mode Tools */}
        <div className="flex items-center space-x-2">
          {/* PiP Pop-out Button */}
          <button
            onClick={togglePictureInPictureWindow}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-all ${
              widgetPosition === 'pip'
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-dark-950 border-dark-800 text-slate-300 hover:text-white hover:border-dark-700'
            }`}
            title="Tách thanh phụ đề thành Cửa sổ Nổi Luôn Nằm Trên Cùng (Picture-in-Picture)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cửa sổ nổi PiP</span>
          </button>

          {/* Floating mode toggle */}
          <button
            onClick={() => setWidgetPosition(widgetPosition === 'floating' ? 'bottom' : 'floating')}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-all ${
              widgetPosition === 'floating'
                ? 'bg-accent-600 text-white border-accent-500'
                : 'bg-dark-950 border-dark-800 text-slate-300 hover:text-white hover:border-dark-700'
            }`}
            title="Chuyển đổi giữa chế độ Gắn dưới video hoặc Nổi trên màn hình"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{widgetPosition === 'floating' ? 'Đang nổi' : 'Gắn dưới'}</span>
          </button>

          {/* Quick Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border text-xs transition-all ${
              showSettings
                ? 'bg-dark-800 text-white border-accent-500'
                : 'bg-dark-950 border-dark-800 text-slate-400 hover:text-white'
            }`}
            title="Tùy chỉnh kiểu chữ & hiển thị"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* History list toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-xl bg-dark-950 border border-dark-800 text-slate-400 hover:text-white text-xs flex items-center space-x-1.5"
            title="Xem lại lịch sử các câu thoại đã dịch"
          >
            <span>Lịch sử ({liveHistory.length})</span>
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Floating Widget Customization Bar (Expandable) */}
      {showSettings && (
        <div className="p-4 rounded-2xl bg-dark-900/80 border border-dark-800 flex flex-wrap items-center gap-6 text-xs text-slate-300 animate-fadeIn">
          {/* Bilingual Toggle */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400 uppercase text-[10px]">Hiển thị:</span>
            <button
              onClick={() => setIsBilingual(!isBilingual)}
              className={`px-3 py-1 rounded-lg border font-bold text-xs transition-all ${
                isBilingual
                  ? 'bg-accent-500/20 text-accent-300 border-accent-500/40'
                  : 'bg-dark-950 border-dark-800 text-slate-400'
              }`}
            >
              {isBilingual ? 'Song ngữ (Gốc + Dịch)' : 'Chỉ tiếng Việt'}
            </button>
          </div>

          {/* Font Size */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400 uppercase text-[10px]">Cỡ chữ:</span>
            {[18, 22, 26, 32].map((sz) => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`px-2.5 py-1 rounded-lg border font-mono text-xs transition-all ${
                  fontSize === sz
                    ? 'bg-accent-600 text-white border-accent-500 font-bold'
                    : 'bg-dark-950 border-dark-800 text-slate-400 hover:text-white'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>

          {/* Font Color */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400 uppercase text-[10px]">Màu chữ:</span>
            {[
              { hex: '#FDE047', label: 'Vàng' },
              { hex: '#FFFFFF', label: 'Trắng' },
              { hex: '#38BDF8', label: 'Cyan' },
              { hex: '#4ADE80', label: 'Lá' },
            ].map((col) => (
              <button
                key={col.hex}
                onClick={() => setFontColor(col.hex)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  fontColor === col.hex ? 'scale-115 border-white ring-2 ring-accent-500/50' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: col.hex }}
                title={col.label}
              />
            ))}
          </div>

          {/* Background Opacity */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400 uppercase text-[10px]">Độ mờ nền:</span>
            <input
              type="range"
              min="30"
              max="100"
              value={bgOpacity}
              onChange={(e) => setBgOpacity(Number(e.target.value))}
              className="w-24 accent-accent-500 cursor-pointer"
            />
            <span className="font-mono text-slate-400">{bgOpacity}%</span>
          </div>
        </div>
      )}

      {/* THE LIVE SUBTITLE WIDGET BAR */}
      <div
        className={`relative transition-all duration-300 ${
          widgetPosition === 'floating'
            ? 'fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-4xl shadow-2xl ring-1 ring-white/10'
            : 'w-full shadow-xl'
        }`}
      >
        <div
          className="rounded-3xl border border-white/10 p-5 backdrop-blur-xl relative overflow-hidden transition-all duration-200"
          style={{
            backgroundColor: `rgba(15, 23, 42, ${bgOpacity / 100})`,
          }}
        >
          {/* Subtle neon glowing accent edge */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-500/60 to-transparent" />

          {/* Header indicator inside widget */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isListening
                    ? isSpeechActive ? 'bg-emerald-400 animate-ping' : 'bg-red-500 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center space-x-1.5">
                <span>SUBTRANSLATE AI WIDGET</span>
                {detectedLang && (
                  <span className="px-1.5 py-0.2 bg-white/10 rounded text-slate-300 font-mono">
                    {detectedLang.toUpperCase()} ➔ {targetLang.toUpperCase()}
                  </span>
                )}
              </span>
            </div>

            {widgetPosition === 'floating' && (
              <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                <Move className="w-3 h-3" />
                <span>Thanh Widget Nổi</span>
              </span>
            )}
          </div>

          {/* Subtitle Content Display Area */}
          <div className="py-2 min-h-[72px] flex flex-col justify-center items-center text-center space-y-1.5">
            {/* Original Spoken Text (Bilingual Mode) */}
            {isBilingual && currentOriginal && (
              <p
                className="text-slate-400/90 font-medium italic transition-opacity duration-200"
                style={{ fontSize: `${Math.max(13, fontSize - 7)}px` }}
              >
                "{currentOriginal}"
              </p>
            )}

            {/* Translated Live Subtitle (Vietnamese Main Line) */}
            <h2
              className="font-bold tracking-wide transition-all duration-200 drop-shadow-md select-text"
              style={{
                fontSize: `${fontSize}px`,
                color: fontColor,
                lineHeight: 1.35,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0,0,0,0.5)'
              }}
            >
              {currentTranslated}
            </h2>
          </div>
        </div>
      </div>

      {/* Live History Drawer */}
      {showHistory && (
        <div className="p-4 rounded-2xl bg-dark-900/95 border border-dark-800 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-dark-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Lịch sử phụ đề trực tiếp ({liveHistory.length})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportLiveSrt}
                disabled={liveHistory.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-accent-600/20 hover:bg-accent-600/30 text-accent-300 border border-accent-500/30 text-xs font-semibold disabled:opacity-40 transition-all"
                title="Tải toàn bộ phụ đề đã dịch thành file .SRT"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất file .SRT</span>
              </button>
              <button
                onClick={() => setLiveHistory([])}
                disabled={liveHistory.length === 0}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 text-xs transition-colors"
                title="Xóa lịch sử"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {liveHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Chưa có câu thoại nào. Hãy bấm "Bật Dịch Trực Tiếp" và phát video để xem phụ đề xuất hiện tại đây!
              </p>
            ) : (
              liveHistory.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-dark-950/70 border border-dark-800/80 hover:border-dark-700 transition-all flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                      <span>{item.time}</span>
                      {item.lang && <span className="uppercase text-slate-400">[{item.lang}]</span>}
                    </div>
                    {item.original && (
                      <p className="text-slate-400 italic text-[11px]">"{item.original}"</p>
                    )}
                    <p className="text-white font-semibold text-xs text-amber-200/90">{item.translated}</p>
                  </div>

                  <button
                    onClick={() => copyText(item.translated, idx)}
                    className="p-1 text-slate-500 hover:text-slate-300 shrink-0"
                    title="Sao chép câu dịch"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
