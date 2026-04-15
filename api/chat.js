// Vercel Serverless Function - Streaming AI Chat Travel Agent
import { GoogleGenAI } from '@google/genai';

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

  // 1) Trip patterns: 'trip to X', 'travel to X', 'vacation in X'
  return tryMatch(/\b(?:trip|travel|vacation|holiday|fly(?:ing)?|going|headed)\s+(?:to|in)\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|where|from|\d))/i)
    // 2) 'X days in Y', 'weekend in Y'
    || tryMatch(/\b(?:\d+\s*days?|weekend|week)\s+(?:in|at)\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|\d))/i)
    // 3) Category + in: 'restaurants in X', 'attractions in X'
    || tryMatch(/\b(?:restaurants?|hotels?|cafes?|bars?|clubs?|museums?|attractions?|places?|spots?|things?|activities)\s+in\s+([A-Za-z][A-Za-z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we))/i)
    // 4) 'visit(ing) X', 'explore X'
    || tryMatch(/\b(?:visit(?:ing)?|explore|exploring|discover)\s+([A-Za-z][A-Za-z\s]{1,20}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to|that|\d))/i)
    // 5) Generic 'in/to X' — require uppercase start to avoid false positives
    || tryMatch(/\b(?:in|to|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?=[,.]|\s|$)/)
    // 6) Hebrew: 'מסעדות בXXX' or standalone 'בXXX'
    || tryMatch(/(?:מסעדות?|בתי קפה|מלונות?|ברים|אטרקציות?|מקומות?)\s+ב([\u0590-\u05FF][\u0590-\u05FF\s]{1,20}?)(?=[,.]|\s*$)/u)
    || tryMatch(/(?:^|\s)ב([\u0590-\u05FF][\u0590-\u05FF\s]{1,20}?)(?=[,.]|\s*$|\s+[-–])/u);
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

Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe

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
