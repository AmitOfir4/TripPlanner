import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { neon } from '@neondatabase/serverless';

dotenv.config();

// Words that should never be treated as city names
const STOP_WORDS = new Set(['me','my','a','the','an','it','we','us','i','all','some','this','that','our','your','there','here','them','day','days','trip','plan','visit','see','want','need','like','show','find','get','know','make','take','give']);

function extractCityFromMessage(message) {
  const tryMatch = (regex) => {
    const m = message.match(regex);
    if (!m) return null;
    const candidate = m[1].trim();
    if (STOP_WORDS.has(candidate.split(/\s+/)[0].toLowerCase())) return null;
    return candidate;
  };

  return tryMatch(/\b(?:trip|travel|vacation|holiday|fly(?:ing)?|going|headed)\s+(?:to|in)\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|where|from|\d))/i)
    || tryMatch(/\b(?:\d+\s*days?|weekend|week)\s+(?:in|at)\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|\d))/i)
    || tryMatch(/\b(?:restaurants?|hotels?|cafes?|bars?|clubs?|museums?|attractions?|places?|spots?|things?|activities)\s+in\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we))/i)
    || tryMatch(/\b(?:visit(?:ing)?|explore|exploring|discover)\s+([A-Za-z][A-Za-z\s]{1,20}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|\d))/i)
    || tryMatch(/\b(?:in|to|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?=[,.]|\s|$)/)
    || tryMatch(/(?:מסעדות?|בתי קפה|מלונות?|ברים|אטרקציות?|מקומות?)\s+ב([\u0590-\u05FF][\u0590-\u05FF\s]{1,20}?)(?=[,.]|\s*$)/u)
    || tryMatch(/(?:^|\s)ב([\u0590-\u05FF][\u0590-\u05FF\s]{1,20}?)(?=[,.]|\s*$|\s+[-–])/u);
}


// ── Shared geocoding helpers (used by /api/chat and /api/geocode) ───────
async function findPlaceByName(query, apiKey, cityCenter) {
  let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=geometry,formatted_address,name,place_id&key=${apiKey}`;
  if (cityCenter && cityCenter.lat && cityCenter.lng) {
    url += `&locationbias=circle:50000@${cityCenter.lat},${cityCenter.lng}`;
  }
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status === 'OK' && data.candidates && data.candidates[0]) {
    const c = data.candidates[0];
    return {
      lat: c.geometry.location.lat, lng: c.geometry.location.lng,
      formatted_address: c.formatted_address || '', place_name: c.name || '', place_id: c.place_id || ''
    };
  }
  return null;
}



// ── Geocode cache helpers (Neon Postgres) ───────────────────────────────
const CACHE_TTL_DAYS = 365;

function normalizeKey(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Cache key shape for a place lookup. `${placeName}, ${city}` lowercased,
 * matching what `normalizeKey("placeName, city")` would produce.
 * Chat keeps cities in English via the [CITY_EN:] tag, so cross-language
 * lookups already converge on the same key.
 */
function buildPlaceCacheKey(placeName, city) {
  const np = normalizeKey(placeName);
  return city ? `${np}, ${normalizeKey(city)}` : np;
}

async function ensureGeoTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      id SERIAL PRIMARY KEY,
      query_key TEXT UNIQUE NOT NULL,
      query_type TEXT NOT NULL DEFAULT 'forward',
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      formatted_address TEXT,
      place_name TEXT,
      place_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE geocode_cache ADD COLUMN IF NOT EXISTS place_id TEXT`.catch(() => {});
}

/**
 * Forward-geocode with cache.
 *
 * `placeName` is the place itself (e.g. "Atlantis The Palm").
 * `city` (optional) is a city hint used both for the API location bias query
 *   and for the cache key, where it's canonicalised to English so lookups in
 *   any language land on the same row.
 *
 * Falls back to the legacy single-string contract when called as
 * `cachedFindPlace(sql, fullQuery, apiKey, cityCenter)` — the second arg is
 * then treated as the full address with no separate city.
 */
async function cachedFindPlace(sql, placeName, apiKey, cityCenter, city) {
  const apiQuery = city ? `${placeName}, ${city}` : placeName;
  if (!sql) return findPlaceByName(apiQuery, apiKey, cityCenter);
  const key = buildPlaceCacheKey(placeName, city);
  try {
    const cached = await sql`
      SELECT lat, lng, formatted_address, place_name, place_id
      FROM geocode_cache
      WHERE query_key = ${key}
        AND created_at > NOW() - INTERVAL '365 days'
      LIMIT 1
    `;
    if (cached.length > 0) {
      console.log('[Chat/Geocode] Cache HIT: ' + key);
      return { lat: cached[0].lat, lng: cached[0].lng, formatted_address: cached[0].formatted_address, place_name: cached[0].place_name, place_id: cached[0].place_id || '' };
    }
    const result = await findPlaceByName(apiQuery, apiKey, cityCenter);
    if (!result) return null;
    console.log('[Chat/Geocode] Cache MISS → stored: ' + key);
    await sql`
      INSERT INTO geocode_cache (query_key, query_type, lat, lng, formatted_address, place_name, place_id)
      VALUES (${key}, 'forward', ${result.lat}, ${result.lng}, ${result.formatted_address}, ${result.place_name}, ${result.place_id || null})
      ON CONFLICT (query_key) DO UPDATE SET
        lat = EXCLUDED.lat, lng = EXCLUDED.lng,
        formatted_address = EXCLUDED.formatted_address, place_name = EXCLUDED.place_name,
        place_id = EXCLUDED.place_id, created_at = NOW()
    `;
    return result;
  } catch (err) {
    console.warn('[Chat/Geocode] Cache error, falling back to API:', err.message);
    return findPlaceByName(apiQuery, apiKey, cityCenter);
  }
}

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
    
    // Create enrichment prompt - explicit about finding the right place in the right city
    const placeNames = places.map(p => p.title).join('\n- ');
    const prompt = `Find the EXACT location of each of these specific places in ${city} using Google Maps.
Search for each place BY ITS FULL NAME within ${city} to ensure you get the correct location.

Places to find in ${city}:
- ${placeNames}

RULES:
1. USE GOOGLE MAPS GROUNDING to look up each place in ${city}
2. Search for "[place name], ${city}" to get the correct location — do NOT return places from other cities
3. MUST include exact (latitude, longitude) for every place
4. Find real ratings from Google Maps
5. Keep descriptions concise (max 15 words)

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
    const cityFromMessage = extractCityFromMessage(message);
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
    const systemInstruction = `You are an expert AI travel agent and local guide. You help users discover places to visit, eat, stay, and explore anywhere in the world.

CRITICAL FORMAT RULE:
Every time you mention a specific place (restaurant, cafe, attraction, hotel, shop, park, beach, bar, museum, etc.), you MUST wrap it in this exact tag:
[PLACE: Place Name | Category | Description (1-2 sentences) | lat,lng]

The lat,lng field is REQUIRED — always include the real GPS coordinates so the place can be pinned on a map. Use decimal degrees (e.g. 25.2048,55.2708). Never omit coordinates.
Never write a place name without the [PLACE:] tag — the app uses these tags to let users save places to their map.

CITY TAG (REQUIRED when the response is about a single city):
At the very start of your response, output one [CITY_EN: City Name In English] tag using the official English name. Examples: [CITY_EN: Dubai], [CITY_EN: Paris], [CITY_EN: Tokyo], [CITY_EN: New York City]. Do this even when the user asked in another language (Hebrew, Spanish, etc.). The tag is critical — it lets the app cache lookups consistently across languages. Omit only for multi-city or non-city responses.

Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe, Ice Cream, Dessert

EXAMPLES:

User: "give me good ice cream in Dubai"
Dubai has a great ice cream scene, from artisanal gelato to local favourites.

[PLACE: Mirzam Chocolate & Sweets | Dessert | Award-winning bean-to-bar chocolatier offering creative ice cream flavours in a beautiful space. | 25.1855,55.2530]
[PLACE: Salt | Ice Cream | Iconic Dubai street-food brand famous for its salted caramel soft serve and inventive seasonal flavours. | 25.1935,55.2792]

User: "cheap but good restaurants in Paris"
Paris has excellent affordable dining well beyond tourist spots. Here are the best value picks.

Budget Bistros:
[PLACE: Bouillon Chartier | Restaurant | Historic Parisian bouillon serving classic French dishes since 1896 at incredibly low prices. | 48.8729,2.3481]
[PLACE: Le Relais de la Butte | Restaurant | Unpretentious Montmartre neighbourhood bistro with generous portions and wines by the carafe. | 48.8864,2.3428]

HOW TO RESPOND (choose based on what the user is asking):

1. SPECIFIC RECOMMENDATIONS — for any request asking for places, things to do, food, drinks, shopping, etc.
   Triggers: "give me", "recommend", "best X in Y", "where to eat", "I want X", "looking for X", "find me", "what are good X", etc.
   Format: 2-3 sentence intro tailored to the user's exact request, then 15-25 [PLACE:] tags grouped under short subheadings. No [DAY:] markers.
   - Always honour qualifiers: budget/cheap/not expensive → mention prices; romantic → intimate venues; family → kid-friendly; vegan → plant-based; luxury → awards/accolades; hidden gems → off the beaten path.
   - Match the category to what was asked — ice cream → Ice Cream, coffee → Cafe, nightlife → Nightlife, etc.

2. MULTI-DAY ITINERARY — only when the user explicitly asks for a trip plan, itinerary, or a schedule across multiple days.
   Triggers: "X days in Y", "plan my trip", "itinerary for", "what to do over a week in", etc.
   Format: Start each day with [DAY: Day X - Theme Title], then 10-15 [PLACE:] per day with a varied mix of categories.
   - Day 1 always leads with the city's most iconic attractions.
   - Group places geographically each day to minimise travel time.
   - Include at least 2-3 dining options per day near that day's sights.
   - Cover ALL major must-see landmarks across the trip — never skip a famous site.

3. GENERAL QUESTION — for questions about travel tips, culture, customs, visas, budgets, best time to visit, comparisons, etc.
   Format: Conversational answer. Still tag any specific places mentioned with [PLACE:].

RULES (apply to all responses):
- Plain text only — no markdown (no **, ##, *, or --- dividers)
- Only recommend real, existing places
- Always use the FULL official name for accurate map lookup (e.g. "Burj Khalifa" not "The Tower", "Louvre Museum" not "The Louvre")
- Never ignore qualifiers the user stated (price, dietary need, vibe, distance, etc.)${isHebrew ? '\n- Reply entirely in Hebrew but keep [PLACE:] and [DAY:] tags in English so the app can parse them.' : ''}`;

    // ── Build multi-turn Content[] (last 10 messages for cost control) ──
    const recentHistory = conversationHistory.slice(-10);
    const contents = recentHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    // Detect "X days trip to Y" pattern and add planning instructions
    const tripMatch = message.match(/(\d+)\s*days?\s+(?:trip|itinerary|visit|vacation|holiday)\s+(?:to|in)\s+/i);
    let userText = resolvedCity ? `[City: ${resolvedCity}] ${message}` : message;
    if (tripMatch) {
      const numDays = parseInt(tripMatch[1], 10);
      userText += `\n\n[System hint: The user wants a ${numDays}-day itinerary. You MUST use MULTI-DAY TRIP mode. Include ALL of ${resolvedCity || 'the city'}'s most iconic landmarks and tourist attractions across the ${numDays} days. Do not leave out any major site. Aim for 10-15 places per day.]`;
    }
    contents.push({ role: 'user', parts: [{ text: userText }] });

    // ── Stream response ─────────────────────────────────────────────────
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash-lite",
      contents,
      config: {
        systemInstruction,
        temperature: 0.8,
        maxOutputTokens: 12000
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
    // 4th capture group (lat,lng) is optional — gracefully handles responses without coords
    const placeRegex = /\[PLACE:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|\]]+?)\s*(?:\|\s*([-\d.]+\s*,\s*[-\d.]+))?\s*\]/g;

    // [CITY_EN:] is Gemini's authoritative English city name — used as the
    // canonical city for every place in this response so cache keys are
    // language-agnostic (Hebrew/Arabic queries hit the same row as English).
    const cityEnMatch = fullText.match(/\[CITY_EN:\s*([^\]]+)\]/);
    const englishCity = cityEnMatch ? cityEnMatch[1].trim() : null;
    const cityForPlaces = englishCity || resolvedCity || undefined;

    const parseCoords = (raw) => {
      if (!raw) return null;
      const [latStr, lngStr] = raw.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      return { lat, lng };
    };

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
          const geminiCoords = parseCoords(placeMatch[4]);
          dayPlaces.push({
            title: placeMatch[1].trim(),
            category: placeMatch[2].trim(),
            description: placeMatch[3].trim(),
            city: cityForPlaces,
            _geminiLat: geminiCoords ? geminiCoords.lat : undefined,
            _geminiLng: geminiCoords ? geminiCoords.lng : undefined,
          });
        }
        dayGroups.push({ dayTitle: currentDay.title, dayText, places: dayPlaces });
      }
    } else {
      const places = [];
      placeRegex.lastIndex = 0;
      let match;
      while ((match = placeRegex.exec(fullText)) !== null) {
        const geminiCoords = parseCoords(match[4]);
        places.push({
          title: match[1].trim(),
          category: match[2].trim(),
          description: match[3].trim(),
          city: cityForPlaces,
          _geminiLat: geminiCoords ? geminiCoords.lat : undefined,
          _geminiLng: geminiCoords ? geminiCoords.lng : undefined,
        });
      }
      if (places.length > 0) {
        dayGroups.push({ dayTitle: 'Recommendations', dayText: '', places });
      }
    }

    const firstDayIndex = dayMatches.length > 0 ? dayMatches[0].index : fullText.length;
    const cleanIntro = fullText.substring(0, firstDayIndex).trim()
      .replace(/\[CITY_EN:[^\]]*\]/g, '')
      .replace(/\[PLACE:\s*([^|]+)\s*\|[^\]]*\]/g, (_, name) => name.trim())
      .replace(/\[DAY:[^\]]*\]/g, '')
      .replace(/\*/g, '')
      .trim();

    const totalPlaces = dayGroups.reduce((sum, day) => sum + day.places.length, 0);
    console.log(`[Chat] Extracted ${totalPlaces} places across ${dayGroups.length} group(s)` + (englishCity ? ` (city=${englishCity})` : ''));

    // Prefer Gemini's [CITY_EN:] tag — it's reliable across input languages
    // where our regex-based extraction often fails (e.g. Hebrew without ב prefix).
    let responseCity = englishCity || resolvedCity || city;
    if (!responseCity && totalPlaces > 0) {
      const cityMatch2 = fullText.match(/\b(?:in|to|visiting)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
      responseCity = cityMatch2 ? cityMatch2[1] : '';
    }


    // ── Coordinate handling: pass Gemini's coords through untouched ─────
    // Server makes ZERO Places API calls per chat message. Accuracy is
    // guaranteed at the moment of "Add to map" — the client verifies each
    // place via /api/geocode before saving (services/geocodeService.ts).
    for (const place of dayGroups.flatMap(g => g.places)) {
      if (place._geminiLat != null && place._geminiLng != null) {
        place.lat = place._geminiLat;
        place.lng = place._geminiLng;
      }
      delete place._geminiLat;
      delete place._geminiLng;
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

// Geocode endpoint with Postgres cache (checks cache FIRST to save API calls)
app.post('/api/geocode', async (req, res) => {
  // `address` is the place name (e.g. "Atlantis The Palm"). `city` (optional)
  // is split out so the cache key can use the canonical English form,
  // surviving language switches in the chat (Hebrew דובאי -> Dubai etc.).
  const { address, city, lat, lng, cityCenter } = req.body;
  const isReverse = typeof lat === 'number' && typeof lng === 'number' && !address;

  if (!address && !isReverse) {
    return res.status(400).json({ error: 'Provide either "address" or "lat"+"lng"' });
  }

  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) {
    return res.status(500).json({ error: 'Server missing GOOGLE_MAPS_API_KEY' });
  }

  const validCityCenter = cityCenter && typeof cityCenter.lat === 'number' && typeof cityCenter.lng === 'number'
    ? cityCenter : null;

  const normalizeReverseKey = (lt, ln) => `rev:${lt.toFixed(4)},${ln.toFixed(4)}`;

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

  // For forward lookups, use the shared cachedFindPlace helper
  if (!isReverse) {
    const apiQuery = city ? `${address}, ${city}` : address;
    try {
      let sql = null;
      if (process.env.DATABASE_URL) {
        sql = neon(process.env.DATABASE_URL);
        await ensureGeoTable(sql);
      }
      const result = await cachedFindPlace(sql, address, mapsApiKey, validCityCenter, city);
      if (!result) return res.status(404).json({ error: 'Geocoding returned no results' });
      return res.json({ ...result, cached: false });
    } catch (error) {
      console.error('[Geocode] Error:', error);
      const result = await findPlaceByName(apiQuery, mapsApiKey, validCityCenter);
      if (!result) return res.status(404).json({ error: 'Geocoding returned no results' });
      return res.json({ ...result, cached: false });
    }
  }

  // Reverse geocoding with cache
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const result = await geocodeReverse(lat, lng, mapsApiKey);
    if (!result) return res.status(404).json({ error: 'Geocoding returned no results' });
    return res.json({ ...result, cached: false });
  }

  try {
    const sql = neon(databaseUrl);
    await ensureGeoTable(sql);
    const revKey = normalizeReverseKey(lat, lng);

    const cached = await sql`
      SELECT lat, lng, formatted_address, place_name
      FROM geocode_cache
      WHERE query_key = ${revKey}
        AND created_at > NOW() - INTERVAL '365 days'
      LIMIT 1
    `;
    if (cached.length > 0) {
      console.log('[Geocode] Cache HIT: ' + revKey);
      return res.json({ ...cached[0], cached: true });
    }

    const result = await geocodeReverse(lat, lng, mapsApiKey);
    if (!result) return res.status(404).json({ error: 'Geocoding returned no results' });

    console.log('[Geocode] Cache MISS → stored: ' + revKey);
    await sql`
      INSERT INTO geocode_cache (query_key, query_type, lat, lng, formatted_address, place_name)
      VALUES (${revKey}, 'reverse', ${result.lat}, ${result.lng}, ${result.formatted_address}, ${result.place_name})
      ON CONFLICT (query_key) DO UPDATE SET
        lat = EXCLUDED.lat, lng = EXCLUDED.lng,
        formatted_address = EXCLUDED.formatted_address, place_name = EXCLUDED.place_name,
        created_at = NOW()
    `;
    return res.json({ ...result, cached: false });
  } catch (error) {
    console.error('[Geocode] Error:', error);
    const result = await geocodeReverse(lat, lng, mapsApiKey);
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
