const GEOCODE_URL = import.meta.env.DEV
  ? 'http://localhost:3001/api/geocode'
  : '/api/geocode';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address: string;
  place_name?: string;
  /** Real Google Maps rating bundled with the Find Place response. `null`
   * when the place exists but has no reviews on Google. */
  rating?: number | null;
}

// In-memory session cache to avoid redundant network calls
const memoryCache = new Map<string, GeocodeResult>();

// In-flight request deduplication — concurrent calls for the same key share one fetch
const inFlight = new Map<string, Promise<any>>();

function forwardKey(address: string, city?: string, country?: string, hint?: { lat: number; lng: number }): string {
  const parts = [`fwd:${address.toLowerCase().trim()}`];
  if (city) parts.push(city.toLowerCase().trim());
  if (country) parts.push(country.toLowerCase().trim());
  if (hint) parts.push(`@${hint.lat.toFixed(4)},${hint.lng.toFixed(4)}`);
  return parts.join('|');
}

function reverseKey(lat: number, lng: number): string {
  return `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Forward-geocode a place. `city` (optional) is sent separately so the server
 * can canonicalise it to English in the cache key — Hebrew "דובאי" and
 * English "Dubai" then hit the same row. `country` (optional, ISO-3166
 * alpha-2 like "IT") is forwarded as Google's `components=country:` filter so
 * places like "Naples, IT" never resolve to Naples, Florida. `hint` (optional,
 * Gemini's per-place coords) keys the server cache by location so it stays
 * language-agnostic — the Hebrew and English names of one place share a row.
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  cityCenter?: { lat: number; lng: number },
  country?: string,
  hint?: { lat: number; lng: number }
): Promise<GeocodeResult | null> {
  const key = forwardKey(address, city, country, hint);
  const hit = memoryCache.get(key);
  if (hit) return hit;

  // Deduplicate concurrent requests for the same key
  if (inFlight.has(key)) return inFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await fetch(GEOCODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, city, country, cityCenter, hintLat: hint?.lat, hintLng: hint?.lng })
      });

      if (!res.ok) return null;
      const data = await res.json();
      memoryCache.set(key, data);
      return data;
    } catch (err) {
      console.error('[geocodeService] forward geocode failed:', err);
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

interface ReverseGeocodeResult {
  place_name: string;
  formatted_address: string;
  lat: number;
  lng: number;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const key = reverseKey(lat, lng);
  const hit = memoryCache.get(key);
  // Reverse-geocode entries always come back with place_name populated
  // (the server-side `geocodeReverse` guarantees it), so this cast is safe.
  if (hit) return hit as ReverseGeocodeResult;

  if (inFlight.has(key)) return inFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await fetch(GEOCODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      });

      if (!res.ok) return null;
      const data = await res.json();
      memoryCache.set(key, data);
      return data;
    } catch (err) {
      console.error('[geocodeService] reverse geocode failed:', err);
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}
