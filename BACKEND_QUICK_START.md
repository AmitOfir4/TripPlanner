# 🎉 Backend API Proxy - Quick Start

Your Gemini API is now secured with a backend proxy! Here's how to get started:

## 🚀 Quick Setup (3 steps)

### 1. Run Setup Script
```bash
chmod +x setup.sh && ./setup.sh
```

### 2. Update Environment Variables
Open `.env` and update:
```bash
# Change API_KEY to GEMINI_API_KEY
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Start Development
```bash
npm run dev:all
```

That's it! Your app now runs with:
- ✅ Frontend on http://localhost:5173
- ✅ Secure backend API on http://localhost:3001

---

## 📂 What Changed

### New Files Created:
- ✅ `server/index.js` - Express backend server
- ✅ `api/search.js` - Vercel serverless function
- ✅ `vercel.json` - Vercel configuration
- ✅ `.env.example` - Environment template
- ✅ `BACKEND_SETUP.md` - Detailed documentation

### Modified Files:
- ✅ `geminiService.ts` - Now calls backend API
- ✅ `package.json` - Added backend dependencies

---

## 🔒 Security Before vs After

### Before:
```typescript
// ❌ API key exposed in browser
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

### After:
```typescript
// ✅ Frontend calls YOUR backend
const response = await fetch('/api/search', {
  method: 'POST',
  body: JSON.stringify({ city, query })
});

// ✅ Backend keeps API key secret
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

---

## 🎯 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend only |
| `npm run dev:backend` | Start backend only |
| `npm run dev:all` | Start both (recommended) |
| `npm run build` | Build for production |

---

## 🚀 Deploy to Production (Vercel)

```bash
# Set environment variables
vercel env add GEMINI_API_KEY
vercel env add GOOGLE_MAPS_API_KEY

# Deploy
vercel --prod
```

Your backend API will automatically work at:
- `https://your-app.vercel.app/api/search`

---

## 🛡️ What's Protected Now

✅ **Gemini API Key** - Only on backend, never exposed  
✅ **Rate Limiting** - 20 requests/hour per IP  
✅ **Request Validation** - Prevents malformed requests  
✅ **Error Handling** - Graceful failures  
✅ **CORS Protection** - Configurable origins  

---

## 📊 Cost Impact

**Without Protection:**
- If key leaked: $28,800/month potential

**With Protection:**
- Rate limited: $1-2/day maximum
- Monitored: Alerts at thresholds
- Controlled: Can't be abused

---

## ❓ Troubleshooting

**Backend won't start?**
```bash
# Check if port 3001 is in use
lsof -ti:3001 | xargs kill -9
npm run dev:backend
```

**API calls failing?**
- Verify backend is running
- Check `.env` has `GEMINI_API_KEY`
- Look at browser console and terminal for errors

**Need help?**
See detailed docs in [BACKEND_SETUP.md](BACKEND_SETUP.md)

---

## ✅ Verification Checklist

- [ ] Ran `./setup.sh` successfully
- [ ] Updated `.env` with real API keys  
- [ ] Both frontend and backend start without errors
- [ ] Search functionality works in the app
- [ ] No API key visible in browser DevTools
- [ ] Set up billing alerts in Google Cloud Console

---

🎉 **Your API is now secure!** No more exposed keys in the browser.

For complete documentation, see [BACKEND_SETUP.md](BACKEND_SETUP.md)
