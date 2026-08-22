import React, { useRef, useState } from 'react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { ErrorBanner } from './components/ErrorBanner';
import { SaveStatusBanner } from './components/SaveStatusBanner';
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
import { useErrorBanner } from './hooks/useErrorBanner';
import { useSaveTrip } from './hooks/useSaveTrip';
import { useMyTrips } from './hooks/useMyTrips';
import { usePlaceActions } from './hooks/usePlaceActions';
import { useDraftAutosave } from './hooks/useDraftAutosave';
import { TripRecommendation } from './types';
import { setSavedTripDriveLink } from './services/tripsService';
import { appStyles as s } from './styles/app';

const App: React.FC = () => {
  // ── Core hooks ───────────────────────────────────────────────────
  const userLocation = useUserLocation();
  const { googleUser, login, logout, sessionExpired, notifyAuthFailure, dismissSessionExpired } = useGoogleAuth();
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  const [focusedPlace, setFocusedPlace] = useState<TripRecommendation | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { errorMessage, errorKind, setErrorMessage, clearError } = useErrorBanner();

  const {
    currentCity, setCurrentCity, savedLayers, setSavedLayers,
    savePlace, addLayer, renameLayer, deleteLayer, resetTrip,
    tripId, tripTitle, markSaved, loadSavedTrip,
    tripDriveFileId, setTripDriveFileId,
  } = useTripPlanner(userLocation, apiKey);

  const {
    chatMessages, chatLoading, verifyingTitles, handleSendMessage,
    handleAddPlaceFromChat, handleAddAllPlaces, handleShowInMapFromChat,
  } = useChat(currentCity, setCurrentCity, apiKey, savePlace, setFocusedPlace, setErrorMessage);

  const {
    showUploadModal, uploadDriveFiles, loadingDriveFiles, uploading, uploadResult,
    openUploadModal, closeUploadModal, refreshDriveFiles, doUpload, handleDownload,
  } = useUpload({ onAuthFailure: notifyAuthFailure });

  const { importingMap, importFromFile } = useMapImport();

  // ── Feature hooks (state + handlers extracted from this component) ─
  const {
    showSaveModal, saving, saveError, justSaved, autoSaveError, pendingServerSave,
    retryAutoSave, dismissAutoSaveError, handleSaveClick, persistCreate, closeSaveModal,
  } = useSaveTrip({
    googleUser, savedLayers, currentCity, tripId, tripTitle, tripDriveFileId,
    markSaved, onAuthFailure: notifyAuthFailure,
  });

  const {
    showMyTripsModal, loadingTrips, myTrips, loadingMoreTrips, loadingTripId, myTripsError,
    hasMore, openMyTrips, loadMoreTrips, selectTrip, deleteTrip, importKmlFile, closeMyTrips,
  } = useMyTrips({
    googleUser, login, loadSavedTrip, tripId, markSaved,
    importFromFile, currentCity, setCurrentCity, setSavedLayers,
    onAuthFailure: notifyAuthFailure,
  });

  const { removePlaceFromMap, updatePlaceFromMap, reorderPlace } =
    usePlaceActions({ savedLayers, setSavedLayers });

  // Mirror the working trip into localStorage. Independent of auth and of
  // whether the trip has ever been saved, so a refresh never costs work.
  useDraftAutosave({
    currentCity, savedLayers, tripId, tripTitle, tripDriveFileId, chatMessages, pendingServerSave,
  });

  const handleViewInMap = (place: TripRecommendation) => {
    // Scroll first so the user sees the map immediately; the pin updates a
    // moment later once Google Places confirms the exact coordinate.
    mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Fire-and-forget: surface unexpected verification failures so they don't
    // disappear silently into a swallowed promise.
    handleShowInMapFromChat(place).catch((err) => console.error('Show-in-map verify failed:', err));
  };

  // Open the API-key editor in the Header from the error banner's CTA.
  const openApiKeyEditor = () => {
    clearError();
    document.querySelector('[title="Add your Gemini API Key"]')?.dispatchEvent(new Event('click', { bubbles: true }));
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
        onImportClick={openMyTrips}
        onLogout={logout}
        onReset={resetTrip}
        onApiKeyChange={setApiKey}
        onApiKeyClear={clearApiKey}
      />

      <main className={s.main}>
        <div className={s.scrollArea}>
          <div className={s.contentWrap}>
            {errorMessage && (
              <ErrorBanner
                message={errorMessage}
                kind={errorKind}
                onDismiss={clearError}
                onAddKey={openApiKeyEditor}
              />
            )}

            <SaveStatusBanner
              sessionExpired={sessionExpired}
              autoSaveError={autoSaveError}
              onSignIn={login}
              onRetry={retryAutoSave}
              onDismiss={sessionExpired ? dismissSessionExpired : dismissAutoSaveError}
            />

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
                  language={language}
                  onAddPlace={savePlace}
                  onRemovePlace={removePlaceFromMap}
                  onUpdatePlace={updatePlaceFromMap}
                  onReorderPlace={reorderPlace}
                  onAddLayer={addLayer}
                  onRenameLayer={renameLayer}
                  onDeleteLayer={deleteLayer}
                />
              </div>
            </div>

            {savedLayers.length > 0 && (
              <div className={s.actionRow}>
                <button onClick={() => handleDownload(savedLayers, currentCity)} className={s.downloadBtn}>
                  <Download className="w-4 h-4" />
                  Download Map
                </button>
                {googleUser && (
                  <button onClick={handleSaveClick} disabled={saving} className={s.saveBtn}>
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : justSaved ? 'Saved' : tripId ? 'Save' : 'Save Trip'}
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
        hasMore={hasMore}
        loadingMore={loadingMoreTrips}
        onClose={closeMyTrips}
        onSelectTrip={selectTrip}
        onDeleteTrip={deleteTrip}
        onFileUpload={importKmlFile}
        onLoadMore={loadMoreTrips}
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
        onClose={closeSaveModal}
        onConfirm={persistCreate}
      />
    </div>
  );
};

export default App;
