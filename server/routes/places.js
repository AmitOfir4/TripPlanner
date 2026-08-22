import { Router } from 'express';
import { enforceRateLimit, getClientIp, LIMITS, truncate } from '../../api/_security.js';

const placesRouter = Router();

const MAX_INPUT = 200;

function mapsKey(res) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'server_error', message: 'Server missing GOOGLE_MAPS_API_KEY' });
    return null;
  }
  return key;
}

// Google returns `sessiontoken` opaque strings; we only forward what the client
// generated (a UUID) and never persist it.
function sessionParam(token) {
  return typeof token === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(token)
    ? `&sessiontoken=${token}`
    : '';
}

// ── Autocomplete ─────────────────────────────────────────────────────────
// POST /api/places/autocomplete — { input, lat?, lng?, language?, sessionToken? }
// Returns lightweight predictions for the map search bar. Coordinates come
// from a second call to /details once the user picks one, so this stays cheap.
placesRouter.post('/autocomplete', async (req, res) => {
  if (!enforceRateLimit(res, `${getClientIp(req)}:places`, LIMITS.places)) return;

  const { input, lat, lng, language, sessionToken } = req.body || {};
  if (typeof input !== 'string' || input.trim().length < 2) {
    return res.json({ predictions: [] });
  }

  const key = mapsKey(res);
  if (!key) return;

  const lang = language === 'he' ? 'he' : 'en';
  let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json`
    + `?input=${encodeURIComponent(input.trim().slice(0, MAX_INPUT))}`
    + `&language=${lang}${sessionParam(sessionToken)}&key=${key}`;

  // Bias (not restrict) toward what the user is currently looking at, so
  // "central station" resolves near the trip's city first.
  if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
    url += `&location=${lat},${lng}&radius=50000`;
  }

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[/api/places/autocomplete] Google status:', data.status);
      return res.status(502).json({ error: 'places_error', message: 'Place search is unavailable right now' });
    }
    const predictions = (data.predictions || []).slice(0, 8).map((p) => ({
      place_id: p.place_id,
      description: p.description || '',
      main_text: p.structured_formatting?.main_text || p.description || '',
      secondary_text: p.structured_formatting?.secondary_text || '',
    }));
    res.json({ predictions });
  } catch (err) {
    console.error('[/api/places/autocomplete] error for input:', truncate(input), err?.message);
    res.status(500).json({ error: 'server_error', message: 'Place search failed' });
  }
});

// ── Place details ────────────────────────────────────────────────────────
// POST /api/places/details — { place_id, language?, sessionToken? }
// Resolves a prediction to coordinates so it can be dropped on the map.
placesRouter.post('/details', async (req, res) => {
  if (!enforceRateLimit(res, `${getClientIp(req)}:places`, LIMITS.places)) return;

  const { place_id: placeId, language, sessionToken } = req.body || {};
  if (typeof placeId !== 'string' || !placeId) {
    return res.status(400).json({ error: 'bad_request', message: 'place_id is required' });
  }

  const key = mapsKey(res);
  if (!key) return;

  const lang = language === 'he' ? 'he' : 'en';
  const url = `https://maps.googleapis.com/maps/api/place/details/json`
    + `?place_id=${encodeURIComponent(placeId)}`
    + `&fields=geometry,name,formatted_address,rating,types`
    + `&language=${lang}${sessionParam(sessionToken)}&key=${key}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const loc = data.result?.geometry?.location;
    if (data.status !== 'OK' || !loc) {
      return res.status(404).json({ error: 'not_found', message: 'Place has no location' });
    }
    res.json({
      lat: loc.lat,
      lng: loc.lng,
      name: data.result.name || '',
      formatted_address: data.result.formatted_address || '',
      rating: typeof data.result.rating === 'number' ? data.result.rating : null,
      types: data.result.types || [],
    });
  } catch (err) {
    console.error('[/api/places/details] error:', err?.message);
    res.status(500).json({ error: 'server_error', message: 'Place lookup failed' });
  }
});

export default placesRouter;
