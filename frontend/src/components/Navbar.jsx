import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Subtitles, 
  LayoutDashboard, 
  Languages, 
  History, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Radio
} from 'lucide-react';

export default function Navbar({ config, onOpenKeyModal }) {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Sparkles },
    { name: 'Live Widget', path: '/live-widget', icon: Radio, isLive: true },
    { name: 'Translate', path: '/translate', icon: Languages },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'History', path: '/history', icon: History },
  ];

  const hasKey = config?.has_gemini_api_key;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-taste-border bg-taste-bg/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-taste-accent text-taste-accentInk flex items-center justify-center shadow-taste-accent group-hover:scale-105 transition-transform duration-150">
            <Subtitles className="w-5 h-5 font-black" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg text-taste-ink tracking-tight">SubTranslate</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-taste-accent/15 text-taste-accent font-bold border border-taste-accent/30">AI</span>
            </div>
            <p className="text-[10px] text-taste-muted font-medium">Whisper & Gemini Subtitles</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 taste-button ${
                  isActive
                    ? 'bg-taste-card text-taste-accent border border-taste-borderLight shadow-sm'
                    : 'text-taste-muted hover:text-taste-ink hover:bg-taste-surface'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.isLive ? 'text-red-400 animate-pulse' : isActive ? 'text-taste-accent' : 'text-taste-muted'}`} />
                <span>{item.name}</span>
                {item.isLive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                    LIVE
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* API Key Status & Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenKeyModal}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all taste-button ${
              hasKey
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40 animate-pulse'
            }`}
            title={hasKey ? 'Gemini API Key is active' : 'Click to configure Gemini API Key'}
          >
            {hasKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {hasKey ? 'Gemini Connected' : 'Set Gemini Key'}
            </span>
            <Key className="w-3 h-3 opacity-60 ml-1" />
          </button>

          <Link
            to="/translate"
            className="hidden sm:inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-taste-accent text-taste-accentInk hover:bg-taste-accentHover shadow-taste-accent transition-all taste-button"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>New Translation</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
