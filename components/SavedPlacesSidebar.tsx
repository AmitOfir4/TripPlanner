import React from 'react';
import { Layers, Trash2, Star, Download, Info, Upload, MapPin, Map } from 'lucide-react';
import { TripLayer, TripRecommendation } from '../types';
import { PlaceImage } from './PlaceImage';
import { TRANSLATIONS } from '../constants';
import { GoogleUser } from '../googleAuthService';
import { buildGoogleMapsUrl } from '../helpers/urlHelper';
import { savedSidebarStyles as s } from '../styles/places';

interface SavedPlacesSidebarProps {
  savedLayers: TripLayer[];
  googleUser: GoogleUser | null;
  enriching?: boolean;
  onRemovePlace: (layerName: string, placeTitle: string) => void;
  onDownload: () => void;
  onUploadToDrive: () => void;
  onEnrichSelected?: () => void;
  onViewInMap?: (place: TripRecommendation) => void;
}

export const SavedPlacesSidebar: React.FC<SavedPlacesSidebarProps> = ({
  savedLayers, googleUser, enriching = false,
  onRemovePlace, onDownload, onUploadToDrive, onEnrichSelected, onViewInMap,
}) => {
  const totalPlaces = savedLayers.reduce((acc, l) => acc + l.places.length, 0);

  return (
    <section className={s.wrapper}>
      {/* Header strip */}
      <div className={s.headerStrip}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={s.headerIcon}>
              <Layers className="w-4.5 h-4.5 text-teal-400" />
            </div>
            <div>
              <h3 className={s.headerTitle}>{TRANSLATIONS.savedMap}</h3>
              <p className={s.headerSubtitle}>Your trip collection</p>
            </div>
          </div>
          {savedLayers.length > 0 && (
            <div className={s.headerBadge}>
              {totalPlaces} spot{totalPlaces !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className={s.body}>
        <ActionButtons hasPlaces={savedLayers.length > 0} googleUser={googleUser} onDownload={onDownload} onUploadToDrive={onUploadToDrive} />

        <div className="space-y-8">
          {savedLayers.length === 0 ? (
            <EmptyState />
          ) : (
            savedLayers.map((layer, idx) => (
              <LayerSection key={idx} layer={layer} onRemovePlace={onRemovePlace} onViewInMap={onViewInMap} />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

const EmptyState: React.FC = () => (
  <div className={s.emptyWrap}>
    <div className={s.emptyIcon}>
      <Map className="w-7 h-7 text-slate-300" />
    </div>
    <p className={s.emptyTitle}>{TRANSLATIONS.noPlaces}</p>
    <p className={s.emptySubtitle}>Start chatting to add places</p>
  </div>
);

interface LayerSectionProps {
  layer: TripLayer;
  onRemovePlace: (layerName: string, placeTitle: string) => void;
  onViewInMap?: (place: TripRecommendation) => void;
}

const LayerSection: React.FC<LayerSectionProps> = ({ layer, onRemovePlace, onViewInMap }) => {
  const placesByCategory = layer.places.reduce((acc, place) => {
    const category = place.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(place);
    return acc;
  }, {} as Record<string, TripRecommendation[]>);

  const sortedCategories = Object.keys(placesByCategory).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={s.layerDot} />
        <span className={s.layerName}>{layer.name}</span>
        <div className={s.layerDivider} />
        <span className={s.layerCount}>{layer.places.length} places</span>
      </div>
      <div className="space-y-5">
        {sortedCategories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            places={placesByCategory[category]}
            layerName={layer.name}
            onRemovePlace={onRemovePlace}
            onViewInMap={onViewInMap}
          />
        ))}
      </div>
    </div>
  );
};

interface CategorySectionProps {
  category: string;
  places: TripRecommendation[];
  layerName: string;
  onRemovePlace: (layerName: string, placeTitle: string) => void;
  onViewInMap?: (place: TripRecommendation) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category, places, layerName, onRemovePlace, onViewInMap,
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 px-1">
      <span className={s.categorySectionLabel}>{category}</span>
      <div className={s.layerDivider} />
      <span className={`${s.layerCount}`}>{places.length}</span>
    </div>
    <div className="grid grid-cols-1 gap-2">
      {places.map((place, pIdx) => (
        <SavedPlaceCard
          key={pIdx}
          place={place}
          index={pIdx}
          onRemove={() => onRemovePlace(layerName, place.title)}
          onViewInMap={onViewInMap}
        />
      ))}
    </div>
  </div>
);

interface SavedPlaceCardProps {
  place: TripRecommendation;
  index: number;
  onRemove: () => void;
  onViewInMap?: (place: TripRecommendation) => void;
}

const SavedPlaceCard: React.FC<SavedPlaceCardProps> = ({ place, index, onRemove, onViewInMap }) => (
  <div className={s.savedCard}>
    <div className={s.savedCardImg}>
      <PlaceImage place={place} index={index} />
    </div>
    <div className="flex-1 min-w-0">
      <h5 onClick={() => onViewInMap?.(place)} className={s.savedCardTitle} title="Click to view on map">
        {place.title}
      </h5>
      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        <span className={s.savedCardCategory}>{place.category}</span>
        {place.rating && (
          <span className={s.savedCardRating}>
            <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
            {place.rating}
          </span>
        )}
      </div>
      {place.description && <p className={s.savedCardDescription}>{place.description}</p>}
      <a href={buildGoogleMapsUrl(place)} target="_blank" rel="noreferrer" className={s.savedCardMapLink}>
        <MapPin className="w-3 h-3" />
        Google Maps
      </a>
    </div>
    <button onClick={onRemove} className={s.savedCardRemoveBtn}>
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

interface ActionButtonsProps {
  hasPlaces: boolean;
  googleUser: GoogleUser | null;
  onDownload: () => void;
  onUploadToDrive: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ hasPlaces, googleUser, onDownload, onUploadToDrive }) => (
  <div className="space-y-3">
    <div className={s.tipBanner}>
      <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
      <p className={s.tipText}>{TRANSLATIONS.layersTip}</p>
    </div>
    <button disabled={!hasPlaces} onClick={onDownload} className={s.downloadBtn}>
      <Download className="w-4 h-4" />
      {TRANSLATIONS.downloadKml}
    </button>
    {googleUser && (
      <button disabled={!hasPlaces} onClick={onUploadToDrive} className={s.uploadBtn}>
        <Upload className="w-4 h-4" />
        Upload to Google Maps
      </button>
    )}
  </div>
);
