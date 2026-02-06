import React, { useRef, useState } from 'react';
import { Header } from './components/Header';
import { SearchForm } from './components/SearchForm';
import { PlaceResults } from './components/PlaceResults';
import { SavedPlacesSidebar } from './components/SavedPlacesSidebar';
import { ImportModal } from './components/ImportModal';
import { MapView } from './components/MapView';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useApiKey } from './hooks/useApiKey';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useMapImport } from './hooks/useMapImport';
import { useUserLocation } from './hooks/useUserLocation';
import { TripService } from './services/tripService';
import { MyMapsFile } from './googleDriveService';
import { TripRecommendation } from './types';

const App: React.FC = () => {
  const userLocation = useUserLocation();
  const { googleUser, login, logout } = useGoogleAuth();
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const suggestionsEndRef = useRef<HTMLDivElement>(null);
  const [focusedPlace, setFocusedPlace] = useState<TripRecommendation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  // Wrap handleSearch to catch API key errors
  const handleSearch = async (e: React.FormEvent | null) => {
    setErrorMessage(''); // Clear previous errors
    try {
      await handleSearchBase(e);
    } catch (error: any) {
      if (error.message?.includes('API key')) {
        setErrorMessage(error.message);
      } else {
        console.error('Search error:', error);
      }
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
                        // Trigger the API key modal by simulating a click
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

            <SearchForm
              currentCity={currentCity}
              query={query}
              loading={loading}
              hasExistingPlaces={pendingSuggestions.length > 0}
              onCityChange={setCurrentCity}
              onQueryChange={setQuery}
              onSearch={handleSearch}
            />

            {/* Map View with Recommended Places on the Right */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Map Section */}
              {currentCity && (pendingSuggestions.length > 0 || savedLayers.length > 0) && (
                <div className="flex-1 lg:max-w-[60%]">
                  <MapView
                    city={currentCity}
                    places={pendingSuggestions}
                    savedLayers={savedLayers}
                    focusedPlace={focusedPlace}
                    onAddPlace={savePlace}
                  />
                </div>
              )}

              {/* Recommended Places - Right Side of Map */}
              {pendingSuggestions.length > 0 && (
                <div className="lg:w-[40%] shrink-0">
                  <PlaceResults
                    loading={loading}
                    currentCity={currentCity}
                    suggestions={pendingSuggestions}
                    suggestionsEndRef={suggestionsEndRef}
                    onSavePlace={savePlace}
                    onDismissPlace={handleDismissPlace}
                    onIconChange={handleIconChange}
                    onViewOnMap={setFocusedPlace}
                  />
                </div>
              )}
            </div>

            {/* Saved Places - Below Map */}
            {savedLayers.length > 0 && (
              <SavedPlacesSidebar
                savedLayers={savedLayers}
                googleUser={googleUser}
                enriching={enriching}
                onRemovePlace={handleRemovePlace}
                onDownload={handleDownload}
                onUploadToDrive={handleUploadToDrive}
                onEnrichSelected={handleEnrichSelected}
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
