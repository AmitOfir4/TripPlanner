import { useState } from 'react';
import { TripRecommendation, TripLayer, SavedTripDoc } from '../types';
import { readTripDraft, clearTripDraft } from '../helpers/localDraft';

interface UseTripPlannerReturn {
  currentCity: string;
  setCurrentCity: (city: string) => void;
  savedLayers: TripLayer[];
  setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>>;
  savePlace: (place: TripRecommendation, targetLayerName?: string) => void;
  /** Create a new empty layer. Returns true if added, false if a layer with
   *  the same (case-insensitive) name already exists. */
  addLayer: (name: string) => boolean;
  /** Rename an existing layer. No-op if `from` doesn't exist or `to`
   *  collides with another layer (case-insensitive). */
  renameLayer: (from: string, to: string) => boolean;
  /** Remove a layer and all its places. */
  deleteLayer: (name: string) => void;
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
  // Restore the local draft so a refresh resumes where the user left off.
  // Read once, lazily — every piece of state below seeds from the same snapshot.
  const [draft] = useState(() => readTripDraft());

  const [currentCity, setCurrentCityState] = useState(draft?.currentCity ?? '');
  const [savedLayers, setSavedLayersState] = useState<TripLayer[]>(draft?.savedLayers ?? []);
  const [tripId, setTripId] = useState<string | null>(draft?.tripId ?? null);
  const [tripTitle, setTripTitle] = useState<string>(draft?.tripTitle ?? '');
  const [tripDriveFileId, setTripDriveFileIdState] = useState<string | null>(draft?.tripDriveFileId ?? null);

  const setCurrentCity = (city: string) => {
    setCurrentCityState(city);
  };

  const setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>> = (value) => {
    setSavedLayersState(value);
  };

  const savePlace = (place: TripRecommendation, targetLayerName?: string) => {
    // Explicit target layer wins (user picked one in the sidebar / map UI).
    // Otherwise use the place's own city (set by chat when asking about a
    // different city) so it lands in the correct layer.
    const layerName = targetLayerName || place.city || currentCity;

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

  const addLayer = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    let added = false;
    setSavedLayersState(prev => {
      if (prev.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) return prev;
      added = true;
      return [...prev, { name: trimmed, places: [] }];
    });
    return added;
  };

  const renameLayer = (from: string, to: string): boolean => {
    const trimmed = to.trim();
    if (!trimmed || trimmed === from) return false;
    let renamed = false;
    setSavedLayersState(prev => {
      const fromIdx = prev.findIndex(l => l.name === from);
      if (fromIdx === -1) return prev;
      const collides = prev.some(
        (l, i) => i !== fromIdx && l.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (collides) return prev;
      renamed = true;
      const next = [...prev];
      next[fromIdx] = { ...next[fromIdx], name: trimmed };
      return next;
    });
    return renamed;
  };

  const deleteLayer = (name: string) => {
    setSavedLayersState(prev => prev.filter(l => l.name !== name));
  };

  const resetTrip = () => {
    setSavedLayers([]);
    setCurrentCity('');
    setTripId(null);
    setTripTitle('');
    setTripDriveFileIdState(null);
    // Drop the local draft too — an explicit reset means the user wants a clean
    // slate, not the old trip back on the next refresh.
    clearTripDraft();
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
    addLayer,
    renameLayer,
    deleteLayer,
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
