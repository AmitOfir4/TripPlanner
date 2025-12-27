import { XMLParser } from 'fast-xml-parser';
import { TripRecommendation, TripLayer } from './types';

/**
 * Parses KML data from Google My Maps and converts it to our app's format
 * KML structure typically includes:
 * - Folders (which become our layers)
 * - Placemarks (which become our recommendations)
 */
export function parseKMLToTripData(kmlText: string): { layers: TripLayer[], cityName: string } {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(kmlText);
  const kml = parsed.kml || parsed.KML;
  
  if (!kml || !kml.Document) {
    throw new Error('Invalid KML format');
  }

  const doc = kml.Document;
  const cityName = doc.name || 'Imported Map';
  const layers: TripLayer[] = [];

  // KML can have Folders (layers) or direct Placemarks
  const folders = Array.isArray(doc.Folder) ? doc.Folder : (doc.Folder ? [doc.Folder] : []);
  const rootPlacemarks = Array.isArray(doc.Placemark) ? doc.Placemark : (doc.Placemark ? [doc.Placemark] : []);

  // Process folders as layers
  folders.forEach(folder => {
    const layerName = folder.name || 'Unnamed Layer';
    const placemarks = Array.isArray(folder.Placemark) ? folder.Placemark : (folder.Placemark ? [folder.Placemark] : []);
    
    const places = placemarks.map(placemark => parseKMLPlacemark(placemark)).filter(Boolean) as TripRecommendation[];
    
    if (places.length > 0) {
      layers.push({
        name: layerName,
        places,
      });
    }
  });

  // If there are root-level placemarks, create a default layer
  if (rootPlacemarks.length > 0) {
    const places = rootPlacemarks.map(placemark => parseKMLPlacemark(placemark)).filter(Boolean) as TripRecommendation[];
    if (places.length > 0) {
      layers.push({
        name: cityName,
        places,
      });
    }
  }

  return { layers, cityName };
}

/**
 * Converts a KML Placemark to our TripRecommendation format
 */
function parseKMLPlacemark(placemark: any): TripRecommendation | null {
  try {
    const name = placemark.name || 'Unnamed Place';
    const description = placemark.description || '';
    
    // Extract coordinates from Point geometry
    let lat: number | undefined;
    let lng: number | undefined;
    
    if (placemark.Point && placemark.Point.coordinates) {
      const coords = placemark.Point.coordinates.toString().trim().split(',');
      if (coords.length >= 2) {
        lng = parseFloat(coords[0]);
        lat = parseFloat(coords[1]);
      }
    }

    // Try to extract category from description or style
    let category = 'Place';
    const descLower = description.toLowerCase();
    if (descLower.includes('restaurant') || descLower.includes('food')) category = 'Restaurant';
    else if (descLower.includes('museum') || descLower.includes('art')) category = 'Museum';
    else if (descLower.includes('park') || descLower.includes('garden')) category = 'Park';
    else if (descLower.includes('landmark') || descLower.includes('monument')) category = 'Landmark';
    else if (descLower.includes('hotel') || descLower.includes('accommodation')) category = 'Hotel';
    else if (descLower.includes('shop') || descLower.includes('market')) category = 'Shopping';

    // Generate Google Maps URL if we have coordinates
    const mapUrl = (lat && lng) 
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : undefined;

    return {
      title: name,
      description: stripHTML(description),
      category,
      lat,
      lng,
      mapUrl,
    };
  } catch (error) {
    console.error('Error parsing placemark:', error);
    return null;
  }
}

/**
 * Removes HTML tags from KML description (My Maps often includes HTML)
 */
function stripHTML(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
