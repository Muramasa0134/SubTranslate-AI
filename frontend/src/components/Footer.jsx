import React from 'react';
import { Subtitles, Sparkles, Code2, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-dark-800 bg-dark-950/80 text-slate-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Subtitles className="w-5 h-5 text-accent-400" />
          <span className="text-sm font-semibold text-slate-200">SubTranslate AI</span>
          <span className="text-xs text-slate-500">— Video & Subtitle Translation System</span>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-accent-400" />
            <span>Powered by Google Gemini & faster-whisper</span>
          </span>
          <span className="text-dark-700">•</span>
          <span className="flex items-center space-x-1">
            <Code2 className="w-3.5 h-3.5 text-primary-400" />
            <span>AI Intern Portfolio Project</span>
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Built with React + Vite + FastAPI
        </p>
      </div>
    </footer>
  );
}
