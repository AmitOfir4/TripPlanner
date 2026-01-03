import React from 'react';
import { Map as MapIcon, Trash2, Upload, LogIn } from 'lucide-react';
import { GoogleUser } from '../googleAuthService';
import { TRANSLATIONS } from '../constants';

interface HeaderProps {
  googleUser: GoogleUser | null;
  onImportClick: () => void;
  onLogout: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  googleUser,
  onImportClick,
  onLogout,
  onReset
}) => {
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
        {googleUser ? (
          <div className="flex items-center gap-3">
            <img 
              src={googleUser.picture} 
              alt={googleUser.name} 
              className="w-8 h-8 rounded-full" 
            />
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
