// Vercel Serverless Function - Streaming AI Chat Travel Agent
import { GoogleGenAI } from '@google/genai';
import { applyCors, enforceRateLimit, safeError, truncate, CHAT_LIMITS } from './_security.js';

// Grammatical function words — structural words that can never be part of a real city name.
// Checked against every word in the candidate (not just the first).
const FUNCTION_WORDS = new Set([
  'i','me','my','we','us','our','you','your','they','them','their',
  'he','him','his','she','her','it','its',
  'this','that','these','those','there','here',
  'a','an','the','all','some','any','every','each'
]);

// Generic travel/action words that are only invalid when they are the entire candidate.
// Multi-word candidates like "New York City" still pass even though "city" is in this set.
const GENERIC_TRAVEL_WORDS = new Set([
  'day','days','trip','trips','plan','visit','holiday','vacation',
  'weekend','week','place','places','area','city','town','country',
  'world','destination','guide','tour','itinerary'
]);

function isValidCityCandidate(candidate) {
  const words = candidate.trim().split(/\s+/);
  if (!words.length || words[0].length < 2) return false;
  // Reject if any word is a grammatical function word (e.g. "the city", "my place")
  if (words.some(w => FUNCTION_WORDS.has(w.toLowerCase()))) return false;
  // Reject a single bare generic word like "trip", "day", "city"
  if (words.length === 1 && GENERIC_TRAVEL_WORDS.has(words[0].toLowerCase())) return false;
  return true;
}

function extractCityFromMessage(message) {
  // Ordered from most to least specific — first valid match wins
  const latinPatterns = [
    // 1) Trip intent: "trip to X", "traveling to X", "vacation in X"
    /\b(?:trip|travel|vacation|holiday|fly(?:ing)?|going|headed)\s+(?:to|in)\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|where|from|\d))/i,
    // 2) Duration: "3 days in X", "weekend in X"
    /\b(?:\d+\s*days?|weekend|week)\s+(?:in|at)\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|\d))/i,
    // 3) Category + in: "restaurants in X", "attractions in X"
    /\b(?:restaurants?|hotels?|cafes?|bars?|clubs?|museums?|attractions?|places?|spots?|things?|activities)\s+in\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we))/i,
    // 4) Visit/explore: "visiting X", "explore X"
    /\b(?:visit(?:ing)?|explore|exploring|discover)\s+([A-Za-z][A-Za-z\s]{1,20}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|\d))/i,
    // 5) Generic "in/to X" — require uppercase start to reduce false positives
    /\b(?:in|to|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?=[,.]|\s|$)/,
  ];

  for (const pattern of latinPatterns) {
    const m = message.match(pattern);
    if (!m) continue;
    const candidate = m[1].trim();
    if (isValidCityCandidate(candidate)) return candidate;
  }

  // Hebrew patterns (validation not needed — Hebrew words are inherently non-function-words here)
  const hebrewPatterns = [
    /(?:מסעדות?|בתי קפה|מלונות?|ברים|אטרקציות?|מקומות?)\s+ב([\u0590-\u05FF][\u0590-\u05FF\s]{1,20}?)(?=[,.]|\s*$)/u,
    /(?:^|\s)ב([\u0590-\u05FF][\u0590-\u05FF\s]{1,20}?)(?=[,.]|\s*$|\s+[-–])/u,
  ];
  for (const pattern of hebrewPatterns) {
    const m = message.match(pattern);
    if (m) return m[1].trim();
  }

  return null;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (enforceRateLimit(req, res, 'chat')) return;

  try {
    const { city, message, apiKey, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Message is required'
      });
    }
    if (message.length > CHAT_LIMITS.maxMessageChars) {
      return res.status(413).json({
        error: 'Message too long',
        message: `Please keep messages under ${CHAT_LIMITS.maxMessageChars} characters.`
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'API key required',
        message: 'Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey'
      });
    }
    const geminiApiKey = apiKey;

    // ── City Resolution ─────────────────────────────────────────────────
    const cityFromMessage = extractCityFromMessage(message);
    const resolvedCity = cityFromMessage || city;

    const isHebrew = /[\u0590-\u05FF]/.test(message);

    console.log(`[Chat] ${resolvedCity || 'Unknown'} - "${truncate(message)}" (stream)`);

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
[PLACE: Place Name | Category | Description (1-2 sentences) | lat,lng | rating | City, CC]

- lat,lng (REQUIRED): real GPS coordinates in decimal degrees, e.g. 25.2048,55.2708. Never omit.
- rating (OPTIONAL): the typical Google Maps rating you've seen for this place, as a single decimal between 1.0 and 5.0 (e.g. 4.5). Only include when you are confident — well-known landmarks, popular restaurants, established hotels. OMIT the entire "| rating" segment when you're not confident; never invent ratings for obscure or hypothetical places.
- City, CC (REQUIRED, never omit): the English city name and ISO-3166 alpha-2 country code for THIS specific place, e.g. "Naples, IT", "Bari, IT", "Paris, FR", "Dubai, AE". The app uses this to (a) put places from the same city in the same map layer and (b) constrain Google Maps lookups to the right country — without it, "Naples" can resolve to Florida instead of Italy. ALWAYS include this on every [PLACE:] tag, even for single-city responses where every place is in the same city. The country code MUST be exactly 2 letters.

Never write a place name without the [PLACE:] tag — the app uses these tags to let users save places to their map.

CITY TAG (REQUIRED when the response is about a single city):
At the very start of your response, output one [CITY_EN: City Name In English] tag using the official English name. Examples: [CITY_EN: Dubai], [CITY_EN: Paris], [CITY_EN: Tokyo], [CITY_EN: New York City]. Do this even when the user asked in another language (Hebrew, Spanish, etc.). The tag is critical — it lets the app cache lookups consistently across languages. Omit for multi-city or multi-region responses (use the per-place "City, CC" field instead).

Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe, Ice Cream, Dessert

EXAMPLES:

User: "give me good ice cream in Dubai"
Dubai has a great ice cream scene, from artisanal gelato to local favourites.

[PLACE: Mirzam Chocolate & Sweets | Dessert | Award-winning bean-to-bar chocolatier offering creative ice cream flavours in a beautiful space. | 25.1855,55.2530 | 4.6 | Dubai, AE]
[PLACE: Salt | Ice Cream | Iconic Dubai street-food brand famous for its salted caramel soft serve and inventive seasonal flavours. | 25.1935,55.2792 | 4.5 | Dubai, AE]

User: "cheap but good restaurants in Paris"
Paris has excellent affordable dining well beyond tourist spots. Here are the best value picks.

Budget Bistros:
[PLACE: Bouillon Chartier | Restaurant | Historic Parisian bouillon serving classic French dishes since 1896 at incredibly low prices. | 48.8729,2.3481 | 4.0 | Paris, FR]
[PLACE: Le Relais de la Butte | Restaurant | Unpretentious Montmartre neighbourhood bistro with generous portions and wines by the carafe. | 48.8864,2.3428 | 4.4 | Paris, FR]

User: "10-day trip to southern Italy, landing in Naples then Amalfi and Puglia"
A great mix of three regions — Naples for history and pizza, the Amalfi Coast for dramatic seaside towns, and Puglia for whitewashed villages and trulli.

[DAY: Day 1 - Naples Arrival]
[PLACE: Historic Centre of Naples | Landmark | UNESCO World Heritage old town packed with churches, palaces, and bustling piazzas. | 40.8518,14.2681 | 4.7 | Naples, IT]
[PLACE: L'Antica Pizzeria da Michele | Restaurant | Legendary century-old pizzeria serving just two classic Neapolitan pizzas. | 40.8497,14.2681 | 4.4 | Naples, IT]

[DAY: Day 4 - Amalfi Coast]
[PLACE: Spiaggia Grande | Beach | Iconic main beach of Positano with colourful umbrellas below the cliffside town. | 40.6280,14.4892 | 4.6 | Positano, IT]
[PLACE: Amalfi Cathedral | Landmark | Striking 9th-century cathedral with a dramatic staircase in the heart of Amalfi town. | 40.6340,14.6027 | 4.7 | Amalfi, IT]

[DAY: Day 7 - Puglia / Valle d'Itria]
[PLACE: Alberobello | Landmark | UNESCO town famous for its conical-roofed trulli houses. | 40.7833,17.2333 | 4.7 | Alberobello, IT]
[PLACE: Polignano a Mare | Landmark | Whitewashed clifftop town above a hidden cove beach. | 40.9966,17.2179 | 4.7 | Polignano a Mare, IT]

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

    // ── Build multi-turn Content[] (cap count + per-message length for cost & abuse) ──
    const safeHistory = (Array.isArray(conversationHistory) ? conversationHistory : [])
      .slice(-CHAT_LIMITS.maxHistoryMessages)
      .filter(m => m && typeof m.content === 'string')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.slice(0, CHAT_LIMITS.maxHistoryCharsPerMsg) }]
      }));
    const contents = safeHistory;
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
    // Groups: 1=name, 2=category, 3=description, 4=lat,lng (optional),
    // 5=rating (optional), 6=location ("City, CC" or "City" or "CC", optional).
    const placeRegex = /\[PLACE:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|\]]+?)\s*(?:\|\s*([-\d.]+\s*,\s*[-\d.]+))?\s*(?:\|\s*([\d.]+))?\s*(?:\|\s*([^\]]+?))?\s*\]/g;

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

    // Gemini's rating field is a free-text estimate from training data — clamp
    // to the Google Maps scale and round to one decimal so the chip displays cleanly.
    const parseRating = (raw) => {
      if (!raw) return undefined;
      const r = parseFloat(raw);
      if (isNaN(r) || r < 1 || r > 5) return undefined;
      return Math.round(r * 10) / 10;
    };

    // Per-place "City, CC" trailing field. Splits city from a 2-letter country
    // code; tolerates "City" alone, "CC" alone, or "City, Country Name" (in
    // which case country falls through as undefined since we only honour ISO2).
    const parseLocation = (raw) => {
      if (!raw) return { city: undefined, country: undefined };
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length === 0) return { city: undefined, country: undefined };
      if (parts.length === 1) {
        if (/^[A-Za-z]{2}$/.test(parts[0])) return { city: undefined, country: parts[0].toUpperCase() };
        return { city: parts[0], country: undefined };
      }
      const last = parts[parts.length - 1];
      if (/^[A-Za-z]{2}$/.test(last)) {
        return { city: parts.slice(0, -1).join(', '), country: last.toUpperCase() };
      }
      return { city: parts.join(', '), country: undefined };
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
          const loc = parseLocation(placeMatch[6]);
          dayPlaces.push({
            title: placeMatch[1].trim(),
            category: placeMatch[2].trim(),
            description: placeMatch[3].trim(),
            city: loc.city || cityForPlaces,
            country: loc.country,
            rating: parseRating(placeMatch[5]),
            _geminiLat: geminiCoords?.lat,
            _geminiLng: geminiCoords?.lng,
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
        const loc = parseLocation(match[6]);
        places.push({
          title: match[1].trim(),
          category: match[2].trim(),
          description: match[3].trim(),
          city: loc.city || cityForPlaces,
          country: loc.country,
          rating: parseRating(match[5]),
          _geminiLat: geminiCoords?.lat,
          _geminiLng: geminiCoords?.lng,
        });
      }
      if (places.length > 0) {
        dayGroups.push({ dayTitle: 'Recommendations', dayText: '', places });
      }
    }

    // ── Coordinate handling: pass Gemini's coords through untouched ─────
    // Server makes ZERO Places API calls per chat message — the user pays for
    // accuracy only when they actually add a place to their map (verified
    // client-side via /api/geocode in services/geocodeService.ts).
    const allPlaces = dayGroups.flatMap(g => g.places);
    for (const place of allPlaces) {
      if (place._geminiLat != null && place._geminiLng != null) {
        place.lat = place._geminiLat;
        place.lng = place._geminiLng;
      }
      delete place._geminiLat;
      delete place._geminiLng;
    }

    // ── Country backfill ────────────────────────────────────────────────
    // Gemini sometimes omits "| City, CC" on a few places even when the prompt
    // requires it. For places missing a country, infer it from the most common
    // country among siblings — a 30-place southern-Italy itinerary with 4
    // strays still gets all 34 geocoded against IT. Keeps Naples-Florida
    // collisions from sneaking back in via the partial-tag path.
    const countryCounts = {};
    for (const p of allPlaces) {
      if (p.country) countryCounts[p.country] = (countryCounts[p.country] || 0) + 1;
    }
    const majorityCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (majorityCountry) {
      for (const p of allPlaces) {
        if (!p.country) p.country = majorityCountry;
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

    res.write(`data: ${JSON.stringify({ type: 'done', response: cleanIntro, dayGroups, city: responseCity })}\n\n`);
    res.end();

  } catch (error) {
    safeError(res, error, 'Chat');
  }
}
