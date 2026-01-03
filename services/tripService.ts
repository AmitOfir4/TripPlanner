import { TripData, TripLayer } from '../types';
import { generateKml, downloadFile } from '../utils';
import { uploadKMLToDrive } from '../googleDriveService';

export class TripService {
  static createTripData(savedLayers: TripLayer[]): TripData {
    return {
      city: savedLayers.map(l => l.name).join(', '),
      summary: "Your AI-powered travel itinerary.",
      layers: savedLayers,
      sources: []
    };
  }

  static downloadTrip(savedLayers: TripLayer[], cityName: string): void {
    if (savedLayers.length === 0) return;
    
    const tripData = this.createTripData(savedLayers);
    const kml = generateKml(tripData);
    const fileName = `Trip_${cityName || 'Planner'}.kml`;
    
    downloadFile(kml, fileName, "application/vnd.google-earth.kml+xml");
  }

  static async uploadToGoogleDrive(
    savedLayers: TripLayer[], 
    cityName: string, 
    accessToken: string
  ): Promise<void> {
    if (savedLayers.length === 0) {
      throw new Error('No places to upload');
    }

    const tripData = this.createTripData(savedLayers);
    const kml = generateKml(tripData);
    const fileName = `Trip_${cityName || 'Planner'}_${new Date().toISOString().split('T')[0]}.kml`;
    
    await uploadKMLToDrive(kml, fileName, accessToken);
    
    // Open Google My Maps
    window.open('https://mymaps.google.com/', '_blank');
    
    // Show instructions
    setTimeout(() => {
      alert(
        `✅ KML uploaded successfully!\n\n` +
        `Google My Maps is now opening...\n\n` +
        `To import your map:\n` +
        `1. Click "Create a New Map" (or open an existing map)\n` +
        `2. Click "Import" in the left menu\n` +
        `3. Select "Google Drive"\n` +
        `4. Find and select: "${fileName}"\n` +
        `5. Click "Select" to import\n\n` +
        `Your map layers will be imported!`
      );
    }, 500);
  }
}
