import React, { useState } from 'react';
import { X, Key, ExternalLink, Check, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';
import { setApiKey } from '../services/api';

export default function ApiKeyModal({ isOpen, onClose, onKeyUpdated, currentConfig }) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError('Vui lòng nhập Gemini API Key hợp lệ.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await setApiKey(keyInput.trim());
      setSuccess('Đã lưu Gemini API Key thành công!');
      setTimeout(() => {
        onKeyUpdated();
        onClose();
        setSuccess('');
        setKeyInput('');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Không thể lưu API Key.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-taste-surface border border-taste-border rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-taste-border">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-taste-card text-taste-accent border border-taste-border">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-taste-ink tracking-tight">Google Gemini API Key</h3>
              <p className="text-xs text-taste-muted">Cấu hình API Key để dịch phụ đề AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-taste-muted hover:text-taste-ink hover:bg-taste-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-taste-muted uppercase tracking-wider mb-1.5">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 bg-taste-bg border border-taste-border rounded-xl text-sm text-taste-ink placeholder-taste-muted/60 focus:outline-none focus:border-taste-accent focus:ring-1 focus:ring-taste-accent pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-taste-muted hover:text-taste-ink transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-taste-muted mt-2 flex items-center justify-between">
              <span>Lưu tại backend <code className="text-taste-accent font-mono">.env</code></span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-taste-accent hover:underline flex items-center space-x-1"
              >
                <span>Lấy key miễn phí</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {currentConfig?.has_gemini_api_key && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300">
                Backend đang có sẵn Gemini API Key hợp lệ.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="taste-button px-4 py-2 text-xs font-semibold rounded-xl bg-taste-card text-taste-muted hover:text-taste-ink border border-taste-border"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="taste-button px-5 py-2 text-xs font-semibold rounded-xl bg-taste-accent hover:bg-taste-accentHover text-taste-accentInk shadow-taste-accent disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{saving ? 'Đang lưu...' : 'Lưu API Key'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
