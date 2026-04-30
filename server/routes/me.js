import { Router } from 'express';
import { requireUser } from '../../api/_auth.js';
import { upsertUser } from '../../api/_users.js';

const meRouter = Router();

// POST /api/me — upsert the user doc on login and return the profile.
meRouter.post('/', async (req, res) => {
  const auth = await requireUser(req, res);
  if (!auth) return;
  try {
    const user = await upsertUser({
      sub: auth.sub,
      email: auth.email,
      name: auth.name,
      picture: auth.picture,
    });
    res.json({ user });
  } catch (err) {
    console.error('[/api/me] error:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to load user profile' });
  }
});

export default meRouter;
