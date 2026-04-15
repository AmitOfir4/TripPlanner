import React from 'react';
import { MapPin, Plus, X, Star } from 'lucide-react';
import { TripRecommendation } from '../types';
import { PlaceImage } from './PlaceImage';
import { TRANSLATIONS } from '../constants';
import { KmlIconSelector } from './KmlIconSelector';
import { getDefaultKmlIcon } from '../helpers/kmlIconHelper';
import { placeCardStyles as s } from '../styles/places';

interface PlaceCardProps {
  place: TripRecommendation;
  index: number;
  onSave: (place: TripRecommendation) => void;
  onDismiss: (place: TripRecommendation) => void;
  onIconChange?: (place: TripRecommendation, iconId: string) => void;
  onViewOnMap?: (place: TripRecommendation) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  index,
  onSave,
  onDismiss,
  onIconChange,
  onViewOnMap,
}) => {
  const defaultIcon = getDefaultKmlIcon(place);
  const currentIcon = place.customKmlIcon || defaultIcon;

  const handleIconChange = (iconId: string) => {
    if (onIconChange) {
      onIconChange(place, iconId);
    }
  };

  return (
    <div className={s.wrapper}>
      <div className={s.inner}>
        {/* Compact Image Icon */}
        <div className={s.imageWrap}>
          <PlaceImage place={place} index={index} />
          {place.rating && (
            <div className={s.ratingBadge}>
              <Star className="w-2 h-2 fill-white" />
              {place.rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={s.content}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h4 className={s.title}>{place.title}</h4>
              <span className={s.categoryBadge}>{place.category}</span>
            </div>
            <button onClick={() => onDismiss(place)} className={s.dismissBtn} title={TRANSLATIONS.dismiss}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className={s.description}>{place.description}</p>

          {onIconChange && (
            <div className="mb-2">
              <KmlIconSelector currentIconId={currentIcon} onIconChange={handleIconChange} />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-auto">
            <button onClick={() => onViewOnMap?.(place)} className={s.mapBtn}>
              <MapPin className="w-3 h-3" />
              Map
            </button>
            <button onClick={() => onSave(place)} className={s.addBtn}>
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
