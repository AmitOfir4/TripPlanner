import React from 'react';
import { MapPin, Plus, Loader2 } from 'lucide-react';
import { TripRecommendation } from '../../types';
import { placeChipStyles as s } from '../../styles/chat';
import { buildGoogleMapsUrl } from '../../helpers/urlHelper';

interface PlaceChipProps {
  place: TripRecommendation;
  /** True while the chat hook is calling Google Places to verify exact coords
   * before saving. Replaces the Add button with a spinner and disables it. */
  isVerifying?: boolean;
  onAdd: () => void;
  onShowInMap?: () => void;
  isHebrew?: boolean;
}

export const PlaceChip: React.FC<PlaceChipProps> = ({ place, isVerifying, onAdd, onShowInMap, isHebrew }) => (
  <div className={s.wrapper}>
    <div className={s.inner}>
      <div className="flex-1 min-w-0">
        <h4 className={s.title}>{place.title}</h4>
        {place.description && <p className={s.description}>{place.description}</p>}
        <div className={s.metaRow}>
          <span className={s.categoryBadge}>{place.category}</span>
          {place.rating && (
            <span className={s.rating}>⭐ {place.rating.toFixed(1)}</span>
          )}
          <a
            href={buildGoogleMapsUrl(place)}
            target="_blank"
            rel="noreferrer"
            className={s.mapLink}
          >
            <MapPin className="w-3 h-3" />
            {isHebrew ? 'גוגל מפות' : 'Google Maps'}
          </a>
          {onShowInMap && (
            <button onClick={onShowInMap} className={s.showInMapBtn} disabled={isVerifying}>
              <MapPin className="w-3 h-3" />
              {isHebrew ? 'הצג במפה' : 'Show in Map'}
            </button>
          )}
        </div>
      </div>
      <button onClick={onAdd} className={s.addBtn} disabled={isVerifying}>
        {isVerifying ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            {isHebrew ? 'מאמת…' : 'Verifying…'}
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" />
            {isHebrew ? 'הוסף' : 'Add'}
          </>
        )}
      </button>
    </div>
  </div>
);
