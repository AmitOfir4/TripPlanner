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
}

// Helper to get default icon for a category
const getDefaultKmlIcon = (category: string): string => {
  const normalized = category.toLowerCase();
  
  for (const [categoryName, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
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
  onIconChange
}) => {
  const defaultIcon = getDefaultKmlIcon(place.category);
  const currentIcon = place.customKmlIcon || defaultIcon;

  const handleIconChange = (iconId: string) => {
    if (onIconChange) {
      onIconChange(place, iconId);
    }
  };
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
      <div className="relative h-64 bg-slate-100 rounded-t-[2.5rem] overflow-hidden">
        <PlaceImage place={place} index={index} />
        <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
          <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase text-indigo-600 shadow-sm">
            {place.category}
          </span>
          {place.rating && (
            <div className="flex items-center gap-1 bg-amber-400 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-md">
              <Star className="w-3.5 h-3.5 fill-white" />
              {place.rating.toFixed(1)}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-8 space-y-4">
        <h4 className="font-extrabold text-slate-900 text-2xl leading-tight group-hover:text-indigo-600 transition-colors">
          {place.title}
        </h4>
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 font-medium">
          {place.description}
        </p>
        
        {onIconChange && (
          <div className="flex items-center gap-2 pt-2">
            <KmlIconSelector
              currentIconId={currentIcon}
              onIconChange={handleIconChange}
            />
          </div>
        )}
        
        <div className="pt-4 flex items-center justify-between gap-4">
          <a 
            href={
              place.mapUrl ||
              (place.placeId 
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${place.placeId}`
                : place.lat && place.lng
                ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}`
              )
            } 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Google Maps
          </a>
          
          <div className="flex gap-2">
            <button 
              onClick={() => onDismiss(place)}
              className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              title={TRANSLATIONS.dismiss}
            >
              <X className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onSave(place)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 text-xs font-black uppercase tracking-widest active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {TRANSLATIONS.savePlace}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
