import React, { useRef, useState } from 'react';
import { Header } from './components/Header';
import { ChatInterface, ChatMessage } from './components/ChatInterface';
import { ImportModal } from './components/ImportModal';
import { UploadModal } from './components/UploadModal';
import { MapView } from './components/MapView';
import { Download, Upload } from 'lucide-react';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useApiKey } from './hooks/useApiKey';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useMapImport } from './hooks/useMapImport';
import { useUserLocation } from './hooks/useUserLocation';
import { TripService } from './services/tripService';
import { sendChatMessage } from './chatService';
import { MyMapsFile, fetchKmlFiles } from './googleDriveService';
import { TripRecommendation } from './types';

const App: React.FC = () => {
  const userLocation = useUserLocation();
  const { googleUser, login, logout } = useGoogleAuth();
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [focusedPlace, setFocusedPlace] = useState<TripRecommendation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDriveFiles, setUploadDriveFiles] = useState<MyMapsFile[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; fileName: string } | null>(null);

  const {
    currentCity,
    setCurrentCity,
    query,
    setQuery,
    loading,
    enriching,
    pendingSuggestions,
    setPendingSuggestions,
    savedLayers,
    setSavedLayers,
    requestCount,
    handleSearch: handleSearchBase,
    handleEnrichSelected,
    savePlace,
    resetTrip
  } = useTripPlanner(userLocation, apiKey);

  // Handle sending chat messages to AI travel agent (streaming)
  const handleSendMessage = async (message: string) => {
    if (!apiKey) {
      setErrorMessage('Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey');
      return;
    }

    // Add user message + empty assistant placeholder for streaming
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    const aiMessageId = (Date.now() + 1).toString();
    const aiPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage, aiPlaceholder]);
    setErrorMessage('');
    setChatLoading(true);

    try {
      const { response, dayGroups, places, city } = await sendChatMessage(
        currentCity || '',
        message,
        apiKey,
        chatMessages,
        // Stream chunks into the placeholder message
        (chunk) => {
          setChatMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        }
      );

      // Update city if returned from AI
      if (city && !currentCity) {
        setCurrentCity(city);
      }

      // Final update: replace streaming text with clean response + structured data
      setChatMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, content: response, dayGroups, places }
            : msg
        )
      );
      setChatLoading(false);
    } catch (error: any) {
      console.error('Chat error:', error);
      if (error.message?.includes('API key')) {
        setErrorMessage(error.message);
      }
      // Remove the placeholder on error
      setChatMessages(prev => prev.filter(msg => msg.id !== aiMessageId));
      setChatLoading(false);
    }
  };

  // Handle adding a place from chat recommendation
  const handleAddPlaceFromChat = (place: TripRecommendation) => {
    savePlace(place);
    setFocusedPlace(place); // Focus the map on the newly added place
  };

  // Handle adding all places from chat recommendation
  const handleAddAllPlaces = (places: TripRecommendation[]) => {
    places.forEach(place => savePlace(place));
    // Focus on the first place
    if (places.length > 0) {
      setFocusedPlace(places[0]);
    }
  };

  const {
    showImportModal,
    myMaps,
    loadingMaps,
    importingMap,
    openImportModal,
    closeImportModal,
    importMap,
    importFromFile
  } = useMapImport();

  // Import handlers
  const handleImportFromMyMaps = async () => {
    if (!googleUser) {
      login();
      return;
    }

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
      setSavedLayers(prev => [...prev, ...layers]);
      
      if (!currentCity) {
        setCurrentCity(cityName);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to import map');
    }
  };

  const handleKMLFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = ''; // Reset input

    try {
      const { layers, cityName } = await importFromFile(file, currentCity);
      setSavedLayers(prev => [...prev, ...layers]);
      
      if (!currentCity) {
        setCurrentCity(cityName);
      }

      const totalPlaces = layers.reduce((acc, l) => acc + l.places.length, 0);
      alert(`Successfully imported "${file.name}" with ${totalPlaces} places!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to import file');
    }
  };

  // Trip actions
  const handleDownload = async () => {
    try {
      await TripService.downloadTrip(savedLayers, currentCity);
    } catch (error) {
      console.error('Error downloading trip:', error);
      alert('Failed to download KML file. Please try again.');
    }
  };

  const handleUploadToDrive = async () => {
    if (!googleUser) return;
    setShowUploadModal(true);
    setUploadResult(null);
  };

  const handleRefreshDriveFiles = async () => {
    if (!googleUser) return;
    setLoadingDriveFiles(true);
    try {
      const files = await fetchKmlFiles(googleUser.accessToken);
      setUploadDriveFiles(files);
    } catch (error) {
      console.error('Error fetching Drive files:', error);
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  const handleDoUpload = async (fileName: string, fileIdToUpdate?: string) => {
    if (!googleUser) return;
    setUploading(true);
    try {
      const result = await TripService.uploadToGoogleDrive(
        savedLayers,
        currentCity,
        googleUser.accessToken,
        fileName,
        fileIdToUpdate
      );
      setUploadResult({ success: true, fileName: result.fileName });
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      alert('Failed to upload to Google Drive. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadMore = () => {
    // Removed - no longer using load more in quick search
  };

  const handleDismissPlace = (place: { title: string }) => {
    setPendingSuggestions(prev => prev.filter(p => p.title !== place.title));
  };

  const handleIconChange = (place: TripRecommendation, iconId: string) => {
    setPendingSuggestions(prev =>
      prev.map(p => p.title === place.title ? { ...p, customKmlIcon: iconId } : p)
    );
  };

  const handleRemovePlace = (layerName: string, placeTitle: string) => {
    setSavedLayers(prev =>
      prev
        .map(layer => {
          if (layer.name === layerName) {
            return {
              ...layer,
              places: layer.places.filter(p => p.title !== placeTitle)
            };
          }
          return layer;
        })
        .filter(layer => layer.places.length > 0)
    );
  };

  const handleRemovePlaceFromMap = (place: TripRecommendation) => {
    const layer = savedLayers.find(l => l.places.some(p => p.title === place.title));
    if (layer) {
      handleRemovePlace(layer.name, place.title);
    }
  };

  const handleUpdatePlaceFromMap = (updated: TripRecommendation) => {
    setSavedLayers(prev =>
      prev.map(layer => ({
        ...layer,
        places: layer.places.map(p => p.title === updated.title ? updated : p)
      }))
    );
  };

  const handleViewInMap = (place: TripRecommendation) => {
    setFocusedPlace(place);
    // Scroll to map view with smooth animation
    mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app-container min-h-screen flex flex-col antialiased">
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

      <main className="app-main-content flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-10 lg:py-8">
          <div className="w-full space-y-8 max-w-[1600px] mx-auto">
            {/* API Key Error Banner */}
            {errorMessage && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-lg">
                    🔑
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-900 mb-1">API Key Required</h3>
                    <p className="text-xs text-amber-800">{errorMessage}</p>
                    <button
                      onClick={() => {
                        setErrorMessage('');
                        document.querySelector('[title="Add your Gemini API Key"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                      }}
                      className="mt-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
                    >
                      Add API Key
                    </button>
                  </div>
                  <button onClick={() => setErrorMessage('')} className="text-amber-400 hover:text-amber-600 text-xl leading-none">×</button>
                </div>
              </div>
            )}

            {/* Chat & Map Layout */}
            <div ref={mapContainerRef} className="flex flex-col lg:flex-row gap-5">
              {/* Chat Interface - Left Side */}
              <div className="lg:w-[45%] shrink-0 h-[880px]">
                <ChatInterface
                  loading={chatLoading}
                  messages={chatMessages}
                  savedLayers={savedLayers}
                  language={language}
                  onSendMessage={handleSendMessage}
                  onAddPlace={handleAddPlaceFromChat}
                  onAddAll={handleAddAllPlaces}
                  onShowInMap={handleViewInMap}
                />
              </div>

              {/* Map Section - Right Side */}
              <div className="flex-1">
                <MapView
                  city={currentCity}
                  places={[]}
                  savedLayers={savedLayers}
                  focusedPlace={focusedPlace}
                  userLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null}
                  onAddPlace={savePlace}
                  onRemovePlace={handleRemovePlaceFromMap}
                  onUpdatePlace={handleUpdatePlaceFromMap}
                />
              </div>
            </div>

            {/* Action buttons - Download & Upload */}
            {savedLayers.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-teal-200/60 active:scale-[0.98] text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Map
                </button>
                {googleUser && (
                  <button
                    onClick={handleUploadToDrive}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-200/60 active:scale-[0.98] text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Upload to Google Maps
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Import Modal */}
      <ImportModal
        show={showImportModal}
        loading={loadingMaps}
        importing={importingMap}
        maps={myMaps}
        onClose={closeImportModal}
        onSelectMap={handleSelectMap}
        onFileUpload={handleKMLFileUpload}
      />

      {/* Upload Modal */}
      <UploadModal
        show={showUploadModal}
        cityName={currentCity}
        existingFiles={uploadDriveFiles}
        loadingFiles={loadingDriveFiles}
        uploading={uploading}
        uploadResult={uploadResult}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleDoUpload}
        onRefreshFiles={handleRefreshDriveFiles}
      />
    </div>
  );
};

export default App;
