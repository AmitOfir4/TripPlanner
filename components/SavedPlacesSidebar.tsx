import React from 'react';
import { 
  Layers, Search, ChevronRight, Trash2, Star, 
  Download, Info, Upload, MapPin, Map
} from 'lucide-react';
import { TripLayer, TripRecommendation } from '../types';
import { PlaceImage } from './PlaceImage';
import { TRANSLATIONS } from '../constants';
import { GoogleUser } from '../googleAuthService';

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
  savedLayers,
  googleUser,
  enriching = false,
  onRemovePlace,
  onDownload,
  onUploadToDrive,
  onEnrichSelected,
  onViewInMap
}) => {
  const totalPlaces = savedLayers.reduce((acc, l) => acc + l.places.length, 0);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-900/5">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500/20 rounded-xl flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {TRANSLATIONS.savedMap}
              </h3>
              <p className="text-xs text-slate-400">Your trip collection</p>
            </div>
          </div>
          {savedLayers.length > 0 && (
            <div className="bg-teal-500/20 text-teal-300 text-[11px] font-bold px-3 py-1 rounded-full border border-teal-500/30">
              {totalPlaces} spot{totalPlaces !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <ActionButtons
          hasPlaces={savedLayers.length > 0}
          googleUser={googleUser}
          onDownload={onDownload}
          onUploadToDrive={onUploadToDrive}
        />

        <div className="space-y-8">
          {savedLayers.length === 0 ? (
            <EmptyState />
          ) : (
            savedLayers.map((layer, idx) => (
              <LayerSection
                key={idx}
                layer={layer}
                onRemovePlace={onRemovePlace}
                onViewInMap={onViewInMap}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center text-center py-16">
    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
      <Map className="w-7 h-7 text-slate-300" />
    </div>
    <p className="text-sm font-semibold text-slate-400">
      {TRANSLATIONS.noPlaces}
    </p>
    <p className="text-xs text-slate-300 mt-1">Start chatting to add places</p>
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
      {/* Layer name row */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-teal-500 rounded-full shrink-0" />
        <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">
          {layer.name}
        </span>
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-[10px] font-semibold text-slate-400">{layer.places.length} places</span>
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
  category,
  places,
  layerName,
  onRemovePlace,
  onViewInMap
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 px-1">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {category}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[10px] text-slate-400 font-medium">{places.length}</span>
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
  <div className="group flex items-start gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100 hover:bg-white hover:border-teal-100 hover:shadow-md hover:shadow-teal-900/5 transition-all place-card-hover">
    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-1 ring-slate-200">
      <PlaceImage place={place} index={index} />
    </div>

    <div className="flex-1 min-w-0">
      <h5
        onClick={() => onViewInMap?.(place)}
        className="font-semibold text-slate-900 text-sm truncate cursor-pointer hover:text-teal-600 transition-colors leading-tight"
        title="Click to view on map"
      >
        {place.title}
      </h5>
      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-100">
          {place.category}
        </span>
        {place.rating && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
            <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
            {place.rating}
          </span>
        )}
      </div>
      {place.description && (
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
          {place.description}
        </p>
      )}
      <a
        href={
          place.mapUrl ||
          (place.placeId
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${place.placeId}`
            : place.lat && place.lng
            ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}`)
        }
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-slate-400 hover:text-teal-600 transition-colors"
      >
        <MapPin className="w-3 h-3" />
        Google Maps
      </a>
    </div>

    <button
      onClick={onRemove}
      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
    >
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

const ActionButtons: React.FC<ActionButtonsProps> = ({
  hasPlaces,
  googleUser,
  onDownload,
  onUploadToDrive
}) => (
  <div className="space-y-3">
    {/* Tip banner */}
    <div className="flex gap-3 bg-sky-50 border border-sky-100 rounded-xl p-3.5">
      <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
      <p className="text-xs text-sky-700 leading-relaxed">
        {TRANSLATIONS.layersTip}
      </p>
    </div>

    <button
      disabled={!hasPlaces}
      onClick={onDownload}
      className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-teal-200/60 active:scale-[0.98] text-sm"
    >
      <Download className="w-4 h-4" />
      {TRANSLATIONS.downloadKml}
    </button>

    {googleUser && (
      <button
        disabled={!hasPlaces}
        onClick={onUploadToDrive}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-200/60 active:scale-[0.98] text-sm"
      >
        <Upload className="w-4 h-4" />
        Upload to Google Maps
      </button>
    )}
  </div>
);
