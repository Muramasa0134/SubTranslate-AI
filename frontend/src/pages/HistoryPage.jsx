import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  History, 
  Search, 
  Trash2, 
  ExternalLink, 
  Subtitles, 
  Video, 
  Clock, 
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import { getHistoryList, deleteHistoryItem } from '../services/api';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'srt', 'video'
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistoryList();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId, fileName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lịch sử dịch cho "${fileName}" không?`)) {
      return;
    }
    setDeletingId(jobId);
    try {
      await deleteHistoryItem(jobId);
      setHistory((prev) => prev.filter((item) => item.job_id !== jobId));
    } catch (err) {
      alert('Không thể xóa: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.file_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Lịch sử Dịch thuật
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Quản lý và xem lại tất cả các tác vụ dịch SRT và Video đã lưu
          </p>
        </div>

        <Link
          to="/translate"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white self-start transition-colors"
        >
          + Tạo bản dịch mới
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-dark-900 border border-dark-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên file..."
            className="w-full pl-9 pr-3 py-2 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="inline-flex rounded-xl bg-dark-950 p-1 border border-dark-800 text-xs">
            {['all', 'srt', 'video'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg uppercase font-bold text-[10px] tracking-wider transition-colors ${
                  filterType === type
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            Đang tải danh sách lịch sử...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <History className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">Không tìm thấy bản ghi lịch sử nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-950 border-b border-dark-800 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Tên File</th>
                  <th className="py-3.5 px-4">Loại</th>
                  <th className="py-3.5 px-4">Ngôn ngữ</th>
                  <th className="py-3.5 px-4">Số dòng</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filteredHistory.map((item) => (
                  <tr key={item.job_id} className="hover:bg-dark-850 transition-colors">
                    <td className="py-4 px-4 font-semibold text-white max-w-xs truncate">
                      {item.file_name}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.file_type === 'video'
                          ? 'bg-purple-950/40 text-purple-400 border border-purple-500/30'
                          : 'bg-blue-950/40 text-blue-400 border border-blue-500/30'
                      }`}>
                        {item.file_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-300 font-mono">
                      {item.source_language} &rarr; {item.target_language}
                    </td>
                    <td className="py-4 px-4 text-slate-300 font-mono">
                      {item.subtitles_count}
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
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
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {item.subtitled_video_path && (
                          <a
                            href={item.subtitled_video_path}
                            download={`${item.file_name ? item.file_name.replace(/\.[^/.]+$/, "") : 'video'}_subtitled.mp4`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-dark-800 transition-colors"
                            title="Tải video MP4 đã gắn phụ đề"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <Link
                          to={`/history/${item.job_id}`}
                          className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-accent-400 font-semibold text-xs inline-flex items-center space-x-1 transition-colors"
                        >
                          <span>Xem & Sửa</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.job_id, item.file_name)}
                          disabled={deletingId === item.job_id}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-dark-800 transition-colors"
                          title="Xóa bản ghi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
