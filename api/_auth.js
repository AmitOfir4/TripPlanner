// Shared auth helpers for the Express dev server and Vercel functions.
// Verifies a Google OAuth access token by calling Google's userinfo endpoint
// and extracts a stable user identifier (`sub`).
//
// Userinfo round-trips are cached in-process for 5 minutes so a burst of
// authenticated requests from the same client doesn't hammer Google.

const TOKEN_CACHE_TTL_MS = 5 * 60_000;
const tokenCache = new Map(); // accessToken -> { sub, email, name, picture, expiresAt }

export function bearerToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function verifyAccessToken(token) {
  if (!token) return null;
  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > now) return cached;

  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      tokenCache.delete(token);
      return null;
    }
    const info = await r.json();
    // v2 `id` is the same stable Google account id as the OIDC `sub` claim.
    if (!info?.id) return null;
    const entry = {
      sub: String(info.id),
      email: info.email || '',
      name: info.name || '',
      picture: info.picture || '',
      expiresAt: now + TOKEN_CACHE_TTL_MS,
    };
    tokenCache.set(token, entry);

    if (tokenCache.size > 5000) {
      for (const [k, v] of tokenCache) {
        if (v.expiresAt < now) tokenCache.delete(k);
      }
    }
    return entry;
  } catch (err) {
    console.error('[auth] verifyAccessToken error:', err);
    return null;
  }
}

// Convenience for raw handlers: returns the verified user, or null after
// writing a 401 response. Caller should `return` immediately on null.
export async function requireUser(req, res) {
  const token = bearerToken(req);
  const user = await verifyAccessToken(token);
  if (!user) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid access token',
    });
    return null;
  }
  return user;
}
