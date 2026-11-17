import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Subtitles, 
  Video, 
  Sparkles, 
  ArrowRight, 
  Cpu, 
  Languages, 
  FileCheck, 
  History, 
  ShieldCheck, 
  Zap,
  Play,
  Radio
} from 'lucide-react';

export default function Home({ config, onOpenKeyModal }) {
  const steps = [
    {
      num: '01',
      title: 'Dán Link Video hoặc Tải file',
      desc: 'Dán link YouTube, TikTok, Facebook, MP4 URL hoặc tải file từ máy tính nhanh chóng.',
      icon: Video,
      accent: 'from-blue-500 to-indigo-600',
    },
    {
      num: '02',
      title: 'Trích xuất & Whisper AI',
      desc: 'FFmpeg trích xuất âm thanh 16kHz mono. faster-whisper chuyển giọng nói thành text kèm timestamp.',
      icon: Cpu,
      accent: 'from-indigo-500 to-purple-600',
    },
    {
      num: '03',
      title: 'Google Gemini Translation',
      desc: 'Dịch thuật ngữ cảnh tự nhiên theo từng batch, bảo toàn 100% số thứ tự và mốc thời gian.',
      icon: Sparkles,
      accent: 'from-purple-500 to-pink-600',
    },
    {
      num: '04',
      title: 'Gắn phụ đề trực tiếp & Xuất Video',
      desc: 'Tự động tạo phụ đề trực tiếp vào video (Hardsub MP4), xem trực tiếp trên web và tải video hoàn chỉnh.',
      icon: FileCheck,
      accent: 'from-pink-500 to-accent-500',
    },
  ];

  const features = [
    {
      icon: Subtitles,
      title: 'Dịch file SRT Siêu tốc',
      desc: 'Đọc và chia block phụ đề, gửi theo lô tối ưu lên Gemini API, giữ nguyên timestamp tuyệt đối.',
    },
    {
      icon: Video,
      title: 'Dịch trực tiếp từ Video',
      desc: 'Tự động trích xuất âm thanh và nhận diện phụ đề tự động bằng mô hình faster-whisper tiên tiến.',
    },
    {
      icon: Languages,
      title: 'Đa ngôn ngữ & Ngữ cảnh',
      desc: 'Hỗ trợ dịch chuẩn xác sang Tiếng Việt, Tiếng Anh, Tiếng Nhật, Hàn, Trung, Pháp, Tây Ban Nha,...',
    },
    {
      icon: History,
      title: 'Lịch sử & Quản lý',
      desc: 'Lưu trữ tự động vào SQLite, cho phép xem lại video kèm phụ đề và tải lại SRT bất cứ lúc nào.',
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 overflow-hidden text-center">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-primary-600/20 via-accent-500/20 to-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-dark-900 border border-dark-700/80 text-xs font-semibold text-accent-400 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Video & Subtitle Translation Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Dịch phụ đề Video thông minh với{' '}
            <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-indigo-300 bg-clip-text text-transparent">
              Gemini & Whisper AI
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Dán link video trực tiếp từ <strong>YouTube, TikTok, Facebook, MP4 URL</strong> hoặc tải file lên. AI sẽ tự động trích xuất âm thanh, nhận diện phụ đề Whisper và chuyển ngữ với Google Gemini.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/live-widget"
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition-all hover:scale-105"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Mở Live Subtitle Widget (Mới)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/translate?tab=video"
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white shadow-lg shadow-purple-600/25 flex items-center space-x-2 transition-all hover:scale-105"
            >
              <Video className="w-4 h-4" />
              <span>Dịch từ Video</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/dashboard"
              className="px-6 py-3.5 rounded-xl font-semibold text-sm bg-dark-900 hover:bg-dark-800 border border-dark-700 text-slate-200 transition-colors"
            >
              Xem Dashboard
            </Link>

            {!config?.has_gemini_api_key && (
              <button
                onClick={onOpenKeyModal}
                className="px-4 py-3.5 rounded-xl font-semibold text-xs bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 text-amber-300 transition-colors flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Cấu hình Gemini API Key</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* AI Pipeline Architecture Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Quy trình xử lý AI khép kín
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Từ file gốc đến phụ đề chất lượng cao chỉ qua 4 giai đoạn tự động
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative p-6 rounded-2xl bg-dark-900 border border-dark-700/80 hover:border-accent-500/40 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${step.accent} flex items-center justify-center shadow-md shadow-primary-500/20 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-mono text-2xl font-black text-dark-700 group-hover:text-accent-400 transition-colors">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Features Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 md:p-12 rounded-3xl bg-dark-900/60 border border-dark-800 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-primary-600/20 border border-primary-500/30 text-accent-400 shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1.5">{feat.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech Stack Footer Bar */}
      <section className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Công nghệ triển khai cốt lõi
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            'Python 3.14',
            'FastAPI',
            'Google Gemini API',
            'faster-whisper',
            'FFmpeg Engine',
            'pysubs2',
            'SQLite / SQLAlchemy',
            'React + Vite',
            'Tailwind CSS',
          ].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-800 text-xs font-mono text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
