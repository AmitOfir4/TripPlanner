/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Maximize2, Minimize2, Star, ExternalLink, Search, Edit2, Check, X } from 'lucide-react';
import { TripRecommendation, TripLayer } from '../types';
import { AVAILABLE_KML_ICONS, KML_ICON_STYLES, CATEGORY_RULES } from '../constants';
import { KmlIconSelector } from './KmlIconSelector';

// Helper to get default icon for a category
const getDefaultKmlIcon = (category: string): string => {
  const normalized = category.toLowerCase();
  
  for (const [categoryName, keywords] of Object.entries(CATEGORY_RULES)) 
  {
    if (keywords.some(keyword => normalized.includes(keyword))) 
    {
      return KML_ICON_STYLES[categoryName] || 'icon-camera';
    }
  }
  
  return 'icon-camera';
};

interface MapViewProps {
  city: string;
  places: TripRecommendation[];
  savedLayers?: TripLayer[];
  focusedPlace?: TripRecommendation | null;
  onMarkerClick?: (place: TripRecommendation) => void;
  onAddPlace?: (place: TripRecommendation) => void;
}

// Component to handle geocoding and map centering
const MapController: React.FC<{ 
  city: string; 
  focusedPlace?: TripRecommendation | null; 
  places: TripRecommendation[];
  selectedPlace?: TripRecommendation | null;
}> = ({ 
  city, 
  focusedPlace, 
  places,
  selectedPlace 
}) => {
  const map = useMap();
  const [geocodedCenter, setGeocodedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [lastGeocodedCity, setLastGeocodedCity] = useState<string>('');

  useEffect(() => {
    if (!map || !city) return;

    // Priority 1: If we have a selected place from search, center on it
    if (selectedPlace) {
      if (selectedPlace.lat && selectedPlace.lng) {
        map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
        map.setZoom(15);
      } else {
        const geocoder = new google.maps.Geocoder();
        const searchQuery = `${selectedPlace.title}, ${city}`;
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

    // Priority 2: If we have a focused place, try to center on it
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
  }, [map, city, focusedPlace, selectedPlace, places, geocodedCenter, lastGeocodedCity]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ 
  city, 
  places, 
  savedLayers = [],
  focusedPlace,
  onMarkerClick,
  onAddPlace
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<TripRecommendation | null>(null);
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [customPlaceIcon, setCustomPlaceIcon] = useState('icon-camera');
  const [isEditingName, setIsEditingName] = useState(false);
  const [geocodedFocusedPlace, setGeocodedFocusedPlace] = useState<{ place: TripRecommendation; lat: number; lng: number } | null>(null);
  const [geocodedSavedPlaces, setGeocodedSavedPlaces] = useState<Record<string, { lat: number; lng: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.GeocoderResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Default center (will be updated by MapController)
  const defaultCenter = { lat: 25.2048, lng: 55.2708 }; // Dubai as fallback

  // Search Google Maps for places
  useEffect(() => {
    if (!searchQuery.trim() || typeof google === 'undefined' || !google.maps) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(true);
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ 
        address: searchQuery,
        region: city ? city.toLowerCase() : undefined
      }, (results, status) => {
        setIsSearching(false);
        if (status === 'OK' && results) {
          setSearchResults(results.slice(0, 5)); // Limit to 5 results
        } else {
          setSearchResults([]);
        }
      });
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, city]);

  // Handle selecting a search result from Google Maps
  const handleSelectSearchResult = (result: google.maps.GeocoderResult) => {
    const location = result.geometry.location;
    const newPlace: TripRecommendation = {
      title: result.formatted_address || result.address_components[0]?.long_name || 'Unknown Place',
      description: result.formatted_address || '',
      category: 'Other',
      lat: location.lat(),
      lng: location.lng(),
      needsEnrichment: false
    };
    
    setSelectedPlace(newPlace);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Auto-select focused place to show info window
  useEffect(() => {
    if (focusedPlace) {
      setSelectedPlace(focusedPlace);
      
      // If focused place doesn't have coordinates, geocode it
      if (!focusedPlace.lat || !focusedPlace.lng) {
        // Check if Google Maps API is loaded
        if (typeof google === 'undefined' || !google.maps) return;
        
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
    // Check if Google Maps API is fully loaded
    if (!apiKey || typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) return;
    
    const savedPlaces = savedLayers.flatMap(layer => layer.places);
    const placesNeedingGeocoding = savedPlaces.filter(p => !p.lat || !p.lng);
    
    if (placesNeedingGeocoding.length === 0) return;

    try {
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
    } catch (error) {
      console.error('Error initializing geocoder:', error);
    }
  }, [savedLayers, city, geocodedSavedPlaces, apiKey]);

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

        {/* Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search any place on Google Maps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSelectedPlace(null)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            {isSearching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl p-4 z-50 border border-slate-200">
                <div className="text-sm text-slate-500">Searching...</div>
              </div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 border border-slate-200">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div className="font-bold text-sm text-slate-900">
                      {result.address_components[0]?.long_name || result.formatted_address}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1">{result.formatted_address}</div>
                  </button>
                ))}
              </div>
            )}
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
      <div className={`map-wrapper relative ${isExpanded ? 'h-[calc(100%-4rem)]' : 'h-[850px]'}`}>
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
              onClick={(e) => {
                // Handle map click to get place information
                if (e.detail.latLng) {
                  const lat = e.detail.latLng.lat;
                  const lng = e.detail.latLng.lng;
                  
                  // Reverse geocode to get place name
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                      const placeName = results[0].address_components[0]?.long_name || results[0].formatted_address;
                      setClickedLocation({ lat, lng, name: placeName });
                      setCustomPlaceName(placeName);
                      setCustomPlaceIcon('icon-camera');
                      setIsEditingName(false);
                      setSelectedPlace(null); // Clear any existing selection
                    }
                  });
                }
              }}
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
                const iconStyle = place.customKmlIcon || getDefaultKmlIcon(place.category);
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
                  
                  const iconStyle = place.customKmlIcon || getDefaultKmlIcon(place.category);
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

              {/* Marker for clicked location on map */}
              {clickedLocation && (
                <AdvancedMarker
                  position={{ lat: clickedLocation.lat, lng: clickedLocation.lng }}
                  onClick={() => {}}
                >
                  <Pin
                    background="#10b981"
                    borderColor="#065f46"
                    glyphColor="#ffffff"
                    scale={1.2}
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

              {/* Info Window for clicked location with Add button */}
              {clickedLocation && (
                <InfoWindow
                  position={{ lat: clickedLocation.lat, lng: clickedLocation.lng }}
                  onCloseClick={() => {
                    setClickedLocation(null);
                    setIsEditingName(false);
                  }}
                >
                  <div className="p-3 max-w-sm">
                    {/* Editable Place Name */}
                    <div className="mb-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Place Name
                      </label>
                      <div className="flex items-center gap-2">
                        {isEditingName ? (
                          <>
                            <input
                              type="text"
                              value={customPlaceName}
                              onChange={(e) => setCustomPlaceName(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              onClick={() => setIsEditingName(false)}
                              className="p-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <h4 className="flex-1 font-bold text-sm text-slate-900">
                              {customPlaceName || 'Selected Location'}
                            </h4>
                            <button
                              onClick={() => setIsEditingName(true)}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mb-3">
                      {clickedLocation.lat.toFixed(6)}, {clickedLocation.lng.toFixed(6)}
                    </p>

                    {/* Icon Selector */}
                    {onAddPlace && (
                      <div className="mb-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Select Icon
                        </label>
                        <KmlIconSelector
                          currentIconId={customPlaceIcon}
                          onIconChange={setCustomPlaceIcon}
                        />
                      </div>
                    )}

                    {/* Add to Trip Button */}
                    {onAddPlace && (
                      <button
                        onClick={() => {
                          const newPlace: TripRecommendation = {
                            title: customPlaceName || 'Custom Place',
                            description: `Custom location at ${clickedLocation.lat.toFixed(4)}, ${clickedLocation.lng.toFixed(4)}`,
                            category: 'Other',
                            lat: clickedLocation.lat,
                            lng: clickedLocation.lng,
                            needsEnrichment: false,
                            customKmlIcon: customPlaceIcon
                          };
                          onAddPlace(newPlace);
                          setClickedLocation(null);
                          setIsEditingName(false);
                        }}
                        className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-3 h-3" />
                        Add to Trip
                      </button>
                    )}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${clickedLocation.lat},${clickedLocation.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 justify-center mt-2"
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
