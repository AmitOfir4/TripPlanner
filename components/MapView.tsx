/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Maximize2, Minimize2, Star, ExternalLink, Search, Edit2, Check, X, Trash2, Plus, List, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { TripRecommendation, TripLayer } from '../types';
import { AVAILABLE_KML_ICONS, KML_ICON_STYLES, CATEGORY_RULES } from '../constants';
import { KmlIconSelector } from './KmlIconSelector';
import { geocodeAddress, reverseGeocode } from '../services/geocodeService';

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

interface MapViewProps {
  city: string;
  places: TripRecommendation[];
  savedLayers?: TripLayer[];
  focusedPlace?: TripRecommendation | null;
  userLocation?: { lat: number; lng: number } | null;
  onMarkerClick?: (place: TripRecommendation) => void;
  onAddPlace?: (place: TripRecommendation) => void;
  onRemovePlace?: (place: TripRecommendation) => void;
  onUpdatePlace?: (updated: TripRecommendation) => void;
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
        const searchQuery = `${selectedPlace.title}, ${selectedPlace.city || city}`;
        geocodeAddress(searchQuery).then(result => {
          if (result) {
            map.panTo({ lat: result.lat, lng: result.lng });
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
        // No coordinates - geocode the place name using the place's own city if available
        const searchQuery = `${focusedPlace.title}, ${focusedPlace.city || city}`;
        geocodeAddress(searchQuery).then(result => {
          if (result) {
            map.panTo({ lat: result.lat, lng: result.lng });
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
      geocodeAddress(city).then(result => {
        if (result) {
          const center = { lat: result.lat, lng: result.lng };
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
  userLocation,
  onMarkerClick,
  onAddPlace,
  onRemovePlace,
  onUpdatePlace
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
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [editingIconForPlace, setEditingIconForPlace] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const geocodingInFlightRef = useRef<Set<string>>(new Set());
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Default center - use user location if available, otherwise world view
  const defaultCenter = (userLocation && isFinite(userLocation.lat) && isFinite(userLocation.lng))
    ? userLocation
    : { lat: 20, lng: 0 };

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
        address: searchQuery
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
      lng: location.lng()
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
        const searchQuery = `${focusedPlace.title}, ${focusedPlace.city || city}`;
        geocodeAddress(searchQuery).then(result => {
          if (result) {
            setGeocodedFocusedPlace({
              place: focusedPlace,
              lat: result.lat,
              lng: result.lng
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
    const placesNeedingGeocoding = savedLayers.flatMap(layer =>
      layer.places
        .filter(p => !p.lat || !p.lng)
        .map(p => ({ place: p, layerCity: layer.name }))
    );
    
    if (placesNeedingGeocoding.length === 0) return;

    placesNeedingGeocoding.forEach(({ place, layerCity }) => {
      // Skip if already geocoded or in-flight
      if (geocodingInFlightRef.current.has(place.title)) return;
      geocodingInFlightRef.current.add(place.title);
      
      // Use the place's own city, then the layer name (= city for AI searches),
      // then fall back to the session city prop.
      const geocodeCity = place.city || layerCity || city;
      const searchQuery = `${place.title}, ${geocodeCity}`;
      geocodeAddress(searchQuery).then(result => {
        if (result) {
          setGeocodedSavedPlaces(prev => ({
            ...prev,
            [place.title]: { lat: result.lat, lng: result.lng }
          }));
        }
      });
    });
  }, [savedLayers, city]);

  // Filter places that have coordinates
  const placesWithCoords = places.filter(p => p.lat && p.lng);
  
  // Flatten all saved places from layers
  const savedPlaces = savedLayers.flatMap(layer => layer.places);
  const savedPlacesWithCoords = savedPlaces.filter(p => p.lat && p.lng);

  // Helper to check if a place is already saved
  const isPlaceSaved = (place: TripRecommendation | null): boolean => {
    if (!place) return false;
    return savedPlaces.some(p => p.title === place.title);
  };

  if (!city && savedLayers.length === 0) return null;

  return (
    <div className={`map-view-container bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-lg transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50' : 'relative'}`}>
      {/* Map Header */}
      <div className="map-header flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
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
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
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
                    className="w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-slate-100 last:border-b-0"
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

        {savedLayers.length > 0 && (
          <button
            onClick={() => setIsSidebarOpen(v => !v)}
            className={`p-2 rounded-xl transition-colors ${isSidebarOpen ? 'bg-teal-100 text-teal-700' : 'hover:bg-white text-slate-600'}`}
            title={isSidebarOpen ? 'Hide trip summary' : 'Show trip summary'}
          >
            <List className="w-5 h-5" />
          </button>
        )}
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
      <div className={`map-wrapper flex ${isExpanded ? 'h-[calc(100%-4rem)]' : 'h-[850px]'}`}>

        {/* Trip Summary Sidebar */}
        {savedLayers.length > 0 && (
          <div className={`relative flex-shrink-0 h-full transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64' : 'w-0'
          }`}>
            {/* Sidebar content — hidden when collapsed */}
            <div className={`absolute inset-0 w-64 h-full flex flex-col border-r border-slate-200 bg-white overflow-hidden transition-all duration-300 ${
              isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              {/* Sidebar Header */}
              <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-black text-slate-900">Trip Summary</span>
                <span className="ml-auto text-xs text-slate-400 font-medium">
                  {savedLayers.reduce((n, l) => n + l.places.length, 0)} places
                </span>
              </div>

              {/* Layers — scrollable */}
              <div className="flex-1 overflow-y-auto">
                {savedLayers.map((layer) => {
                  const isCollapsed = collapsedLayers.has(layer.name);
                  const toggleLayer = () =>
                    setCollapsedLayers(prev => {
                      const next = new Set(prev);
                      isCollapsed ? next.delete(layer.name) : next.add(layer.name);
                      return next;
                    });

                  return (
                    <div key={layer.name} className="border-b border-slate-100 last:border-b-0">
                      {/* Layer header */}
                      <button
                        onClick={toggleLayer}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      >
                        {isCollapsed
                          ? <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                        <span className="text-xs font-black text-slate-700 truncate flex-1">{layer.name}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{layer.places.length}</span>
                      </button>

                      {/* Places */}
                      {!isCollapsed && (
                        <ul>
                          {layer.places.map((place, idx) => {
                            const iconStyle = place.customKmlIcon || getDefaultKmlIcon(place);
                            const iconUrl = AVAILABLE_KML_ICONS.find(i => i.id === iconStyle)?.url || AVAILABLE_KML_ICONS[0].url;
                            const isActive = selectedPlace?.title === place.title;
                            return (
                              <li key={idx}>
                                <button
                                  onClick={() => {
                                    setSelectedPlace(place);
                                    onMarkerClick?.(place);
                                  }}
                                  className={`w-full flex items-center gap-2.5 pl-8 pr-4 py-2 text-left transition-colors ${
                                    isActive ? 'bg-teal-50' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <img src={iconUrl} alt={place.category} className="w-4 h-4 flex-shrink-0" />
                                  <span className={`text-xs truncate ${
                                    isActive ? 'font-bold text-teal-700' : 'text-slate-700'
                                  }`}>{place.title}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapse / expand tab on sidebar edge */}
            <button
              onClick={() => setIsSidebarOpen(v => !v)}
              title={isSidebarOpen ? 'Collapse sidebar' : 'Show trip summary'}
              className={`absolute top-1/2 -translate-y-1/2 -right-5 z-20 flex items-center justify-end pr-0.5 rounded-r-xl shadow-md border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200 ${
                isSidebarOpen ? 'w-5 h-12' : 'w-8 h-20'
              }`}
            >
              {isSidebarOpen ? (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-teal-600" strokeWidth={3} />
              )}
            </button>
          </div>
        )}

        {/* Map area */}
        <div className="relative flex-1 h-full">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
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
                // Handle map click — defer geocoding until user adds to trip
                if (e.detail.latLng) {
                  const lat = e.detail.latLng.lat;
                  const lng = e.detail.latLng.lng;
                  setClickedLocation({ lat, lng });
                  setCustomPlaceName('');
                  setCustomPlaceIcon('icon-camera');
                  setIsEditingName(false);
                  setSelectedPlace(null);
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
                const iconStyle = place.customKmlIcon || getDefaultKmlIcon(place);
                const iconUrl = AVAILABLE_KML_ICONS.find(icon => icon.id === iconStyle)?.url || AVAILABLE_KML_ICONS[0].url;
                const isFocused = focusedPlace?.title === place.title;
                
                return (
                  <AdvancedMarker
                    key={`saved-${index}`}
                    position={{ lat: place.lat!, lng: place.lng! }}
                    onClick={() => {
                      setSelectedPlace(place);
                      onMarkerClick?.(place);
                    }}
                  >
                    <Pin
                      background="transparent"
                      borderColor="transparent"
                      glyphColor="transparent"
                      scale={isFocused ? 1.5 : 1}
                    >
                      <img
                        src={iconUrl}
                        alt={place.category}
                        style={{
                          width: isFocused ? '36px' : '28px',
                          height: isFocused ? '36px' : '28px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          filter: isFocused ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none'
                        }}
                      />
                    </Pin>
                  </AdvancedMarker>
                );
              })}

              {/* Render geocoded saved places (places without original coordinates) */}
              {savedPlaces
                .filter(p => !p.lat || !p.lng)
                .map((place, index) => {
                  const coords = geocodedSavedPlaces[place.title];
                  if (!coords) return null;
                  
                  const iconStyle = place.customKmlIcon || getDefaultKmlIcon(place);
                  const iconUrl = AVAILABLE_KML_ICONS.find(icon => icon.id === iconStyle)?.url || AVAILABLE_KML_ICONS[0].url;
                  const isFocused = focusedPlace?.title === place.title;
                  
                  return (
                    <AdvancedMarker
                      key={`geocoded-saved-${index}`}
                      position={coords}
                      onClick={() => {
                        setSelectedPlace(place);
                        onMarkerClick?.(place);
                      }}
                    >
                      <Pin
                        background="transparent"
                        borderColor="transparent"
                        glyphColor="transparent"
                        scale={isFocused ? 1.5 : 1}
                      >
                        <img
                          src={iconUrl}
                          alt={place.category}
                          style={{
                            width: isFocused ? '36px' : '28px',
                            height: isFocused ? '36px' : '28px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            filter: isFocused ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none'
                          }}
                        />
                      </Pin>
                    </AdvancedMarker>
                  );
                })
              }

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
                  onCloseClick={() => {
                    setSelectedPlace(null);
                    setEditingIconForPlace(null);
                  }}
                >
                  <div className="p-2 max-w-sm -mt-1">
                    {/* Icon above title — click to change */}
                    {isPlaceSaved(selectedPlace) && onUpdatePlace && (
                      <div className="mb-1">
                        <button
                          onClick={() => setEditingIconForPlace(
                            editingIconForPlace === selectedPlace.title ? null : selectedPlace.title
                          )}
                          className="mb-1 self-start hover:scale-110 transition-transform"
                          title="Click to change icon"
                        >
                          <img
                            src={AVAILABLE_KML_ICONS.find(i => i.id === (selectedPlace.customKmlIcon || getDefaultKmlIcon(selectedPlace)))?.url || AVAILABLE_KML_ICONS[0].url}
                            alt="icon"
                            className="w-6 h-6"
                          />
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
                    <h4 className="font-bold text-sm text-slate-900 mb-1">
                      {selectedPlace.title}
                    </h4>
                    <p className="text-xs text-slate-600 mb-2">
                      {selectedPlace.description}
                    </p>
                    {selectedPlace.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold">{selectedPlace.rating.toFixed(1)}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mb-2">
                      {isPlaceSaved(selectedPlace) ? (
                        onRemovePlace && (
                          <button
                            onClick={() => {
                              onRemovePlace(selectedPlace);
                              setSelectedPlace(null);
                            }}
                            className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove from Trip
                          </button>
                        )
                      ) : (
                        onAddPlace && (
                          <button
                            onClick={() => {
                              onAddPlace(selectedPlace);
                              setSelectedPlace(null);
                            }}
                            className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3 h-3" />
                            Add to Trip
                          </button>
                        )
                      )}
                    </div>

                    <a
                      href={
                        selectedPlace.lat && selectedPlace.lng
                          ? `https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.title + ', ' + city)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
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
                              className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                        disabled={isAddingToTrip}
                        onClick={async () => {
                          setIsAddingToTrip(true);
                          let name = customPlaceName.trim();
                          if (!name) {
                            const result = await reverseGeocode(clickedLocation.lat, clickedLocation.lng);
                            name = result?.place_name || `${clickedLocation.lat.toFixed(4)}, ${clickedLocation.lng.toFixed(4)}`;
                          }
                          const newPlace: TripRecommendation = {
                            title: name,
                            description: `Custom location at ${clickedLocation.lat.toFixed(4)}, ${clickedLocation.lng.toFixed(4)}`,
                            category: 'Other',
                            lat: clickedLocation.lat,
                            lng: clickedLocation.lng,
                            customKmlIcon: customPlaceIcon
                          };
                          onAddPlace(newPlace);
                          setClickedLocation(null);
                          setIsEditingName(false);
                          setIsAddingToTrip(false);
                        }}
                        className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-3 h-3" />
                        {isAddingToTrip ? 'Adding...' : 'Add to Trip'}
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50" style={{minHeight: 0}}>
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
        </div>{/* end map area */}
      </div>
    </div>
  );
};
