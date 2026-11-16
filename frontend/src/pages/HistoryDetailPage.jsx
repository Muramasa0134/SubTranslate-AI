import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Subtitles, 
  Video, 
  Loader2,
  Download,
  Sparkles
} from 'lucide-react';
import { getHistoryItem, deleteHistoryItem, renderSubtitledVideo } from '../services/api';
import SubtitleEditor from '../components/SubtitleEditor';
import VideoSubtitlePlayer from '../components/VideoSubtitlePlayer';
import Mp4ConfigModal from '../components/Mp4ConfigModal';

export default function HistoryDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoCurrentTimeMs, setVideoCurrentTimeMs] = useState(0);
  const [isMp4ModalOpen, setIsMp4ModalOpen] = useState(false);
  const [isReRendering, setIsReRendering] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [jobId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await getHistoryItem(jobId);
      setDetail(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Không thể tải chi tiết lịch sử.');
    } finally {
      setLoading(false);
    }
  };

  const handleReRenderVideo = async () => {
    if (!detail?.job_id) return;
    setIsReRendering(true);
    try {
      const res = await renderSubtitledVideo({
        jobId: detail.job_id,
        items: detail.items,
        config: {
          subtitles_source: 'translated'
        }
      });
      setDetail(prev => ({
        ...prev,
        subtitled_video_url: res.subtitled_video_url + '?t=' + Date.now()
      }));
    } catch (err) {
      alert('Không thể cập nhật video: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsReRendering(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!window.confirm(`Xác nhận xóa bản ghi "${detail.file_name}"?`)) return;

    try {
      await deleteHistoryItem(jobId);
      navigate('/history');
    } catch (err) {
      alert('Xóa thất bại: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-400 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Đang tải chi tiết bản dịch...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
          {error || 'Không tìm thấy dữ liệu cho tác vụ này.'}
        </div>
        <Link
          to="/history"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-dark-800 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách Lịch sử</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/history"
            className="p-2 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white max-w-lg truncate">
                {detail.file_name}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                detail.file_type === 'video'
                  ? 'bg-purple-950/40 text-purple-400 border border-purple-500/30'
                  : 'bg-blue-950/40 text-blue-400 border border-blue-500/30'
              }`}>
                {detail.file_type}
              </span>
              {detail.subtitled_video_url && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-950/40 text-purple-300 border border-purple-500/30">
                  Đã gắn phụ đề
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
              <span>{detail.source_language} &rarr; {detail.target_language}</span>
              <span>•</span>
              <span className="flex items-center space-x-1 font-mono">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{new Date(detail.created_at).toLocaleString()}</span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {detail.subtitled_video_url && (
            <a
              href={detail.subtitled_video_url}
              download={`${detail.file_name ? detail.file_name.replace(/\.[^/.]+$/, "") : 'video'}_subtitled.mp4`}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
              title="Tải video MP4 đã gắn phụ đề"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Video MP4</span>
            </a>
          )}

          <button
            onClick={handleDelete}
            className="px-3.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa</span>
          </button>
        </div>
      </div>

      {/* Editor & Player Workspace */}
      {detail.video_url ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 sticky top-20">
            <VideoSubtitlePlayer
              videoUrl={detail.video_url}
              subtitledVideoUrl={detail.subtitled_video_url}
              fileName={detail.file_name}
              items={detail.items}
              currentTimeMs={videoCurrentTimeMs}
              onTimeUpdate={(timeMs) => setVideoCurrentTimeMs(timeMs)}
              onOpenMp4Config={() => setIsMp4ModalOpen(true)}
            />
          </div>
          <div className="lg:col-span-7">
            <SubtitleEditor
              jobId={detail.job_id}
              fileName={detail.file_name}
              sourceLang={detail.source_language}
              targetLang={detail.target_language}
              items={detail.items}
              onItemsChange={(newItems) =>
                setDetail({ ...detail, items: newItems })
              }
              currentTimeMs={videoCurrentTimeMs}
              onSeek={(startMs) => setVideoCurrentTimeMs(startMs)}
              onOpenMp4Config={() => setIsMp4ModalOpen(true)}
              isVideo={true}
              subtitledVideoUrl={detail.subtitled_video_url}
              onReRenderVideo={handleReRenderVideo}
              isReRendering={isReRendering}
            />
          </div>
        </div>
      ) : (
        <SubtitleEditor
          jobId={detail.job_id}
          fileName={detail.file_name}
          sourceLang={detail.source_language}
          targetLang={detail.target_language}
          items={detail.items}
          onItemsChange={(newItems) =>
            setDetail({ ...detail, items: newItems })
          }
        />
      )}

      {detail.video_url && (
        <Mp4ConfigModal
          isOpen={isMp4ModalOpen}
          onClose={() => setIsMp4ModalOpen(false)}
          jobId={detail.job_id}
          fileName={detail.file_name}
          items={detail.items}
          defaultSource="translated"
        />
      )}
    </div>
  );
}
