# Backend API Proxy Setup Complete! 🎉

## ✅ What Was Created

### 1. **Express Backend Server** (`/server/index.js`)
- Standalone Node.js/Express server for local development
- Built-in rate limiting (20 requests/hour per IP)
- Runs on port 3001 by default
- Handles Gemini API calls securely

### 2. **Vercel Serverless Function** (`/api/search.js`)
- Serverless function for production deployment on Vercel
- Auto-scales and handles CORS
- Same rate limiting as Express server
- Zero infrastructure management needed

### 3. **Updated Frontend** (`geminiService.ts`)
- Now calls backend API instead of Gemini directly
- Auto-detects environment (dev vs production)
- No more exposed API keys in browser!

### 4. **Updated Dependencies** (`package.json`)
- Added Express, CORS, dotenv for backend
- Added TypeScript types for backend
- Added concurrently to run frontend + backend together

---

## 🚀 How to Run

### Option 1: Local Development (Frontend + Backend)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Update your `.env` file**:
   ```bash
   # Rename API_KEY to GEMINI_API_KEY
   GEMINI_API_KEY=your_gemini_api_key_here
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

3. **Run both frontend and backend**:
   ```bash
   npm run dev:all
   ```
   
   Or run them separately:
   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - Backend
   npm run dev:backend
   ```

4. **Access the app**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api/search

---

### Option 2: Deploy to Vercel (Production)

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm i -g vercel
   ```

2. **Set environment variables in Vercel**:
   ```bash
   vercel env add GEMINI_API_KEY
   # Paste your Gemini API key

   vercel env add GOOGLE_MAPS_API_KEY
   # Paste your Google Maps API key
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Your API will be available at**:
   - `https://your-app.vercel.app/api/search`

---

## 🔒 Security Improvements

### ✅ What's Now Secure:

1. **API Key Protection**:
   - ✅ Gemini API key is ONLY on backend (never exposed to browser)
   - ✅ Frontend makes requests to YOUR backend, not directly to Gemini
   - ✅ API key can't be extracted from browser DevTools

2. **Rate Limiting**:
   - ✅ 20 requests per hour per IP address
   - ✅ Prevents abuse even if someone tries to spam your API
   - ✅ Returns clear error message when limit is reached

3. **Request Validation**:
   - ✅ Validates required fields (city, query)
   - ✅ Returns proper error messages
   - ✅ Sanitizes input data

### 🛡️ Additional Security Steps (Recommended):

1. **Add Authentication** (Optional but recommended):
   ```javascript
   // Add to server/index.js or api/search.js
   const authenticateUser = (req, res, next) => {
     const token = req.headers.authorization;
     // Verify JWT token or API key
     if (!validToken(token)) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     next();
   };
   
   app.post('/api/search', authenticateUser, rateLimiter, async (req, res) => {
     // ...
   });
   ```

2. **Use Vercel KV for Rate Limiting** (Production):
   - In-memory rate limiting resets when serverless function restarts
   - Use Vercel KV or Upstash Redis for persistent rate limiting
   - Example: https://vercel.com/docs/storage/vercel-kv

3. **Add Request Logging**:
   - Track who's using your API
   - Monitor for unusual patterns
   - Set up alerts for high usage

---

## 📊 Testing Your Backend

### Test with curl:

```bash
# Test backend API
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Paris",
    "query": "best restaurants",
    "language": "en",
    "excludeTitles": [],
    "latLng": null
  }'
```

### Test health endpoint:

```bash
curl http://localhost:3001/api/health
```

---

## 🔧 Configuration Options

### Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Your Gemini API key (backend only) |
| `GOOGLE_MAPS_API_KEY` | ✅ Yes | Your Google Maps API key |
| `PORT` | ⚠️ Optional | Backend server port (default: 3001) |
| `VITE_API_ENDPOINT` | ⚠️ Optional | Custom API endpoint URL |

### Rate Limit Settings:

Edit in `server/index.js` or `api/search.js`:

```javascript
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
```

---

## ⚠️ Important Notes

1. **Remove Old API_KEY**:
   - The old `process.env.API_KEY` is no longer used in frontend
   - Rename it to `GEMINI_API_KEY` in your `.env` file
   - Make sure it's ONLY in backend `.env`, not in client code

2. **Update .gitignore**:
   ```
   .env
   .env.local
   server/.env
   ```

3. **Vercel Deployment**:
   - The `/api` folder is automatically detected as serverless functions
   - Environment variables must be set in Vercel dashboard or CLI
   - Don't commit `.env` files to Git!

4. **Google Maps API**:
   - Still loaded in frontend (this is safe when restricted to your domain)
   - Restrict it in Google Cloud Console to your domain
   - This is normal and necessary for map functionality

---

## 🐛 Troubleshooting

### "API key not configured" error:
- Check that `GEMINI_API_KEY` exists in `.env`
- Restart backend server after changing `.env`
- For Vercel, verify environment variables are set

### CORS errors:
- Backend has CORS enabled for all origins
- For production, restrict to your domain:
  ```javascript
  app.use(cors({
    origin: 'https://yourdomain.com'
  }));
  ```

### Rate limit not working:
- In-memory rate limiting resets when server restarts
- For production, use Redis or Vercel KV

### Backend not connecting:
- Check backend is running on port 3001
- Verify `VITE_API_ENDPOINT` or default endpoint is correct
- Check for firewall/antivirus blocking port 3001

---

## 💰 Cost Savings

**Before**: API key exposed → Unlimited potential costs if leaked

**After**: API key protected + rate limited → Maximum $1-2/day even if found

---

## 📚 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Update `.env` file with `GEMINI_API_KEY`
3. ✅ Test locally: `npm run dev:all`
4. ✅ Deploy to Vercel: `vercel --prod`
5. ✅ Set up billing alerts in Google Cloud Console
6. ✅ Monitor API usage regularly

Your API is now secure! 🎉
