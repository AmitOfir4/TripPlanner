// Single Vercel serverless function fronting all `/api/*` requests.
//
// `vercel.json` rewrites `/api/(.*)` to `/api/index`, so every API request
// lands here and is routed by the shared Express app in server/app.js.
// New routes go in server/app.js or server/routes/*.js — never in this file.

import app from '../server/app.js';

export default app;
