// Shared MongoDB client for the Express dev server and Vercel functions.
// File is prefixed with `_` so Vercel does not deploy it as a route.
//
// The MongoClient promise is held at module scope so warm Vercel lambdas and
// the long-lived dev server reuse the same connection pool across requests.

import { MongoClient } from 'mongodb';

let clientPromise = null;

function getClient() {
  if (clientPromise) return clientPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error('Missing MONGODB_URI env var'));
  }
  const client = new MongoClient(uri);
  clientPromise = client.connect().catch((err) => {
    // Reset so the next call can retry instead of being stuck on a rejected promise.
    clientPromise = null;
    throw err;
  });
  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  // Use the default database from the URI when present; otherwise fall back
  // to MONGODB_DB or 'tripplanner'.
  return client.db(process.env.MONGODB_DB || undefined);
}
