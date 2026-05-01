// Shared trip-collection helpers for the Express dev server and Vercel functions.
// File is prefixed with `_` so Vercel does not deploy it as a route.
//
// Every function here is owner-scoped: callers pass `ownerSub` (the Google
// account id from `requireUser`) and a trip is only ever read or modified
// when its `ownerSub` matches.

import { ObjectId } from 'mongodb';
import { getDb } from './_mongo.js';

const COLLECTION = 'trips';

const MAX_TITLE_LEN = 200;
const MAX_CITY_LEN = 200;
const MAX_SUMMARY_LEN = 10_000;
const MAX_LAYERS = 50;
const MAX_PLACES_PER_LAYER = 500;

async function tripsCollection() {
  const db = await getDb();
  return db.collection(COLLECTION);
}

function toObjectId(id) {
  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

// Strip a TripRecommendation down to fields we trust. Anything else is dropped.
function sanitizePlace(p) {
  if (!p || typeof p !== 'object') return null;
  if (typeof p.title !== 'string' || !p.title.trim()) return null;
  return {
    title: String(p.title).slice(0, 300),
    description: typeof p.description === 'string' ? p.description.slice(0, 2000) : '',
    category: typeof p.category === 'string' ? p.category.slice(0, 100) : '',
    ...(typeof p.mapUrl === 'string' ? { mapUrl: p.mapUrl.slice(0, 500) } : {}),
    ...(typeof p.lat === 'number' ? { lat: p.lat } : {}),
    ...(typeof p.lng === 'number' ? { lng: p.lng } : {}),
    ...(typeof p.rating === 'number' ? { rating: p.rating } : {}),
    ...(typeof p.placeId === 'string' ? { placeId: p.placeId.slice(0, 200) } : {}),
    ...(typeof p.customKmlIcon === 'string' ? { customKmlIcon: p.customKmlIcon.slice(0, 100) } : {}),
    ...(typeof p.city === 'string' ? { city: p.city.slice(0, 200) } : {}),
  };
}

function sanitizeLayer(l) {
  if (!l || typeof l !== 'object') return null;
  const name = typeof l.name === 'string' ? l.name.slice(0, 200) : '';
  if (!name.trim()) return null;
  const places = Array.isArray(l.places)
    ? l.places.map(sanitizePlace).filter(Boolean).slice(0, MAX_PLACES_PER_LAYER)
    : [];
  return { name, places };
}

function sanitizeSource(s) {
  if (!s || typeof s !== 'object' || !s.maps || typeof s.maps !== 'object') return null;
  const out = {};
  if (typeof s.maps.uri === 'string') out.uri = s.maps.uri.slice(0, 500);
  if (typeof s.maps.title === 'string') out.title = s.maps.title.slice(0, 300);
  if (typeof s.maps.placeId === 'string') out.placeId = s.maps.placeId.slice(0, 200);
  return Object.keys(out).length > 0 ? { maps: out } : null;
}

// Validate + normalize a trip payload. Returns { ok, value, error }.
function normalizeTripInput(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid body' };
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE_LEN) : '';
  const city = typeof body.city === 'string' ? body.city.trim().slice(0, MAX_CITY_LEN) : '';
  if (!title) return { ok: false, error: 'title is required' };
  if (!city) return { ok: false, error: 'city is required' };

  const summary = typeof body.summary === 'string' ? body.summary.slice(0, MAX_SUMMARY_LEN) : '';
  const layersIn = Array.isArray(body.layers) ? body.layers : [];
  const layers = layersIn.map(sanitizeLayer).filter(Boolean).slice(0, MAX_LAYERS);
  const sourcesIn = Array.isArray(body.sources) ? body.sources : [];
  const sources = sourcesIn.map(sanitizeSource).filter(Boolean).slice(0, 200);

  const value = { title, city, summary, layers, sources };
  // Only carry driveFileId through if the client sent a real one. Omitting it
  // from the $set means PUT updates won't blow away an existing link when the
  // client doesn't know (or care) about it.
  if (typeof body.driveFileId === 'string' && body.driveFileId.length > 0 && body.driveFileId.length <= 200) {
    value.driveFileId = body.driveFileId;
  }

  return { ok: true, value };
}

// ── Reads ───────────────────────────────────────────────────────────────

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

/**
 * Lightweight projection for the trip-list view, keyset-paginated by `updatedAt`.
 *
 * Cursor: we use `updatedAt` alone (not the strictly-correct `(updatedAt, _id)`
 * compound). Ties on `updatedAt` are essentially impossible for per-user trip
 * lists at millisecond resolution, so the simpler cursor is fine. Upgrade path
 * if it ever matters: `{ $or: [{ updatedAt: { $lt: c.t } }, { updatedAt: c.t,
 * _id: { $lt: c.id } }] }` plus an `_id` tiebreak in the sort.
 *
 * Backed by the `{ ownerSub: 1, updatedAt: -1 }` index from `ensureTripIndexes`.
 */
export async function listTrips(ownerSub, { limit, before } = {}) {
  const safeLimit = Math.min(
    MAX_LIST_LIMIT,
    Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIST_LIMIT),
  );

  // Forgiving cursor parse: invalid `before` falls back to no cursor (page 1)
  // rather than 400, so a stale or mangled query string never breaks the list.
  let beforeDate = null;
  if (before != null) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) beforeDate = d;
  }

  const filter = { ownerSub };
  if (beforeDate) filter.updatedAt = { $lt: beforeDate };

  const col = await tripsCollection();
  const docs = await col
    .find(filter, { projection: { title: 1, city: 1, updatedAt: 1, createdAt: 1 } })
    .sort({ updatedAt: -1 })
    .limit(safeLimit)
    .toArray();

  const trips = docs.map(d => ({
    id: String(d._id),
    title: d.title,
    city: d.city,
    updatedAt: d.updatedAt,
    createdAt: d.createdAt,
  }));

  // Only emit a cursor when the page is full — a partial page means we've
  // reached the end and the client should stop asking for more.
  const nextCursor = trips.length === safeLimit
    ? (trips[trips.length - 1].updatedAt instanceof Date
        ? trips[trips.length - 1].updatedAt.toISOString()
        : String(trips[trips.length - 1].updatedAt))
    : null;

  return { trips, nextCursor };
}

/** Full trip doc, or null if not found / not owned by this user. */
export async function getTrip(ownerSub, tripId) {
  const _id = toObjectId(tripId);
  if (!_id) return null;
  const col = await tripsCollection();
  const doc = await col.findOne({ _id, ownerSub });
  if (!doc) return null;
  return { ...doc, id: String(doc._id), _id: undefined };
}

// ── Writes ──────────────────────────────────────────────────────────────

export async function createTrip(ownerSub, body) {
  const norm = normalizeTripInput(body);
  if (!norm.ok) return { ok: false, status: 400, error: norm.error };
  const now = new Date();
  const col = await tripsCollection();
  const doc = {
    ownerSub,
    ...norm.value,
    createdAt: now,
    updatedAt: now,
  };
  const result = await col.insertOne(doc);
  return {
    ok: true,
    status: 201,
    trip: { ...doc, id: String(result.insertedId) },
  };
}

export async function updateTrip(ownerSub, tripId, body) {
  const _id = toObjectId(tripId);
  if (!_id) return { ok: false, status: 404, error: 'Trip not found' };
  const norm = normalizeTripInput(body);
  if (!norm.ok) return { ok: false, status: 400, error: norm.error };

  const now = new Date();
  const col = await tripsCollection();
  const result = await col.findOneAndUpdate(
    { _id, ownerSub },
    { $set: { ...norm.value, updatedAt: now } },
    { returnDocument: 'after' },
  );
  // Driver v6 returns the doc directly; v5 wraps it in `{ value }`.
  const updated = result?.value ?? result;
  if (!updated) return { ok: false, status: 404, error: 'Trip not found' };
  return {
    ok: true,
    status: 200,
    trip: { ...updated, id: String(updated._id), _id: undefined },
  };
}

export async function deleteTrip(ownerSub, tripId) {
  const _id = toObjectId(tripId);
  if (!_id) return { ok: false, status: 404, error: 'Trip not found' };
  const col = await tripsCollection();
  const result = await col.deleteOne({ _id, ownerSub });
  if (result.deletedCount === 0) {
    return { ok: false, status: 404, error: 'Trip not found' };
  }
  return { ok: true, status: 200 };
}

/**
 * Update only the Drive linkage on a trip. Used after a successful "Upload to
 * Google Maps" so subsequent uploads update the same Drive file in place.
 */
export async function setDriveFileId(ownerSub, tripId, driveFileId) {
  const _id = toObjectId(tripId);
  if (!_id) return { ok: false, status: 404, error: 'Trip not found' };
  if (typeof driveFileId !== 'string' || !driveFileId.trim()) {
    return { ok: false, status: 400, error: 'driveFileId is required' };
  }
  const col = await tripsCollection();
  const result = await col.updateOne(
    { _id, ownerSub },
    { $set: { driveFileId: driveFileId.trim().slice(0, 200), updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) {
    return { ok: false, status: 404, error: 'Trip not found' };
  }
  return { ok: true, status: 200 };
}

/** Ensure the indexes the read paths depend on exist. Idempotent. */
export async function ensureTripIndexes() {
  const col = await tripsCollection();
  await col.createIndex({ ownerSub: 1, updatedAt: -1 });
}
