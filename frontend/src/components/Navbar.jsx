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
  Sparkles
} from 'lucide-react';

export default function Navbar({ config, onOpenKeyModal }) {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Sparkles },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Translate', path: '/translate', icon: Languages },
    { name: 'History', path: '/history', icon: History },
  ];

  const hasKey = config?.has_gemini_api_key;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-dark-700/60 bg-dark-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-200">
            <Subtitles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg text-white tracking-tight">SubTranslate</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400 font-bold border border-accent-500/30">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Whisper & Gemini Subtitles</p>
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
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600/20 text-accent-400 border border-primary-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-dark-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* API Key Status & Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenKeyModal}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
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
            className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white shadow-md shadow-primary-600/20 transition-all hover:scale-102"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>New Translation</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
