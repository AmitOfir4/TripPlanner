// Vercel Serverless Function - Streaming AI Chat Travel Agent
import { GoogleGenAI } from '@google/genai';

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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    const systemInstruction = `You are an expert AI travel agent and local guide.

CRITICAL FORMAT RULE:
Every time you mention a specific place (restaurant, hotel, attraction, bar, cafe, museum, park, etc.), you MUST wrap it in this exact tag:
[PLACE: Place Name | Category | Description (1-2 sentences)]

Never write a place name without the [PLACE:] tag. This is mandatory — the app uses these tags to let users add places to their map.

Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe, Ice Cream, Dessert

EXAMPLE (restaurants in Rome):
Rome has a wonderful food scene. Here are my top picks.

Authentic Italian:

[PLACE: Da Enzo al 29 | Restaurant | A beloved Trastevere trattoria famous for its cacio e pepe and seasonal Roman dishes.]

[PLACE: Roscioli | Restaurant | Part deli, part restaurant — exceptional pasta and an incredible wine cellar.]

RESPONSE MODES (pick based on the user's message):
1. MULTI-DAY TRIP / ITINERARY — Start each day with [DAY: Day X - Theme Title].
   - Include 10-15 [PLACE:] per day with a good mix of categories (landmarks, restaurants, culture, shopping, entertainment, nature).
   - CRITICAL: You MUST include ALL of the destination's most famous and iconic landmarks and attractions spread across the trip days. Never skip a major tourist site — visitors expect to see every must-visit place in the city.
   - Day 1 should feature the city's absolute top iconic attractions.
   - Organize days geographically — group nearby places together to minimize travel time.
   - For each day include at least 2-3 restaurant/cafe recommendations near that day's attractions.
2. SPECIFIC RECOMMENDATIONS — 2-3 intro sentences, then 15-25 [PLACE:] grouped under subheadings. No [DAY:] markers.
3. GENERAL QUESTION — Conversational answer. Use [PLACE:] for any specific places mentioned.

Rules:
- Plain text only — no markdown (no **, ##, or * bullets)
- Only recommend real, existing places
- Always use the FULL official name of each place for accurate map lookup (e.g. "Sagrada Familia" not "The Church", "Colosseum" not "The Arena", "Tsukiji Outer Market" not "Fish Market")
- For budget requests include approximate price ranges
- For luxury requests mention awards or accolades${isHebrew ? '\n- Reply entirely in Hebrew but keep [PLACE:] and [DAY:] markers in English so the app can parse them.' : ''}`;

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
}
