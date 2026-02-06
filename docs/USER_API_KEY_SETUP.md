# User API Key Setup Guide

## Overview

Your TripPlanner app now supports **user-provided API keys**, allowing each user to use their own free Gemini API key instead of sharing a single server key.

## How It Works

### For Users

1. **Get a Free API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy your new API key

2. **Add API Key to TripPlanner**
   - Click the "Add API Key" button in the header (amber/yellow button)
   - Paste your API key in the input field
   - Click "Save API Key"
   - You'll see a green "API Key" button when configured ✅

3. **Start Planning**
   - Your API key is stored locally in your browser
   - Each search uses YOUR key and YOUR quota (1,500 requests/day)
   - Your key is never shared or sent to anyone except Google's API

### For Developers

The implementation includes:

- **Client-side storage**: API keys stored in `localStorage` (never in database)
- **Secure transmission**: Keys sent directly from client → Vercel serverless → Google API
- **No server storage**: Your backend never saves user keys
- **Fallback support**: Can still use `GEMINI_API_KEY` env variable for admin/testing

## Technical Architecture

### Flow
```
User Input (Header.tsx)
  ↓
localStorage (useApiKey hook)
  ↓
App.tsx (passes to useTripPlanner)
  ↓
geminiService.ts (includes in API request)
  ↓
api/search.js (serverless function)
  ↓
Google Gemini API
```

### Files Modified
- `hooks/useApiKey.ts` - New hook for API key management
- `components/Header.tsx` - UI for entering/managing API key
- `geminiService.ts` - Updated to pass apiKey to backend
- `api/search.js` - Accepts user's apiKey from request body
- `App.tsx` - Integrates API key flow
- `hooks/useTripPlanner.ts` - Passes apiKey to API services

## Rate Limits

### Free Tier (Per User)
- **1,500 requests per day**
- **15 requests per minute**

Each user gets their own quota! 🎉

### For Production

To upgrade individual users to higher limits:
1. User upgrades their Google AI Studio account to Pay-as-you-go
2. Their personal API key automatically gets higher quotas:
   - **1,000,000 RPD** (requests per day)
   - Pay only for what you use: ~$0.075 per 1M tokens

## Security Notes

✅ **Secure**:
- API keys stored in browser's localStorage (isolated per domain)
- Keys transmitted over HTTPS
- Server-side execution prevents key exposure in client-side code

⚠️ **User Responsibility**:
- Users should never share their API keys
- Keys can be regenerated at Google AI Studio if compromised
- Users control their own quota and billing

## Publishing Checklist

Before deploying to production:

- [ ] Test API key input/storage/retrieval
- [ ] Verify fallback to env variable works
- [ ] Test error messages when no key provided
- [ ] Update README with user instructions
- [ ] Add link to this guide in your app's help section
- [ ] Consider adding a welcome modal explaining API key requirement

## Benefits

**For You (Developer)**:
- ❌ No API costs on your side
- ❌ No rate limit management needed
- ✅ Unlimited users possible

**For Users**:
- ✅ Free 1,500 requests/day personal quota
- ✅ Privacy - their data, their key
- ✅ Can upgrade individually if needed
- ✅ Full control over usage
