/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Maximize2, Minimize2, Star, ExternalLink, Edit2, Trash2, Plus, List } from 'lucide-react';
import { TripRecommendation, TripLayer } from '../types';
import { AVAILABLE_KML_ICONS } from '../constants';
import { KmlIconSelector } from './KmlIconSelector';
import { geocodeAddress } from '../services/geocodeService';
import { getDefaultKmlIcon } from '../helpers/kmlIconHelper';
import { buildGoogleMapsUrl } from '../helpers/urlHelper';
import { MapController } from './map/MapController';
import { MapSidebar } from './map/MapSidebar';
import { MapSearchBar } from './map/MapSearchBar';
import { PlaceDescription } from './map/PlaceDescription';
import { NewPlaceForm } from './map/NewPlaceForm';
import { mapViewStyles as vs, mapInfoWindowStyles as iw } from '../styles/map';

interface MapViewProps {
  city: string;
  places: TripRecommendation[];
  savedLayers?: TripLayer[];
  focusedPlace?: TripRecommendation | null;
  userLocation?: { lat: number; lng: number } | null;
  language?: 'en' | 'he';
  onMarkerClick?: (place: TripRecommendation) => void;
  onAddPlace?: (place: TripRecommendation, targetLayerName?: string) => void;
  onRemovePlace?: (place: TripRecommendation) => void;
  onUpdatePlace?: (updated: TripRecommendation) => void;
  onReorderPlace?: (fromLayer: string, fromIndex: number, toLayer: string, toIndex: number) => void;
  onAddLayer?: (name: string) => boolean;
  onRenameLayer?: (from: string, to: string) => boolean;
  onDeleteLayer?: (name: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  city, places, savedLayers = [], focusedPlace, userLocation, language = 'en',
  onMarkerClick, onAddPlace, onRemovePlace, onUpdatePlace, onReorderPlace,
  onAddLayer, onRenameLayer, onDeleteLayer,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<TripRecommendation | null>(null);
  // Set either by clicking the map (bare coords) or by picking a search
  // result (coords + the place's name/address/rating).
  const [clickedLocation, setClickedLocation] = useState<{
    lat: number; lng: number; name?: string; address?: string; rating?: number | null;
  } | null>(null);
  const [geocodedFocusedPlace, setGeocodedFocusedPlace] = useState<{ place: TripRecommendation; lat: number; lng: number } | null>(null);
  const [geocodedSavedPlaces, setGeocodedSavedPlaces] = useState<Record<string, { lat: number; lng: number }>>({});
  const [editingIconForPlace, setEditingIconForPlace] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const geocodingInFlightRef = useRef<Set<string>>(new Set());

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const defaultCenter = (userLocation && isFinite(userLocation.lat) && isFinite(userLocation.lng))
    ? userLocation
    : { lat: 20, lng: 0 };

  // Geocode focused place
  useEffect(() => {
    if (focusedPlace) {
      setSelectedPlace(focusedPlace);
      if (!focusedPlace.lat || !focusedPlace.lng) {
        geocodeAddress(focusedPlace.title, focusedPlace.city || city, undefined, focusedPlace.country).then((result) => {
          if (result) setGeocodedFocusedPlace({ place: focusedPlace, lat: result.lat, lng: result.lng });
        });
      } else {
        setGeocodedFocusedPlace(null);
      }
    }
  }, [focusedPlace, city]);

  // Geocode saved places without coordinates
  useEffect(() => {
    const placesNeedingGeocoding = savedLayers.flatMap((layer) =>
      layer.places.filter((p) => !p.lat || !p.lng).map((p) => ({ place: p, layerCity: layer.name }))
    );
    const toGeocode = placesNeedingGeocoding.filter(({ place }) =>
      !geocodingInFlightRef.current.has(place.title) && !geocodedSavedPlaces[place.title]
    );
    if (toGeocode.length === 0) return;

    toGeocode.forEach(({ place }) => geocodingInFlightRef.current.add(place.title));

    // Cap concurrent geocodes so a 40-place trip doesn't burst all requests at
    // once on first mount. Workers pull jobs from a shared cursor.
    const CONCURRENCY = 4;
    let cursor = 0;
    const worker = async () => {
      while (cursor < toGeocode.length) {
        const { place, layerCity } = toGeocode[cursor++];
        const geocodeCity = place.city || layerCity || city;
        try {
          const result = await geocodeAddress(place.title, geocodeCity, undefined, place.country);
          if (result) setGeocodedSavedPlaces((prev) => ({ ...prev, [place.title]: { lat: result.lat, lng: result.lng } }));
        } finally {
          geocodingInFlightRef.current.delete(place.title);
        }
      }
    };
    for (let i = 0; i < Math.min(CONCURRENCY, toGeocode.length); i++) worker();
  }, [savedLayers, city, geocodedSavedPlaces]);

  const placesWithCoords = places.filter((p) => p.lat && p.lng);
  const savedPlaces = savedLayers.flatMap((layer) => layer.places);
  const savedPlacesWithCoords = savedPlaces.filter((p) => p.lat && p.lng);

  const isPlaceSaved = (place: TripRecommendation | null): boolean => {
    if (!place) return false;
    return savedPlaces.some((p) => p.title === place.title);
  };

  const saveDescription = (description: string) => {
    if (!selectedPlace) return;
    const updated = { ...selectedPlace, description };
    setSelectedPlace(updated);
    // A place already in the trip persists straight away; one that hasn't been
    // added yet keeps the edit staged until "Add to Trip" picks it up.
    if (isPlaceSaved(selectedPlace)) onUpdatePlace?.(updated);
  };

  if (!city && savedLayers.length === 0) return null;

  return (
    <div className={vs.container(isExpanded)}>
      {/* Map Header */}
      <div className={vs.header}>
        <div className="flex items-center gap-3">
          <div className={vs.headerIcon}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={vs.headerTitle}>{focusedPlace ? focusedPlace.title : city}</h3>
            <p className={vs.headerSubtitle}>
              {placesWithCoords.length > 0 ? `${placesWithCoords.length} places on map` : 'City Overview'}
            </p>
          </div>
        </div>


        {(savedLayers.length > 0 || onAddLayer) && (
          <button onClick={() => setIsSidebarOpen((v) => !v)} className={vs.sidebarToggleBtn(isSidebarOpen)} title={isSidebarOpen ? 'Hide trip summary' : 'Show trip summary'}>
            <List className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => setIsExpanded(!isExpanded)} className={vs.expandBtn} title={isExpanded ? 'Minimize' : 'Expand'}>
          {isExpanded ? <Minimize2 className="w-5 h-5 text-slate-600" /> : <Maximize2 className="w-5 h-5 text-slate-600" />}
        </button>
      </div>

      {/* Map Container */}
      <div className={vs.mapWrapper(isExpanded)}>
        {(savedLayers.length > 0 || onAddLayer) && (
          <MapSidebar
            savedLayers={savedLayers}
            isSidebarOpen={isSidebarOpen}
            selectedPlace={selectedPlace}
            onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
            onSelectPlace={(place) => { setSelectedPlace(place); onMarkerClick?.(place); }}
            onReorderPlace={onReorderPlace}
            onAddLayer={onAddLayer}
            onRenameLayer={onRenameLayer}
            onDeleteLayer={onDeleteLayer}
          />
        )}

        <div className={vs.mapArea}>
          {apiKey ? (
            <APIProvider apiKey={apiKey} libraries={['places']}>
              <Map
                mapId="trip-planner-map"
                defaultCenter={defaultCenter}
                defaultZoom={12}
                gestureHandling="greedy"
                disableDefaultUI={false}
                keyboardShortcuts={false}
                clickableIcons={false}
                className="w-full h-full"
                onClick={(e) => {
                  if (e.detail.latLng) {
                    setClickedLocation({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
                    setSelectedPlace(null);
                  }
                }}
              >
                <MapController city={city} focusedPlace={focusedPlace} places={places} />

                <MapSearchBar
                  language={language}
                  onSelectPlace={(place) => {
                    setSelectedPlace(null);
                    setClickedLocation({
                      lat: place.lat,
                      lng: place.lng,
                      name: place.name,
                      address: place.formatted_address,
                      rating: place.rating,
                    });
                  }}
                />

                {/* Pending place markers */}
                {placesWithCoords.map((place, index) => (
                  <AdvancedMarker key={`pending-${index}`} position={{ lat: place.lat!, lng: place.lng! }} onClick={() => { setSelectedPlace(place); onMarkerClick?.(place); }}>
                    <Pin background={focusedPlace?.title === place.title ? '#4f46e5' : '#ef4444'} borderColor={focusedPlace?.title === place.title ? '#312e81' : '#991b1b'} glyphColor="#ffffff" scale={focusedPlace?.title === place.title ? 1.3 : 1} />
                  </AdvancedMarker>
                ))}

                {/* Saved places with icons */}
                {savedPlacesWithCoords.map((place, index) => {
                  const iconStyle = place.customKmlIcon || getDefaultKmlIcon(place);
                  const iconUrl = AVAILABLE_KML_ICONS.find((icon) => icon.id === iconStyle)?.url || AVAILABLE_KML_ICONS[0].url;
                  const isFocused = focusedPlace?.title === place.title;
                  return (
                    <AdvancedMarker key={`saved-${index}`} position={{ lat: place.lat!, lng: place.lng! }} onClick={() => { setSelectedPlace(place); onMarkerClick?.(place); }}>
                      <Pin background="transparent" borderColor="transparent" glyphColor="transparent" scale={isFocused ? 1.5 : 1}>
                        <img src={iconUrl} alt={place.category} style={{ width: isFocused ? '36px' : '28px', height: isFocused ? '36px' : '28px', cursor: 'pointer', transition: 'all 0.2s', filter: isFocused ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none' }} />
                      </Pin>
                    </AdvancedMarker>
                  );
                })}

                {/* Geocoded saved places */}
                {savedPlaces.filter((p) => !p.lat || !p.lng).map((place, index) => {
                  const coords = geocodedSavedPlaces[place.title];
                  if (!coords) return null;
                  const iconStyle = place.customKmlIcon || getDefaultKmlIcon(place);
                  const iconUrl = AVAILABLE_KML_ICONS.find((icon) => icon.id === iconStyle)?.url || AVAILABLE_KML_ICONS[0].url;
                  const isFocused = focusedPlace?.title === place.title;
                  return (
                    <AdvancedMarker key={`geocoded-saved-${index}`} position={coords} onClick={() => { setSelectedPlace(place); onMarkerClick?.(place); }}>
                      <Pin background="transparent" borderColor="transparent" glyphColor="transparent" scale={isFocused ? 1.5 : 1}>
                        <img src={iconUrl} alt={place.category} style={{ width: isFocused ? '36px' : '28px', height: isFocused ? '36px' : '28px', cursor: 'pointer', transition: 'all 0.2s', filter: isFocused ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none' }} />
                      </Pin>
                    </AdvancedMarker>
                  );
                })}

                {/* Clicked location marker */}
                {clickedLocation && (
                  <AdvancedMarker position={{ lat: clickedLocation.lat, lng: clickedLocation.lng }} onClick={() => {}}>
                    <Pin background="#10b981" borderColor="#065f46" glyphColor="#ffffff" scale={1.2} />
                  </AdvancedMarker>
                )}

                {/* Selected place info window */}
                {selectedPlace && (
                  <InfoWindow
                    // Without this the Maps API pulls focus into the window
                    // every time it (re)opens, yanking the caret out of the
                    // inputs below mid-typing.
                    shouldFocus={false}
                    position={
                      selectedPlace.lat && selectedPlace.lng
                        ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
                        : geocodedFocusedPlace?.place.title === selectedPlace.title && geocodedFocusedPlace
                        ? { lat: geocodedFocusedPlace.lat, lng: geocodedFocusedPlace.lng }
                        : geocodedSavedPlaces[selectedPlace.title] || undefined
                    }
                    onCloseClick={() => { setSelectedPlace(null); setEditingIconForPlace(null); }}
                  >
                    <div className={iw.wrapper}>
                      {isPlaceSaved(selectedPlace) && onUpdatePlace && (
                        <div className="mb-1">
                          <button
                            onClick={() => setEditingIconForPlace(editingIconForPlace === selectedPlace.title ? null : selectedPlace.title)}
                            className={iw.iconBtn}
                            title="Click to change icon"
                          >
                            <img src={AVAILABLE_KML_ICONS.find((i) => i.id === (selectedPlace.customKmlIcon || getDefaultKmlIcon(selectedPlace)))?.url || AVAILABLE_KML_ICONS[0].url} alt="icon" className={iw.iconImg} />
                          </button>
                          {editingIconForPlace === selectedPlace.title && (
                            <KmlIconSelector
                              currentIconId={selectedPlace.customKmlIcon || getDefaultKmlIcon(selectedPlace)}
                              onIconChange={(iconId) => {
                                const updated = { ...selectedPlace, customKmlIcon: iconId };
                                onUpdatePlace(updated);
                                setSelectedPlace(updated);
                                setEditingIconForPlace(null);
                              }}
                            />
                          )}
                        </div>
                      )}
                      <h4 className={iw.title}>{selectedPlace.title}</h4>

                      {/* ── Description (editable before and after adding) ─── */}
                      <PlaceDescription
                        key={selectedPlace.title}
                        description={selectedPlace.description}
                        onSave={(isPlaceSaved(selectedPlace) ? onUpdatePlace : onAddPlace) ? saveDescription : undefined}
                        hint={isPlaceSaved(selectedPlace) ? undefined : 'Saved with the place when you add it'}
                      />
                      {selectedPlace.rating && (
                        <div className={iw.ratingRow}>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className={iw.ratingText}>{selectedPlace.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <div className="flex gap-2 mb-2">
                        {isPlaceSaved(selectedPlace) ? (
                          onRemovePlace && (
                            <button onClick={() => { onRemovePlace(selectedPlace); setSelectedPlace(null); }} className={iw.removeBtn}>
                              <Trash2 className="w-3 h-3" /> Remove from Trip
                            </button>
                          )
                        ) : (
                          onAddPlace && (
                            <button onClick={() => { onAddPlace(selectedPlace); setSelectedPlace(null); }} className={iw.addBtn}>
                              <Plus className="w-3 h-3" /> Add to Trip
                            </button>
                          )
                        )}
                      </div>
                      <a
                        href={buildGoogleMapsUrl(selectedPlace)}
                        target="_blank" rel="noreferrer" className={iw.mapsLink}
                      >
                        <ExternalLink className="w-3 h-3" /> Open in Google Maps
                      </a>
                    </div>
                  </InfoWindow>
                )}

                {/* Clicked location info window */}
                {clickedLocation && (
                  <InfoWindow
                    shouldFocus={false}
                    position={{ lat: clickedLocation.lat, lng: clickedLocation.lng }}
                    onCloseClick={() => setClickedLocation(null)}
                  >
                    <NewPlaceForm
                      // Remount on a new pick so the fields reset.
                      key={`${clickedLocation.lat},${clickedLocation.lng}`}
                      location={clickedLocation}
                      savedLayers={savedLayers}
                      onAddPlace={onAddPlace}
                      onDone={() => setClickedLocation(null)}
                    />
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          ) : (
            <div className={vs.noApiKeyWrap} style={{ minHeight: 0 }}>
              <div className={vs.noApiKeyInner}>
                <MapPin className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <p className={vs.noApiKeyTitle}>Google Maps API Key Required</p>
                <p className={vs.noApiKeySubtitle}>Add VITE_GOOGLE_MAPS_API_KEY to your .env file to enable the interactive map.</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`} target="_blank" rel="noreferrer" className={vs.noApiKeyLink}>
                  <MapPin className="w-4 h-4" /> Open {city} in Google Maps
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
