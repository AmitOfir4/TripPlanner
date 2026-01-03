import React from 'react';
import { Sparkles, Loader2, RefreshCw, MapPin } from 'lucide-react';
import { TripRecommendation } from '../types';
import { PlaceCard } from './PlaceCard';
import { TRANSLATIONS } from '../constants';

interface PlaceResultsProps {
  loading: boolean;
  loadingMore: boolean;
  currentCity: string;
  suggestions: TripRecommendation[];
  suggestionsEndRef: React.RefObject<HTMLDivElement>;
  onSavePlace: (place: TripRecommendation) => void;
  onDismissPlace: (place: TripRecommendation) => void;
  onLoadMore: () => void;
}

export const PlaceResults: React.FC<PlaceResultsProps> = ({
  loading,
  loadingMore,
  currentCity,
  suggestions,
  suggestionsEndRef,
  onSavePlace,
  onDismissPlace,
  onLoadMore
}) => {
  if (loading) {
    return null;
  }

  if (suggestions.length === 0) {
    return (
      <div className="py-24 text-center space-y-8 flex flex-col items-center">
        <div className="relative">
          <div className="w-32 h-32 bg-indigo-50 rounded-[3rem] rotate-12 absolute -inset-2 opacity-50" />
          <div className="w-32 h-32 bg-white rounded-[3rem] shadow-sm flex items-center justify-center relative border border-slate-100">
            <MapPin className="w-12 h-12 text-indigo-600" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-slate-900 font-black text-2xl tracking-tight">
            {currentCity ? "Ready to explore?" : TRANSLATIONS.noCity}
          </p>
          <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">
            Tell us your destination and what you love to do there.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          {TRANSLATIONS.topRated}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {suggestions.map((place, idx) => (
          <PlaceCard
            key={idx}
            place={place}
            index={idx}
            onSave={onSavePlace}
            onDismiss={onDismissPlace}
          />
        ))}
      </div>

      <div className="flex justify-center pt-8" ref={suggestionsEndRef}>
        <button 
          onClick={onLoadMore}
          disabled={loadingMore}
          className="group flex items-center gap-3 px-10 py-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-600 text-slate-900 font-black text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {loadingMore ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          )}
          {TRANSLATIONS.loadMore}
        </button>
      </div>
    </>
  );
};
