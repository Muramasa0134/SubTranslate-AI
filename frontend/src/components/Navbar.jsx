import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Subtitles, 
  LayoutDashboard, 
  Languages, 
  History, 
  Key, 
  Sparkles,
  Radio,
  Cpu,
  Menu,
  X,
  Plus
} from 'lucide-react';

export default function Navbar({ config, onOpenKeyModal }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Trang chủ', path: '/', icon: Sparkles },
    { name: 'Dịch Video & Phụ đề', path: '/translate', icon: Languages },
    { name: 'Live Widget', path: '/live-widget', icon: Radio, isLive: true },
    { name: 'Bảng điều khiển', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Lịch sử', path: '/history', icon: History },
  ];

  const hasKey = config?.has_gemini_api_key;
  const geminiModel = config?.gemini_model || 'gemini-3.5-flash-lite';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl transition-all">
      {/* Top micro status bar highlight */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#5ab9fc]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-b from-[#1c2436] to-[#131824] border border-white/[0.1] shadow-inner group-hover:border-[#5ab9fc]/50 transition-all duration-200">
              <Subtitles className="w-4.5 h-4.5 text-[#5ab9fc] transition-transform duration-200 group-hover:scale-110" />
              <div className="absolute -inset-0.5 rounded-xl bg-[#5ab9fc]/10 opacity-0 group-hover:opacity-100 blur-sm transition-opacity" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[15px] tracking-tight text-white font-sans">
                  SubTranslate
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#5ab9fc]/10 text-[#5ab9fc] border border-[#5ab9fc]/20 leading-none">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-[#8891a1] font-mono tracking-tight hidden sm:block">
                Whisper • Gemini Engine
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Segmented Navigation Dock (Desktop) */}
        <nav className="hidden lg:flex items-center p-1 rounded-full bg-[#131824]/90 border border-white/[0.08] shadow-lg shadow-black/40 backdrop-blur-md">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 taste-button ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm font-semibold border border-white/[0.1]'
                    : 'text-[#8891a1] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.isLive ? 'text-rose-400 animate-pulse' : isActive ? 'text-[#5ab9fc]' : 'text-[#8891a1]'}`} />
                <span>{item.name}</span>
                {item.isLive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: AI Engine Status & Primary Action */}
        <div className="flex items-center space-x-2.5">
          {/* Engine Status Pill */}
          <button
            onClick={onOpenKeyModal}
            className={`group hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-150 taste-button ${
              hasKey
                ? 'bg-[#131824]/90 border-white/[0.08] text-[#8891a1] hover:border-[#5ab9fc]/40 hover:text-white'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300 hover:bg-amber-900/40 animate-pulse'
            }`}
            title={hasKey ? `Gemini API sẵn sàng (${geminiModel})` : 'Nhấp để nhập Gemini API Key'}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasKey ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${hasKey ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px] truncate max-w-[130px]">
              {hasKey ? 'Gemini Active' : 'Cần API Key'}
            </span>
            <Key className="w-3 h-3 text-[#8891a1] group-hover:text-[#5ab9fc] transition-colors" />
          </button>

          {/* Primary Action Button */}
          <Link
            to="/translate"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full text-xs font-semibold bg-[#5ab9fc] text-[#0a0d14] hover:bg-[#7ecbfd] shadow-sm shadow-[#5ab9fc]/20 hover:shadow-[#5ab9fc]/30 transition-all duration-150 taste-button"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tạo bản dịch</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-[#131824] border border-white/[0.08] text-[#8891a1] hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/[0.06] bg-[#0a0d14]/95 backdrop-blur-2xl px-4 py-4 space-y-2 animate-fade-in">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/[0.08] text-[#5ab9fc] border border-white/[0.08]'
                    : 'text-[#8891a1] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#5ab9fc]' : 'text-[#8891a1]'}`} />
                  <span>{item.name}</span>
                </div>
                {item.isLive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    LIVE
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenKeyModal();
              }}
              className="flex items-center space-x-2 text-xs text-[#8891a1] hover:text-white py-2"
            >
              <Key className="w-3.5 h-3.5 text-[#5ab9fc]" />
              <span>{hasKey ? 'Cấu hình Gemini API Key' : 'Nhập Gemini API Key'}</span>
            </button>
            <span className="text-[10px] font-mono text-[#8891a1]">
              {hasKey ? 'Connected' : 'Missing Key'}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
