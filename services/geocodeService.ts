const GEOCODE_URL = import.meta.env.DEV
  ? 'http://localhost:3001/api/geocode'
  : '/api/geocode';

// In-memory session cache to avoid redundant network calls
const memoryCache = new Map<string, { lat: number; lng: number; formatted_address: string; place_name: string }>();

// In-flight request deduplication — concurrent calls for the same key share one fetch
const inFlight = new Map<string, Promise<any>>();

function forwardKey(address: string, city?: string): string {
  return city
    ? `fwd:${address.toLowerCase().trim()}|${city.toLowerCase().trim()}`
    : `fwd:${address.toLowerCase().trim()}`;
}

function reverseKey(lat: number, lng: number): string {
  return `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Forward-geocode a place. `city` (optional) is sent separately so the server
 * can canonicalise it to English in the cache key — Hebrew "דובאי" and
 * English "Dubai" then hit the same row.
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  cityCenter?: { lat: number; lng: number }
): Promise<{ lat: number; lng: number; formatted_address: string } | null> {
  const key = forwardKey(address, city);
  const hit = memoryCache.get(key);
  if (hit) return hit;

  // Deduplicate concurrent requests for the same key
  if (inFlight.has(key)) return inFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await fetch(GEOCODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, city, cityCenter })
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

export async function reverseGeocode(lat: number, lng: number): Promise<{ place_name: string; formatted_address: string; lat: number; lng: number } | null> {
  const key = reverseKey(lat, lng);
  const hit = memoryCache.get(key);
  if (hit) return hit;

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
