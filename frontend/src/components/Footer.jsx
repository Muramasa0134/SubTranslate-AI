import React from 'react';
import { Subtitles, Sparkles, Code2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-taste-border bg-taste-surface/80 backdrop-blur-md text-taste-muted py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-taste-accent flex items-center justify-center">
            <Subtitles className="w-3.5 h-3.5 text-taste-accentInk" />
          </div>
          <span className="text-sm font-semibold text-taste-ink">SubTranslate AI</span>
          <span className="text-xs text-taste-muted">— Video & Subtitle Translation System</span>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-taste-accent" />
            <span>Powered by Google Gemini & faster-whisper</span>
          </span>
          <span className="text-taste-border">•</span>
          <span className="flex items-center space-x-1.5">
            <Code2 className="w-3.5 h-3.5 text-taste-accent" />
            <span>Portfolio Project</span>
          </span>
        </div>

        <p className="text-xs text-taste-muted font-mono">
          React 18 + Vite + FastAPI
        </p>
      </div>
    </footer>
  );
}
