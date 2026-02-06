# ⚠️ API Security & Billing Warnings

## 🚨 CRITICAL SECURITY ISSUES

### 1. **API Keys Exposed in Client Code**

**PROBLEM**: Your API keys are currently embedded in client-side code and can be extracted by anyone using browser DevTools.

**AFFECTED KEYS**:
- Gemini API Key (`process.env.API_KEY`)
- Google Maps API Key (`process.env.GOOGLE_MAPS_API_KEY`)

**RISK**: 
- Anyone can extract and use your API keys
- Malicious users can run up unlimited charges on your account
- No way to track or prevent unauthorized usage

**CURRENT PROTECTION ADDED**:
✅ Session request limit: 20 searches per session
✅ Rate limiting: 2 seconds between requests
✅ Visual request counter

**STILL VULNERABLE**: These client-side protections can be bypassed by technical users.

---

## 🛡️ RECOMMENDED SECURITY FIXES

### Priority 1: Backend Proxy for Gemini API

**Create a backend server** to handle Gemini API calls:

```javascript
// backend/api/search.js
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Add authentication
  // Add rate limiting (Redis/database)
  // Add cost tracking
  
  const { city, query, language } = req.body;
  
  // Keep API key on server only
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const result = await ai.models.generateContent({...});
  
  res.json(result);
}
```

**Frontend Change**:
```typescript
// Instead of calling Gemini directly
const response = await fetch('/api/search', {
  method: 'POST',
  body: JSON.stringify({ city, query, language })
});
```

### Priority 2: Restrict Google Maps API Key

In Google Cloud Console:
1. Go to Credentials → Edit your Maps API key
2. Set **Application Restrictions**: HTTP referrers
3. Add your domain: `https://yourdomain.com/*`
4. Set **API Restrictions**: 
   - Google Maps JavaScript API only
   - Remove all other APIs

### Priority 3: Add Backend Rate Limiting

Use a service like:
- **Upstash** (Redis) for rate limiting
- **Vercel Edge Config** for request tracking
- **Cloudflare** for DDoS protection

---

## 💰 BILLING ANALYSIS

### Current Costs Per Search (Estimated)

| Service | Cost | Usage |
|---------|------|-------|
| **Gemini 2.5 Flash** | ~$0.001-0.002 | Per search (25-30 results) |
| **Google Maps Grounding** | Included | In Gemini request |
| **Maps JavaScript API** | $7/1000 loads | Once per session |
| **Google Drive API** | Free | Read/write within quota |

**Total per user session**: ~$0.02-0.05 (assuming 20 searches)

### Monthly Cost Projection

| Users/Month | Searches/User | Monthly Cost |
|-------------|---------------|--------------|
| 100 | 20 | $40-100 |
| 1,000 | 20 | $400-1,000 |
| 10,000 | 20 | $4,000-10,000 |

### Without Protection (If Keys Leaked)

If someone extracts your keys and automates requests:
- **10,000 requests/hour** = $20-40/hour
- **24 hours** = $480-960/day
- **30 days** = $14,400-28,800/month

---

## ✅ PROTECTIONS ALREADY ADDED

1. **Session Limit**: Max 20 searches per session
2. **Rate Limiting**: 2-second cooldown between requests  
3. **Request Counter**: Visual feedback to users
4. **No Photo API**: Removed expensive Places Photos API calls

---

## 🎯 IMMEDIATE ACTION ITEMS

### Do This Today:
1. ✅ **Monitor your API usage** in Google Cloud Console
2. ✅ **Set up billing alerts**: 
   - Go to Billing → Budgets & alerts
   - Set alert at $50, $100, $200
3. ✅ **Restrict Maps API key** to your domain only

### Do This Week:
1. ⚠️ **Create backend API proxy** for Gemini calls
2. ⚠️ **Implement server-side rate limiting**
3. ⚠️ **Add user authentication** (optional but recommended)

### Optional Enhancements:
- Add **API key rotation** strategy
- Implement **caching** for repeated searches
- Add **usage analytics** dashboard
- Create **cost per user** tracking

---

## 📊 Monitoring Your Usage

### Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Navigate to APIs & Services → Dashboard
3. Check daily usage for:
   - Gemini API
   - Google Maps JavaScript API
   - Google Drive API

### Set Up Alerts
```
Billing → Budgets & alerts → Create Budget
- Scope: All projects
- Amount: $100/month
- Alerts: 50%, 90%, 100%
- Action: Email notification
```

---

## 🔐 Best Practices

1. **Never commit `.env` files** to Git
2. **Use environment variables** for all keys
3. **Implement backend proxies** for sensitive APIs
4. **Add authentication** for production apps
5. **Monitor usage daily** during initial launch
6. **Set strict billing limits** in Google Cloud
7. **Use API restrictions** on all keys
8. **Rotate keys quarterly** or if compromised

---

## 📞 If You Notice Unusual Charges

1. **Immediately disable the API key** in Google Cloud Console
2. **Generate a new key** with proper restrictions
3. **Review billing reports** to identify abuse
4. **Contact Google Cloud Support** for potential refund
5. **Update your application** with the new key

---

**Remember**: Client-side API key usage is convenient for development but NOT safe for production! Always use a backend proxy for sensitive API calls.
