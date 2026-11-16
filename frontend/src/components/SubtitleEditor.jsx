import React, { useState } from 'react';
import { 
  Download, 
  Save, 
  Search, 
  Clock, 
  Check, 
  Copy, 
  FileText, 
  Sparkles,
  PlayCircle,
  Video,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { exportSubtitlesFile, saveJobSubtitles } from '../services/api';

export default function SubtitleEditor({ 
  jobId, 
  fileName, 
  sourceLang, 
  targetLang, 
  items, 
  onItemsChange, 
  currentTimeMs,
  onSeek,
  onOpenMp4Config,
  isVideo = false,
  subtitledVideoUrl = null,
  onReRenderVideo = null,
  isReRendering = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Handle text edit
  const handleTextChange = (index, newTranslated) => {
    const updated = items.map((it) =>
      it.index === index ? { ...it, translated: newTranslated } : it
    );
    onItemsChange(updated);
  };

  // Save changes to backend database
  const handleSave = async () => {
    if (!jobId) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveJobSubtitles(jobId, items);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert('Failed to save subtitles: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Export SRT
  const handleExport = async (useTranslated = true) => {
    const defaultName = fileName ? fileName.replace(/\.[^/.]+$/, "") : 'subtitles';
    const outName = `${defaultName}_${useTranslated ? targetLang : sourceLang}.srt`;
    try {
      await exportSubtitlesFile({
        items,
        file_name: outName,
        use_translated: useTranslated,
      });
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Copy text to clipboard
  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Filter items
  const filteredItems = items.filter((it) => {
    const query = searchTerm.toLowerCase();
    return (
      it.original.toLowerCase().includes(query) ||
      it.translated.toLowerCase().includes(query) ||
      it.index.toString().includes(query) ||
      it.start.includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-2xl">
      {/* Action Toolbar */}
      <div className="p-4 bg-dark-850 border-b border-dark-700/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Info & Search */}
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search subtitle text or timestamp..."
              className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            Showing <strong className="text-slate-200">{filteredItems.length}</strong> of {items.length} lines
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Re-render Video with updated subtitles */}
          {isVideo && onReRenderVideo && (
            <button
              onClick={onReRenderVideo}
              disabled={isReRendering}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all disabled:opacity-50"
              title="Render lại video với nội dung phụ đề vừa sửa đổi"
            >
              {isReRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Đang gắn sub...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cập nhật vào Video</span>
                </>
              )}
            </button>
          )}

          {jobId && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                saveSuccess
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                  : 'bg-dark-800 border-dark-700 text-slate-200 hover:bg-dark-700 hover:text-white'
              }`}
            >
              {saveSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Save className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save'}</span>
            </button>
          )}

          {/* If video, primary action is Download Subtitled Video */}
          {isVideo && subtitledVideoUrl ? (
            <a
              href={subtitledVideoUrl}
              download={`${fileName ? fileName.replace(/\.[^/.]+$/, "") : 'video'}_subtitled.mp4`}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
              title="Tải video MP4 đã gắn phụ đề hoàn chỉnh"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Video MP4</span>
            </a>
          ) : (
            <button
              onClick={() => handleExport(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white shadow-md shadow-primary-600/20 transition-all hover:scale-102"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải SRT</span>
            </button>
          )}

          {/* Secondary: SRT export for video */}
          {isVideo && (
            <button
              onClick={() => handleExport(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 transition-colors"
              title="Tải riêng file phụ đề .srt"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>SRT</span>
            </button>
          )}

          {onOpenMp4Config && (
            <button
              onClick={onOpenMp4Config}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 transition-colors shadow-sm"
              title="Cấu hình kiểu dáng chữ, màu sắc, vị trí phụ đề trên video"
            >
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span>Kiểu phụ đề</span>
            </button>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 px-4 py-2 bg-dark-950 border-b border-dark-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-2">Timestamp</div>
        <div className="col-span-4 pl-2">Original Subtitle</div>
        <div className="col-span-5 pl-2 flex items-center justify-between">
          <span className="text-accent-400 font-bold">Translated Subtitle (Editable)</span>
          <span className="text-[10px] text-slate-500 font-normal">Click text to edit</span>
        </div>
      </div>

      {/* Subtitles Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-dark-800/80 max-h-[620px]">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No subtitles match your search query.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive =
              currentTimeMs !== undefined &&
              currentTimeMs >= item.start_ms &&
              currentTimeMs <= item.end_ms;

            return (
              <div
                key={item.index}
                className={`grid grid-cols-12 px-4 py-3 items-start transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-950/40 border-l-4 border-accent-400'
                    : 'hover:bg-dark-800/40'
                }`}
              >
                {/* Index & Jump Button */}
                <div className="col-span-1 flex flex-col items-center justify-center pt-1">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {item.index}
                  </span>
                  {onSeek && (
                    <button
                      onClick={() => onSeek(item.start_ms)}
                      className="mt-1 text-slate-500 hover:text-accent-400 transition-colors"
                      title="Seek video to this timestamp"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Timestamps */}
                <div className="col-span-2 flex flex-col justify-center text-[11px] font-mono text-slate-400 pt-1 space-y-0.5">
                  <span className="flex items-center space-x-1 text-slate-300">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{item.start}</span>
                  </span>
                  <span className="pl-4 text-slate-500">
                    {item.end}
                  </span>
                </div>

                {/* Original Subtitle */}
                <div className="col-span-4 px-2 pt-1 group relative">
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                    {item.original}
                  </p>
                  <button
                    onClick={() => handleCopy(item.original, `orig_${item.index}`)}
                    className="opacity-0 group-hover:opacity-100 absolute top-1 right-2 text-slate-500 hover:text-white transition-opacity"
                    title="Copy original"
                  >
                    {copiedIndex === `orig_${item.index}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Translated Subtitle (Editable) */}
                <div className="col-span-5 px-2">
                  <textarea
                    value={item.translated}
                    onChange={(e) => handleTextChange(item.index, e.target.value)}
                    rows={Math.max(1, item.translated.split('\n').length)}
                    className="w-full bg-dark-950/70 hover:bg-dark-950 focus:bg-dark-950 border border-dark-700 focus:border-accent-500 rounded-xl px-3 py-2 text-xs text-white leading-relaxed resize-none transition-all focus:outline-none focus:ring-1 focus:ring-accent-500/50"
                    placeholder="Enter translated text..."
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
