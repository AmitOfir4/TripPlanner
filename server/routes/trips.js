import { Router } from 'express';
import { requireUser } from '../../api/_auth.js';
import {
  listTrips, getTrip, createTrip, updateTrip, deleteTrip,
  setDriveFileId, ensureTripIndexes,
} from '../../api/_trips.js';

const tripsRouter = Router();

// Indexes are created once per process, on the first request that needs them.
let tripIndexesPromise = null;
function ensureTripIndexesOnce() {
  if (!tripIndexesPromise) {
    tripIndexesPromise = ensureTripIndexes().catch(err => {
      tripIndexesPromise = null;
      console.error('[trips] ensureTripIndexes failed:', err);
    });
  }
  return tripIndexesPromise;
}

// GET /api/trips — list current user's trips
tripsRouter.get('/', async (req, res) => {
  const auth = await requireUser(req, res);
  if (!auth) return;
  try {
    await ensureTripIndexesOnce();
    const trips = await listTrips(auth.sub);
    res.json({ trips });
  } catch (err) {
    console.error('[GET /api/trips] error:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to list trips' });
  }
});

// POST /api/trips — create a new trip
tripsRouter.post('/', async (req, res) => {
  const auth = await requireUser(req, res);
  if (!auth) return;
  try {
    const result = await createTrip(auth.sub, req.body);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    res.status(result.status).json({ trip: result.trip });
  } catch (err) {
    console.error('[POST /api/trips] error:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to create trip' });
  }
});

// GET /api/trips/:id
tripsRouter.get('/:id', async (req, res) => {
  const auth = await requireUser(req, res);
  if (!auth) return;
  try {
    const trip = await getTrip(auth.sub, req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json({ trip });
  } catch (err) {
    console.error('[GET /api/trips/:id] error:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to load trip' });
  }
});

// PUT /api/trips/:id
tripsRouter.put('/:id', async (req, res) => {
  const auth = await requireUser(req, res);
  if (!auth) return;
  try {
    const result = await updateTrip(auth.sub, req.params.id, req.body);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    res.json({ trip: result.trip });
  } catch (err) {
    console.error('[PUT /api/trips/:id] error:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to update trip' });
  }
});

// DELETE /api/trips/:id
tripsRouter.delete('/:id', async (req, res) => {
  const auth = await requireUser(req, res);
  if (!auth) return;
  try {
    const result = await deleteTrip(auth.sub, req.params.id);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    res.status(204).end();
  } catch (err) {
    console.error('[DELETE /api/trips/:id] error:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to delete trip' });
  }
});

// PATCH /api/trips/:id/drive-link — store the Drive file id after a successful upload.
tripsRouter.patch('/:id/drive-link', async (req, res) => {
  const auth = await requireUser(req, res);
  if (!auth) return;
  try {
    const result = await setDriveFileId(auth.sub, req.params.id, req.body?.driveFileId);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    res.status(204).end();
  } catch (err) {
    console.error('[PATCH /api/trips/:id/drive-link] error:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to update drive link' });
  }
});

export default tripsRouter;
