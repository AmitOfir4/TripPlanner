import React, { useRef, useState } from 'react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { UploadModal } from './components/UploadModal';
import { SaveTripModal } from './components/SaveTripModal';
import { MyTripsModal } from './components/MyTripsModal';
import { MapView } from './components/MapView';
import { Download, Upload, Save } from 'lucide-react';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useApiKey } from './hooks/useApiKey';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useMapImport } from './hooks/useMapImport';
import { useUserLocation } from './hooks/useUserLocation';
import { useChat } from './hooks/useChat';
import { useUpload } from './hooks/useUpload';
import { TripRecommendation, SavedTripSummary } from './types';
import {
  createSavedTrip, updateSavedTrip,
  listSavedTrips, getSavedTrip, deleteSavedTrip,
  setSavedTripDriveLink,
  type TripPayload,
} from './services/tripsService';
import { appStyles as s } from './styles/app';

const App: React.FC = () => {
  const userLocation = useUserLocation();
  const { googleUser, login, logout } = useGoogleAuth();
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [focusedPlace, setFocusedPlace] = useState<TripRecommendation | null>(null);
  type ErrorKind = 'api_key' | 'quota' | 'invalid_key' | 'generic';
  const [errorMessage, setErrorMessageRaw] = useState<string>('');
  const [errorKind, setErrorKind] = useState<ErrorKind>('api_key');
  const setErrorMessage = (msg: string, kind: ErrorKind = 'api_key') => {
    setErrorMessageRaw(msg);
    if (msg) setErrorKind(kind);
  };
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const {
    currentCity, setCurrentCity, savedLayers, setSavedLayers,
    savePlace, resetTrip,
    tripId, tripTitle, markSaved, loadSavedTrip,
    tripDriveFileId, setTripDriveFileId,
  } = useTripPlanner(userLocation, apiKey);

  // ── Save trip state ──────────────────────────────────────────────
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

  const {
    chatMessages, chatLoading, verifyingTitles, handleSendMessage,
    handleAddPlaceFromChat, handleAddAllPlaces, handleShowInMapFromChat,
  } = useChat(currentCity, setCurrentCity, apiKey, savePlace, setFocusedPlace, setErrorMessage);

  const {
    showUploadModal, uploadDriveFiles, loadingDriveFiles, uploading, uploadResult,
    openUploadModal, closeUploadModal, refreshDriveFiles, doUpload, handleDownload,
  } = useUpload();

  const { importingMap, importFromFile } = useMapImport();

  // ── My Trips state + handlers ────────────────────────────────────
  const [showMyTripsModal, setShowMyTripsModal] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [myTrips, setMyTrips] = useState<SavedTripSummary[]>([]);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const [myTripsError, setMyTripsError] = useState<string | null>(null);

  const handleMyTripsClick = async () => {
    if (!googleUser) { login(); return; }
    setShowMyTripsModal(true);
    setMyTripsError(null);
    setLoadingTrips(true);
    try {
      const trips = await listSavedTrips(googleUser.accessToken);
      setMyTrips(trips);
    } catch (err) {
      setMyTripsError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleSelectTrip = async (id: string) => {
    if (!googleUser) return;
    setLoadingTripId(id);
    setMyTripsError(null);
    try {
      const trip = await getSavedTrip(id, googleUser.accessToken);
      loadSavedTrip(trip);
      setShowMyTripsModal(false);
    } catch (err) {
      setMyTripsError(err instanceof Error ? err.message : 'Failed to load trip');
    } finally {
      setLoadingTripId(null);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!googleUser) return;
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await deleteSavedTrip(id, googleUser.accessToken);
      setMyTrips(prev => prev.filter(t => t.id !== id));
      // If the user just deleted the trip currently loaded into state, mark it
      // as unsaved so the next save creates a new doc instead of 404'ing.
      if (tripId === id) markSaved('', '');
    } catch (err) {
      setMyTripsError(err instanceof Error ? err.message : 'Failed to delete trip');
    }
  };

  const handleKMLFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  // ── Place handlers ───────────────────────────────────────────────

  const handleRemovePlace = (layerName: string, placeTitle: string) => {
    setSavedLayers((prev) =>
      prev
        .map((layer) =>
          layer.name === layerName
            ? { ...layer, places: layer.places.filter((p) => p.title !== placeTitle) }
            : layer
        )
        .filter((layer) => layer.places.length > 0)
    );
  };

  const handleRemovePlaceFromMap = (place: TripRecommendation) => {
    const layer = savedLayers.find((l) => l.places.some((p) => p.title === place.title));
    if (layer) handleRemovePlace(layer.name, place.title);
  };

  const handleUpdatePlaceFromMap = (updated: TripRecommendation) => {
    setSavedLayers((prev) =>
      prev.map((layer) => ({
        ...layer,
        places: layer.places.map((p) => (p.title === updated.title ? updated : p)),
      }))
    );
  };

  const handleReorderPlace = (fromLayer: string, fromIndex: number, toLayer: string, toIndex: number) => {
    setSavedLayers((prev) => {
      const layers = prev.map((l) => ({ ...l, places: [...l.places] }));
      const srcLayer = layers.find((l) => l.name === fromLayer);
      const dstLayer = layers.find((l) => l.name === toLayer);
      if (!srcLayer || !dstLayer) return prev;
      const [moved] = srcLayer.places.splice(fromIndex, 1);
      dstLayer.places.splice(toIndex, 0, moved);
      return layers.filter((l) => l.places.length > 0);
    });
  };

  const handleViewInMap = (place: TripRecommendation) => {
    // Scroll first so the user sees the map immediately; the pin updates a
    // moment later once Google Places confirms the exact coordinate.
    mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Fire-and-forget: surface unexpected verification failures so they don't
    // disappear silently into a swallowed promise.
    handleShowInMapFromChat(place).catch((err) => console.error('Show-in-map verify failed:', err));
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className={s.container}>
      <Header
        googleUser={googleUser}
        apiKey={apiKey}
        hasApiKey={hasApiKey}
        language={language}
        onLanguageChange={setLanguage}
        onImportClick={handleMyTripsClick}
        onLogout={logout}
        onReset={resetTrip}
        onApiKeyChange={setApiKey}
        onApiKeyClear={clearApiKey}
      />

      <main className={s.main}>
        <div className={s.scrollArea}>
          <div className={s.contentWrap}>
            {/* Error Banner */}
            {errorMessage && (() => {
              const banner = {
                api_key:     { icon: '🔑', title: 'API Key Required',   cta: 'Add API Key' },
                invalid_key: { icon: '❌', title: 'Invalid API Key',     cta: 'Update Key' },
                quota:       { icon: '⏱️', title: 'Daily Limit Reached', cta: null as string | null },
                generic:     { icon: '⚠️', title: 'Something went wrong', cta: null as string | null },
              }[errorKind];
              return (
                <div className={s.errorBanner}>
                  <div className={s.errorInner}>
                    <div className={s.errorIconWrap}>{banner.icon}</div>
                    <div className="flex-1">
                      <h3 className={s.errorTitle}>{banner.title}</h3>
                      <p className={s.errorText}>{errorMessage}</p>
                      {banner.cta && (
                        <button
                          onClick={() => {
                            setErrorMessage('');
                            document.querySelector('[title="Add your Gemini API Key"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                          }}
                          className={s.errorBtn}
                        >
                          {banner.cta}
                        </button>
                      )}
                    </div>
                    <button onClick={() => setErrorMessage('')} className={s.errorClose}>×</button>
                  </div>
                </div>
              );
            })()}

            {/* Chat & Map Layout */}
            <div ref={mapContainerRef} className={s.chatMapLayout}>
              <div className={s.chatColumn}>
                <ChatInterface
                  loading={chatLoading}
                  verifyingTitles={verifyingTitles}
                  messages={chatMessages}
                  savedLayers={savedLayers}
                  language={language}
                  onSendMessage={handleSendMessage}
                  onAddPlace={handleAddPlaceFromChat}
                  onAddAll={handleAddAllPlaces}
                  onShowInMap={handleViewInMap}
                />
              </div>
              <div className={s.mapColumn}>
                <MapView
                  city={currentCity}
                  places={[]}
                  savedLayers={savedLayers}
                  focusedPlace={focusedPlace}
                  userLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null}
                  onAddPlace={savePlace}
                  onRemovePlace={handleRemovePlaceFromMap}
                  onUpdatePlace={handleUpdatePlaceFromMap}
                  onReorderPlace={handleReorderPlace}
                />
              </div>
            </div>

            {/* Action buttons */}
            {savedLayers.length > 0 && (
              <div className={s.actionRow}>
                <button onClick={() => handleDownload(savedLayers, currentCity)} className={s.downloadBtn}>
                  <Download className="w-4 h-4" />
                  Download Map
                </button>
                {googleUser && (
                  <button onClick={handleSaveClick} disabled={saving} className={s.saveBtn}>
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : tripId ? 'Save' : 'Save Trip'}
                  </button>
                )}
                {googleUser && (
                  <button onClick={openUploadModal} className={s.uploadBtn}>
                    <Upload className="w-4 h-4" />
                    Upload to Google Maps
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <MyTripsModal
        show={showMyTripsModal}
        loading={loadingTrips}
        trips={myTrips}
        loadingTripId={loadingTripId}
        errorMessage={myTripsError}
        importingFile={importingMap}
        onClose={() => { if (loadingTripId === null) setShowMyTripsModal(false); }}
        onSelectTrip={handleSelectTrip}
        onDeleteTrip={handleDeleteTrip}
        onFileUpload={handleKMLFileUpload}
      />

      <UploadModal
        show={showUploadModal}
        cityName={currentCity}
        existingFiles={uploadDriveFiles}
        loadingFiles={loadingDriveFiles}
        uploading={uploading}
        uploadResult={uploadResult}
        onClose={closeUploadModal}
        onUpload={async (fileName, fileIdToUpdate) => {
          if (!googleUser) return;
          const target = fileIdToUpdate || tripDriveFileId || undefined;
          const result = await doUpload(savedLayers, currentCity, googleUser.accessToken, fileName, target);
          if (result && tripId && result.id !== tripDriveFileId) {
            // Remember the Drive file id so the next upload of this trip
            // updates the same file in place. Failure here doesn't block the
            // user — the upload itself already succeeded.
            try {
              await setSavedTripDriveLink(tripId, result.id, googleUser.accessToken);
              setTripDriveFileId(result.id);
            } catch (err) {
              console.warn('Failed to persist drive linkage:', err);
            }
          }
        }}
        onRefreshFiles={() => googleUser && refreshDriveFiles(googleUser.accessToken)}
      />

      <SaveTripModal
        show={showSaveModal}
        defaultTitle={tripTitle || currentCity || ''}
        saving={saving}
        errorMessage={saveError}
        mode="create"
        onClose={() => { if (!saving) { setShowSaveModal(false); setSaveError(null); } }}
        onConfirm={persistCreate}
      />
    </div>
  );
};

export default App;
