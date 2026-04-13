import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { TripRecommendation, TripLayer } from '../types';
import { fetchSuggestions, enrichPlaces } from '../geminiService';
import { API_LIMITS } from '../constants';


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
  const [currentCity, setCurrentCityState] = useState('');
  
  const [query, setQueryState] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  
  const [pendingSuggestions, setPendingSuggestionsState] = useState<TripRecommendation[]>([]);
  
  const [savedLayers, setSavedLayersState] = useState<TripLayer[]>([]);
  
  const [requestCount, setRequestCount] = useState(0);

  const lastRequestTime = useRef<number>(0);

  const setCurrentCity = (city: string) => {
    setCurrentCityState(city);
  };

  const setQuery = (q: string) => {
    setQueryState(q);
  };

  const setPendingSuggestions: React.Dispatch<React.SetStateAction<TripRecommendation[]>> = (value) => {
    flushSync(() => {
      setPendingSuggestionsState(value);
    });
  };

  const setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>> = (value) => {
    setSavedLayersState(value);
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
      // Group places by their own city (places from chat carry place.city;
      // places from the main search use the session city as fallback).
      const cityGroups: Record<string, TripRecommendation[]> = {};
      for (const place of placesToEnrich) {
        const key = place.city || currentCity;
        if (!cityGroups[key]) cityGroups[key] = [];
        cityGroups[key].push(place);
      }

      console.log(`[Enrich] Enriching ${placesToEnrich.length} places across ${Object.keys(cityGroups).length} city group(s)`);

      // Enrich each city group with the correct city so coordinates are accurate
      const allEnriched: TripRecommendation[] = [];
      for (const [groupCity, groupPlaces] of Object.entries(cityGroups)) {
        const { enrichedPlaces } = await enrichPlaces(
          groupPlaces,
          groupCity,
          apiKey || '',
          userLocation
        );
        allEnriched.push(...enrichedPlaces);
      }
      
      console.log(`[Enrich] Successfully enriched ${allEnriched.length} places`);
      
      // Update saved layers with enriched data
      setSavedLayers(prev => 
        prev.map(layer => ({
          ...layer,
          places: layer.places.map(place => {
            const enriched = allEnriched.find(e => e.title === place.title);
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
    // Use the place's own city (set by chat when asking about a different city)
    // so it lands in the correct layer, not always in the session city layer.
    const layerName = place.city || currentCity;

    setSavedLayers(prev => {
      const existingLayerIdx = prev.findIndex(
        l => l.name.toLowerCase() === layerName.toLowerCase()
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
      
      return [...prev, { name: layerName, places: [place] }];
    });
    
    setPendingSuggestions(prev => prev.filter(p => p.title !== place.title));
  };

  const resetTrip = () => {
    setSavedLayers([]);
    setCurrentCity('');
    setPendingSuggestions([]);
    setQuery('');
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
