import { useState } from 'react';
import { TripRecommendation, TripLayer } from '../types';

interface UseTripPlannerReturn {
  currentCity: string;
  setCurrentCity: (city: string) => void;
  savedLayers: TripLayer[];
  setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>>;
  savePlace: (place: TripRecommendation) => void;
  resetTrip: () => void;
}

export const useTripPlanner = (
  userLocation?: { latitude: number; longitude: number },
  apiKey?: string
): UseTripPlannerReturn => {
  const [currentCity, setCurrentCityState] = useState('');
  const [savedLayers, setSavedLayersState] = useState<TripLayer[]>([]);

  const setCurrentCity = (city: string) => {
    setCurrentCityState(city);
  };

  const setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>> = (value) => {
    setSavedLayersState(value);
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
  };

  const resetTrip = () => {
    setSavedLayers([]);
    setCurrentCity('');
  };

  return {
    currentCity,
    setCurrentCity,
    savedLayers,
    setSavedLayers,
    savePlace,
    resetTrip
  };
};
