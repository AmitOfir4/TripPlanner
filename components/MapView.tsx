/// <reference types="@types/google.maps" />
import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Maximize2, Minimize2, Star, ExternalLink } from 'lucide-react';
import { TripRecommendation, TripLayer } from '../types';
import { AVAILABLE_KML_ICONS, KML_ICON_STYLES } from '../constants';

interface MapViewProps {
  city: string;
  places: TripRecommendation[];
  savedLayers?: TripLayer[];
  focusedPlace?: TripRecommendation | null;
  onMarkerClick?: (place: TripRecommendation) => void;
}

// Component to handle geocoding and map centering
const MapController: React.FC<{ city: string; focusedPlace?: TripRecommendation | null; places: TripRecommendation[] }> = ({ 
  city, 
  focusedPlace, 
  places 
}) => {
  const map = useMap();
  const [geocodedCenter, setGeocodedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [lastGeocodedCity, setLastGeocodedCity] = useState<string>('');

  useEffect(() => {
    if (!map || !city) return;

    // If we have a focused place, try to center on it
    if (focusedPlace) {
      if (focusedPlace.lat && focusedPlace.lng) {
        // Has coordinates - center directly
        map.panTo({ lat: focusedPlace.lat, lng: focusedPlace.lng });
        map.setZoom(15);
      } else {
        // No coordinates - geocode the place name
        const geocoder = new google.maps.Geocoder();
        const searchQuery = `${focusedPlace.title}, ${city}`;
        geocoder.geocode({ address: searchQuery }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            map.panTo({ lat: location.lat(), lng: location.lng() });
            map.setZoom(15);
          }
        });
      }
      return;
    }

    // If we have any places with coordinates, center on the first one
    const placeWithCoords = places.find(p => p.lat && p.lng);
    if (placeWithCoords?.lat && placeWithCoords?.lng) {
      map.setCenter({ lat: placeWithCoords.lat, lng: placeWithCoords.lng });
      map.setZoom(13);
      return;
    }

    // Otherwise, geocode the city name only if we have places (search was performed)
    if (!geocodedCenter && places.length > 0 && city !== lastGeocodedCity) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: city }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const center = { lat: location.lat(), lng: location.lng() };
          setGeocodedCenter(center);
          setLastGeocodedCity(city);
          map.setCenter(center);
          map.setZoom(12);
        }
      });
    }
  }, [map, city, focusedPlace, places, geocodedCenter, lastGeocodedCity]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ 
  city, 
  places, 
  savedLayers = [],
  focusedPlace,
  onMarkerClick 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<TripRecommendation | null>(null);
  const [geocodedFocusedPlace, setGeocodedFocusedPlace] = useState<{ place: TripRecommendation; lat: number; lng: number } | null>(null);
  const [geocodedSavedPlaces, setGeocodedSavedPlaces] = useState<Record<string, { lat: number; lng: number }>>({});
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Default center (will be updated by MapController)
  const defaultCenter = { lat: 25.2048, lng: 55.2708 }; // Dubai as fallback

  // Auto-select focused place to show info window
  useEffect(() => {
    if (focusedPlace) {
      setSelectedPlace(focusedPlace);
      
      // If focused place doesn't have coordinates, geocode it
      if (!focusedPlace.lat || !focusedPlace.lng) {
        const geocoder = new google.maps.Geocoder();
        const searchQuery = `${focusedPlace.title}, ${city}`;
        geocoder.geocode({ address: searchQuery }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            setGeocodedFocusedPlace({
              place: focusedPlace,
              lat: location.lat(),
              lng: location.lng()
            });
          }
        });
      } else {
        setGeocodedFocusedPlace(null);
      }
    }
  }, [focusedPlace, city]);

  // Geocode saved places without coordinates
  useEffect(() => {
    const savedPlaces = savedLayers.flatMap(layer => layer.places);
    const placesNeedingGeocoding = savedPlaces.filter(p => !p.lat || !p.lng);
    
    if (placesNeedingGeocoding.length === 0) return;

    const geocoder = new google.maps.Geocoder();
    
    placesNeedingGeocoding.forEach(place => {
      // Skip if already geocoded
      if (geocodedSavedPlaces[place.title]) return;
      
      const searchQuery = `${place.title}, ${city}`;
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          setGeocodedSavedPlaces(prev => ({
            ...prev,
            [place.title]: { lat: location.lat(), lng: location.lng() }
          }));
        }
      });
    });
  }, [savedLayers, city, geocodedSavedPlaces]);

  // Filter places that have coordinates
  const placesWithCoords = places.filter(p => p.lat && p.lng);
  
  // Flatten all saved places from layers
  const savedPlaces = savedLayers.flatMap(layer => layer.places);
  const savedPlacesWithCoords = savedPlaces.filter(p => p.lat && p.lng);

  if (!city) return null;

  return (
    <div className={`map-view-container bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-lg transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50' : 'relative'}`}>
      {/* Map Header */}
      <div className="map-header flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-slate-900">
              {focusedPlace ? focusedPlace.title : city}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {placesWithCoords.length > 0 
                ? `${placesWithCoords.length} places on map` 
                : 'City Overview'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white rounded-xl transition-colors"
          title={isExpanded ? 'Minimize' : 'Expand'}
        >
          {isExpanded ? (
            <Minimize2 className="w-5 h-5 text-slate-600" />
          ) : (
            <Maximize2 className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      {/* Map Container */}
      <div className={`map-wrapper relative ${isExpanded ? 'h-[calc(100%-4rem)]' : 'h-[600px]'}`}>
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              mapId="trip-planner-map"
              defaultCenter={defaultCenter}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              keyboardShortcuts={false}
              className="w-full h-full"
            >
              <MapController city={city} focusedPlace={focusedPlace} places={places} />
              
              {/* Render markers for all places with coordinates */}
              {placesWithCoords.map((place, index) => (
                <AdvancedMarker
                  key={`pending-${index}`}
                  position={{ lat: place.lat!, lng: place.lng! }}
                  onClick={() => {
                    setSelectedPlace(place);
                    onMarkerClick?.(place);
                  }}
                >
                  <Pin
                    background={focusedPlace?.title === place.title ? '#4f46e5' : '#ef4444'}
                    borderColor={focusedPlace?.title === place.title ? '#312e81' : '#991b1b'}
                    glyphColor="#ffffff"
                    scale={focusedPlace?.title === place.title ? 1.3 : 1}
                  />
                </AdvancedMarker>
              ))}

              {/* Render saved places with custom category icons */}
              {savedPlacesWithCoords.map((place, index) => {
                const iconStyle = place.customKmlIcon || KML_ICON_STYLES[place.category] || 'icon-camera';
                const iconUrl = AVAILABLE_KML_ICONS.find(icon => icon.id === iconStyle)?.url || AVAILABLE_KML_ICONS[0].url;
                
                return (
                  <AdvancedMarker
                    key={`saved-${index}`}
                    position={{ lat: place.lat!, lng: place.lng! }}
                    onClick={() => {
                      setSelectedPlace(place);
                      onMarkerClick?.(place);
                    }}
                  >
                    <img
                      src={iconUrl}
                      alt={place.category}
                      style={{
                        width: focusedPlace?.title === place.title ? '48px' : '32px',
                        height: focusedPlace?.title === place.title ? '48px' : '32px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        filter: focusedPlace?.title === place.title ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none'
                      }}
                    />
                  </AdvancedMarker>
                );
              })}

              {/* Render geocoded saved places (places without original coordinates) */}
              {savedPlaces
                .filter(p => !p.lat || !p.lng)
                .map((place, index) => {
                  const coords = geocodedSavedPlaces[place.title];
                  if (!coords) return null;
                  
                  const iconStyle = place.customKmlIcon || KML_ICON_STYLES[place.category] || 'icon-camera';
                  const iconUrl = AVAILABLE_KML_ICONS.find(icon => icon.id === iconStyle)?.url || AVAILABLE_KML_ICONS[0].url;
                  
                  return (
                    <AdvancedMarker
                      key={`geocoded-saved-${index}`}
                      position={coords}
                      onClick={() => {
                        setSelectedPlace(place);
                        onMarkerClick?.(place);
                      }}
                    >
                      <img
                        src={iconUrl}
                        alt={place.category}
                        style={{
                          width: focusedPlace?.title === place.title ? '48px' : '32px',
                          height: focusedPlace?.title === place.title ? '48px' : '32px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          filter: focusedPlace?.title === place.title ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none'
                        }}
                      />
                    </AdvancedMarker>
                  );
                })
              }

              {/* Render temporary marker for geocoded focused place without coordinates */}
              {geocodedFocusedPlace && (
                <AdvancedMarker
                  position={{ lat: geocodedFocusedPlace.lat, lng: geocodedFocusedPlace.lng }}
                  onClick={() => setSelectedPlace(geocodedFocusedPlace.place)}
                >
                  <Pin
                    background="#4f46e5"
                    borderColor="#312e81"
                    glyphColor="#ffffff"
                    scale={1.3}
                  />
                </AdvancedMarker>
              )}

              {/* Info Window for selected place */}
              {selectedPlace && (
                <InfoWindow
                  position={
                    selectedPlace.lat && selectedPlace.lng 
                      ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
                      : geocodedFocusedPlace?.place.title === selectedPlace.title && geocodedFocusedPlace
                      ? { lat: geocodedFocusedPlace.lat, lng: geocodedFocusedPlace.lng }
                      : geocodedSavedPlaces[selectedPlace.title] || undefined
                  }
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div className="p-2 max-w-xs">
                    <h4 className="font-bold text-sm text-slate-900 mb-1">
                      {selectedPlace.title}
                    </h4>
                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                      {selectedPlace.description}
                    </p>
                    {selectedPlace.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold">{selectedPlace.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <a
                      href={
                        selectedPlace.lat && selectedPlace.lng
                          ? `https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.title + ', ' + city)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in Google Maps
                    </a>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
            <div className="text-center p-8 max-w-md">
              <MapPin className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
              <p className="text-slate-900 font-bold text-lg mb-2">Google Maps API Key Required</p>
              <p className="text-sm text-slate-500 mb-4">
                Add VITE_GOOGLE_MAPS_API_KEY to your .env file to enable the interactive map.
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <MapPin className="w-4 h-4" />
                Open {city} in Google Maps
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
