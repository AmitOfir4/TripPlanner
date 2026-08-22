import { useState } from 'react';
import { GoogleUser, isTokenExpired } from '../googleAuthService';
import { SavedTripSummary, SavedTripDoc, TripLayer } from '../types';
import { listSavedTrips, getSavedTrip, deleteSavedTrip, isAuthError } from '../services/tripsService';

interface UseMyTripsDeps {
  googleUser: GoogleUser | null;
  login: () => void;
  loadSavedTrip: (trip: SavedTripDoc) => void;
  tripId: string | null;
  markSaved: (id: string, title: string) => void;
  importFromFile: (file: File, currentCity: string) => Promise<{ layers: TripLayer[]; cityName: string }>;
  currentCity: string;
  setCurrentCity: (city: string) => void;
  setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>>;
  /** Called when the server rejects our token, so the session ends and the user
   *  is prompted to sign in again. */
  onAuthFailure: () => void;
}

interface UseMyTripsReturn {
  showMyTripsModal: boolean;
  loadingTrips: boolean;
  myTrips: SavedTripSummary[];
  loadingMoreTrips: boolean;
  loadingTripId: string | null;
  myTripsError: string | null;
  hasMore: boolean;
  /** Header "My Trips" entry: log in if needed, else open the modal and load page 1. */
  openMyTrips: () => Promise<void>;
  loadMoreTrips: () => Promise<void>;
  selectTrip: (id: string) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  importKmlFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  closeMyTrips: () => void;
}

export const useMyTrips = (deps: UseMyTripsDeps): UseMyTripsReturn => {
  const {
    googleUser, login, loadSavedTrip, tripId, markSaved,
    importFromFile, currentCity, setCurrentCity, setSavedLayers, onAuthFailure,
  } = deps;

  const [showMyTripsModal, setShowMyTripsModal] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [myTrips, setMyTrips] = useState<SavedTripSummary[]>([]);
  const [myTripsCursor, setMyTripsCursor] = useState<string | null>(null);
  const [loadingMoreTrips, setLoadingMoreTrips] = useState(false);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const [myTripsError, setMyTripsError] = useState<string | null>(null);

  /** Turn a failed request into a message, ending the session first if the
   *  token was the problem. */
  const reportError = (err: unknown, fallback: string): string => {
    if (isAuthError(err)) {
      onAuthFailure();
      return 'Your Google session expired. Sign in again to see your saved trips.';
    }
    return err instanceof Error ? err.message : fallback;
  };

  const openMyTrips = async () => {
    // A known-dead token would just 401 — send the user straight to sign-in.
    if (!googleUser || isTokenExpired(googleUser)) { login(); return; }
    setShowMyTripsModal(true);
    setMyTripsError(null);
    setLoadingTrips(true);
    try {
      const page = await listSavedTrips(googleUser.accessToken);
      setMyTrips(page.trips);
      setMyTripsCursor(page.nextCursor);
    } catch (err) {
      setMyTripsError(reportError(err, 'Failed to load trips'));
    } finally {
      setLoadingTrips(false);
    }
  };

  const loadMoreTrips = async () => {
    if (!googleUser || !myTripsCursor || loadingMoreTrips) return;
    setLoadingMoreTrips(true);
    setMyTripsError(null);
    try {
      const page = await listSavedTrips(googleUser.accessToken, { before: myTripsCursor });
      setMyTrips(prev => [...prev, ...page.trips]);
      setMyTripsCursor(page.nextCursor);
    } catch (err) {
      setMyTripsError(reportError(err, 'Failed to load more trips'));
    } finally {
      setLoadingMoreTrips(false);
    }
  };

  const selectTrip = async (id: string) => {
    if (!googleUser) return;
    setLoadingTripId(id);
    setMyTripsError(null);
    try {
      const trip = await getSavedTrip(id, googleUser.accessToken);
      loadSavedTrip(trip);
      setShowMyTripsModal(false);
    } catch (err) {
      setMyTripsError(reportError(err, 'Failed to load trip'));
    } finally {
      setLoadingTripId(null);
    }
  };

  const deleteTrip = async (id: string) => {
    if (!googleUser) return;
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await deleteSavedTrip(id, googleUser.accessToken);
      setMyTrips(prev => prev.filter(t => t.id !== id));
      // If the user just deleted the trip currently loaded into state, mark it
      // as unsaved so the next save creates a new doc instead of 404'ing.
      if (tripId === id) markSaved('', '');
    } catch (err) {
      setMyTripsError(reportError(err, 'Failed to delete trip'));
    }
  };

  const importKmlFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    try {
      const { layers, cityName } = await importFromFile(file, currentCity);
      setSavedLayers((prev) => [...prev, ...layers]);
      if (!currentCity) setCurrentCity(cityName);
      const totalPlaces = layers.reduce((acc, l) => acc + l.places.length, 0);
      setShowMyTripsModal(false);
      alert(`Successfully imported "${file.name}" with ${totalPlaces} places!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to import file');
    }
  };

  const closeMyTrips = () => {
    if (loadingTripId === null) setShowMyTripsModal(false);
  };

  return {
    showMyTripsModal,
    loadingTrips,
    myTrips,
    loadingMoreTrips,
    loadingTripId,
    myTripsError,
    hasMore: myTripsCursor !== null,
    openMyTrips,
    loadMoreTrips,
    selectTrip,
    deleteTrip,
    importKmlFile,
    closeMyTrips,
  };
};
