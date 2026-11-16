import React, { useState } from 'react';
import { 
  X, 
  Video, 
  Download, 
  Sparkles, 
  Sliders, 
  Type, 
  Palette, 
  SlidersHorizontal, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { exportMp4Video } from '../services/api';

const COLOR_PRESETS = [
  { name: 'Trắng', hex: '#FFFFFF' },
  { name: 'Vàng', hex: '#FFFF00' },
  { name: 'Cyan', hex: '#00FFFF' },
  { name: 'Xanh neon', hex: '#00FF66' },
  { name: 'Hồng nhạt', hex: '#FF99DD' },
];

export default function Mp4ConfigModal({ 
  isOpen, 
  onClose, 
  jobId, 
  fileName, 
  items,
  defaultSource = 'translated'
}) {
  const [subtitlesSource, setSubtitlesSource] = useState(defaultSource);
  const [fontSize, setFontSize] = useState(22);
  const [fontColor, setFontColor] = useState('#FFFFFF');
  const [borderStyle, setBorderStyle] = useState(1); // 1 = outline, 3 = box
  const [position, setPosition] = useState('bottom');
  const [preset, setPreset] = useState('ultrafast');

  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleExport = async (e) => {
    e.preventDefault();
    if (!jobId) {
      setErrorMsg('Không tìm thấy mã phiên dịch (Job ID).');
      return;
    }

    setExporting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await exportMp4Video({
        jobId,
        fileName,
        items,
        config: {
          font_size: fontSize,
          font_color: fontColor,
          outline_color: '#000000',
          border_style: borderStyle,
          position: position,
          preset: preset,
          subtitles_source: subtitlesSource,
        },
      });

      setSuccessMsg('Video MP4 đã xuất thành công và bắt đầu tải xuống!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2000);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail || err.message || 'Xuất video MP4 thất bại. Vui lòng thử lại.'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-accent-600 text-white shadow-md shadow-purple-600/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Cấu hình xuất Video MP4 (Hardsub)
              </h3>
              <p className="text-xs text-slate-400">
                Gắn phụ đề trực tiếp vào video MP4 để chia sẻ và phát mọi nơi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Visual Preview Frame */}
        <div className="mt-5 space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Xem trước hiển thị phụ đề (Live Preview)
          </label>
          <div className="relative aspect-video w-full rounded-2xl bg-gradient-to-b from-dark-950 via-slate-900 to-black border border-dark-700/80 overflow-hidden flex flex-col justify-between p-4 shadow-inner">
            <div className="text-[10px] text-slate-500 font-mono">16:9 MP4 Video Simulator</div>

            {/* Subtitle simulation element */}
            <div
              className={`w-full text-center px-4 transition-all ${
                position === 'top'
                  ? 'mb-auto pt-2'
                  : position === 'middle'
                  ? 'my-auto'
                  : 'mt-auto pb-2'
              }`}
            >
              <span
                style={{
                  fontSize: `${fontSize}px`,
                  color: fontColor,
                  textShadow:
                    borderStyle === 1
                      ? '0 0 4px #000, 0 0 4px #000, 2px 2px 3px #000'
                      : 'none',
                  backgroundColor:
                    borderStyle === 3 ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
                  padding: borderStyle === 3 ? '4px 12px' : '0',
                  borderRadius: borderStyle === 3 ? '8px' : '0',
                  lineHeight: '1.4',
                  fontWeight: '600',
                  display: 'inline-block',
                }}
              >
                Mẫu phụ đề SubTranslate AI sẽ hiển thị như thế này!
              </span>
            </div>

            <div className="text-[10px] text-slate-500 font-mono text-right">H.264 / AAC</div>
          </div>
        </div>

        {/* Form controls */}
        <form onSubmit={handleExport} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subtitles Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                Nguồn phụ đề gắn vào video
              </label>
              <select
                value={subtitlesSource}
                onChange={(e) => setSubtitlesSource(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white focus:outline-none focus:border-accent-500"
              >
                <option value="translated">Phụ đề đã dịch (Translated - Đề xuất)</option>
                <option value="original">Phụ đề gốc (Original)</option>
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                Vị trí hiển thị
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bottom', label: 'Dưới cùng' },
                  { id: 'middle', label: 'Ở giữa' },
                  { id: 'top', label: 'Trên cùng' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      position === pos.id
                        ? 'bg-accent-500/20 text-accent-400 border-accent-500/40'
                        : 'bg-dark-950 border-dark-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase">
                  Cỡ chữ phụ đề (Font Size)
                </label>
                <span className="text-xs font-mono font-bold text-accent-400">
                  {fontSize}px
                </span>
              </div>
              <input
                type="range"
                min="16"
                max="36"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-accent-500 bg-dark-950 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>16px (Nhỏ)</span>
                <span>22px (Chuẩn)</span>
                <span>36px (Lớn)</span>
              </div>
            </div>

            {/* Font Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                Màu sắc phụ đề
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 flex-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setFontColor(color.hex)}
                      className={`w-7 h-7 rounded-lg border transition-transform ${
                        fontColor.toUpperCase() === color.hex.toUpperCase()
                          ? 'scale-110 border-white ring-2 ring-accent-500/50'
                          : 'border-dark-700 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="w-24 px-2 py-1.5 bg-dark-950 border border-dark-700 rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-accent-500"
                />
              </div>
            </div>

            {/* Border / Box Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                Viền & Kiểu nền phụ đề
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBorderStyle(1)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    borderStyle === 1
                      ? 'bg-accent-500/20 text-accent-400 border-accent-500/40'
                      : 'bg-dark-950 border-dark-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Viền chữ đen nổi
                </button>
                <button
                  type="button"
                  onClick={() => setBorderStyle(3)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    borderStyle === 3
                      ? 'bg-accent-500/20 text-accent-400 border-accent-500/40'
                      : 'bg-dark-950 border-dark-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Hộp nền mờ (Opaque)
                </button>
              </div>
            </div>

            {/* Encoding Preset */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                Tốc độ mã hóa (Preset)
              </label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white focus:outline-none focus:border-accent-500"
              >
                <option value="ultrafast">Siêu nhanh (Ultrafast - Tiết kiệm thời gian)</option>
                <option value="fast">Cân bằng (Fast - Mặc định)</option>
                <option value="medium">Chất lượng cao (Medium - Nén tối ưu)</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-dark-800 text-slate-300 hover:bg-dark-700 transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={exporting}
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 via-primary-600 to-accent-600 hover:from-purple-500 hover:to-accent-500 text-white shadow-lg shadow-purple-600/25 disabled:opacity-50 flex items-center space-x-2 transition-all hover:scale-102"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gắn phụ đề vào MP4 (FFmpeg)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Xuất & Tải Video MP4</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
