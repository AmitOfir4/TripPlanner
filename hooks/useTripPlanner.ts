import { useState } from 'react';
import { TripRecommendation, TripLayer, SavedTripDoc } from '../types';

interface UseTripPlannerReturn {
  currentCity: string;
  setCurrentCity: (city: string) => void;
  savedLayers: TripLayer[];
  setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>>;
  savePlace: (place: TripRecommendation) => void;
  resetTrip: () => void;
  /** Mongo `_id` of the trip currently loaded into state, or null if unsaved. */
  tripId: string | null;
  /** User-editable trip title. Empty until the trip is first saved. */
  tripTitle: string;
  setTripTitle: (t: string) => void;
  /** Hydrate state from a server-loaded trip. */
  loadSavedTrip: (trip: SavedTripDoc) => void;
  /** Called after a successful create/update to remember the server's id+title. */
  markSaved: (id: string, title: string) => void;
  /** Drive file id for the trip's "Upload to Google Maps" target, if one exists. */
  tripDriveFileId: string | null;
  /** Called after a successful upload-to-Drive so the next upload updates the same file. */
  setTripDriveFileId: (driveFileId: string | null) => void;
}

export const useTripPlanner = (
  userLocation?: { latitude: number; longitude: number },
  apiKey?: string
): UseTripPlannerReturn => {
  const [currentCity, setCurrentCityState] = useState('');
  const [savedLayers, setSavedLayersState] = useState<TripLayer[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripTitle, setTripTitle] = useState<string>('');
  const [tripDriveFileId, setTripDriveFileIdState] = useState<string | null>(null);

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
    setTripId(null);
    setTripTitle('');
    setTripDriveFileIdState(null);
  };

  const loadSavedTrip = (trip: SavedTripDoc) => {
    setTripId(trip.id);
    setTripTitle(trip.title);
    setCurrentCityState(trip.city);
    setSavedLayersState(trip.layers || []);
    setTripDriveFileIdState(trip.driveFileId || null);
  };

  const markSaved = (id: string, title: string) => {
    // An empty id means "no longer associated with a saved doc" (e.g. after the
    // user deletes the loaded trip). Treat it as null so `tripId` stays canonical.
    const next = id || null;
    setTripId(next);
    setTripTitle(title);
    if (!next) setTripDriveFileIdState(null);
  };

  const setTripDriveFileId = (driveFileId: string | null) => {
    setTripDriveFileIdState(driveFileId);
  };

  return {
    currentCity,
    setCurrentCity,
    savedLayers,
    setSavedLayers,
    savePlace,
    resetTrip,
    tripId,
    tripTitle,
    setTripTitle,
    loadSavedTrip,
    markSaved,
    tripDriveFileId,
    setTripDriveFileId,
  };
};
