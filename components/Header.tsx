import React, { useState } from 'react';
import { Compass, Trash2, Library, LogIn, User, Key, X, Check, Sparkles, Languages } from 'lucide-react';
import { GoogleUser } from '../googleAuthService';
import { TRANSLATIONS } from '../constants';
import { headerStyles as s } from '../styles/layout';

interface HeaderProps {
  googleUser: GoogleUser | null;
  apiKey: string;
  hasApiKey: boolean;
  language: 'en' | 'he';
  onLanguageChange: (lang: 'en' | 'he') => void;
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
  language,
  onLanguageChange,
  onImportClick,
  onLogout,
  onReset,
  onApiKeyChange,
  onApiKeyClear,
}) => {
  const [imageError, setImageError] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

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
    <header className={s.wrapper}>
      <div className={s.accentBar} />

      <div className={s.inner}>
        {/* Brand */}
        <div className={s.brand}>
          <div className={s.brandIcon}>
            <div className={s.brandIconBg} />
            <div className={s.brandIconInner}>
              <Compass className={s.brandIconSvg} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className={s.brandTitle}>{TRANSLATIONS.title}</span>
            <span className={s.brandSubtitle}>AI Travel Companion!</span>
          </div>
        </div>

        {/* Actions */}
        <div className={s.actions}>
          {/* Language Toggle */}
          <button
            onClick={() => onLanguageChange(language === 'en' ? 'he' : 'en')}
            className={s.langBtn}
            title={language === 'en' ? 'Switch to Hebrew' : 'Switch to English'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'עב' : 'EN'}</span>
          </button>

          {/* API Key Button */}
          <div className="relative">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={hasApiKey ? s.apiKeyBtnActive : s.apiKeyBtnInactive}
              title={hasApiKey ? 'API Key configured' : 'Add your Gemini API Key'}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{hasApiKey ? 'API Key ✓' : 'Add API Key'}</span>
            </button>

            {showApiKeyInput && (
              <div className={s.apiKeyDropdown}>
                <div className={s.apiKeyArrow} />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={s.apiKeyTitle}>Gemini API Key</h3>
                    <p className={s.apiKeySubtitle}>
                      Get yours free at{' '}
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className={s.apiKeyLink}>
                        Google AI Studio
                      </a>
                    </p>
                  </div>
                  <button onClick={() => setShowApiKeyInput(false)} className={s.apiKeyCloseBtn}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {hasApiKey ? (
                  <div className="space-y-3">
                    <div className={s.apiKeyActiveBox}>
                      <Check className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="text-sm font-semibold text-teal-800">API Key is active</span>
                    </div>
                    <div className={s.apiKeyMasked}>{apiKey.substring(0, 20)}••••••••</div>
                    <button onClick={handleApiKeyClear} className={s.apiKeyRemoveBtn}>Remove Key</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Paste your API key here…"
                      className={s.apiKeyInput}
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && tempApiKey && handleApiKeySave()}
                    />
                    <button onClick={handleApiKeySave} disabled={!tempApiKey} className={s.apiKeySaveBtn}>
                      Save API Key
                    </button>
                    <p className={s.apiKeyHint}>🔒 Stored locally in your browser — never shared.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={s.divider} />

          {/* User / Sign-in */}
          {googleUser ? (
            <div className="flex items-center gap-2">
              {!imageError && profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={googleUser.name}
                  className={s.profileImg}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={s.profileFallback}>
                  <User className="w-3.5 h-3.5 text-teal-600" />
                </div>
              )}
              <span className={s.profileName}>{googleUser.name}</span>
              <button onClick={onLogout} className={s.signOutBtn}>Sign out</button>
            </div>
          ) : (
            <button onClick={onImportClick} className={s.importBtn}>
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign in</span>
            </button>
          )}

          {/* My Trips & Reset */}
          {googleUser && (
            <button onClick={onImportClick} className={s.importBtn}>
              <Library className="w-3.5 h-3.5" />
              <span className="hidden md:inline">My Trips</span>
            </button>
          )}
          <button onClick={onReset} className={s.resetBtn}>
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{TRANSLATIONS.reset}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
