import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting storage (in-memory, use Redis in production)
const requestCounts = new Map();
const RATE_LIMIT = 20; // requests per IP per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }
  
  const clientData = requestCounts.get(clientIP);
  
  if (now > clientData.resetTime) {
    // Reset the counter
    clientData.count = 1;
    clientData.resetTime = now + RATE_WINDOW;
    return next();
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Maximum ${RATE_LIMIT} requests per hour. Please try again later.`,
      resetTime: clientData.resetTime
    });
  }
  
  clientData.count++;
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gemini search endpoint
app.post('/api/search', rateLimiter, async (req, res) => {
  try {
    const { city, query, language, excludeTitles = [], latLng } = req.body;

    // Validation
    if (!city || !query) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both city and query are required'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key not configured'
      });
    }

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const languageName = language === 'he' ? 'Hebrew' : 'English';
    const excludeText = excludeTitles.length > 0 
      ? `\nDO NOT suggest: [${excludeTitles.join(', ')}].` 
      : '';
    
    const prompt = `You are a travel expert. Suggest 25-30 specific places in ${city} for: "${query}".
  ${excludeText}
  Respond in ${languageName}.
  
  RULES:
  1. USE GOOGLE MAPS GROUNDING: Find exact coordinates and ratings.
  2. PROVIDE GEOLOCATION: You MUST include (latitude, longitude) for every place.
  3. BE SPECIFIC: Use full official names for landmarks.
  4. PRIORITIZE: List the best and most relevant places first.
  
  RESPONSE FORMAT (Strictly one line per place):
  * [Category] | Place Name | [Rating/5.0] | (latitude, longitude) - Short Description
  
  Example:
  * [Landmark] | Eiffel Tower | [4.8/5.0] | (48.8584, 2.2945) - The iconic iron lattice tower.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }], 
        toolConfig: {
          retrievalConfig: {
            latLng: latLng
          }
        },
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      },
    });

    const text = response.text || "";
    const sdkChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const suggestions = [];
    const lines = text.split('\n');
    const coordRegex = /\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
    const ratingRegex = /\[(\d+\.?\d*)\/5\.0\]/;
    const categoryRegex = /^[*-\s]*\[(.*?)\]/;

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        let category = "Other";
        const catMatch = trimmedLine.match(categoryRegex);
        if (catMatch) category = catMatch[1];

        let lat = undefined;
        let lng = undefined;
        const coordMatch = trimmedLine.match(coordRegex);
        if (coordMatch) {
          lat = parseFloat(coordMatch[1]);
          lng = parseFloat(coordMatch[2]);
        }

        let rating = undefined;
        const ratingMatch = trimmedLine.match(ratingRegex);
        if (ratingMatch) rating = parseFloat(ratingMatch[1]);

        const parts = trimmedLine.split('|').map(p => p.trim());
        let placeName = "Unknown Place";
        if (parts.length > 1) {
          placeName = parts[1].replace(/\[.*?\]/, '').trim();
        }

        let description = "";
        const descPart = trimmedLine.split(' - ');
        description = descPart.length > 1 ? descPart[descPart.length - 1].trim() : `Explore ${placeName} in ${city}.`;

        const matchingChunk = sdkChunks.find(c => 
          c.maps?.title?.toLowerCase().includes(placeName.toLowerCase()) || 
          placeName.toLowerCase().includes(c.maps?.title?.toLowerCase() || "")
        );

        let placeId = matchingChunk?.maps?.placeId;
        if (!placeId) {
          const uri = matchingChunk?.maps?.uri || "";
          const placeIdMatch = uri.match(/place_id:([^&/]+)/) || uri.match(/query_place_id=([^&/]+)/);
          placeId = placeIdMatch ? placeIdMatch[1] : undefined;
        }

        if (placeName && placeName !== "Unknown Place" && lat !== undefined && lng !== undefined) {
          suggestions.push({
            title: placeName,
            description: description,
            category: category,
            mapUrl: matchingChunk?.maps?.uri,
            lat,
            lng,
            rating,
            placeId: placeId
          });
        }
      }
    });

    const uniqueSuggestions = suggestions.filter((v, i, a) => a.findIndex(t => (t.title === v.title)) === i);

    res.json({ 
      suggestions: uniqueSuggestions.sort((a, b) => (b.rating || 0) - (a.rating || 0)), 
      sources: sdkChunks.filter(c => !!c.maps)
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message || 'An error occurred while processing your request'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`📍 Gemini API endpoint: http://localhost:${PORT}/api/search`);
  console.log(`⏱️  Rate limit: ${RATE_LIMIT} requests per hour per IP`);
});

export default app;
