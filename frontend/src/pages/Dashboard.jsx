import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Subtitles, 
  Video, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  Cpu, 
  Sparkles, 
  Key,
  ExternalLink,
  Layers
} from 'lucide-react';
import { getHistoryList } from '../services/api';

export default function Dashboard({ config, onOpenKeyModal }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistoryList();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history in dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = history.length;
  const srtCount = history.filter((h) => h.file_type === 'srt').length;
  const videoCount = history.filter((h) => h.file_type === 'video').length;
  const totalSubtitles = history.reduce((sum, h) => sum + (h.subtitles_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard Tổng Quan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Theo dõi trạng thái hệ thống AI, số liệu xử lý và các bản dịch gần đây
          </p>
        </div>

        <Link
          to="/translate"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white shadow-md shadow-primary-600/20 transition-all self-start"
        >
          <Sparkles className="w-4 h-4" />
          <span>Tạo bản dịch mới</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-dark-900 border border-dark-700/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng bản dịch</span>
            <Layers className="w-4 h-4 text-primary-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Đã xử lý trên hệ thống</p>
        </div>

        <div className="p-5 rounded-2xl bg-dark-900 border border-dark-700/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Dịch SRT File</span>
            <Subtitles className="w-4 h-4 text-accent-400" />
          </div>
          <div className="text-3xl font-black text-white">{srtCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">File phụ đề hoàn tất</p>
        </div>

        <div className="p-5 rounded-2xl bg-dark-900 border border-dark-700/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Dịch Video</span>
            <Video className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{videoCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Whisper speech-to-text</p>
        </div>

        <div className="p-5 rounded-2xl bg-dark-900 border border-dark-700/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng dòng phụ đề</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalSubtitles}</div>
          <p className="text-[11px] text-slate-500 mt-1">Đã dịch chuẩn xác</p>
        </div>
      </div>

      {/* System Status Panel */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-700/80">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-accent-400" />
          <span>Trạng thái kết nối & AI Backend Engines</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gemini */}
          <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-accent-400" />
                <span className="text-xs font-bold text-white">Google Gemini API</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Model: {config?.gemini_model || 'gemini-2.5-flash'}</p>
              <div className="mt-2">
                {config?.has_gemini_api_key ? (
                  <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>API Key đã kích hoạt</span>
                  </span>
                ) : (
                  <button
                    onClick={onOpenKeyModal}
                    className="inline-flex items-center space-x-1 text-amber-400 hover:underline text-xs font-semibold"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Cần nhập API Key</span>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={onOpenKeyModal}
              className="p-1.5 rounded-lg bg-dark-800 text-slate-400 hover:text-white"
              title="Đổi API Key"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Whisper */}
          <div className="p-4 rounded-xl bg-dark-950 border border-dark-800">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white">faster-whisper Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Model: {config?.whisper_model || 'base'} (CP314 CTranslate2)</p>
            <div className="mt-2">
              <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sẵn sàng xử lý âm thanh</span>
              </span>
            </div>
          </div>

          {/* FFmpeg */}
          <div className="p-4 rounded-xl bg-dark-950 border border-dark-800">
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white">FFmpeg Media Processor</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Trích xuất âm thanh 16kHz mono</p>
            <div className="mt-2">
              {config?.ffmpeg_available ? (
                <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>FFmpeg Binary khả dụng</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Không tìm thấy FFmpeg</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Translations Table */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-700/80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Clock className="w-4 h-4 text-primary-400" />
            <span>Bản dịch gần đây</span>
          </h2>
          <Link
            to="/history"
            className="text-xs font-semibold text-accent-400 hover:underline flex items-center space-x-1"
          >
            <span>Xem toàn bộ lịch sử</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Đang tải dữ liệu...
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Subtitles className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">Chưa có bản dịch nào được thực hiện.</p>
            <Link
              to="/translate"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bắt đầu dịch ngay</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-950 border-b border-dark-800 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tên File</th>
                  <th className="py-3 px-4">Loại</th>
                  <th className="py-3 px-4">Cặp ngôn ngữ</th>
                  <th className="py-3 px-4">Số phụ đề</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {history.slice(0, 5).map((item) => (
                  <tr key={item.job_id} className="hover:bg-dark-850 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                      {item.file_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.file_type === 'video'
                          ? 'bg-purple-950/40 text-purple-400 border border-purple-500/30'
                          : 'bg-blue-950/40 text-blue-400 border border-blue-500/30'
                      }`}>
                        {item.file_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {item.source_language} &rarr; {item.target_language}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {item.subtitles_count} dòng
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.status === 'completed'
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : item.status === 'failed'
                          ? 'text-rose-400 bg-rose-950/40'
                          : 'text-amber-400 bg-amber-950/40'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/history/${item.job_id}`}
                        className="px-3 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-accent-400 font-semibold text-xs inline-flex items-center space-x-1 transition-colors"
                      >
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
