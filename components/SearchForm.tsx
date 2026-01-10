import React, { useState } from 'react';
import { MapPin, MessageSquare, Compass, Loader2, Sparkles, Lightbulb } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface SearchFormProps {
  currentCity: string;
  query: string;
  loading: boolean;
  hasExistingPlaces?: boolean;
  onCityChange: (city: string) => void;
  onQueryChange: (query: string) => void;
  onSearch: (e: React.FormEvent | null) => void;
}

interface PromptExample {
  query: string;
  label: string;
  icon: string;
}

const PROMPT_EXAMPLES: PromptExample[] = [
  { query: 'highly-rated restaurants with authentic local cuisine and traditional dishes', label: 'Local Restaurants', icon: '🍜' },
  { query: 'top-rated famous landmarks, historical sites, and must-see tourist attractions', label: 'Main Attractions', icon: '🌟' },
  { query: 'popular nightlife spots including rooftop bars, cocktail lounges, and live music venues', label: 'Nightlife', icon: '🎷' },
  { query: 'luxury shopping districts, high-end boutiques, local markets, and specialty stores', label: 'Shopping', icon: '✨' },
  { query: 'premium spa experiences, wellness centers, luxury hotels, and upscale dining', label: 'Luxury & Wellness', icon: '💎' },
  { query: 'outdoor activities, scenic viewpoints, nature parks, and adventure experiences', label: 'Nature & Adventure', icon: '🏞️' },
  { query: 'highly-rated hotels, boutique accommodations, luxury resorts, and best-reviewed places to stay', label: 'Hotels & Lodging', icon: '🏨' },
  { query: 'family-friendly attractions, theme parks, playgrounds, and kid-friendly restaurants', label: 'Family Activities', icon: '🎡' },
  { query: 'hidden gems, off-the-beaten-path locations, local favorites, and secret spots', label: 'Hidden Gems', icon: '🔍' },
  { query: 'romantic restaurants, intimate cafes, sunset viewpoints, and couples activities', label: 'Romantic Spots', icon: '💕' },
  { query: 'street food markets, food halls, local eateries, and authentic culinary experiences', label: 'Street Food', icon: '🌮' },
  { query: 'Instagram-worthy photo spots, scenic viewpoints, and aesthetic locations', label: 'Photo Spots', icon: '📸' },
];

export const SearchForm: React.FC<SearchFormProps> = ({
  currentCity,
  query,
  loading,
  hasExistingPlaces = false,
  onCityChange,
  onQueryChange,
  onSearch
}) => {
  const isDisabled = loading || !currentCity || !query;

  const handleExampleClick = (example: PromptExample) => {
    onQueryChange(example.query);
  };

  return (
    <section className="search-form-section space-y-8">
      <div className="search-header space-y-2">
        <h2 className="text-4xl font-black text-slate-900">{TRANSLATIONS.builder}</h2>
        <p className="text-slate-500 font-medium">
          Use AI to curate the perfect local experience.
        </p>
      </div>

      <div className="search-inputs-grid grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="city-input-wrapper relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
            {TRANSLATIONS.cityPrompt}
          </label>
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Enter a city name"
              className="w-full pl-12 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none font-bold text-slate-800 shadow-sm"
              value={currentCity}
              onChange={(e) => onCityChange(e.target.value)}
            />
          </div>
        </div>
        
        <div className="query-input-wrapper relative">
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

      {/* Prompt Examples */}
      {!query && (
        <div className="prompt-examples-section animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Try these popular searches</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PROMPT_EXAMPLES.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(example)}
                className="prompt-example-card group text-left p-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{example.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {example.label}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                      {example.query}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={() => onSearch(null)}
        disabled={isDisabled}
        className="search-submit-button w-full bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.99]"
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Compass className="w-6 h-6" />
        )}
        <span className="text-lg uppercase tracking-widest">
          {loading ? TRANSLATIONS.searching : (hasExistingPlaces ? TRANSLATIONS.loadMore : TRANSLATIONS.findPlaces)}
        </span>
      </button>
    </section>
  );
};
