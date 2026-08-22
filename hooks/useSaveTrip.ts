import { useEffect, useRef, useState } from 'react';
import { GoogleUser } from '../googleAuthService';
import { TripLayer } from '../types';
import { createSavedTrip, updateSavedTrip, type TripPayload } from '../services/tripsService';

/** Quiet period after the last layer change before an auto-save fires. Long
 *  enough to batch bursts like "Add All 16 Places" into a single request. */
const AUTOSAVE_DELAY_MS = 1500;
/** How long the button reads "Saved" after an auto-save lands. */
const SAVED_FLASH_MS = 2000;

interface UseSaveTripDeps {
  googleUser: GoogleUser | null;
  savedLayers: TripLayer[];
  currentCity: string;
  tripId: string | null;
  tripTitle: string;
  tripDriveFileId: string | null;
  markSaved: (id: string, title: string) => void;
}

interface UseSaveTripReturn {
  showSaveModal: boolean;
  saving: boolean;
  saveError: string | null;
  /** True for a moment after an auto-save succeeds, for button feedback. */
  justSaved: boolean;
  /** Save button: fast-path update if already saved, otherwise open the modal. */
  handleSaveClick: () => void;
  /** Create a new trip with the given title (modal confirm). */
  persistCreate: (title: string) => Promise<void>;
  closeSaveModal: () => void;
}

export const useSaveTrip = (deps: UseSaveTripDeps): UseSaveTripReturn => {
  const { googleUser, savedLayers, currentCity, tripId, tripTitle, tripDriveFileId, markSaved } = deps;

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Serialized layers last known to match the server, tagged with the trip they
  // belong to. Loading or creating a trip adopts its layers as the baseline so
  // we don't immediately push back what we just received.
  const syncedRef = useRef<{ tripId: string | null; snapshot: string }>({ tripId: null, snapshot: '' });
  // Snapshot whose auto-save failed — don't retry it until something changes.
  const failedSnapshotRef = useRef<string | null>(null);

  const buildTripPayload = (title: string): TripPayload => ({
    title,
    city: currentCity || title,
    summary: '',
    layers: savedLayers,
    sources: [],
    // Carry the link through PUT updates so a save doesn't blow it away.
    ...(tripDriveFileId ? { driveFileId: tripDriveFileId } : {}),
  });

  const handleSaveClick = () => {
    if (!googleUser || savedLayers.length === 0) return;
    if (tripId) {
      // Already saved — fast-path update with the existing title.
      void persistUpdate(tripTitle || currentCity || 'Untitled trip');
    } else {
      setSaveError(null);
      setShowSaveModal(true);
    }
  };

  const persistCreate = async (title: string) => {
    if (!googleUser) return;
    setSaving(true);
    setSaveError(null);
    try {
      const trip = await createSavedTrip(buildTripPayload(title), googleUser.accessToken);
      syncedRef.current = { tripId: trip.id, snapshot: JSON.stringify(savedLayers) };
      markSaved(trip.id, trip.title);
      setShowSaveModal(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  const persistUpdate = async (title: string, silent = false) => {
    if (!googleUser || !tripId) return;
    const snapshot = JSON.stringify(savedLayers);
    setSaving(true);
    setSaveError(null);
    try {
      const trip = await updateSavedTrip(tripId, buildTripPayload(title), googleUser.accessToken);
      syncedRef.current = { tripId, snapshot };
      failedSnapshotRef.current = null;
      markSaved(trip.id, trip.title);
      if (silent) setJustSaved(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save trip';
      // Auto-save failures stay quiet — the manual Save button is still there,
      // and the next edit retries.
      if (silent) {
        failedSnapshotRef.current = snapshot;
        console.warn('Auto-save failed:', message);
      } else {
        // On update failure, surface via alert (no modal is open).
        alert(message);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Auto-save ────────────────────────────────────────────────────
  // Keep the latest closure reachable from the effect without making it a
  // dependency, so unrelated re-renders don't restart the debounce timer.
  const persistUpdateRef = useRef(persistUpdate);
  persistUpdateRef.current = persistUpdate;

  useEffect(() => {
    const snapshot = JSON.stringify(savedLayers);

    // A different trip just loaded / was created / was cleared: take its layers
    // as the baseline rather than treating them as an unsaved edit.
    if (syncedRef.current.tripId !== tripId) {
      syncedRef.current = { tripId, snapshot };
      failedSnapshotRef.current = null;
      return;
    }

    // Nothing to push: trip was never saved, user is signed out, a save is
    // already in flight, the layers already match the server, or this exact
    // snapshot just failed to save.
    if (!tripId || !googleUser || saving) return;
    if (snapshot === syncedRef.current.snapshot || snapshot === failedSnapshotRef.current) return;

    const timer = setTimeout(() => {
      void persistUpdateRef.current(tripTitle || currentCity || 'Untitled trip', true);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [savedLayers, tripId, googleUser, saving, tripTitle, currentCity]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), SAVED_FLASH_MS);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const closeSaveModal = () => {
    if (!saving) {
      setShowSaveModal(false);
      setSaveError(null);
    }
  };

  return { showSaveModal, saving, saveError, justSaved, handleSaveClick, persistCreate, closeSaveModal };
};
