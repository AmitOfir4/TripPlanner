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
    // First, resolve city centers so we can bias individual place geocoding
    const cityCenters: Record<string, { lat: number; lng: number }> = {};
    const uniqueCities = new Set<string>();
    for (const layer of layers) {
      for (const place of layer.places) {
        if (!place.lat || !place.lng) {
          const city = place.city || layer.name || cityName;
          if (city) uniqueCities.add(city);
        }
      }
    }
    // Geocode each unique city to get its center (used as bias)
    await Promise.all(
      [...uniqueCities].map(async (city) => {
        const result = await geocodeAddress(city);
        if (result) {
          cityCenters[city] = { lat: result.lat, lng: result.lng };
        }
      })
    );

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
            const cityCenter = cityCenters[geocodeCity];
            try {
              const searchQuery = `${place.title}, ${geocodeCity}`;
              const result = await geocodeAddress(searchQuery, cityCenter);
              
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
    accessToken: string,
    fileName?: string,
    fileIdToUpdate?: string
  ): Promise<{ id: string; fileName: string }> {
    if (savedLayers.length === 0) {
      throw new Error('No places to upload');
    }

    // Geocode any places without coordinates
    const enrichedLayers = await this.geocodePlacesIfNeeded(savedLayers, cityName);
    
    const tripData = this.createTripData(enrichedLayers);
    const kml = generateKml(tripData);
    const finalName = fileName || `Trip_${cityName || 'Planner'}_${new Date().toISOString().split('T')[0]}.kml`;
    // Ensure it ends with .kml
    const kmlFileName = finalName.endsWith('.kml') ? finalName : `${finalName}.kml`;
    
    const result = await uploadKMLToDrive(kml, kmlFileName, accessToken, fileIdToUpdate);
    
    return { id: result.id, fileName: kmlFileName };
  }
}
