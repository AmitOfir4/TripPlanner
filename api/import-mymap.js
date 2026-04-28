// Server-side proxy that fetches a publicly-shared Google My Map and returns
// its KML body. Replaces the previous third-party CORS-proxy chain
// (corsproxy.io / api.codetabs.com / api.allorigins.win) which leaked map IDs
// to external services and was unreliable.
import { applyCors, enforceRateLimit, safeError } from './_security.js';

// Google My Maps IDs are alphanumeric + `_` / `-`. Strict allowlist regex
// prevents the user input from controlling the upstream URL beyond the `mid`.
const MID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const MAX_KML_BYTES = 5 * 1024 * 1024;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (enforceRateLimit(req, res, 'import-mymap')) return;

  const mid = typeof req.query?.mid === 'string' ? req.query.mid : '';
  if (!MID_REGEX.test(mid)) {
    return res.status(400).json({ error: 'invalid_map_id', message: 'Invalid map id.' });
  }

  try {
    const url = `https://www.google.com/maps/d/u/0/kml?forcekml=1&mid=${encodeURIComponent(mid)}`;
    const upstream = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'TripPlanner/1.0' },
    });

    if (!upstream.ok) {
      return res.status(404).json({
        error: 'map_not_public',
        message: 'Map is not publicly accessible. Open the map in Google My Maps → Share → set to "Anyone with the link".',
      });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_KML_BYTES) {
      return res.status(413).json({ error: 'too_large', message: 'Map is too large to import.' });
    }
    const text = new TextDecoder().decode(buf);

    const head = text.slice(0, 500).toLowerCase();
    if (!head.includes('<kml') && !head.includes('<?xml')) {
      return res.status(404).json({
        error: 'not_kml',
        message: 'Could not retrieve a valid KML for this map. Make sure it is shared publicly.',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(text);
  } catch (error) {
    safeError(res, error, 'ImportMyMap');
  }
}
