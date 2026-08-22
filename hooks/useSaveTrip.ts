import { useEffect, useRef, useState } from 'react';
import { GoogleUser, isTokenExpired } from '../googleAuthService';
import { TripLayer } from '../types';
import { createSavedTrip, updateSavedTrip, isAuthError, type TripPayload } from '../services/tripsService';
import { readTripDraft } from '../helpers/localDraft';

/** Quiet period after the last layer change before an auto-save fires. Long
 *  enough to batch bursts like "Add All 16 Places" into a single request. */
const AUTOSAVE_DELAY_MS = 1500;
/** How long the button reads "Saved" after an auto-save lands. */
const SAVED_FLASH_MS = 2000;
/** Shown whenever a save fails because the Google token is gone. Google's own
 *  401 body is not something to put in front of a user. */
/** Stands in for "the server's copy is unknown" when a restored draft was
 *  mid-edit. Can never equal a real `JSON.stringify(layers)`, so the first
 *  auto-save check always treats the layers as unsaved. */
const UNKNOWN_SERVER_SNAPSHOT = '\u0000unsynced';
/** Shown whenever a save fails because the Google token is gone. Google's own
 *  401 body is not something to put in front of a user. */
const SESSION_EXPIRED_MESSAGE =
  'Your Google session expired, so this trip could not be saved to the server. Sign in again to save it — your work is kept on this device meanwhile.';

interface UseSaveTripDeps {
  googleUser: GoogleUser | null;
  savedLayers: TripLayer[];
  currentCity: string;
  tripId: string | null;
  tripTitle: string;
  tripDriveFileId: string | null;
  markSaved: (id: string, title: string) => void;
  /** Called when the server rejects our token, so the session can be ended and
   *  the user prompted to sign in again instead of editing into a void. Takes
   *  the token the request used, so a late 401 can't kill a newer session. */
  onAuthFailure: (token?: string) => void;
}

interface UseSaveTripReturn {
  showSaveModal: boolean;
  saving: boolean;
  saveError: string | null;
  /** True for a moment after an auto-save succeeds, for button feedback. */
  justSaved: boolean;
  /** Last auto-save failure, or null. Surfaced in the UI — a silently broken
   *  auto-save is indistinguishable from a working one until work is lost. */
  autoSaveError: string | null;
  /** Retry the failed snapshot now (the banner's Retry button). */
  retryAutoSave: () => void;
  /** Hide the failure banner without retrying. */
  dismissAutoSaveError: () => void;
  /** True while the server's copy is behind the current layers. Persisted with
   *  the local draft so a refresh resumes the pending save. */
  pendingServerSave: boolean;
  /** Save button: fast-path update if already saved, otherwise open the modal. */
  handleSaveClick: () => void;
  /** Create a new trip with the given title (modal confirm). */
  persistCreate: (title: string) => Promise<void>;
  closeSaveModal: () => void;
}

export const useSaveTrip = (deps: UseSaveTripDeps): UseSaveTripReturn => {
  const { googleUser, savedLayers, currentCity, tripId, tripTitle, tripDriveFileId, markSaved, onAuthFailure } = deps;

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [pendingServerSave, setPendingServerSave] = useState(false);

  // A draft restored mid-edit has layers the server never accepted. Seeding the
  // baseline from it is what makes the pending save resume after a refresh —
  // otherwise the restored layers get adopted as "already synced" and the edits
  // silently never reach the server.
  //
  // Computed in a lazy useState initializer, not inline: an argument to
  // useRef()/useState() is re-evaluated on every render even though only the
  // first result is kept, so building it inline would re-read localStorage and
  // re-stringify every layer on each render — once per streamed chat chunk.
  const [initialSynced] = useState<{ tripId: string | null; snapshot: string }>(() => {
    const draft = readTripDraft();
    if (!draft?.tripId) return { tripId: null, snapshot: '' };
    return {
      tripId: draft.tripId,
      snapshot: draft.pendingServerSave
        ? UNKNOWN_SERVER_SNAPSHOT
        : JSON.stringify(draft.savedLayers),
    };
  });

  // Serialized layers last known to match the server, tagged with the trip they
  // belong to. Loading or creating a trip adopts its layers as the baseline so
  // we don't immediately push back what we just received.
  const syncedRef = useRef(initialSynced);
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
    const token = googleUser.accessToken;
    if (isTokenExpired(googleUser)) {
      onAuthFailure(token);
      setSaveError(SESSION_EXPIRED_MESSAGE);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const trip = await createSavedTrip(buildTripPayload(title), token);
      syncedRef.current = { tripId: trip.id, snapshot: JSON.stringify(savedLayers) };
      markSaved(trip.id, trip.title);
      setShowSaveModal(false);
    } catch (err) {
      if (isAuthError(err)) onAuthFailure(token);
      setSaveError(err instanceof Error ? err.message : 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  const persistUpdate = async (title: string, silent = false) => {
    if (!googleUser || !tripId) return;
    const token = googleUser.accessToken;
    const snapshot = JSON.stringify(savedLayers);

    // Don't spend a round-trip on a token we already know Google will reject —
    // end the session now so the user sees the prompt instead of a stale
    // "signed in" header.
    if (isTokenExpired(googleUser)) {
      failedSnapshotRef.current = snapshot;
      setAutoSaveError(SESSION_EXPIRED_MESSAGE);
      onAuthFailure(token);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const trip = await updateSavedTrip(tripId, buildTripPayload(title), token);
      syncedRef.current = { tripId, snapshot };
      failedSnapshotRef.current = null;
      setAutoSaveError(null);
      markSaved(trip.id, trip.title);
      if (silent) setJustSaved(true);
    } catch (err) {
      const authFailed = isAuthError(err);
      const message = authFailed
        ? SESSION_EXPIRED_MESSAGE
        : err instanceof Error ? err.message : 'Failed to save trip';
      // Record the failure either way. It used to be swallowed into a
      // console.warn on the auto-save path, which let a broken session look
      // identical to a healthy one until the work was gone.
      failedSnapshotRef.current = snapshot;
      setAutoSaveError(message);
      if (authFailed) onAuthFailure(token);
      if (!silent && !authFailed) {
        // Manual save: the banner alone is easy to miss right after a click.
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
      setPendingServerSave(false);
      return;
    }

    // Whether the server is behind — tracked separately from whether we can
    // push right now, so a signed-out or failed state still records that the
    // work is unsaved and the next session picks it up.
    const dirty = tripId !== null && snapshot !== syncedRef.current.snapshot;
    setPendingServerSave(dirty);
    if (!dirty) return;

    // Can't push right now: user is signed out, a save is already in flight,
    // or this exact snapshot just failed to save.
    if (!googleUser || saving) return;
    if (snapshot === failedSnapshotRef.current) return;

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

  const retryAutoSave = () => {
    if (saving || !tripId || !googleUser) return;
    // Clear the failed-snapshot guard so the effect (and this call) will push
    // the current layers again.
    failedSnapshotRef.current = null;
    setAutoSaveError(null);
    void persistUpdate(tripTitle || currentCity || 'Untitled trip', true);
  };

  const dismissAutoSaveError = () => setAutoSaveError(null);

  return {
    showSaveModal, saving, saveError, justSaved, autoSaveError, pendingServerSave,
    retryAutoSave, dismissAutoSaveError, handleSaveClick, persistCreate, closeSaveModal,
  };
};
