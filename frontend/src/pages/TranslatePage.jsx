import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Subtitles, 
  Video, 
  Upload, 
  Sparkles, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Clock, 
  Loader2, 
  RotateCcw, 
  FileText,
  Key,
  ShieldAlert,
  Download,
  Link as LinkIcon,
  Globe,
  X,
  Play,
  Film
} from 'lucide-react';
import { 
  parseSrtFile, 
  translateSrtItems, 
  translateVideoFile, 
  translateVideoUrl,
  getVideoUrlInfo,
  renderSubtitledVideo 
} from '../services/api';
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../utils/languages';
import SubtitleEditor from '../components/SubtitleEditor';
import VideoSubtitlePlayer from '../components/VideoSubtitlePlayer';
import Mp4ConfigModal from '../components/Mp4ConfigModal';

export default function TranslatePage({ config, onOpenKeyModal }) {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('tab') === 'video' ? 'video' : 'srt';

  const [activeTab, setActiveTab] = useState(initialMode); // 'srt' or 'video'
  const [videoInputMode, setVideoInputMode] = useState('url'); // 'url' (default) or 'file'

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'video' || tab === 'srt') {
      setActiveTab(tab);
      resetAll();
    }
  }, [searchParams]);

  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('vi');
  const [translationStyle, setTranslationStyle] = useState('cinematic');
  const [contextHint, setContextHint] = useState('');
  const [whisperModel, setWhisperModel] = useState('tiny'); // 'tiny' or 'base'

  // Video URL state
  const [videoUrl, setVideoUrl] = useState('');
  const [urlInfo, setUrlInfo] = useState(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Status & Progress
  const [processing, setProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Video Subtitle Direct Burn Styling
  const [fontSize, setFontSize] = useState(22);
  const [fontColor, setFontColor] = useState('#FFFFFF');
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [borderStyle, setBorderStyle] = useState(1);
  const [position, setPosition] = useState('bottom');
  const [preset, setPreset] = useState('ultrafast');
  const [isReRendering, setIsReRendering] = useState(false);

  // Result state
  const [resultData, setResultData] = useState(null);
  const [videoCurrentTimeMs, setVideoCurrentTimeMs] = useState(0);
  const [isMp4ModalOpen, setIsMp4ModalOpen] = useState(false);

  // Re-render hardsubbed video when subtitles are edited
  const handleReRenderVideo = async () => {
    if (!resultData?.job_id) return;
    setIsReRendering(true);
    try {
      const res = await renderSubtitledVideo({
        jobId: resultData.job_id,
        items: resultData.items,
        config: {
          font_size: fontSize,
          font_color: fontColor,
          outline_color: outlineColor,
          border_style: borderStyle,
          position: position,
          preset: 'fast',
          subtitles_source: 'translated'
        }
      });
      setResultData(prev => ({
        ...prev,
        subtitled_video_url: res.subtitled_video_url + '?t=' + Date.now()
      }));
    } catch (err) {
      alert('Không thể cập nhật video: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsReRendering(false);
    }
  };

  // URL Handling
  const handleUrlChange = (val) => {
    setVideoUrl(val);
    setErrorMsg('');
    if (!val.trim()) {
      setUrlInfo(null);
    }
  };

  const handleClearUrl = () => {
    setVideoUrl('');
    setUrlInfo(null);
    setErrorMsg('');
  };

  const handleCheckUrl = async () => {
    const clean = videoUrl.trim();
    if (!clean) return;
    setFetchingInfo(true);
    setErrorMsg('');
    try {
      const info = await getVideoUrlInfo(clean);
      setUrlInfo(info);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Không thể đọc thông tin video từ đường dẫn.');
    } finally {
      setFetchingInfo(false);
    }
  };

  const handlePasteUrl = async (e) => {
    const text = e.clipboardData?.getData('text');
    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
      const clean = text.trim();
      setVideoUrl(clean);
      setErrorMsg('');
      setFetchingInfo(true);
      try {
        const info = await getVideoUrlInfo(clean);
        setUrlInfo(info);
      } catch (err) {
        // Silently ignore preview error on paste so user can still submit
      } finally {
        setFetchingInfo(false);
      }
    }
  };

  // Handle Drag & Drop for Files
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setErrorMsg('');
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const videoExts = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v', '.ts', '.3gp'];

    if (activeTab === 'srt' && !['.srt', '.sub', '.ass', '.ssa'].includes(ext)) {
      setErrorMsg('Vui lòng chọn file phụ đề định dạng .srt cho tab Dịch SRT.');
      return;
    }
    if (activeTab === 'video' && !videoExts.includes(ext) && !file.type.startsWith('video/')) {
      setErrorMsg('Vui lòng chọn video định dạng MP4, MKV, MOV, WebM, hoặc AVI.');
      return;
    }

    setSelectedFile(file);
  };

  const resetAll = () => {
    setSelectedFile(null);
    setVideoUrl('');
    setUrlInfo(null);
    setResultData(null);
    setErrorMsg('');
    setProcessing(false);
    setProgressStage('');
    setUploadPercent(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Main Submit handler
  const handleTranslate = async () => {
    if (activeTab === 'srt' && !selectedFile) {
      setErrorMsg('Vui lòng chọn file SRT trước khi bắt đầu dịch.');
      return;
    }

    if (activeTab === 'video') {
      if (videoInputMode === 'url' && !videoUrl.trim()) {
        setErrorMsg('Vui lòng dán link video (YouTube, TikTok, Facebook, URL MP4...)');
        return;
      }
      if (videoInputMode === 'file' && !selectedFile) {
        setErrorMsg('Vui lòng chọn file video từ máy tính trước khi bắt đầu dịch.');
        return;
      }
    }

    if (!config?.has_gemini_api_key) {
      setErrorMsg('Vui lòng cấu hình Gemini API Key trước khi dịch.');
      onOpenKeyModal();
      return;
    }

    setErrorMsg('');
    setProcessing(true);

    try {
      if (activeTab === 'srt') {
        // Step 1: Parse SRT
        setProgressStage('1/2. Đang phân tích file SRT và trích xuất phụ đề...');
        const parsed = await parseSrtFile(selectedFile);

        // Step 2: Gemini Batch Translate
        setProgressStage(`2/2. Đang gửi ${parsed.subtitles_count} phụ đề tới Google Gemini để dịch...`);
        const result = await translateSrtItems({
          items: parsed.items,
          source_language: sourceLang,
          target_language: targetLang,
          translation_style: translationStyle,
          context_hint: contextHint,
          file_name: selectedFile.name,
        });

        setResultData(result);
      } else if (activeTab === 'video' && videoInputMode === 'url') {
        // Video from URL
        setProgressStage('1/4. Đang kết nối & tải video từ URL (YouTube/Web)...');

        const stageTimer1 = setTimeout(() => {
          setProgressStage('2/4. Đang trích xuất âm thanh (FFmpeg) & Nhận diện giọng nói (Whisper AI)...');
        }, 9000);
        const stageTimer2 = setTimeout(() => {
          setProgressStage('3/4. Đang dịch phụ đề ngữ cảnh chuyên sâu với Gemini AI...');
        }, 22000);
        const stageTimer3 = setTimeout(() => {
          setProgressStage('4/4. Đang gắn phụ đề trực tiếp vào video (Hardsub MP4)...');
        }, 36000);

        try {
          const result = await translateVideoUrl({
            url: videoUrl.trim(),
            source_language: sourceLang,
            target_language: targetLang,
            translation_style: translationStyle,
            context_hint: contextHint,
            whisper_model: whisperModel,
            font_size: fontSize,
            font_color: fontColor,
            outline_color: outlineColor,
            border_style: borderStyle,
            position: position,
            preset: preset,
          });

          setResultData(result);
        } finally {
          clearTimeout(stageTimer1);
          clearTimeout(stageTimer2);
          clearTimeout(stageTimer3);
        }
      } else {
        // Video from uploaded local file
        setProgressStage('1/4. Đang tải video lên máy chủ...');
        const result = await translateVideoFile({
          file: selectedFile,
          source_language: sourceLang,
          target_language: targetLang,
          translation_style: translationStyle,
          context_hint: contextHint,
          font_size: fontSize,
          font_color: fontColor,
          outline_color: outlineColor,
          border_style: borderStyle,
          position: position,
          preset: preset,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadPercent(percent);
              if (percent === 100) {
                setProgressStage('2/4. Đang trích xuất âm thanh (FFmpeg) & Nhận diện giọng nói (Whisper)...');
                setTimeout(() => {
                  setProgressStage('3/4. Đang dịch phụ đề với Google Gemini AI...');
                }, 15000);
              }
            }
          },
        });

        setResultData(result);
      }
    } catch (err) {
      console.error('Translation error:', err);
      setErrorMsg(
        err.response?.data?.detail || err.message || 'Có lỗi xảy ra trong quá trình xử lý.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const isSubmitDisabled = processing || (
    activeTab === 'srt' 
      ? !selectedFile 
      : (videoInputMode === 'url' ? !videoUrl.trim() : !selectedFile)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <span>Không gian Dịch Phụ đề AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {activeTab === 'video'
              ? 'Dán link video (YouTube, TikTok, Facebook...) hoặc tải file để AI tự động trích xuất âm thanh và dịch'
              : 'Tải file phụ đề SRT để chuyển ngữ nhanh chóng giữ nguyên mốc thời gian'}
          </p>
        </div>

        {/* Tab switch buttons */}
        {!resultData && (
          <div className="inline-flex p-1 rounded-xl bg-dark-900 border border-dark-700 self-start">
            <button
              onClick={() => {
                setActiveTab('video');
                resetAll();
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-purple-600 to-accent-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Dịch từ Video</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('srt');
                resetAll();
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'srt'
                  ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Subtitles className="w-4 h-4" />
              <span>Dịch file SRT</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      {!resultData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Link Paste / File Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* If Video Tab and URL Mode: Primary Clean Paste Box */}
            {activeTab === 'video' && videoInputMode === 'url' && (
              <div className="p-6 sm:p-8 rounded-3xl bg-dark-900 border border-dark-700 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600/30 to-accent-600/30 border border-purple-500/40 flex items-center justify-center text-accent-400">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Dán Link Video để Dịch Tự Động</h3>
                      <p className="text-xs text-slate-400">Không cần tải file về máy – AI sẽ tự động phân tích và dịch trực tiếp</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVideoInputMode('file');
                      setErrorMsg('');
                    }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-accent-400 flex items-center space-x-1.5 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-dark-800/90 hover:bg-dark-800 border border-dark-700 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Hoặc tải file từ máy tính</span>
                  </button>
                </div>

                {/* URL Input Bar */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Đường dẫn video (URL)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Globe className="w-5 h-5 text-accent-400" />
                    </div>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      onPaste={handlePasteUrl}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSubmitDisabled) {
                          handleTranslate();
                        }
                      }}
                      placeholder="Dán link YouTube, TikTok, Facebook, MP4 URL..."
                      className="w-full pl-12 pr-32 py-4 bg-dark-950 border-2 border-dark-700 focus:border-accent-500 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all font-mono"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center space-x-1.5">
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={handleClearUrl}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                          title="Xóa link"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCheckUrl}
                        disabled={!videoUrl.trim() || fetchingInfo}
                        className="px-3 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 shadow-md shadow-accent-600/20"
                      >
                        {fetchingInfo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Kiểm tra link</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Supported Platform Badges */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-500">Hỗ trợ tự động:</span>
                  <span className="px-2 py-0.5 rounded-md bg-dark-950 border border-dark-800 text-red-400 font-medium">
                    YouTube (Video & Shorts)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-dark-950 border border-dark-800 text-cyan-400 font-medium">
                    TikTok
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-dark-950 border border-dark-800 text-blue-400 font-medium">
                    Facebook
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-dark-950 border border-dark-800 text-slate-300 font-medium">
                    X / Twitter
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-dark-950 border border-dark-800 text-emerald-400 font-medium">
                    Link MP4 trực tiếp
                  </span>
                </div>

                {/* URL Preview Card */}
                {urlInfo && (
                  <div className="p-4 rounded-2xl bg-dark-950 border border-dark-700 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in duration-300">
                    {urlInfo.thumbnail && (
                      <div className="relative w-full sm:w-40 h-24 rounded-xl overflow-hidden border border-dark-700 shrink-0 bg-dark-900 flex items-center justify-center">
                        <img
                          src={urlInfo.thumbnail}
                          alt={urlInfo.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white/80 drop-shadow" />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider">
                          Đã nhận diện link
                        </span>
                        {urlInfo.duration_string && (
                          <span className="text-xs text-slate-300 flex items-center space-x-1 font-mono bg-dark-900 px-2 py-0.5 rounded border border-dark-800">
                            <Clock className="w-3 h-3 text-accent-400" />
                            <span>{urlInfo.duration_string}</span>
                          </span>
                        )}
                        {urlInfo.uploader && (
                          <span className="text-xs text-slate-400 truncate">
                            Kênh: <strong className="text-white">{urlInfo.uploader}</strong>
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white line-clamp-2" title={urlInfo.title}>
                        {urlInfo.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate font-mono">
                        {urlInfo.webpage_url}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If SRT Tab OR Video File Mode: Drag and Drop Upload Box */}
            {(activeTab === 'srt' || (activeTab === 'video' && videoInputMode === 'file')) && (
              <div className="space-y-4">
                {activeTab === 'video' && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      Đang chọn chế độ: <strong>Tải file từ máy tính</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoInputMode('url');
                        setErrorMsg('');
                      }}
                      className="text-xs font-bold text-accent-400 hover:text-accent-300 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-accent-950/40 border border-accent-500/30 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Chuyển sang Dán link video (YouTube/Web)</span>
                    </button>
                  </div>
                )}

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-accent-500/50 bg-dark-900/90'
                      : 'border-dark-700 hover:border-primary-500/50 bg-dark-900/50 hover:bg-dark-900/80'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeTab === 'srt' ? '.srt,.sub,.ass,.ssa' : 'video/*,.mp4,.mkv,.mov,.webm,.avi'}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-accent-400">
                      {activeTab === 'srt' ? (
                        <Subtitles className="w-8 h-8" />
                      ) : (
                        <Video className="w-8 h-8" />
                      )}
                    </div>

                    {selectedFile ? (
                      <div>
                        <h3 className="text-base font-bold text-white max-w-md truncate">
                          {selectedFile.name}
                        </h3>
                        <p className="text-xs text-accent-400 mt-1 font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Sẵn sàng dịch
                        </p>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Nhấp để chọn file khác
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-base font-bold text-white">
                          Kéo thả file vào đây hoặc <span className="text-accent-400 underline">chọn từ máy tính</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {activeTab === 'srt'
                            ? 'Chấp nhận định dạng file .srt phụ đề'
                            : 'Hỗ trợ video MP4, MKV, MOV, WebM'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <p className="font-semibold">Lỗi trong quá trình xử lý:</p>
                  <p className="leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Loading / Progress State */}
            {processing && (
              <div className="p-6 rounded-2xl bg-dark-900 border border-dark-700 space-y-4 animate-pulse">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
                    <span>{progressStage || 'Đang xử lý với AI...'}</span>
                  </span>
                  {uploadPercent > 0 && uploadPercent < 100 && (
                    <span className="font-mono text-accent-400">{uploadPercent}%</span>
                  )}
                </div>

                <div className="w-full h-2 rounded-full bg-dark-950 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all duration-500"
                    style={{
                      width: uploadPercent > 0 && uploadPercent < 100 ? `${uploadPercent}%` : '100%',
                    }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  Quá trình có thể mất từ 15 - 60 giây tuỳ thuộc vào độ dài video và tốc độ mạng. Vui lòng không đóng trang.
                </p>
              </div>
            )}
          </div>

          {/* Right Col: Configuration Box */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-dark-900 border border-dark-700/80 space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-accent-400" />
                <span>Cấu hình dịch thuật</span>
              </h3>

              {/* Source Lang */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                  Ngôn ngữ gốc (Source)
                </label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white focus:outline-none focus:border-accent-500"
                >
                  {SOURCE_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Lang */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                  Ngôn ngữ đích (Target)
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white focus:outline-none focus:border-accent-500"
                >
                  {TARGET_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Translation Persona & Style */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase flex items-center justify-between">
                  <span>Phong cách dịch thuật AI</span>
                  <span className="text-[10px] text-accent-400 font-bold uppercase">Chuyên gia phụ đề</span>
                </label>
                <select
                  value={translationStyle}
                  onChange={(e) => setTranslationStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white focus:outline-none focus:border-accent-500 font-medium"
                >
                  <option value="cinematic">🎬 Phim ảnh & Kịch tính (Tự nhiên, giàu cảm xúc)</option>
                  <option value="casual">🎙️ Đời thường & Vlog (Hội thoại gần gũi, đời sống)</option>
                  <option value="tech">💻 Công nghệ & Lập trình (Giữ chuẩn thuật ngữ IT/AI)</option>
                  <option value="anime">⚔️ Anime / Manga / Tokusatsu (Chuẩn danh xưng & chiêu thức)</option>
                  <option value="formal">💼 Trang trọng & Tài liệu (Lịch sự, chuẩn mực)</option>
                </select>
              </div>

              {/* Whisper Model Selection (Only for Video Tab) */}
              {activeTab === 'video' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase flex items-center justify-between">
                    <span>Mô hình Whisper AI</span>
                    <span className="text-[10px] text-accent-400 font-bold uppercase">Nhận diện âm thanh</span>
                  </label>
                  <select
                    value={whisperModel}
                    onChange={(e) => setWhisperModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white focus:outline-none focus:border-accent-500 font-medium"
                  >
                    <option value="tiny">⚡ Siêu tốc (Whisper Tiny - Tối ưu thời gian)</option>
                    <option value="base">🎯 Chuẩn xác (Whisper Base - Nhận diện chi tiết hơn)</option>
                  </select>
                </div>
              )}

              {/* Context Hint / Custom Glossary */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase flex items-center justify-between">
                  <span>Gợi ý ngữ cảnh / Tên nhân vật (Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={contextHint}
                  onChange={(e) => setContextHint(e.target.value)}
                  placeholder="Ví dụ: Phim Kamen Rider, Tokusatsu, Phỏng vấn IT..."
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                />
              </div>

              {/* Subtitle Styling Options (Only for Video Tab) */}
              {activeTab === 'video' && (
                <div className="pt-3 border-t border-dark-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Video className="w-3.5 h-3.5 text-purple-400" />
                      <span>Gắn phụ đề vào Video</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30 font-medium">
                      Hardsub MP4
                    </span>
                  </div>

                  {/* Font Size & Position Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Cỡ chữ phụ đề
                      </label>
                      <select
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full px-2.5 py-2 bg-dark-950 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value={18}>Nhỏ (18px)</option>
                        <option value={22}>Chuẩn (22px)</option>
                        <option value={26}>Lớn (26px)</option>
                        <option value={30}>Rất lớn (30px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Vị trí hiển thị
                      </label>
                      <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="w-full px-2.5 py-2 bg-dark-950 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="bottom">Dưới cùng (Chuẩn)</option>
                        <option value="top">Trên cùng</option>
                        <option value="middle">Ở giữa</option>
                      </select>
                    </div>
                  </div>

                  {/* Font Color & Style Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Màu chữ
                      </label>
                      <div className="flex items-center space-x-1.5">
                        {[
                          { color: '#FFFFFF', title: 'Trắng' },
                          { color: '#FDE047', title: 'Vàng' },
                          { color: '#38BDF8', title: 'Cyan' },
                          { color: '#4ADE80', title: 'Xanh lá' },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setFontColor(c.color)}
                            title={c.title}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${
                              fontColor === c.color ? 'scale-115 border-white ring-2 ring-purple-500/50' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: c.color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Kiểu hiển thị
                      </label>
                      <select
                        value={borderStyle}
                        onChange={(e) => setBorderStyle(Number(e.target.value))}
                        className="w-full px-2.5 py-2 bg-dark-950 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value={1}>Viền đen nổi bật</option>
                        <option value={3}>Hộp nền mờ</option>
                      </select>
                    </div>
                  </div>

                  {/* Processing Speed / Preset */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Tốc độ render Hardsub
                    </label>
                    <select
                      value={preset}
                      onChange={(e) => setPreset(e.target.value)}
                      className="w-full px-2.5 py-2 bg-dark-950 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                    >
                      <option value="ultrafast">⚡ Siêu tốc (Ultrafast - Nhanh gấp 5 lần)</option>
                      <option value="veryfast">🚀 Rất nhanh (Veryfast - Cân bằng)</option>
                      <option value="superfast">🏎️ Cực nhanh (Superfast)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* API Key Status Warning */}
              {!config?.has_gemini_api_key && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center space-x-2 font-semibold">
                    <Key className="w-4 h-4" />
                    <span>Chưa có Gemini API Key</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Cần có Gemini API Key để dịch thuật nội dung.
                  </p>
                  <button
                    onClick={onOpenKeyModal}
                    className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-colors"
                  >
                    Nhập API Key ngay
                  </button>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleTranslate}
                disabled={isSubmitDisabled}
                className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-primary-600 via-primary-500 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white shadow-lg shadow-primary-600/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all hover:scale-[1.01]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang dịch AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {activeTab === 'srt'
                        ? 'Bắt đầu dịch file SRT'
                        : videoInputMode === 'url'
                        ? 'Bắt đầu dịch Video từ Link'
                        : 'Bắt đầu dịch Video File'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Top Bar for Results */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-dark-700/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span className="truncate max-w-md">{resultData.file_name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-dark-800 text-accent-400 font-mono uppercase">
                    {resultData.file_type}
                  </span>
                  {resultData.subtitled_video_url && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40 font-bold uppercase">
                      Đã gắn phụ đề vào Video
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Đã dịch <strong className="text-white">{resultData.subtitles_count}</strong> dòng phụ đề ({resultData.source_language} &rarr; {resultData.target_language})
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {resultData.subtitled_video_url && (
                <a
                  href={resultData.subtitled_video_url}
                  download={`${resultData.file_name ? resultData.file_name.replace(/\.[^/.]+$/, "") : 'video'}_subtitled.mp4`}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Video MP4 (.mp4)</span>
                </a>
              )}

              <button
                onClick={resetAll}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Dịch video khác</span>
              </button>
            </div>
          </div>

          {/* If video was translated, show Video Player + Subtitle Editor layout */}
          {resultData.video_url ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Video Player on Left / Top */}
              <div className="lg:col-span-5 sticky top-20">
                <VideoSubtitlePlayer
                  videoUrl={resultData.video_url}
                  subtitledVideoUrl={resultData.subtitled_video_url}
                  fileName={resultData.file_name}
                  items={resultData.items}
                  currentTimeMs={videoCurrentTimeMs}
                  onTimeUpdate={(ms) => setVideoCurrentTimeMs(ms)}
                />
              </div>

              {/* Subtitle Editor on Right / Bottom */}
              <div className="lg:col-span-7 space-y-4">
                <SubtitleEditor
                  items={resultData.items}
                  jobId={resultData.job_id}
                  fileName={resultData.file_name}
                  videoUrl={resultData.video_url}
                  videoCurrentTimeMs={videoCurrentTimeMs}
                  onSeekVideo={(ms) => setVideoCurrentTimeMs(ms)}
                  onItemsUpdated={(newItems) => {
                    setResultData((prev) => ({
                      ...prev,
                      items: newItems,
                    }));
                  }}
                  onOpenMp4Modal={() => setIsMp4ModalOpen(true)}
                  onReRenderVideo={handleReRenderVideo}
                  isReRendering={isReRendering}
                />
              </div>
            </div>
          ) : (
            /* SRT-only mode: Full width editor */
            <SubtitleEditor
              items={resultData.items}
              jobId={resultData.job_id}
              fileName={resultData.file_name}
              videoUrl={null}
              onItemsUpdated={(newItems) => {
                setResultData((prev) => ({
                  ...prev,
                  items: newItems,
                }));
              }}
              onOpenMp4Modal={() => {}}
            />
          )}

          {/* Export MP4 Modal */}
          {isMp4ModalOpen && (
            <Mp4ConfigModal
              isOpen={isMp4ModalOpen}
              onClose={() => setIsMp4ModalOpen(false)}
              jobId={resultData.job_id}
              fileName={resultData.file_name}
              items={resultData.items}
            />
          )}
        </div>
      )}
    </div>
  );
}
