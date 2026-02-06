import React, { useState } from 'react';
import { Map as MapIcon, Trash2, Upload, LogIn, User, Key, X, Check } from 'lucide-react';
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
    <header className="sticky top-0 z-50 glass h-18 px-6 lg:px-12 flex items-center justify-between border-b border-slate-200/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <MapIcon className="text-white w-5 h-5" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {TRANSLATIONS.title}
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* API Key Button */}
        <div className="relative">
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              hasApiKey 
                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
            title={hasApiKey ? 'API Key configured' : 'Add your Gemini API Key'}
          >
            <Key className="w-4 h-4" />
            <span className="hidden md:inline">{hasApiKey ? 'API Key' : 'Add API Key'}</span>
          </button>

          {/* API Key Input Modal */}
          {showApiKeyInput && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">Gemini API Key</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Get your free API key from{' '}
                    <a 
                      href="https://aistudio.google.com/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline font-semibold"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {hasApiKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">API Key configured</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-200 truncate">
                    {apiKey.substring(0, 20)}...
                  </div>
                  <button
                    onClick={handleApiKeyClear}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    Remove API Key
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Paste your API key here"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-mono text-sm"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && tempApiKey && handleApiKeySave()}
                  />
                  <button
                    onClick={handleApiKeySave}
                    disabled={!tempApiKey}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                  >
                    Save API Key
                  </button>
                  <p className="text-xs text-slate-500">
                    🔒 Your API key is stored locally in your browser and never shared.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {googleUser ? (
          <div className="flex items-center gap-3">
            {!imageError && profileImageUrl ? (
              <img 
                src={profileImageUrl} 
                alt={googleUser.name} 
                className="w-8 h-8 rounded-full border-2 border-slate-200" 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.warn('Profile image failed to load:', profileImageUrl);
                  setImageError(true);
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
            )}
            <span className="text-xs font-medium text-slate-600 hidden md:inline">
              {googleUser.name}
            </span>
            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-red-600 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : null}
        
        <button
          onClick={onImportClick}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all"
        >
          {googleUser ? <Upload className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          {googleUser ? 'Import' : 'Sign In'}
        </button>
        
        <button 
          onClick={onReset}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          title="Clear all"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
