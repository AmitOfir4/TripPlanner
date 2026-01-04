import { useState, useRef } from 'react';
import { TripRecommendation, TripLayer } from '../types';
import { fetchSuggestions } from '../geminiService';
import { API_LIMITS } from '../Constants';

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
  const [currentCity, setCurrentCity] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<TripRecommendation[]>([]);
  const [savedLayers, setSavedLayers] = useState<TripLayer[]>([]);
  const [requestCount, setRequestCount] = useState(0);

  const lastRequestTime = useRef<number>(0);

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
