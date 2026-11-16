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
      setError('Please enter a valid Gemini API Key.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await setApiKey(keyInput.trim());
      setSuccess('Gemini API Key saved successfully!');
      setTimeout(() => {
        onKeyUpdated();
        onClose();
        setSuccess('');
        setKeyInput('');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save API Key.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-primary-600/20 text-accent-400 border border-primary-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Gemini API Key</h3>
              <p className="text-xs text-slate-400">Configure your key for AI translation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Saved locally in backend <code className="text-accent-400 font-mono">.env</code></span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-accent-400 hover:underline flex items-center space-x-1"
              >
                <span>Get free key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {currentConfig?.has_gemini_api_key && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300">
                A valid Gemini API Key is currently loaded in the backend environment.
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
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-dark-800 text-slate-300 hover:bg-dark-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white shadow-md shadow-primary-500/20 disabled:opacity-50 flex items-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save API Key'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
