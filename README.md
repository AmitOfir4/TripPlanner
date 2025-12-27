<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TripPlanner - AI-Powered Travel Planner

An intelligent travel planning app powered by Google Gemini AI that helps you discover and organize perfect local experiences.

## ✨ New Feature: Import from Google My Maps!

Now you can:
- 🔐 Sign in with your Google account
- 📥 Import your saved Google My Maps
- ✏️ Edit and enhance imported maps in the app
- 📤 Export modified maps as KML files
- 🗺️ Seamlessly blend AI suggestions with your existing maps

[**See detailed setup guide →**](SETUP_GOOGLE_IMPORT.md)

View your app in AI Studio: https://ai.studio/apps/drive/1VCxC3qLKsdjquVbq51649gVq4OFOi-C5

## Features

- 🤖 AI-powered location discovery using Google Gemini
- 🗺️ Google Maps integration with real photos
- 🌍 Multi-language support (English & Hebrew)
- 📱 Beautiful, responsive UI
- 📊 Organize places by city layers
- 💾 Export to KML for Google My Maps
- 🔄 **NEW:** Import existing Google My Maps

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env`:
   ```env
   API_KEY=your_gemini_api_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   VITE_GOOGLE_CLIENT_ID=your_oauth_client_id.apps.googleusercontent.com
   ```
   
   See [.env.example](.env.example) for full configuration.

3. Run the app:
   ```bash
   npm run dev
   ```

## Google My Maps Import Setup

To enable the import feature, you need to:

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Drive API
3. Configure environment variables

**[Complete setup instructions →](SETUP_GOOGLE_IMPORT.md)**
