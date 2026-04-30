import { useState } from 'react';
import { parseKMLToTripData } from '../kmlParser';
import { TripLayer } from '../types';

interface UseMapImportReturn {
  importingMap: boolean;
  importFromFile: (file: File, currentCity: string) => Promise<ImportResult>;
}

interface ImportResult {
  layers: TripLayer[];
  cityName: string;
}

export const useMapImport = (): UseMapImportReturn => {
  const [importingMap, setImportingMap] = useState(false);

  const importFromFile = async (file: File, _currentCity: string): Promise<ImportResult> => {
    const MAX_KML_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_KML_BYTES) {
      throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please upload a KML file under 5 MB.`);
    }
    setImportingMap(true);
    try {
      const kmlText = await file.text();
      const head = kmlText.slice(0, 200).toLowerCase();
      if (!head.includes('<kml') && !head.includes('<?xml')) {
        throw new Error('Not a valid KML file (expected XML/KML format).');
      }
      const { layers, cityName } = parseKMLToTripData(kmlText);
      return { layers, cityName };
    } catch (error) {
      console.error('Error parsing KML file:', error);
      const msg = error instanceof Error ? error.message : 'Failed to parse KML file.';
      throw new Error(msg.startsWith('File too large') || msg.startsWith('Not a valid KML') ? msg
        : 'Failed to parse KML file. Please make sure it\'s a valid KML file from Google My Maps.');
    } finally {
      setImportingMap(false);
    }
  };

  return {
    importingMap,
    importFromFile,
  };
};
