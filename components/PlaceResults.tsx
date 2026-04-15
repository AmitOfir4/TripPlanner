import React, { useState } from 'react';
import { Sparkles, Loader2, MapPin, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { TripRecommendation } from '../types';
import { PlaceCard } from './PlaceCard';
import { TRANSLATIONS, CATEGORY_RULES } from '../constants';
import { placeResultsStyles as s } from '../styles/places';

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

const CATEGORY_ORDER = [
  'Ice Cream', 'Tourist Attractions', 'Restaurants', 'Coffee',
  'Bar', 'Museums & Galleries', 'Shopping', 'Beach', 'Hotels',
];

const normalizeCategory = (place: TripRecommendation): string => {
  const text = `${place.category} ${place.title} ${place.description}`.toLowerCase();
  for (const categoryName of CATEGORY_ORDER) {
    const keywords = CATEGORY_RULES[categoryName];
    if (keywords && keywords.some((keyword) => text.includes(keyword))) return categoryName;
  }
  return 'Tourist Attractions';
};

export const PlaceResults: React.FC<PlaceResultsProps> = ({
  loading, currentCity, suggestions, suggestionsEndRef,
  onSavePlace, onDismissPlace, onIconChange, onViewOnMap,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Tourist Attractions']));

  if (loading && suggestions.length === 0) {
    return (
      <div className={s.loadingWrap}>
        <div className={s.loadingInner}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className={s.loadingText}>Finding places...</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0 && !loading) {
    return (
      <div className={s.emptyWrap}>
        <div className="relative">
          <div className={s.emptyBg} />
          <div className={s.emptyIconWrap}>
            <MapPin className="w-12 h-12 text-indigo-600" />
          </div>
        </div>
        <div className="space-y-2">
          <p className={s.emptyTitle}>{currentCity ? 'Ready to explore?' : TRANSLATIONS.noCity}</p>
          <p className={s.emptySubtitle}>Tell us your destination and what you love to do there.</p>
        </div>
      </div>
    );
  }

  const groupedByCategory = suggestions.reduce((acc, place) => {
    const category = normalizeCategory(place);
    if (!acc[category]) acc[category] = [];
    acc[category].push(place);
    return acc;
  }, {} as Record<string, TripRecommendation[]>);

  const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  };

  const addAllInCategory = (places: TripRecommendation[]) => {
    places.forEach((place) => onSavePlace(place));
  };

  return (
    <>
      <div className={s.headerRow}>
        <h3 className={s.headerTitle}>
          <Sparkles className="w-4 h-4 text-indigo-500" />
          {TRANSLATIONS.topRated}
        </h3>
        <div className="flex items-center gap-3">
          <span className={s.headerCount}>
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
            <div key={category} className={s.categoryCard(isLandmark)}>
              <div className={s.categoryHeader(isLandmark)} onClick={() => toggleCategory(category)}>
                <div className="flex items-center gap-4">
                  <div className={s.categoryIcon(isLandmark)}>
                    <MapPin className={s.categoryIconSvg(isLandmark)} />
                  </div>
                  <div>
                    <h4 className={s.categoryTitle(isLandmark)}>
                      {category}
                      {isLandmark && <span className={s.categoryMustSee}>Must See</span>}
                    </h4>
                    <p className={s.categoryCount}>{places.length} {places.length === 1 ? 'place' : 'places'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); addAllInCategory(places); }}
                    className={s.addAllBtn}
                  >
                    <Plus className="w-4 h-4" />
                    Add All
                  </button>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className={s.categoryContent}>
                  <div className={s.categoryGrid}>
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

      {loading && suggestions.length > 0 && (
        <div className={s.additionalLoadingWrap}>
          <div className={s.additionalLoadingInner}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className={s.additionalLoadingText}>Finding more places...</p>
          </div>
        </div>
      )}

      <div ref={suggestionsEndRef} />
    </>
  );
};
