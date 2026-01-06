import React, { useRef } from 'react';
import { Header } from './components/Header';
import { SearchForm } from './components/SearchForm';
import { PlaceResults } from './components/PlaceResults';
import { SavedPlacesSidebar } from './components/SavedPlacesSidebar';
import { ImportModal } from './components/ImportModal';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useMapImport } from './hooks/useMapImport';
import { useUserLocation } from './hooks/useUserLocation';
import { TripService } from './services/tripService';
import { MyMapsFile } from './googleDriveService';
import { TripRecommendation } from './types';

const App: React.FC = () => {
  const userLocation = useUserLocation();
  const { googleUser, login, logout } = useGoogleAuth();
  const suggestionsEndRef = useRef<HTMLDivElement>(null);

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
    handleSearch,
    handleEnrichSelected,
    savePlace,
    resetTrip
  } = useTripPlanner(userLocation);

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
  const handleDownload = () => {
    TripService.downloadTrip(savedLayers, currentCity);
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
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <Header
        googleUser={googleUser}
        onImportClick={handleImportFromMyMaps}
        onLogout={logout}
        onReset={resetTrip}
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Discovery Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12">
          <div className="max-w-4xl mx-auto space-y-12">
            <SearchForm
              currentCity={currentCity}
              query={query}
              loading={loading}
              onCityChange={setCurrentCity}
              onQueryChange={setQuery}
              onSearch={handleSearch}
            />

            <div className="space-y-8 pb-20">
              <PlaceResults
                loading={loading}
                currentCity={currentCity}
                suggestions={pendingSuggestions}
                suggestionsEndRef={suggestionsEndRef}
                onSavePlace={savePlace}
                onDismissPlace={handleDismissPlace}
                onIconChange={handleIconChange}
              />
            </div>
          </div>
        </div>

        {/* Itinerary Sidebar */}
        <SavedPlacesSidebar
          savedLayers={savedLayers}
          googleUser={googleUser}
          enriching={enriching}
          onRemovePlace={handleRemovePlace}
          onDownload={handleDownload}
          onUploadToDrive={handleUploadToDrive}
          onEnrichSelected={handleEnrichSelected}
        />
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
