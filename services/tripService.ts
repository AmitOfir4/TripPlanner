/// <reference types="@types/google.maps" />
import { TripData, TripLayer } from '../types';
import { generateKml, downloadFile } from '../utils';
import { uploadKMLToDrive } from '../googleDriveService';
import { geocodeAddress } from './geocodeService';

export class TripService {
  static createTripData(savedLayers: TripLayer[]): TripData {
    return {
      city: savedLayers.map(l => l.name).join(', '),
      summary: "Your AI-powered travel itinerary.",
      layers: savedLayers,
      sources: []
    };
  }

  static async downloadTrip(savedLayers: TripLayer[], cityName: string): Promise<void> {
    if (savedLayers.length === 0) return;
    
    // Geocode any places without coordinates
    const enrichedLayers = await this.geocodePlacesIfNeeded(savedLayers, cityName);
    
    const tripData = this.createTripData(enrichedLayers);
    const kml = generateKml(tripData);
    const fileName = `Trip_${cityName || 'Planner'}.kml`;
    
    downloadFile(kml, fileName, "application/vnd.google-earth.kml+xml");
  }

  static async geocodePlacesIfNeeded(layers: TripLayer[], cityName: string): Promise<TripLayer[]> {
    const enrichedLayers = await Promise.all(
      layers.map(async (layer) => {
        const enrichedPlaces = await Promise.all(
          layer.places.map(async (place) => {
            // If place already has coordinates, return as is
            if (place.lat && place.lng) {
              return place;
            }
            
            // Geocode the place — prefer the place's own city,
            // then the layer name (which equals the city for AI searches),
            // then fall back to the overall session city.
            const geocodeCity = place.city || layer.name || cityName;
            try {
              const searchQuery = `${place.title}, ${geocodeCity}`;
              const result = await geocodeAddress(searchQuery);
              
              if (result) {
                return {
                  ...place,
                  lat: result.lat,
                  lng: result.lng
                };
              }
            } catch (error) {
              console.warn(`Failed to geocode ${place.title}:`, error);
            }
            
            return place;
          })
        );
        
        return { ...layer, places: enrichedPlaces };
      })
    );
    
    return enrichedLayers;
  }

  static async uploadToGoogleDrive(
    savedLayers: TripLayer[], 
    cityName: string, 
    accessToken: string
  ): Promise<void> {
    if (savedLayers.length === 0) {
      throw new Error('No places to upload');
    }

    // Geocode any places without coordinates
    const enrichedLayers = await this.geocodePlacesIfNeeded(savedLayers, cityName);
    
    const tripData = this.createTripData(enrichedLayers);
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
