import React from 'react';
import { MapPin, Plus, X, Star } from 'lucide-react';
import { TripRecommendation } from '../types';
import { PlaceImage } from './PlaceImage';
import { TRANSLATIONS, CATEGORY_RULES, KML_ICON_STYLES } from '../constants';
import { KmlIconSelector } from './KmlIconSelector';

interface PlaceCardProps {
  place: TripRecommendation;
  index: number;
  onSave: (place: TripRecommendation) => void;
  onDismiss: (place: TripRecommendation) => void;
  onIconChange?: (place: TripRecommendation, iconId: string) => void;
  onViewOnMap?: (place: TripRecommendation) => void;
}

// Helper to get default icon for a category
const ICON_PRIORITY = ['Ice Cream', 'Coffee', 'Tourist Attractions', 'Hotels', 'Restaurants', 'Bar', 'Museums & Galleries', 'Shopping', 'Beach'];

const getDefaultKmlIcon = (place: { category: string; title: string; description: string }): string => {
  const text = `${place.category} ${place.title} ${place.description}`.toLowerCase();
  
  for (const categoryName of ICON_PRIORITY) {
    const keywords = CATEGORY_RULES[categoryName];
    if (keywords && keywords.some(keyword => text.includes(keyword))) {
      return KML_ICON_STYLES[categoryName] || 'icon-camera';
    }
  }
  
  return 'icon-camera';
};

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  index,
  onSave,
  onDismiss,
  onIconChange,
  onViewOnMap
}) => {
  const defaultIcon = getDefaultKmlIcon(place);
  const currentIcon = place.customKmlIcon || defaultIcon;

  const handleIconChange = (iconId: string) => {
    if (onIconChange) {
      onIconChange(place, iconId);
    }
  };
  return (
    <div className="place-card bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* Compact Image Icon */}
        <div className="place-card-image relative w-14 h-14 shrink-0 bg-slate-100 rounded-lg overflow-hidden">
          <PlaceImage place={place} index={index} />
          {place.rating && (
            <div className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 bg-amber-400 text-white px-1 py-0.5 rounded text-[8px] font-bold shadow-sm">
              <Star className="w-2 h-2 fill-white" />
              {place.rating.toFixed(1)}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="place-card-content flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">
                {place.title}
              </h4>
              <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded mt-0.5">
                {place.category}
              </span>
            </div>
            <button 
              onClick={() => onDismiss(place)}
              className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
              title={TRANSLATIONS.dismiss}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Description */}
          <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 mb-2 flex-1">
            {place.description}
          </p>
          
          {/* Icon Selector */}
          {onIconChange && (
            <div className="mb-2">
              <KmlIconSelector
                currentIconId={currentIcon}
                onIconChange={handleIconChange}
              />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-between gap-2 mt-auto">
            <button
              onClick={() => onViewOnMap?.(place)}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              Map
            </button>
            
            <button 
              onClick={() => onSave(place)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 text-[10px] font-black uppercase tracking-wider active:scale-95"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
