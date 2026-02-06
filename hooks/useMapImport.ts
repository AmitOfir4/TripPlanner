import { useState } from 'react';
import { MyMapsFile, fetchMyMaps, downloadMyMapAsKML } from '../googleDriveService';
import { parseKMLToTripData } from '../kmlParser';
import { TripLayer } from '../types';

interface UseMapImportReturn {
  showImportModal: boolean;
  myMaps: MyMapsFile[];
  loadingMaps: boolean;
  importingMap: boolean;
  openImportModal: (accessToken: string) => Promise<void>;
  closeImportModal: () => void;
  importMap: (mapFile: MyMapsFile, accessToken: string, currentCity: string) => Promise<ImportResult>;
  importFromFile: (file: File, currentCity: string) => Promise<ImportResult>;
}

interface ImportResult {
  layers: TripLayer[];
  cityName: string;
}

export const useMapImport = (): UseMapImportReturn => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [myMaps, setMyMaps] = useState<MyMapsFile[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [importingMap, setImportingMap] = useState(false);

  const openImportModal = async (accessToken: string) => {
    setShowImportModal(true);
    setLoadingMaps(true);
    
    try {
      const maps = await fetchMyMaps(accessToken);
      setMyMaps(maps);
    } catch (error) {
      console.error('Error fetching My Maps:', error);
      throw new Error('Failed to load your My Maps. Please try again.');
    } finally {
      setLoadingMaps(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
  };

  const importMap = async (
    mapFile: MyMapsFile, 
    accessToken: string,
    currentCity: string
  ): Promise<ImportResult> => {
    setImportingMap(true);
    
    try {
      const kmlText = await downloadMyMapAsKML(mapFile.id, accessToken);
      const { layers, cityName } = parseKMLToTripData(kmlText);
      
      setShowImportModal(false);
      return { layers, cityName };
    } catch (error) {
      console.error('Error importing map:', error);
      throw new Error('Failed to import map. Please make sure it is publicly shared or use the "Upload KML File" button.');
    } finally {
      setImportingMap(false);
    }
  };

  const importFromFile = async (file: File, currentCity: string): Promise<ImportResult> => {
    try {
      const kmlText = await file.text();
      const { layers, cityName } = parseKMLToTripData(kmlText);
      
      setShowImportModal(false);
      return { layers, cityName };
    } catch (error) {
      console.error('Error parsing KML file:', error);
      throw new Error('Failed to parse KML file. Please make sure it\'s a valid KML file from Google My Maps.');
    }
  };

  return {
    showImportModal,
    myMaps,
    loadingMaps,
    importingMap,
    openImportModal,
    closeImportModal,
    importMap,
    importFromFile
  };
};
