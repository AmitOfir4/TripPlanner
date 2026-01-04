import { useState, useRef, useEffect } from 'react';
import { TripRecommendation, TripLayer } from '../types';
import { fetchSuggestions } from '../geminiService';
import { API_LIMITS } from '../Constants';

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
  loadingMore: boolean;
  pendingSuggestions: TripRecommendation[];
  setPendingSuggestions: React.Dispatch<React.SetStateAction<TripRecommendation[]>>;
  savedLayers: TripLayer[];
  setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>>;
  requestCount: number;
  handleSearch: (e: React.FormEvent | null, isLoadMore?: boolean) => Promise<void>;
  savePlace: (place: TripRecommendation) => void;
  resetTrip: () => void;
}

export const useTripPlanner = (
  userLocation?: { latitude: number; longitude: number }
): UseTripPlannerReturn => {
  const [currentCity, setCurrentCityState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.CITY) || '';
  });
  
  const [query, setQueryState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.QUERY) || '';
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
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
    setPendingSuggestionsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(newValue));
      return newValue;
    });
  };

  const setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>> = (value) => {
    setSavedLayersState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(newValue));
      return newValue;
    });
  };

  const handleSearch = async (e: React.FormEvent | null, isLoadMore = false) => {
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

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const excludeTitles = [
        ...pendingSuggestions.map(p => p.title),
        ...savedLayers.flatMap(l => l.places.map(p => p.title))
      ];
      
      const { suggestions } = await fetchSuggestions(
        currentCity, 
        query, 
        excludeTitles, 
        userLocation
      );
      
      if (isLoadMore) {
        setPendingSuggestions(prev => [...prev, ...suggestions]);
      } else {
        setPendingSuggestions(suggestions);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
    loadingMore,
    pendingSuggestions,
    setPendingSuggestions,
    savedLayers,
    setSavedLayers,
    requestCount,
    handleSearch,
    savePlace,
    resetTrip
  };
};
