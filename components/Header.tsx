import React, { useState } from 'react';
import { Compass, Trash2, Upload, LogIn, User, Key, X, Check, Sparkles } from 'lucide-react';
import { GoogleUser } from '../googleAuthService';
import { TRANSLATIONS } from '../constants';

interface HeaderProps {
  googleUser: GoogleUser | null;
  apiKey: string;
  hasApiKey: boolean;
  onImportClick: () => void;
  onLogout: () => void;
  onReset: () => void;
  onApiKeyChange: (key: string) => void;
  onApiKeyClear: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  googleUser,
  apiKey,
  hasApiKey,
  onImportClick,
  onLogout,
  onReset,
  onApiKeyChange,
  onApiKeyClear
}) => {
  const [imageError, setImageError] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Add referrerPolicy to allow Google images to load
  const profileImageUrl = googleUser?.picture || '';

  const handleApiKeySave = () => {
    onApiKeyChange(tempApiKey);
    setShowApiKeyInput(false);
    setTempApiKey('');
  };

  const handleApiKeyClear = () => {
    onApiKeyClear();
    setTempApiKey('');
    setShowApiKeyInput(false);
  };
  
  return (
    <header className="sticky top-0 z-50 glass border-b border-teal-100/60 shadow-sm shadow-teal-900/5">
      {/* Thin brand accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-teal-500 via-sky-400 to-teal-500" />

      <div className="px-5 lg:px-10 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-sky-500 rounded-xl shadow-lg shadow-teal-400/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Compass className="text-white w-5 h-5" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              {TRANSLATIONS.title}
            </span>
            <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-widest hidden sm:block">
              AI Travel Companion
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* API Key Button */}
          <div className="relative">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                hasApiKey
                  ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 ring-1 ring-teal-200'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200'
              }`}
              title={hasApiKey ? 'API Key configured' : 'Add your Gemini API Key'}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{hasApiKey ? 'API Key ✓' : 'Add API Key'}</span>
            </button>

            {/* API Key Dropdown */}
            {showApiKeyInput && (
              <div className="absolute top-full right-0 mt-2.5 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 z-50">
                {/* Arrow */}
                <div className="absolute -top-2 right-4 w-4 h-4 bg-white rotate-45 border-l border-t border-slate-100" />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Gemini API Key</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Get yours free at{' '}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:underline font-semibold"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {hasApiKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                      <Check className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="text-sm font-semibold text-teal-800">API Key is active</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 truncate">
                      {apiKey.substring(0, 20)}••••••••
                    </div>
                    <button
                      onClick={handleApiKeyClear}
                      className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
                    >
                      Remove Key
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Paste your API key here…"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none font-mono text-sm input-glow transition-all"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && tempApiKey && handleApiKeySave()}
                    />
                    <button
                      onClick={handleApiKeySave}
                      disabled={!tempApiKey}
                      className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-sky-600 text-white rounded-xl text-sm font-semibold hover:from-teal-700 hover:to-sky-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 transition-all shadow-md shadow-teal-200"
                    >
                      Save API Key
                    </button>
                    <p className="text-[11px] text-slate-400">
                      🔒 Stored locally in your browser — never shared.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200" />

          {/* User / Sign-in */}
          {googleUser ? (
            <div className="flex items-center gap-2">
              {!imageError && profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={googleUser.name}
                  className="w-7 h-7 rounded-full ring-2 ring-teal-200"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center ring-2 ring-teal-200">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                </div>
              )}
              <span className="text-xs font-medium text-slate-700 hidden md:inline max-w-[100px] truncate">
                {googleUser.name}
              </span>
              <button
                onClick={onLogout}
                className="text-[11px] text-slate-400 hover:text-red-500 font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : null}

          {/* Import / Sign In */}
          <button
            onClick={onImportClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-teal-300"
          >
            {googleUser ? <Upload className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            {googleUser ? 'Import' : 'Sign In'}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
