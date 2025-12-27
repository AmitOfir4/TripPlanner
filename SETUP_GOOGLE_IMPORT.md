# Google My Maps Import - Setup Guide

## Overview
Your TripPlanner app now supports importing maps from Google My Maps! Users can:
1. Sign in with their Google account
2. View all their saved My Maps
3. Import any map into the app
4. Edit, add, or remove places
5. Export back as a new KML file for Google My Maps

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Google Drive API** (required for accessing My Maps)
   - **Google Maps JavaScript API** (already needed for your app)

4. Create OAuth 2.0 Credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - Add authorized redirect URIs:
     - `http://localhost:5173`
     - Your production domain
   - Click **Create**
   - Copy the **Client ID** (it looks like `xxxxx.apps.googleusercontent.com`)

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials:
   ```env
   API_KEY=your_gemini_api_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   ```

### 3. Run the App

```bash
npm install  # Already done
npm run dev
```

## How It Works

### User Flow
1. **Sign In**: Click "Sign In" button → Google OAuth popup
2. **Import**: Click "Import" → See list of My Maps
3. **Select**: Click on any map → Imports all places and layers
4. **Edit**: Add/remove places using the app's AI features
5. **Export**: Download as KML → Manually import to Google My Maps

### Technical Details

#### Authentication
- Uses `@react-oauth/google` for OAuth 2.0 flow
- Requests `drive.readonly` scope for reading My Maps
- Access token stored in React state (session-only)

#### Import Process
1. **Fetch Maps**: `googleDriveService.ts` → Queries Drive for `application/vnd.google-apps.map` files
2. **Download KML**: Exports selected map as KML via Drive API
3. **Parse**: `kmlParser.ts` → Converts KML to app's `TripLayer` format
4. **Merge**: Adds imported layers to existing saved layers

#### Data Structure
- **KML Folders** → App Layers
- **KML Placemarks** → App Recommendations
- Preserves: coordinates, names, descriptions, categories

## Limitations & Workarounds

### What's NOT Possible
❌ Direct write access to Google My Maps (no public API)
❌ Automatic sync of changes back to My Maps
❌ Real-time collaboration with My Maps

### What IS Possible
✅ Import any My Maps as read-only
✅ Edit imported data in your app
✅ Export as new KML file
✅ Manually upload KML to create new My Maps

### Recommended Workflow
1. Import map from My Maps
2. Edit/enhance in your app
3. Export as `Modified_London.kml`
4. Go to [Google My Maps](https://mymaps.google.com)
5. Create new map → Import → Upload your KML
6. Your modified map is now in My Maps!

## Files Created

- `googleAuthService.ts` - OAuth configuration & types
- `googleDriveService.ts` - Drive API calls for My Maps
- `kmlParser.ts` - KML to app format converter
- `.env.example` - Environment variables template

## Troubleshooting

### "Failed to fetch My Maps"
- Check OAuth Client ID is correct
- Ensure Google Drive API is enabled
- Verify authorized origins include your domain

### "No saved maps found"
- User has no My Maps created
- Create test map at https://mymaps.google.com

### CORS Errors
- Google APIs should work from any origin with valid credentials
- Check browser console for specific error messages

### Import Fails
- KML might have unsupported features
- Check browser console for parsing errors
- Some complex KML structures may not parse perfectly

## Future Enhancements

Possible improvements:
- Export directly to Drive (create new My Maps programmatically)
- Better KML parsing for complex geometries
- Sync markers/icons/colors from My Maps
- OAuth token refresh for persistent sessions
- Batch import multiple maps at once
