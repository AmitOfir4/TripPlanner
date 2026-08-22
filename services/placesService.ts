const PLACES_URL = import.meta.env.DEV
  ? 'http://localhost:3001/api/places'
  : '/api/places';

export interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export interface PlaceDetails {
  lat: number;
  lng: number;
  name: string;
  formatted_address: string;
  /** Google rating, `null` when the place has no reviews. */
  rating: number | null;
  types: string[];
}

/**
 * Autocomplete session token. Google bills an autocomplete "session"
 * (keystrokes + the details call that closes it) as one request when the same
 * token is passed throughout, so callers should keep one token per search and
 * call `newSessionToken()` after a selection.
 */
export function newSessionToken(): string {
  return crypto.randomUUID();
}

export async function autocompletePlaces(
  input: string,
  opts: { center?: { lat: number; lng: number } | null; language?: 'en' | 'he'; sessionToken?: string; signal?: AbortSignal } = {}
): Promise<PlacePrediction[]> {
  if (input.trim().length < 2) return [];
  try {
    const res = await fetch(`${PLACES_URL}/autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        lat: opts.center?.lat,
        lng: opts.center?.lng,
        language: opts.language,
        sessionToken: opts.sessionToken,
      }),
      signal: opts.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.predictions || [];
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return [];
    console.error('[placesService] autocomplete failed:', err);
    return [];
  }
}

export async function getPlaceDetails(
  placeId: string,
  opts: { language?: 'en' | 'he'; sessionToken?: string } = {}
): Promise<PlaceDetails | null> {
  try {
    const res = await fetch(`${PLACES_URL}/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: placeId, language: opts.language, sessionToken: opts.sessionToken }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[placesService] details failed:', err);
    return null;
  }
}
