
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend env vars use the VITE_ prefix and are read via import.meta.env
// (see MapView.tsx, googleAuthService.ts). Backend-only secrets like
// GOOGLE_MAPS_API_KEY and DATABASE_URL must NOT be bundled.
export default defineConfig({
  plugins: [react()],
});
