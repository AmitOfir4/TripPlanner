import React from 'react';
import { 
  Layers, Search, ChevronRight, Trash2, Star, 
  Download, Info, Upload, Sparkles, MapPin 
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
}

export const SavedPlacesSidebar: React.FC<SavedPlacesSidebarProps> = ({
  savedLayers,
  googleUser,
  enriching = false,
  onRemovePlace,
  onDownload,
  onUploadToDrive,
  onEnrichSelected
}) => {
  const totalPlaces = savedLayers.reduce((acc, l) => acc + l.places.length, 0);
  const needsEnrichment = savedLayers.some(l => l.places.some(p => p.needsEnrichment));

  return (
    <aside className="lg:w-[440px] shrink-0 bg-white border-l border-slate-200 overflow-y-auto p-8 flex flex-col">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {TRANSLATIONS.savedMap}
          </h3>
        </div>
        {savedLayers.length > 0 && (
          <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full">
            {totalPlaces} SPOTS
          </div>
        )}
      </div>

      <ActionButtons 
        hasPlaces={savedLayers.length > 0}
        needsEnrichment={needsEnrichment}
        enriching={enriching}
        googleUser={googleUser}
        onDownload={onDownload}
        onUploadToDrive={onUploadToDrive}
        onEnrichSelected={onEnrichSelected}
      />

      <div className="flex-1 space-y-12">
        {savedLayers.length === 0 ? (
          <EmptyState />
        ) : (
          savedLayers.map((layer, idx) => (
            <LayerSection 
              key={idx} 
              layer={layer} 
              onRemovePlace={onRemovePlace}
            />
          ))
        )}
      </div>
    </aside>
  );
};

const EmptyState: React.FC = () => (
  <div className="h-full flex flex-col items-center justify-center text-center py-24 opacity-40">
    <Search className="w-12 h-12 text-slate-300 mb-6" />
    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
      {TRANSLATIONS.noPlaces}
    </p>
  </div>
);

interface LayerSectionProps {
  layer: TripLayer;
  onRemovePlace: (layerName: string, placeTitle: string) => void;
}

const LayerSection: React.FC<LayerSectionProps> = ({ layer, onRemovePlace }) => {
  const placesByCategory = layer.places.reduce((acc, place) => {
    const category = place.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(place);
    return acc;
  }, {} as Record<string, TripRecommendation[]>);

  const sortedCategories = Object.keys(placesByCategory).sort();

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-3 group">
        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
          {layer.name}
        </span>
        <div className="flex-1 h-px bg-slate-100" />
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
      
      <div className="space-y-6">
        {sortedCategories.map((category) => (
          <CategorySection 
            key={category}
            category={category}
            places={placesByCategory[category]}
            layerName={layer.name}
            onRemovePlace={onRemovePlace}
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
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  places,
  layerName,
  onRemovePlace
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 px-2">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
        {category}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[8px] font-bold text-slate-400">{places.length}</span>
    </div>
    
    <div className="space-y-3">
      {places.map((place, pIdx) => (
        <SavedPlaceCard 
          key={pIdx}
          place={place}
          index={pIdx}
          onRemove={() => onRemovePlace(layerName, place.title)}
        />
      ))}
    </div>
  </div>
);

interface SavedPlaceCardProps {
  place: TripRecommendation;
  index: number;
  onRemove: () => void;
}

const SavedPlaceCard: React.FC<SavedPlaceCardProps> = ({ place, index, onRemove }) => (
  <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 shadow-sm hover:bg-white hover:shadow-lg transition-all group flex items-start gap-4">
    <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
      <PlaceImage place={place} index={index} />
    </div>
    
    <div className="flex-1 min-w-0">
      <h5 className="font-bold text-slate-900 text-sm truncate">{place.title}</h5>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
          {place.category}
        </span>
        {place.rating && (
          <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-500">
            <Star className="w-2.5 h-2.5 fill-amber-500" />
            {place.rating}
          </span>
        )}
      </div>
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
        className="flex items-center gap-1 mt-1.5 text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors w-fit"
      >
        <MapPin className="w-3 h-3" />
        Google Maps
      </a>
    </div>
    
    <button 
      onClick={onRemove}
      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

interface ActionButtonsProps {
  hasPlaces: boolean;
  needsEnrichment: boolean;
  enriching: boolean;
  googleUser: GoogleUser | null;
  onDownload: () => void;
  onUploadToDrive: () => void;
  onEnrichSelected?: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  hasPlaces,
  needsEnrichment,
  enriching,
  googleUser,
  onDownload,
  onUploadToDrive,
  onEnrichSelected
}) => (
  <div className="mb-12 space-y-4 shrink-0">
    <div className="bg-slate-900 text-slate-400 p-6 rounded-[2rem] shadow-xl flex gap-4">
      <Info className="w-6 h-6 text-indigo-400 shrink-0" />
      <p className="text-[10px] font-bold leading-relaxed tracking-wide text-slate-300">
        {needsEnrichment 
          ? "Places need enrichment to get coordinates and ratings. Click 'Get Full Details' below."
          : TRANSLATIONS.layersTip}
      </p>
    </div>
    
    {needsEnrichment && onEnrichSelected && (
      <button 
        disabled={!hasPlaces || enriching}
        onClick={onEnrichSelected}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-purple-200 active:scale-[0.98]"
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-sm uppercase tracking-widest">
          {enriching ? 'Getting Details...' : 'Get Full Details'}
        </span>
      </button>
    )}
    
    <button 
      disabled={!hasPlaces || needsEnrichment}
      onClick={onDownload}
      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98]"
      title={needsEnrichment ? "Enrich places first to download" : ""}
    >
      <Download className="w-5 h-5" />
      <span className="text-sm uppercase tracking-widest">{TRANSLATIONS.downloadKml}</span>
    </button>
    
    {googleUser && (
      <button 
        disabled={!hasPlaces || needsEnrichment}
        onClick={onUploadToDrive}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-200 active:scale-[0.98]"
        title={needsEnrichment ? "Enrich places first to upload" : ""}
      >
        <Upload className="w-5 h-5" />
        <span className="text-sm uppercase tracking-widest">Upload to Google Maps</span>
      </button>
    )}
  </div>
);
