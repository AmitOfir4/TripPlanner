import { neon } from '@neondatabase/serverless';

const CACHE_TTL_DAYS = 365;

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      id SERIAL PRIMARY KEY,
      query_key TEXT UNIQUE NOT NULL,
      query_type TEXT NOT NULL DEFAULT 'forward',
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      formatted_address TEXT,
      place_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

function normalizeForwardKey(address) {
  return `fwd:${address.toLowerCase().trim()}`;
}

function normalizeReverseKey(lat, lng) {
  return `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

async function geocodeForward(address, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status === 'OK' && data.results && data.results[0]) {
    const result = data.results[0];
    const placeName = result.address_components?.find(c => c.long_name.length > 2)?.long_name || result.formatted_address || '';
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address || '',
      place_name: placeName
    };
  }
  return null;
}

async function geocodeReverse(lat, lng, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status === 'OK' && data.results && data.results[0]) {
    const result = data.results[0];
    const placeName = result.address_components?.find(c => c.long_name.length > 2)?.long_name || result.formatted_address || '';
    return {
      lat,
      lng,
      formatted_address: result.formatted_address || '',
      place_name: placeName
    };
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, lat, lng } = req.body;
  const isReverse = typeof lat === 'number' && typeof lng === 'number' && !address;

  if (!address && !isReverse) {
    return res.status(400).json({ error: 'Provide either "address" or "lat"+"lng"' });
  }

  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) {
    return res.status(500).json({ error: 'Server missing GOOGLE_MAPS_API_KEY' });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // No database configured — fall through to live geocode without caching
    console.warn('[Geocode] No DATABASE_URL — skipping cache');
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await geocodeForward(address, mapsApiKey);

    if (!result) {
      return res.status(404).json({ error: 'Geocoding returned no results' });
    }
    return res.json({ ...result, cached: false });
  }

  try {
    const sql = neon(databaseUrl);
    await ensureTable(sql);

    const queryKey = isReverse
      ? normalizeReverseKey(lat, lng)
      : normalizeForwardKey(address);

    // Check cache (within TTL)
    const cached = await sql`
      SELECT lat, lng, formatted_address, place_name
      FROM geocode_cache
      WHERE query_key = ${queryKey}
        AND created_at > NOW() - INTERVAL '365 days'
      LIMIT 1
    `;

    if (cached.length > 0) {
      console.log(`[Geocode] Cache HIT: ${queryKey}`);
      return res.json({ ...cached[0], cached: true });
    }

    // Cache miss — call Google Maps
    console.log(`[Geocode] Cache MISS: ${queryKey}`);
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await geocodeForward(address, mapsApiKey);

    if (!result) {
      return res.status(404).json({ error: 'Geocoding returned no results' });
    }

    // Store in cache
    await sql`
      INSERT INTO geocode_cache (query_key, query_type, lat, lng, formatted_address, place_name)
      VALUES (${queryKey}, ${isReverse ? 'reverse' : 'forward'}, ${result.lat}, ${result.lng}, ${result.formatted_address}, ${result.place_name})
      ON CONFLICT (query_key) DO UPDATE SET
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        formatted_address = EXCLUDED.formatted_address,
        place_name = EXCLUDED.place_name,
        created_at = NOW()
    `;

    return res.json({ ...result, cached: false });
  } catch (error) {
    console.error('[Geocode] Error:', error);
    // On DB error, fall through to live geocode
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await geocodeForward(address, mapsApiKey);

    if (!result) {
      return res.status(404).json({ error: 'Geocoding returned no results' });
    }
    return res.json({ ...result, cached: false });
  }
}
