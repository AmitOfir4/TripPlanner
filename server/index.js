import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting disabled

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Quick search endpoint - just get place names
app.post('/api/search', async (req, res) => {
  try {
    const { city, query, apiKey, isAdditional = false, excludeTitles = [] } = req.body;

    if (!city || !query) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both city and query are required'
      });
    }

    // Check for API key from user or fallback to environment variable
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.error('No API key provided');
      return res.status(400).json({
        error: 'API key required',
        message: 'Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey'
      });
    }

    console.log(`[Quick Search] ${city} - "${query}"${apiKey ? ' (user key)' : ' (env key)'}`);

    // Initialize Gemini AI with provided key
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    const excludeText = excludeTitles.length > 0 
      ? `\nSkip: ${excludeTitles.join(', ')}.` 
      : '';
    
    // Detect query type and determine optimal number of places
    // Based on search suggestion patterns
    const isTripPlanning = /\b(trip|itinerary|plan|visit|days?|weekend)\b/i.test(query);
    const isSpecificPlace = /^(the\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(query.trim()) || 
                           query.split(' ').length <= 3 && /^[A-Z]/.test(query);
    
    // Food & Markets - more results for dining searches
    const isFoodSearch = /\b(food|restaurant|dining|cafe|cafes|market|street food|authentic|culinary|cuisine)\b/i.test(query);
    
    // Nightlife - bars, clubs, entertainment
    const isNightlife = /\b(bar|bars|club|nightlife|pub|rooftop|live music|venue|entertainment)\b/i.test(query);
    
    // Art & Culture - museums, galleries, architecture
    const isCulture = /\b(museum|gallery|art|culture|historic|architecture|cultural|heritage)\b/i.test(query);
    
    // Nature & Adventure - outdoor activities
    const isNature = /\b(outdoor|nature|adventure|scenic|viewpoint|hike|hiking|park|garden|landscape)\b/i.test(query);
    
    // Luxury & Wellness - shopping, spa, upscale
    const isLuxury = /\b(luxury|shopping|spa|wellness|upscale|premium|boutique|designer)\b/i.test(query);
    
    // Romantic - romantic spots, couples
    const isRomantic = /\b(romantic|romance|couple|date|intimate|cozy)\b/i.test(query);
    
    // Family - family-friendly
    const isFamily = /\b(family|kid|children|child-friendly|playground|family-friendly)\b/i.test(query);
    
    // Hidden Gems & Local Favorites
    const isHiddenGems = /\b(hidden gem|local favorite|off the beaten|secret|undiscovered|lesser-known)\b/i.test(query);
    
    // Main Attractions
    const isMainAttractions = /\b(main attraction|must-see|landmark|famous|iconic|popular|top rated|best)\b/i.test(query);
    
    // General category search
    const isCategorySearch = /\b(hotels?|accommodations?|beaches?)\b/i.test(query);
    
    // General exploration
    const isGeneralExploration = /\b(explore|discover|find|show me)\b/i.test(query);
    
    // Dynamic place count based on query intent
    let placeCount;
    if (isSpecificPlace) {
      placeCount = 1; // Searching for a specific place by name
    } else if (isFoodSearch) {
      placeCount = isAdditional ? 20 : 40; // Food searches need variety
    } else if (isNightlife) {
      placeCount = isAdditional ? 15 : 30; // Nightlife - bars, clubs, venues
    } else if (isCulture) {
      placeCount = isAdditional ? 15 : 25; // Museums, galleries, historic sites
    } else if (isNature) {
      placeCount = isAdditional ? 15 : 30; // Outdoor activities, parks, viewpoints
    } else if (isLuxury) {
      placeCount = isAdditional ? 15 : 30; // Shopping, spa, luxury experiences
    } else if (isRomantic) {
      placeCount = isAdditional ? 15 : 25; // Romantic spots - cafes, gardens
    } else if (isFamily) {
      placeCount = isAdditional ? 15 : 30; // Family-friendly attractions
    } else if (isHiddenGems) {
      placeCount = isAdditional ? 20 : 35; // Hidden gems need more options
    } else if (isMainAttractions) {
      placeCount = isAdditional ? 20 : 40; // Main attractions - comprehensive list
    } else if (isTripPlanning) {
      placeCount = isAdditional ? 30 : 60; // Trip planning needs comprehensive list
    } else if (isCategorySearch) {
      placeCount = isAdditional ? 15 : 30; // Hotels, beaches, etc.
    } else if (isGeneralExploration) {
      placeCount = isAdditional ? 20 : 40; // General exploration gets good variety
    } else {
      placeCount = isAdditional ? 15 : 25; // Default for specific queries
    }
    
    const queryType = isSpecificPlace ? 'Specific Place' : 
                     isFoodSearch ? 'Food & Markets' :
                     isNightlife ? 'Nightlife' :
                     isCulture ? 'Art & Culture' :
                     isNature ? 'Nature & Adventure' :
                     isLuxury ? 'Luxury & Wellness' :
                     isRomantic ? 'Romantic Spots' :
                     isFamily ? 'Family Fun' :
                     isHiddenGems ? 'Hidden Gems' :
                     isMainAttractions ? 'Main Attractions' :
                     isTripPlanning ? 'Trip Planning' : 
                     isCategorySearch ? 'Category' :
                     isGeneralExploration ? 'Exploration' : 'Custom';
    
    console.log(`[Quick Search] City: ${city}, Query: "${query}", Type: ${queryType}, Additional: ${isAdditional}, Count: ${placeCount}`);
    
    // Stronger prompt with numbered format and descriptions
    const categoryBreakdown = isTripPlanning && !isAdditional
      ? '\n- 15 top attractions/landmarks\n- 15 restaurants (various cuisines)\n- 10 hotels (different price ranges)\n- 10 shopping destinations\n- 10 entertainment/activities'
      : '';
    
    // Customize prompt based on query type
    let prompt;
    if (isSpecificPlace) {
      prompt = `Find the exact place in ${city} matching: "${query}"

FORMAT:
1. Exact Place Name | Category | Short description (5-10 words)

Example:
1. Eiffel Tower | Landmark | Iconic iron lattice tower in Paris

IMPORTANT: Return ONLY the specific place that matches "${query}". Be precise.`;
    } else {
      prompt = `List ${placeCount} places in ${city} for: "${query}"
${excludeText}
${categoryBreakdown}

FORMAT - Use numbered list with brief descriptions (1-${placeCount}):
1. Place Name | Category | Short description (5-10 words)
2. Place Name | Category | Short description (5-10 words)
...continue to ${placeCount}

Example:
1. Burj Khalifa | Landmark | World's tallest building with observation decks
2. Dubai Mall | Shopping | Massive mall with aquarium and ice rink

IMPORTANT: Complete the FULL list of ${placeCount} items. Count to ${placeCount}.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        temperature: 1.0,
        maxOutputTokens: 8000
      },
    });

    const text = response.text || "";
    const lines = text.split('\n');
    const suggestions = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && (trimmed.includes('|') || trimmed.match(/^\d+\./))) {
        // Parse "Name | Category | Description" or "1. Name | Category | Description"
        const cleaned = trimmed.replace(/^\d+\.\s*/, ''); // Remove numbering
        const parts = cleaned.split('|').map(p => p.trim());
        
        if (parts.length >= 2) {
          // Remove markdown bold formatting (**) from title
          const title = parts[0].replace(/\*\*/g, '');
          const category = parts[1] || 'Other';
          const description = parts[2] || `Explore ${title} in ${city}`;
          
          if (title && title.length > 2) {
            suggestions.push({
              title: title,
              category: category,
              description: description,
              needsEnrichment: true // Flag that this needs coordinates/ratings later
            });
          }
        }
      }
    });

    console.log(`[Quick Search] Found ${suggestions.length} places`);

    res.json({ 
      suggestions: suggestions.slice(0, placeCount),
      quickSearch: true, // Indicates this is quick search without full details
      isAdditional: isAdditional
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message || 'An error occurred while processing your request'
    });
  }
});

// PHASE 2: Enrich selected places with full details (coordinates, ratings, descriptions)
app.post('/api/enrich', async (req, res) => {
  try {
    const { places, city, apiKey, latLng } = req.body;

    // Validation
    if (!places || !Array.isArray(places) || places.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'places array is required'
      });
    }

    // Check for API key from user or fallback to environment variable
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.error('No API key provided');
      return res.status(400).json({
        error: 'API key required',
        message: 'Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey'
      });
    }

    console.log(`[Enrichment] Processing ${places.length} places for ${city}${apiKey ? ' (user key)' : ' (env key)'}`);

    // Initialize Gemini AI with provided key
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    // Create enrichment prompt
    const placeNames = places.map(p => p.title).join('\n- ');
    const prompt = `For each place in ${city}, provide EXACT coordinates and ratings using Google Maps:

Places to enrich:
- ${placeNames}

RULES:
1. USE GOOGLE MAPS GROUNDING to get exact data
2. MUST include (latitude, longitude) for every place
3. Find real ratings from Google Maps
4. Keep descriptions concise (max 15 words)

FORMAT (one line per place):
* [Category] | Place Name | [Rating/5.0] | (latitude, longitude) - Description

Example:
* [Landmark] | Eiffel Tower | [4.8/5.0] | (48.8584, 2.2945) - Iconic iron lattice tower`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: latLng ? {
          retrievalConfig: {
            latLng: latLng
          }
        } : undefined,
        temperature: 0.7,
        topK: 20,
        topP: 0.85,
        maxOutputTokens: 4096
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    console.log(`[Enrichment] Got ${groundingChunks.length} grounding chunks`);

    // Parse enriched data
    const coordRegex = /\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
    const ratingRegex = /\[(\d+\.?\d*)\/5\.0\]/;
    const categoryRegex = /^[*-\s]*\[(.*?)\]/;

    const enrichedPlaces = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) continue;

      // Extract category
      let category = "Other";
      const catMatch = trimmedLine.match(categoryRegex);
      if (catMatch) category = catMatch[1];

      // Extract coordinates
      let lat = undefined;
      let lng = undefined;
      const coordMatch = trimmedLine.match(coordRegex);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }

      // Extract rating
      let rating = undefined;
      const ratingMatch = trimmedLine.match(ratingRegex);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);

      // Extract place name
      const parts = trimmedLine.split('|').map(p => p.trim());
      let placeName = "Unknown Place";
      if (parts.length > 1) {
        placeName = parts[1].replace(/\[.*?\]/, '').trim();
      }

      // Extract description
      let description = "";
      const descPart = trimmedLine.split(' - ');
      description = descPart.length > 1 ? descPart[descPart.length - 1].trim() : `Explore ${placeName} in ${city}.`;

      // Find matching grounding chunk
      const matchingChunk = groundingChunks.find(c => 
        c.maps?.title?.toLowerCase().includes(placeName.toLowerCase()) || 
        placeName.toLowerCase().includes(c.maps?.title?.toLowerCase() || "")
      );

      let placeId = matchingChunk?.maps?.placeId;
      if (!placeId && matchingChunk) {
        const uri = matchingChunk?.maps?.uri || "";
        const placeIdMatch = uri.match(/place_id:([^&/]+)/) || uri.match(/query_place_id=([^&/]+)/);
        placeId = placeIdMatch ? placeIdMatch[1] : undefined;
      }

      // Only include if we have coordinates
      if (placeName && placeName !== "Unknown Place" && lat !== undefined && lng !== undefined) {
        enrichedPlaces.push({
          title: placeName,
          description: description,
          category: category,
          mapUrl: matchingChunk?.maps?.uri,
          lat,
          lng,
          rating,
          placeId: placeId,
          needsEnrichment: false // Now enriched!
        });
      }
    }

    console.log(`[Enrichment] Successfully enriched ${enrichedPlaces.length}/${places.length} places`);

    res.json({ 
      enrichedPlaces,
      total: enrichedPlaces.length,
      requested: places.length
    });

  } catch (error) {
    console.error('Enrichment API Error:', error);
    res.status(500).json({
      error: 'Enrichment failed',
      message: error.message || 'An error occurred while enriching places'
    });
  }
});

// Chat endpoint - streaming AI travel agent
app.post('/api/chat', async (req, res) => {
  try {
    const { city, message, apiKey, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Message is required'
      });
    }

    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(400).json({
        error: 'API key required',
        message: 'Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey'
      });
    }

    // ── City Resolution ─────────────────────────────────────────────────
    const messageCityMatch =
      message.match(/\b(?:restaurants?|hotels?|cafes?|bars?|clubs?|museums?|attractions?|places?|spots?|things?|activities)\s+in\s+([a-zA-Z][a-zA-Z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we))/i) ||
      message.match(/\b(?:in|to|at|for|visit(?:ing)?)\s+([a-zA-Z][a-zA-Z\s]{1,20}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to))/i) ||
      message.match(/(?:מסעדות?|בתי קפה|מלונות?|ברים|אטרקציות?|מקומות?)\s+ב([\u0590-\u05FF][\u0590-\u05FF\s]{1,20}?)(?=[,.]|\s*$)/u) ||
      message.match(/(?:^|\s)ב([\u0590-\u05FF][\u0590-\u05FF\s]{1,20}?)(?=[,.]|\s*$|\s+[-–])/u);
    const cityFromMessage = messageCityMatch ? messageCityMatch[1].trim() : null;
    const resolvedCity = cityFromMessage || city;

    const isHebrew = /[\u0590-\u05FF]/.test(message);

    console.log(`[Chat] ${resolvedCity || 'Unknown'} - "${message}" (stream)`);

    // ── SSE Headers ─────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // ── System Instruction (stable across requests → Gemini caches it) ─
    const systemInstruction = `You are an expert AI travel agent and local guide.

CRITICAL FORMAT RULE:
Every time you mention a specific place (restaurant, hotel, attraction, bar, cafe, museum, park, etc.), you MUST wrap it in this exact tag:
[PLACE: Place Name | Category | Description (1-2 sentences)]

Never write a place name without the [PLACE:] tag. This is mandatory — the app uses these tags to let users add places to their map.

Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe

EXAMPLE (restaurants in Rome):
Rome has a wonderful food scene. Here are my top picks.

Authentic Italian:

[PLACE: Da Enzo al 29 | Restaurant | A beloved Trastevere trattoria famous for its cacio e pepe and seasonal Roman dishes.]

[PLACE: Roscioli | Restaurant | Part deli, part restaurant — exceptional pasta and an incredible wine cellar.]

RESPONSE MODES (pick based on the user's message):
1. MULTI-DAY TRIP / ITINERARY — Start each day with [DAY: Day X - Theme Title], include 8-12 [PLACE:] per day.
2. SPECIFIC RECOMMENDATIONS — 2-3 intro sentences, then 12-20 [PLACE:] grouped under subheadings. No [DAY:] markers.
3. GENERAL QUESTION — Conversational answer. Use [PLACE:] for any specific places mentioned.

Rules:
- Plain text only — no markdown (no **, ##, or * bullets)
- Only recommend real, existing places
- For budget requests include approximate price ranges
- For luxury requests mention awards or accolades${isHebrew ? '\n- Reply entirely in Hebrew but keep [PLACE:] and [DAY:] markers in English so the app can parse them.' : ''}`;

    // ── Build multi-turn Content[] (last 10 messages for cost control) ──
    const recentHistory = conversationHistory.slice(-10);
    const contents = recentHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    const userText = resolvedCity ? `[City: ${resolvedCity}] ${message}` : message;
    contents.push({ role: 'user', parts: [{ text: userText }] });

    // ── Stream response ─────────────────────────────────────────────────
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash-lite",
      contents,
      config: {
        systemInstruction,
        temperature: 0.8,
        maxOutputTokens: 8000
      }
    });

    let fullText = '';
    for await (const chunk of stream) {
      const text = chunk.text || '';
      if (text) {
        fullText += text;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
      }
    }

    // ── Parse structured data from completed response ───────────────────
    const dayRegex = /\[DAY:\s*([^\]]+)\]/g;
    const placeRegex = /\[PLACE:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/g;

    const dayMatches = [];
    let dayMatch;
    while ((dayMatch = dayRegex.exec(fullText)) !== null) {
      dayMatches.push({ title: dayMatch[1].trim(), index: dayMatch.index, endIndex: dayMatch.index + dayMatch[0].length });
    }

    const dayGroups = [];
    if (dayMatches.length > 0) {
      for (let i = 0; i < dayMatches.length; i++) {
        const currentDay = dayMatches[i];
        const sectionEnd = dayMatches[i + 1] ? dayMatches[i + 1].index : fullText.length;
        const daySection = fullText.substring(currentDay.endIndex, sectionEnd);
        const dayText = daySection.replace(placeRegex, '').trim();
        const dayPlaces = [];
        placeRegex.lastIndex = 0;
        let placeMatch;
        while ((placeMatch = placeRegex.exec(daySection)) !== null) {
          dayPlaces.push({
            title: placeMatch[1].trim(), category: placeMatch[2].trim(), description: placeMatch[3].trim(),
            city: resolvedCity || undefined, needsEnrichment: true
          });
        }
        dayGroups.push({ dayTitle: currentDay.title, dayText, places: dayPlaces });
      }
    } else {
      const places = [];
      placeRegex.lastIndex = 0;
      let match;
      while ((match = placeRegex.exec(fullText)) !== null) {
        places.push({
          title: match[1].trim(), category: match[2].trim(), description: match[3].trim(),
          city: resolvedCity || undefined, needsEnrichment: true
        });
      }
      if (places.length > 0) {
        dayGroups.push({ dayTitle: 'Recommendations', dayText: '', places });
      }
    }

    const firstDayIndex = dayMatches.length > 0 ? dayMatches[0].index : fullText.length;
    const cleanIntro = fullText.substring(0, firstDayIndex).trim()
      .replace(/\[PLACE:\s*([^|]+)\s*\|[^\]]*\]/g, (_, name) => name.trim())
      .replace(/\[DAY:[^\]]*\]/g, '')
      .replace(/\*/g, '')
      .trim();

    const totalPlaces = dayGroups.reduce((sum, day) => sum + day.places.length, 0);
    console.log(`[Chat] Extracted ${totalPlaces} places across ${dayGroups.length} group(s)`);

    let responseCity = resolvedCity || city;
    if (!responseCity && totalPlaces > 0) {
      const cityMatch2 = fullText.match(/\b(?:in|to|visiting)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
      responseCity = cityMatch2 ? cityMatch2[1] : '';
    }

    // ── Send final structured data ──────────────────────────────────────
    res.write(`data: ${JSON.stringify({ type: 'done', response: cleanIntro, dayGroups, city: responseCity })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Gemini Chat Error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Chat failed' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Chat failed', message: error.message || 'An error occurred' });
    }
  }
});

// Geocode endpoint with Postgres cache
app.post('/api/geocode', async (req, res) => {
  const { address, lat, lng } = req.body;
  const isReverse = typeof lat === 'number' && typeof lng === 'number' && !address;

  if (!address && !isReverse) {
    return res.status(400).json({ error: 'Provide either "address" or "lat"+"lng"' });
  }

  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) {
    return res.status(500).json({ error: 'Server missing GOOGLE_MAPS_API_KEY' });
  }

  const CACHE_TTL_DAYS = 365;

  const normalizeKey = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizeReverseKey = (lt, ln) => `rev:${lt.toFixed(4)},${ln.toFixed(4)}`;

  const geocodeForward = async (addr, key) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${key}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === 'OK' && data.results?.[0]) {
      const r = data.results[0];
      const placeName = r.address_components?.find(c => c.long_name.length > 2)?.long_name || r.formatted_address || '';
      return { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formatted_address: r.formatted_address || '', place_name: placeName };
    }
    return null;
  };

  const geocodeReverse = async (lt, ln, key) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lt},${ln}&key=${key}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === 'OK' && data.results?.[0]) {
      const r = data.results[0];
      const placeName = r.address_components?.find(c => c.long_name.length > 2)?.long_name || r.formatted_address || '';
      return { lat: lt, lng: ln, formatted_address: r.formatted_address || '', place_name: placeName };
    }
    return null;
  };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('[Geocode] No DATABASE_URL — skipping cache');
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await geocodeForward(address, mapsApiKey);
    if (!result) return res.status(404).json({ error: 'Geocoding returned no results' });
    return res.json({ ...result, cached: false });
  }

  try {
    const sql = neon(databaseUrl);
    await sql`
      CREATE TABLE IF NOT EXISTS geocode_cache (
        id SERIAL PRIMARY KEY,
        query_key TEXT UNIQUE NOT NULL,
        query_type TEXT NOT NULL DEFAULT 'forward',
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        formatted_address TEXT,
        place_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const lookupKey = isReverse ? normalizeReverseKey(lat, lng) : normalizeKey(address);

    // Call Google Maps first to get the canonical formatted_address
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await geocodeForward(address, mapsApiKey);
    if (!result) return res.status(404).json({ error: 'Geocoding returned no results' });

    const canonicalKey = normalizeKey(result.formatted_address);

    // Check cache using formatted_address
    const cached = await sql`
      SELECT lat, lng, formatted_address, place_name
      FROM geocode_cache
      WHERE query_key = ${canonicalKey}
        AND created_at > NOW() - INTERVAL '365 days'
      LIMIT 1
    `;

    if (cached.length > 0) {
      console.log(`[Geocode] Cache HIT: ${canonicalKey}`);
      return res.json({ ...cached[0], cached: true });
    }

    // Cache miss — store with formatted_address as key
    console.log(`[Geocode] Cache MISS: ${canonicalKey}`);
    await sql`
      INSERT INTO geocode_cache (query_key, query_type, lat, lng, formatted_address, place_name)
      VALUES (${canonicalKey}, ${isReverse ? 'reverse' : 'forward'}, ${result.lat}, ${result.lng}, ${result.formatted_address}, ${result.place_name})
      ON CONFLICT (query_key) DO UPDATE SET
        lat = EXCLUDED.lat, lng = EXCLUDED.lng,
        formatted_address = EXCLUDED.formatted_address, place_name = EXCLUDED.place_name,
        created_at = NOW()
    `;

    return res.json({ ...result, cached: false });
  } catch (error) {
    console.error('[Geocode] Error:', error);
    const result = isReverse
      ? await geocodeReverse(lat, lng, mapsApiKey)
      : await geocodeForward(address, mapsApiKey);
    if (!result) return res.status(404).json({ error: 'Geocoding returned no results' });
    return res.json({ ...result, cached: false });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`📍 Gemini API endpoint: http://localhost:${PORT}/api/search`);
  console.log(`⏱️  Rate limiting: disabled`);
});

export default app;
