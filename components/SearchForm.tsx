import React from 'react';
import { MapPin, MessageSquare, Compass, Loader2 } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface SearchFormProps {
  currentCity: string;
  query: string;
  loading: boolean;
  onCityChange: (city: string) => void;
  onQueryChange: (query: string) => void;
  onSearch: (e: React.FormEvent | null) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  currentCity,
  query,
  loading,
  onCityChange,
  onQueryChange,
  onSearch
}) => {
  const isDisabled = loading || !currentCity || !query;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900">{TRANSLATIONS.builder}</h2>
        <p className="text-slate-500 font-medium">
          Use AI to curate the perfect local experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
            {TRANSLATIONS.cityPrompt}
          </label>
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="e.g. Amsterdam"
              className="w-full pl-12 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none font-bold text-slate-800 shadow-sm"
              value={currentCity}
              onChange={(e) => onCityChange(e.target.value)}
            />
          </div>
        </div>
        
        <div className="relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
            {TRANSLATIONS.queryPrompt}
          </label>
          <div className="relative group">
            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder={TRANSLATIONS.queryPlaceholder}
              className="w-full pl-12 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none font-medium text-slate-800 shadow-sm"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch(null)}
            />
          </div>
        </div>
      </div>

      <button 
        onClick={() => onSearch(null)}
        disabled={isDisabled}
        className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.99]"
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Compass className="w-6 h-6" />
        )}
        <span className="text-lg uppercase tracking-widest">
          {loading ? TRANSLATIONS.searching : TRANSLATIONS.findPlaces}
        </span>
      </button>
    </section>
  );
};
