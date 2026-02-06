# Quick Start: Testing Google My Maps Import

## Immediate Next Steps

### 1. Set Up Google OAuth (5 minutes)

1. Go to https://console.cloud.google.com/
2. Select your project (or create new one)
3. **Enable APIs:**
   - Search for "Google Drive API" → Enable
   - Search for "Google Maps JavaScript API" → Enable (if not already)

4. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - If prompted, configure OAuth consent screen:
     - User Type: External
     - App name: TripPlanner
     - User support email: your email
     - Developer email: your email
     - Save and continue through all screens
   - Back to Create OAuth client ID:
     - Application type: Web application
     - Name: TripPlanner Dev
     - Authorized JavaScript origins:
       - Add: `http://localhost:5173`
     - Authorized redirect URIs:
       - Add: `http://localhost:5173`
     - Click CREATE
   - **Copy the Client ID** (format: `xxxxx-xxxxx.apps.googleusercontent.com`)

### 2. Configure Environment

1. Create `.env` file in project root:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   API_KEY=your_existing_gemini_key
   GOOGLE_MAPS_API_KEY=your_existing_maps_key
   VITE_GOOGLE_CLIENT_ID=paste_client_id_here.apps.googleusercontent.com
   ```

### 3. Create Test Data

1. Go to https://mymaps.google.com/
2. Sign in with same Google account you'll use to test
3. Create a new map (e.g., "London Favorites")
4. Add 3-5 places manually
5. Save the map

### 4. Run and Test

```bash
npm run dev
```

Open http://localhost:5173

**Test Flow:**
1. ✅ Click "Sign In" button (top right)
2. ✅ Google popup → Sign in → Allow permissions
3. ✅ See your profile picture and name appear
4. ✅ Click "Import" button
5. ✅ See your "London Favorites" map in the list
6. ✅ Click on it
7. ✅ Verify places appear in the sidebar
8. ✅ Use AI to find more places
9. ✅ Export as KML
10. ✅ Import KML back to My Maps to verify

## Common Issues

### "Client ID not found"
→ Make sure `VITE_GOOGLE_CLIENT_ID` is in `.env`
→ Restart dev server after adding `.env`

### "Access blocked: Authorization Error"
→ Configure OAuth consent screen in Google Cloud Console
→ Add your email as test user if in "Testing" mode

### "No maps found"
→ Create a map at mymaps.google.com first
→ Sign in with same Google account

### CORS errors
→ Check authorized origins include `http://localhost:5173`
→ Make sure using correct port

## Demo Mode (Without OAuth Setup)

If you want to skip OAuth setup for now, the app still works:
- AI suggestions work normally
- Export to KML works
- Only import feature requires OAuth

## Production Deployment

When deploying to production:

1. Add production domain to OAuth:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com`

2. Set environment variables on hosting platform:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id
   API_KEY=your_gemini_key
   GOOGLE_MAPS_API_KEY=your_maps_key
   ```

3. Update OAuth consent screen:
   - Move from "Testing" to "Production" when ready
   - Add privacy policy URL
   - Add terms of service URL

## Support

- Full setup guide: [SETUP_GOOGLE_IMPORT.md](SETUP_GOOGLE_IMPORT.md)
- Implementation details: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- Issues: Check browser console for specific error messages
