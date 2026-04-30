// Shared CORS + rate-limit helpers for the Express app (dev server + Vercel
// single-function entry). File is prefixed with `_` so Vercel does not deploy
// it as a route.

// ── CORS ─────────────────────────────────────────────────────────────────────
const DEFAULT_DEV_ORIGINS = 'http://localhost:5173,http://localhost:3000';

export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_DEV_ORIGINS)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOW_METHODS = 'GET,OPTIONS,POST,PUT,PATCH,DELETE';
const ALLOW_HEADERS = 'Content-Type, X-Requested-With, Authorization';

// For the Express `cors()` middleware.
export const expressCorsOptions = {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  methods: ALLOW_METHODS.split(','),
  allowedHeaders: ALLOW_HEADERS.split(',').map(s => s.trim()),
};

// ── Rate limiting ────────────────────────────────────────────────────────────
// In-memory sliding window. On Vercel each Lambda instance has its own Map,
// so a determined attacker spreading across cold starts can exceed the limit
// somewhat — but combined with daily quota caps in Google Cloud and the fact
// that users supply their own Gemini key, this is enough for a public beta.
// Upgrade to Postgres- or Upstash-backed if real abuse appears.

const buckets = new Map(); // key -> [timestamps]

export function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (buckets.get(key) || []).filter(t => t > cutoff);
  if (recent.length >= maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    return { allowed: false, retryAfter };
  }
  recent.push(now);
  buckets.set(key, recent);
  // Light cleanup so the Map can't grow unbounded over a long-lived process.
  if (buckets.size > 5000) {
    for (const [k, ts] of buckets) {
      const filtered = ts.filter(t => t > cutoff);
      if (filtered.length === 0) buckets.delete(k);
    }
  }
  return { allowed: true };
}

export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// Default per-endpoint limits per IP per minute. Tune via env if needed.
const num = (v, d) => (Number.isFinite(+v) && +v > 0 ? +v : d);
export const LIMITS = {
  search:  { max: num(process.env.RATE_LIMIT_SEARCH,  30), windowMs: 60_000 },
  enrich:  { max: num(process.env.RATE_LIMIT_ENRICH,  20), windowMs: 60_000 },
  chat:    { max: num(process.env.RATE_LIMIT_CHAT,    20), windowMs: 60_000 },
  geocode: { max: num(process.env.RATE_LIMIT_GEOCODE, 60), windowMs: 60_000 },
};

// ── Safe error responses ─────────────────────────────────────────────────────
// Classify common Gemini SDK errors into user-actionable messages. Returns
// null for unknown errors so the caller falls back to a generic 500.
function classifyGeminiError(error) {
  const status = error?.status;
  const msg = String(error?.message || '');

  if (status === 429 || /RESOURCE_EXHAUSTED|Quota exceeded/i.test(msg)) {
    const retryMatch = msg.match(/retry in ([\d.]+)\s*s/i) || msg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
    const isFreeTier = /free_tier/i.test(msg);
    return {
      status: 429,
      errorCode: 'quota_exceeded',
      message: isFreeTier
        ? `You've hit Gemini's daily free-tier limit on your API key.${retryAfter ? ` Try again in ${retryAfter}s,` : ''} or enable billing in Google AI Studio for higher limits.`
        : `Gemini quota exceeded.${retryAfter ? ` Try again in ${retryAfter}s.` : ' Try again soon.'}`,
      retryAfter,
    };
  }

  if ((status === 400 || status === 401 || status === 403)
      && /API_KEY_INVALID|API key not valid|invalid.*api.*key/i.test(msg)) {
    return {
      status: 401,
      errorCode: 'invalid_api_key',
      message: 'Your Gemini API key was rejected. Double-check it, or get a new one at https://aistudio.google.com/apikey.',
    };
  }

  return null;
}

// Log full error server-side, return a classified user-facing message when
// possible, otherwise a generic shape so SDK internals don't leak.
export function safeError(res, error, context) {
  const requestId = Math.random().toString(36).slice(2, 10);
  console.error(`[${context}] requestId=${requestId}`, error);
  const classified = classifyGeminiError(error);

  if (res.headersSent) {
    const payload = classified
      ? { type: 'error', errorCode: classified.errorCode, message: classified.message, retryAfter: classified.retryAfter, requestId }
      : { type: 'error', errorCode: 'server_error', message: 'Server error', requestId };
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      res.end();
    } catch {}
    return;
  }

  if (classified) {
    return res.status(classified.status).json({
      error: classified.errorCode,
      errorCode: classified.errorCode,
      message: classified.message,
      retryAfter: classified.retryAfter,
      requestId,
    });
  }
  res.status(500).json({ error: 'Server error', errorCode: 'server_error', message: 'Server error', requestId });
}

// Truncate user-supplied strings before logging.
export function truncate(s, n = 30) {
  if (typeof s !== 'string') return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ── Chat input limits ────────────────────────────────────────────────────────
export const CHAT_LIMITS = {
  maxMessageChars: 4000,
  maxHistoryMessages: 10,
  maxHistoryCharsPerMsg: 2000,
};
