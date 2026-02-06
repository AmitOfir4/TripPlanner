import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { TripRecommendation, TripLayer } from '../types';
import { fetchSuggestions, enrichPlaces } from '../geminiService';
import { API_LIMITS } from '../constants';

const STORAGE_KEYS = {
  CITY: 'tripplanner_current_city',
  QUERY: 'tripplanner_query',
  PENDING: 'tripplanner_pending_suggestions',
  SAVED: 'tripplanner_saved_layers'
};

interface UseTripPlannerReturn {
  currentCity: string;
  setCurrentCity: (city: string) => void;
  query: string;
  setQuery: (query: string) => void;
  loading: boolean;
  enriching: boolean;
  pendingSuggestions: TripRecommendation[];
  setPendingSuggestions: React.Dispatch<React.SetStateAction<TripRecommendation[]>>;
  savedLayers: TripLayer[];
  setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>>;
  requestCount: number;
  handleSearch: (e: React.FormEvent | null) => Promise<void>;
  handleEnrichSelected: () => Promise<void>;
  savePlace: (place: TripRecommendation) => void;
  resetTrip: () => void;
}

export const useTripPlanner = (
  userLocation?: { latitude: number; longitude: number },
  apiKey?: string
): UseTripPlannerReturn => {
  const [currentCity, setCurrentCityState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.CITY) || '';
  });
  
  const [query, setQueryState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.QUERY) || '';
  });
  
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  
  const [pendingSuggestions, setPendingSuggestionsState] = useState<TripRecommendation[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PENDING);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing pending suggestions:', error);
        return [];
      }
    }
    return [];
  });
  
  const [savedLayers, setSavedLayersState] = useState<TripLayer[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SAVED);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing saved layers:', error);
        return [];
      }
    }
    return [];
  });
  
  const [requestCount, setRequestCount] = useState(0);

  const lastRequestTime = useRef<number>(0);

  // Wrapper functions to update both state and localStorage
  const setCurrentCity = (city: string) => {
    setCurrentCityState(city);
    localStorage.setItem(STORAGE_KEYS.CITY, city);
  };

  const setQuery = (q: string) => {
    setQueryState(q);
    localStorage.setItem(STORAGE_KEYS.QUERY, q);
  };

  const setPendingSuggestions: React.Dispatch<React.SetStateAction<TripRecommendation[]>> = (value) => {
    flushSync(() => {
      setPendingSuggestionsState(prev => {
        const newValue = typeof value === 'function' ? value(prev) : value;
        // Update localStorage asynchronously to not block state update
        setTimeout(() => {
          localStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(newValue));
        }, 0);
        return newValue;
      });
    });
  };

  const setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>> = (value) => {
    setSavedLayersState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(newValue));
      return newValue;
    });
  };

  // PHASE 1: Quick search - just get place names (fast)
  const handleSearch = async (e: React.FormEvent | null) => {
    e?.preventDefault();
    
    if (!currentCity || !query) return;

    // Rate limiting check
    const now = Date.now();
    if (now - lastRequestTime.current < API_LIMITS.MIN_REQUEST_INTERVAL) {
      console.warn('Rate limit: Please wait before making another request');
      return;
    }

    lastRequestTime.current = now;
    setRequestCount(prev => prev + 1);
    setLoading(true);
    
    // Check if this is an additional search (we already have places)
    const isAdditionalSearch = pendingSuggestions.length > 0;
    const existingTitles = pendingSuggestions.map(p => p.title);
    
    // For additional searches, don't clear existing suggestions
    if (!isAdditionalSearch) {
      setPendingSuggestions([]);
    }

    try {
      console.log(`[Quick Search] ${isAdditionalSearch ? 'Additional' : 'Initial'} search for places in ${currentCity}: "${query}"`);
      
      const { suggestions, quickSearch } = await fetchSuggestions(
        currentCity, 
        query,
        apiKey || '',
        isAdditionalSearch,
        existingTitles
      );
      
      console.log(`[Quick Search] Received ${suggestions.length} places (quick=${quickSearch}, additional=${isAdditionalSearch})`);
      
      // For additional searches, append to existing suggestions
      if (isAdditionalSearch) {
        setPendingSuggestions(prev => [...prev, ...suggestions]);
      } else {
        setPendingSuggestions(suggestions);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setLoading(false);
      throw err; // Re-throw so App.tsx can catch it
    }
  };

  // PHASE 2: Enrich selected places with coordinates, ratings, etc.
  const handleEnrichSelected = async () => {
    if (!currentCity) return;

    const placesToEnrich = savedLayers.flatMap(l => l.places).filter(p => p.needsEnrichment);
    
    if (placesToEnrich.length === 0) {
      console.log('[Enrich] No places need enrichment');
      return;
    }

    setEnriching(true);

    try {
      console.log(`[Enrich] Enriching ${placesToEnrich.length} selected places`);
      
      const { enrichedPlaces, total } = await enrichPlaces(
        placesToEnrich,
        currentCity,
        apiKey || '',
        userLocation
      );
      
      console.log(`[Enrich] Successfully enriched ${total} places`);
      
      // Update saved layers with enriched data
      setSavedLayers(prev => 
        prev.map(layer => ({
          ...layer,
          places: layer.places.map(place => {
            const enriched = enrichedPlaces.find(e => e.title === place.title);
            return enriched || place;
          })
        }))
      );
      
      setEnriching(false);
    } catch (err) {
      console.error('Error enriching places:', err);
      setEnriching(false);
    }
  };

  const savePlace = (place: TripRecommendation) => {
    setSavedLayers(prev => {
      const existingLayerIdx = prev.findIndex(
        l => l.name.toLowerCase() === currentCity.toLowerCase()
      );
      
      if (existingLayerIdx > -1) {
        const newLayers = [...prev];
        const existingPlaces = newLayers[existingLayerIdx].places;
        
        if (!existingPlaces.find(p => p.title === place.title)) {
          newLayers[existingLayerIdx] = {
            ...newLayers[existingLayerIdx],
            places: [...existingPlaces, place]
          };
        }
        return newLayers;
      }
      
      return [...prev, { name: currentCity, places: [place] }];
    });
    
    setPendingSuggestions(prev => prev.filter(p => p.title !== place.title));
  };

  const resetTrip = () => {
    setSavedLayers([]);
    setCurrentCity('');
    setPendingSuggestions([]);
    setQuery('');
    localStorage.removeItem(STORAGE_KEYS.CITY);
    localStorage.removeItem(STORAGE_KEYS.QUERY);
    localStorage.removeItem(STORAGE_KEYS.PENDING);
    localStorage.removeItem(STORAGE_KEYS.SAVED);
  };

  return {
    currentCity,
    setCurrentCity,
    query,
    setQuery,
    loading,
    enriching,
    pendingSuggestions,
    setPendingSuggestions,
    savedLayers,
    setSavedLayers,
    requestCount,
    handleSearch,
    handleEnrichSelected,
    savePlace,
    resetTrip
  };
};
