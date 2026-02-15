import React, { useRef, useState } from 'react';
import { Header } from './components/Header';
import { ChatInterface, ChatMessage } from './components/ChatInterface';
import { SavedPlacesSidebar } from './components/SavedPlacesSidebar';
import { ImportModal } from './components/ImportModal';
import { MapView } from './components/MapView';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useApiKey } from './hooks/useApiKey';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useMapImport } from './hooks/useMapImport';
import { useUserLocation } from './hooks/useUserLocation';
import { TripService } from './services/tripService';
import { sendChatMessage } from './chatService';
import { MyMapsFile } from './googleDriveService';
import { TripRecommendation } from './types';

const App: React.FC = () => {
  const userLocation = useUserLocation();
  const { googleUser, login, logout } = useGoogleAuth();
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [focusedPlace, setFocusedPlace] = useState<TripRecommendation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle sending chat messages to AI travel agent
  const handleSendMessage = async (message: string) => {
    if (!apiKey) {
      setErrorMessage('Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setErrorMessage('');
    setChatLoading(true);

    try {
      const { response, dayGroups, places, city } = await sendChatMessage(
        currentCity || '',
        message,
        apiKey,
        chatMessages
      );

      // Update city if returned from AI
      if (city && !currentCity) {
        setCurrentCity(city);
      }

      // Add AI response with day-grouped places
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        dayGroups: dayGroups,
        places: places
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setChatLoading(false);
    } catch (error: any) {
      console.error('Chat error:', error);
      if (error.message?.includes('API key')) {
        setErrorMessage(error.message);
      }
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

    try {
      await TripService.uploadToGoogleDrive(savedLayers, currentCity, googleUser.accessToken);
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      alert('Failed to upload to Google Drive. Please try again.');
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

  const handleViewInMap = (place: TripRecommendation) => {
    setFocusedPlace(place);
    // Scroll to map view with smooth animation
    mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app-container min-h-screen bg-slate-50 flex flex-col antialiased">
      <Header
        googleUser={googleUser}
        apiKey={apiKey}
        hasApiKey={hasApiKey}
        onImportClick={handleImportFromMyMaps}
        onLogout={logout}
        onReset={resetTrip}
        onApiKeyChange={setApiKey}
        onApiKeyClear={clearApiKey}
      />

      <main className="app-main-content flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 lg:p-12">
          <div className="w-full space-y-12">
            {/* API Key Error Banner */}
            {errorMessage && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔑</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-900 mb-2">API Key Required</h3>
                    <p className="text-sm text-amber-800 mb-3">{errorMessage}</p>
                    <button
                      onClick={() => {
                        setErrorMessage('');
                        document.querySelector('[title="Add your Gemini API Key"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors"
                    >
                      Add API Key Now
                    </button>
                  </div>
                  <button
                    onClick={() => setErrorMessage('')}
                    className="text-amber-400 hover:text-amber-600 transition-colors"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>
            )}

            {/* Chat & Map Layout */}
            <div ref={mapContainerRef} className="flex flex-col lg:flex-row gap-6">
              {/* Chat Interface - Left Side */}
              <div className="lg:w-[50%] shrink-0 h-[940px]">
                <ChatInterface
                  loading={chatLoading}
                  messages={chatMessages}
                  savedLayers={savedLayers}
                  onSendMessage={handleSendMessage}
                  onAddPlace={handleAddPlaceFromChat}
                  onAddAll={handleAddAllPlaces}
                  onShowInMap={setFocusedPlace}
                />
              </div>

              {/* Map Section - Right Side */}
              <div className="flex-1">
                <MapView
                  city={currentCity || ' '}
                  places={[]}
                  savedLayers={savedLayers}
                  focusedPlace={focusedPlace}
                  userLocation={userLocation}
                  onAddPlace={savePlace}
                  onRemovePlace={handleRemovePlaceFromMap}
                />
              </div>
            </div>

            {/* Saved Places - Below Chat & Map */}
            {savedLayers.length > 0 && (
              <SavedPlacesSidebar
                savedLayers={savedLayers}
                googleUser={googleUser}
                enriching={enriching}
                onRemovePlace={handleRemovePlace}
                onDownload={handleDownload}
                onUploadToDrive={handleUploadToDrive}
                onEnrichSelected={handleEnrichSelected}
                onViewInMap={handleViewInMap}
              />
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
    </div>
  );
};

export default App;
