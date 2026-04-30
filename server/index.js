// Local dev launcher. The actual Express app lives in `server/app.js` and is
// shared with the Vercel deployment via `api/index.js`.

import app from './app.js';
import { ALLOWED_ORIGINS, LIMITS } from '../api/_security.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`📍 Gemini API endpoint: http://localhost:${PORT}/api/search`);
  console.log(`🔒 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`⏱️  Rate limits/min per IP: search=${LIMITS.search.max} enrich=${LIMITS.enrich.max} chat=${LIMITS.chat.max} geocode=${LIMITS.geocode.max}`);
});
