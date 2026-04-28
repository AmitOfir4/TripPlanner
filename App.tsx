import React, { useRef, useState } from 'react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { ImportModal } from './components/ImportModal';
import { UploadModal } from './components/UploadModal';
import { MapView } from './components/MapView';
import { Download, Upload } from 'lucide-react';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useApiKey } from './hooks/useApiKey';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useMapImport } from './hooks/useMapImport';
import { useUserLocation } from './hooks/useUserLocation';
import { useChat } from './hooks/useChat';
import { useUpload } from './hooks/useUpload';
import { MyMapsFile } from './googleDriveService';
import { TripRecommendation } from './types';
import { appStyles as s } from './styles/app';

const App: React.FC = () => {
  const userLocation = useUserLocation();
  const { googleUser, login, logout } = useGoogleAuth();
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [focusedPlace, setFocusedPlace] = useState<TripRecommendation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const {
    currentCity, setCurrentCity, savedLayers, setSavedLayers,
    savePlace, resetTrip,
  } = useTripPlanner(userLocation, apiKey);

  const {
    chatMessages, chatLoading, verifyingTitles, handleSendMessage,
    handleAddPlaceFromChat, handleAddAllPlaces, handleShowInMapFromChat,
  } = useChat(currentCity, setCurrentCity, apiKey, savePlace, setFocusedPlace, setErrorMessage);

  const {
    showUploadModal, uploadDriveFiles, loadingDriveFiles, uploading, uploadResult,
    openUploadModal, closeUploadModal, refreshDriveFiles, doUpload, handleDownload,
  } = useUpload();

  const {
    showImportModal, myMaps, loadingMaps, importingMap,
    openImportModal, closeImportModal, importMap, importFromFile,
  } = useMapImport();

  // ── Import handlers ──────────────────────────────────────────────

  const handleImportFromMyMaps = async () => {
    if (!googleUser) { login(); return; }
    try {
      await openImportModal(googleUser.accessToken);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load maps');
    }
  };

  const handleSelectMap = async (mapFile: MyMapsFile) => {
    if (!googleUser) return;
    try {
      const { layers, cityName } = await importMap(mapFile, googleUser.accessToken, currentCity);
      setSavedLayers((prev) => [...prev, ...layers]);
      if (!currentCity) setCurrentCity(cityName);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to import map');
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
    handleShowInMapFromChat(place);
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
        onImportClick={handleImportFromMyMaps}
        onLogout={logout}
        onReset={resetTrip}
        onApiKeyChange={setApiKey}
        onApiKeyClear={clearApiKey}
      />

      <main className={s.main}>
        <div className={s.scrollArea}>
          <div className={s.contentWrap}>
            {/* Error Banner */}
            {errorMessage && (
              <div className={s.errorBanner}>
                <div className={s.errorInner}>
                  <div className={s.errorIconWrap}>🔑</div>
                  <div className="flex-1">
                    <h3 className={s.errorTitle}>API Key Required</h3>
                    <p className={s.errorText}>{errorMessage}</p>
                    <button
                      onClick={() => {
                        setErrorMessage('');
                        document.querySelector('[title="Add your Gemini API Key"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                      }}
                      className={s.errorBtn}
                    >
                      Add API Key
                    </button>
                  </div>
                  <button onClick={() => setErrorMessage('')} className={s.errorClose}>×</button>
                </div>
              </div>
            )}

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

      <ImportModal
        show={showImportModal}
        loading={loadingMaps}
        importing={importingMap}
        maps={myMaps}
        onClose={closeImportModal}
        onSelectMap={handleSelectMap}
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
        onUpload={(fileName, fileIdToUpdate) =>
          googleUser && doUpload(savedLayers, currentCity, googleUser.accessToken, fileName, fileIdToUpdate)
        }
        onRefreshFiles={() => googleUser && refreshDriveFiles(googleUser.accessToken)}
      />
    </div>
  );
};

export default App;
