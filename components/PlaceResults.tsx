import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, MapPin, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { TripRecommendation } from '../types';
import { PlaceCard } from './PlaceCard';
import { TRANSLATIONS, CATEGORY_RULES } from '../constants';

interface PlaceResultsProps {
  loading: boolean;
  currentCity: string;
  suggestions: TripRecommendation[];
  suggestionsEndRef: React.RefObject<HTMLDivElement>;
  onSavePlace: (place: TripRecommendation) => void;
  onDismissPlace: (place: TripRecommendation) => void;
  onIconChange?: (place: TripRecommendation, iconId: string) => void;
  onViewOnMap?: (place: TripRecommendation) => void;
}

// Normalize categories - group similar ones
const normalizeCategory = (category: string): string => {
  const normalized = category.toLowerCase();
  
  for (const [categoryName, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return categoryName;
    }
  }
  
  return 'Tourist Attractions';
};

// Category priority order
const CATEGORY_ORDER = [
  'Tourist Attractions',
  'Bar',
  'Restaurants',
  'Museums & Galleries',
  'Shopping',
  'Beach',
  'Hotels'
];

export const PlaceResults: React.FC<PlaceResultsProps> = ({
  loading,
  currentCity,
  suggestions,
  suggestionsEndRef,
  onSavePlace,
  onDismissPlace,
  onIconChange,
  onViewOnMap
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Tourist Attractions']));

  // Show loading state only if there are no existing suggestions
  if (loading && suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-slate-600 font-medium">Finding places...</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0 && !loading) {
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

  // Group suggestions by normalized category
  const groupedByCategory = suggestions.reduce((acc, place) => {
    const category = normalizeCategory(place.category || 'Other');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(place);
    return acc;
  }, {} as Record<string, TripRecommendation[]>);

  // Sort categories by priority
  const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    
    if (indexA === -1 && indexB === -1)
    {
      return a.localeCompare(b);
    }

    if (indexA === -1)
    { 
      return 1;
    }

    if (indexB === -1)
    {
       return -1;
    }

    return indexA - indexB;
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const addAllInCategory = (places: TripRecommendation[]) => {
    places.forEach(place => onSavePlace(place));
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          {TRANSLATIONS.topRated}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {suggestions.length} places in {sortedCategories.length} categories
          </span>
        </div>
      </div>
      
      <div className="space-y-6">
        {sortedCategories.map((category) => {
          const places = groupedByCategory[category];
          const isExpanded = expandedCategories.has(category);
          const isLandmark = category === 'Tourist Attractions';

          return (
            <div 
              key={category} 
              className={`bg-white rounded-3xl border-2 ${isLandmark ? 'border-indigo-200' : 'border-slate-100'} overflow-hidden transition-all`}
            >
              {/* Category Header */}
              <div 
                className={`flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors ${isLandmark ? 'bg-indigo-50/50' : ''}`}
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLandmark ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                    <MapPin className={`w-6 h-6 ${isLandmark ? 'text-indigo-600' : 'text-slate-600'}`} />
                  </div>
                  <div>
                    <h4 className={`font-black text-lg ${isLandmark ? 'text-indigo-900' : 'text-slate-900'}`}>
                      {category}
                      {isLandmark && <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">Must See</span>}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {places.length} {places.length === 1 ? 'place' : 'places'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addAllInCategory(places);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add All
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Category Content */}
              {isExpanded && (
                <div className="max-h-[600px] overflow-y-auto px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    {places.map((place, idx) => (
                      <PlaceCard
                        key={idx}
                        place={place}
                        index={idx}
                        onSave={onSavePlace}
                        onDismiss={onDismissPlace}
                        onIconChange={onIconChange}
                        onViewOnMap={onViewOnMap}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading indicator for additional searches */}
      {loading && suggestions.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-4 bg-white rounded-3xl border-2 border-indigo-200 p-8 shadow-lg">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-slate-600 font-bold">Finding more places...</p>
          </div>
        </div>
      )}

      <div ref={suggestionsEndRef} />
    </>
  );
};
