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
      place_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE geocode_cache ADD COLUMN IF NOT EXISTS place_id TEXT`.catch(() => {});
}

function normalizeKey(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function clnormalizeReverseKey(lat, lng) {
  return `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

// Use Google Places API (Find Place) for all forward lookups — accurate for POIs, addresses, and cities
async function findPlace(query, apiKey, cityCenter) {
  let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=geometry,formatted_address,name,place_id&key=${apiKey}`;
  if (cityCenter && cityCenter.lat && cityCenter.lng) {
    url += `&locationbias=circle:50000@${cityCenter.lat},${cityCenter.lng}`;
  }
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status === 'OK' && data.candidates && data.candidates[0]) {
    const c = data.candidates[0];
    return {
      lat: c.geometry.location.lat,
      lng: c.geometry.location.lng,
      formatted_address: c.formatted_address || '',
      place_name: c.name || '',
      place_id: c.place_id || ''
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

  const { address, lat, lng, cityCenter } = req.body;
  const isReverse = typeof lat === 'number' && typeof lng === 'number' && !address;

  if (!address && !isReverse) {
    return res.status(400).json({ error: 'Provide either "address" or "lat"+"lng"' });
  }

  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) {
    return res.status(500).json({ error: 'Server missing GOOGLE_MAPS_API_KEY' });
  }

  // Validate cityCenter if provided
  const validCityCenter = cityCenter && typeof cityCenter.lat === 'number' && typeof cityCenter.lng === 'number'
    ? cityCenter : null;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('[Geocode] No DATABASE_URL — skipping cache');
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await findPlace(address, mapsApiKey, validCityCenter);

    if (!result) {
      return res.status(404).json({ error: 'Geocoding returned no results' });
    }
    return res.json({ ...result, cached: false });
  }

  try {
    const sql = neon(databaseUrl);
    await ensureTable(sql);

    // Check cache FIRST by query key to avoid unnecessary API calls
    const lookupKey = isReverse
      ? `rev:${lat.toFixed(4)},${lng.toFixed(4)}`
      : normalizeKey(address);

    const cached = await sql`
      SELECT lat, lng, formatted_address, place_name, place_id
      FROM geocode_cache
      WHERE query_key = ${lookupKey}
        AND created_at > NOW() - INTERVAL '365 days'
      LIMIT 1
    `;

    if (cached.length > 0) {
      console.log('[Geocode] Cache HIT: ' + lookupKey);
      return res.json({ ...cached[0], cached: true });
    }

    // Cache miss — call API
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await findPlace(address, mapsApiKey, validCityCenter);

    if (!result) {
      return res.status(404).json({ error: 'Geocoding returned no results' });
    }

    // Store in cache
    console.log('[Geocode] Cache MISS → stored: ' + lookupKey);
    await sql`
      INSERT INTO geocode_cache (query_key, query_type, lat, lng, formatted_address, place_name, place_id)
      VALUES (${lookupKey}, ${isReverse ? 'reverse' : 'forward'}, ${result.lat}, ${result.lng}, ${result.formatted_address}, ${result.place_name}, ${result.place_id || null})
      ON CONFLICT (query_key) DO UPDATE SET
        lat = EXCLUDED.lat, lng = EXCLUDED.lng,
        formatted_address = EXCLUDED.formatted_address, place_name = EXCLUDED.place_name,
        place_id = EXCLUDED.place_id, created_at = NOW()
    `;

    return res.json({ ...result, cached: false });
  } catch (error) {
    console.error('[Geocode] Error:', error);
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await findPlace(address, mapsApiKey, validCityCenter);

    if (!result) {
      return res.status(404).json({ error: 'Geocoding returned no results' });
    }
    return res.json({ ...result, cached: false });
  }
}
