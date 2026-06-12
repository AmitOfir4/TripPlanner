import { useState } from 'react';
import { GoogleUser } from '../googleAuthService';
import { TripLayer } from '../types';
import { createSavedTrip, updateSavedTrip, type TripPayload } from '../services/tripsService';

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
      markSaved(trip.id, trip.title);
      setShowSaveModal(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  const persistUpdate = async (title: string) => {
    if (!googleUser || !tripId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const trip = await updateSavedTrip(tripId, buildTripPayload(title), googleUser.accessToken);
      markSaved(trip.id, trip.title);
    } catch (err) {
      // On update failure, surface via alert (no modal is open).
      alert(err instanceof Error ? err.message : 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  const closeSaveModal = () => {
    if (!saving) {
      setShowSaveModal(false);
      setSaveError(null);
    }
  };

  return { showSaveModal, saving, saveError, handleSaveClick, persistCreate, closeSaveModal };
};
