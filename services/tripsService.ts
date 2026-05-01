import { GroundingChunk, TripLayer, SavedTripSummary, SavedTripDoc, SavedTripsPage } from '../types';

const TRIPS_ENDPOINT = import.meta.env.VITE_TRIPS_ENDPOINT ||
                       (import.meta.env.DEV ? 'http://localhost:3001/api/trips' : '/api/trips');

export interface TripPayload {
  title: string;
  city: string;
  summary?: string;
  layers: TripLayer[];
  sources?: GroundingChunk[];
  driveFileId?: string;
}

async function authedFetch(url: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}

async function readError(res: Response, fallback: string): Promise<string> {
  // On 429 the server sets Retry-After + a JSON message; surface both so the
  // toast tells the user how long to wait instead of a generic "failed".
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    try {
      const data = await res.json();
      const base = data?.message || 'Too many requests';
      return retryAfter ? `${base} (retry in ${retryAfter}s)` : base;
    } catch {
      return retryAfter ? `Too many requests — retry in ${retryAfter}s` : 'Too many requests';
    }
  }
  try {
    const data = await res.json();
    return data?.error || data?.message || fallback;
  } catch {
    return fallback;
  }
}

export interface ListSavedTripsOpts {
  /** Page size, 1..100. Defaults to backend default (50). */
  limit?: number;
  /** ISO `updatedAt` cursor from a previous page's `nextCursor`. */
  before?: string;
}

export async function listSavedTrips(
  accessToken: string,
  opts: ListSavedTripsOpts = {},
): Promise<SavedTripsPage> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.before) params.set('before', opts.before);
  const qs = params.toString();
  const url = qs ? `${TRIPS_ENDPOINT}?${qs}` : TRIPS_ENDPOINT;

  const res = await authedFetch(url, accessToken);
  if (!res.ok) throw new Error(await readError(res, `List trips failed: ${res.status}`));
  const data = await res.json();
  return {
    trips: Array.isArray(data?.trips) ? data.trips : [],
    nextCursor: typeof data?.nextCursor === 'string' ? data.nextCursor : null,
  };
}

export async function getSavedTrip(id: string, accessToken: string): Promise<SavedTripDoc> {
  const res = await authedFetch(`${TRIPS_ENDPOINT}/${encodeURIComponent(id)}`, accessToken);
  if (!res.ok) throw new Error(await readError(res, `Load trip failed: ${res.status}`));
  const data = await res.json();
  return data.trip;
}

export async function createSavedTrip(payload: TripPayload, accessToken: string): Promise<SavedTripDoc> {
  const res = await authedFetch(TRIPS_ENDPOINT, accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, `Save trip failed: ${res.status}`));
  const data = await res.json();
  return data.trip;
}

export async function updateSavedTrip(id: string, payload: TripPayload, accessToken: string): Promise<SavedTripDoc> {
  const res = await authedFetch(`${TRIPS_ENDPOINT}/${encodeURIComponent(id)}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, `Update trip failed: ${res.status}`));
  const data = await res.json();
  return data.trip;
}

export async function deleteSavedTrip(id: string, accessToken: string): Promise<void> {
  const res = await authedFetch(`${TRIPS_ENDPOINT}/${encodeURIComponent(id)}`, accessToken, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res, `Delete trip failed: ${res.status}`));
  }
}

/**
 * After a successful "Upload to Google Maps", store the returned Drive file id
 * on the trip so subsequent uploads update the same file in place.
 */
export async function setSavedTripDriveLink(
  id: string,
  driveFileId: string,
  accessToken: string,
): Promise<void> {
  const res = await authedFetch(`${TRIPS_ENDPOINT}/${encodeURIComponent(id)}/drive-link`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ driveFileId }),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res, `Update drive link failed: ${res.status}`));
  }
}
