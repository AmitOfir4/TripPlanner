// Shared user-collection helpers for the Express dev server and Vercel functions.
// File is prefixed with `_` so Vercel does not deploy it as a route.

import { getDb } from './_mongo.js';

const COLLECTION = 'users';

/**
 * Upsert the user doc for a verified Google account.
 * On first login: inserts a new doc with default preferences.
 * On subsequent logins: refreshes email/name/picture and bumps lastSeenAt.
 * Returns the resulting user doc.
 */
export async function upsertUser({ sub, email, name, picture }) {
  const db = await getDb();
  const users = db.collection(COLLECTION);
  const now = new Date();

  await users.updateOne(
    { _id: sub },
    {
      $set: {
        email: email || '',
        name: name || '',
        picture: picture || '',
        lastSeenAt: now,
      },
      $setOnInsert: {
        _id: sub,
        preferences: { language: 'en' },
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return users.findOne({ _id: sub });
}
