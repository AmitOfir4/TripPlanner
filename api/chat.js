// Vercel Serverless Function - AI Chat Travel Agent
import { GoogleGenAI } from '@google/genai';

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

    // Validation
    if (!message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Message is required'
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

    console.log(`[Chat] ${city || 'Unknown'} - User: "${message}"${apiKey ? ' (user key)' : ' (env key)'}`);

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' + 
        conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
    }

    // ── Intent Detection ──────────────────────────────────────────────────────
    const isMultiDayRequest = /\b(\d+[\s-]*days?|day[\s-]*trip|itinerary|\d+[\s-]*nights?|full[\s-]*week)\b/i.test(message);
    const isSpecificRecommendation = !isMultiDayRequest && (
      /\b(recommend|suggest|best|top|good|great|where to|where can|affordable|cheap|budget|luxury|hidden gem|local|authentic|must[\s-]?try|must[\s-]?see|must[\s-]?visit)\b/i.test(message) ||
      /\b(restaurant|cafe|coffee|food|eat|dining|hotel|stay|hostel|bar|nightlife|club|museum|gallery|attraction|shopping|market|beach|park|activities|things to do|sights)\b/i.test(message)
    );

    // Extract optional qualifiers for richer prompts
    const isBudgetFriendly = /\b(affordable|cheap|budget|inexpensive|low[\s-]cost|free)\b/i.test(message);
    const isLuxuryReq     = /\b(luxury|upscale|high[\s-]end|fine dining|michelin|premium|fancy)\b/i.test(message);
    const isRomantic      = /\b(romantic|couple[s]?|date night|honeymoon)\b/i.test(message);
    const isFamilyReq     = /\b(family|kid[s]?|children|child-friendly)\b/i.test(message);

    const budgetNote = isBudgetFriendly
      ? ' Prioritize budget-friendly and affordable options. Include an approximate price range in the description where possible.'
      : isLuxuryReq
      ? ' Focus on luxury, high-end or Michelin-recognized options. Mention awards, accolades or price level in descriptions where relevant.'
      : '';
    const vibeNote = isRomantic
      ? ' Note which places are especially suitable for couples or romantic occasions.'
      : isFamilyReq
      ? ' Note which places are particularly family-friendly or suitable for children.'
      : '';

    // ── City Resolution ───────────────────────────────────────────────────────
    // A city explicitly mentioned in the message ALWAYS wins over the session city.
    // This lets users ask about a different city (e.g. "restaurants in Milan")
    // even when their current map/trip is for another city (e.g. Monaco).
    const messageCityMatch =
      message.match(/\b(?:restaurants?|hotels?|cafes?|bars?|clubs?|museums?|attractions?|places?|spots?|things?|activities)\s+in\s+([a-zA-Z][a-zA-Z\s]{1,25}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we))/i) ||
      message.match(/\b(?:in|to|at|for|visit(?:ing)?)\s+([a-zA-Z][a-zA-Z\s]{1,20}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we|to))/i);
    const cityFromMessage = messageCityMatch ? messageCityMatch[1].trim() : null;
    const resolvedCity = cityFromMessage || city;

    // ── Build Prompt Based on Intent ──────────────────────────────────────────
    let prompt;

    if (isMultiDayRequest) {
      const dayCount = (message.match(/\b(\d+)[\s-]*days?\b/i) || [])[1] || 'several';
      prompt = `You are an expert travel agent creating a complete trip itinerary${
        resolvedCity ? ` for ${resolvedCity}` : ''
      }.
The user asked: "${message}"

RULES:
1. Create a detailed day-by-day itinerary for ${dayCount} days.
2. Start EACH day with: [DAY: Day X - Theme Title]
3. For EVERY place use EXACTLY: [PLACE: Name | Category | Description]
4. Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe
5. Include 8-12 places per day: morning activity, lunch, afternoon sights, dinner, optional evening spot.
6. Add 1-2 narrative sentences before each place for context and travel tips.
7. Plain text only — no markdown bold (**).${budgetNote}${vibeNote}

${conversationContext}
Now create the full ${dayCount}-day itinerary:`;

    } else if (isSpecificRecommendation) {
      prompt = `You are a knowledgeable local travel guide${
        resolvedCity ? ` for ${resolvedCity}` : ''
      }.
The user asked: "${message}"${budgetNote}${vibeNote}

RULES:
1. Start with 2-3 conversational intro sentences.
2. List 12-20 highly relevant places.
3. For EVERY place use EXACTLY: [PLACE: Name | Category | Description]
4. Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe
5. Group places under short plain-text subheadings (e.g. "Traditional & Local:" or "Best Value Picks:").
6. Each description: 1-2 sentences explaining why it matches the request.
7. DO NOT use [DAY:...] markers. Plain text only — no markdown bold (**).
8. ONLY recommend places in${resolvedCity ? ` ${resolvedCity}` : ' the city the user asked about'}.

${conversationContext}
Your recommendations:`;

    } else {
      prompt = `You are a friendly and knowledgeable travel expert${
        resolvedCity ? ` specializing in ${resolvedCity}` : ''
      }.
The user asked: "${message}"

Answer helpfully and conversationally. If you mention specific places worth visiting, format each as:
[PLACE: Name | Category | Short description]
Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe

Plain text only — no markdown bold (**). Do NOT use [DAY:...] markers.
${conversationContext}
Your answer:`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8000
      },
    });

    const aiResponse = response.text || "";
    console.log(`[Chat] AI responded (${aiResponse.length} chars)`);

    // Extract days and places structure
    const dayRegex = /\[DAY:\s*([^\]]+)\]/g;
    const placeRegex = /\[PLACE:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/g;
    
    // Find all day markers
    const dayMatches = [];
    let dayMatch;
    while ((dayMatch = dayRegex.exec(aiResponse)) !== null) {
      dayMatches.push({
        title: dayMatch[1].trim(),
        index: dayMatch.index,
        endIndex: dayMatch.index + dayMatch[0].length
      });
    }

    // Structure to hold day-grouped places
    const dayGroups = [];
    
    if (dayMatches.length > 0) {
      // Process each day section
      for (let i = 0; i < dayMatches.length; i++) {
        const currentDay = dayMatches[i];
        const nextDay = dayMatches[i + 1];
        const sectionStart = currentDay.endIndex;
        const sectionEnd = nextDay ? nextDay.index : aiResponse.length;
        const daySection = aiResponse.substring(sectionStart, sectionEnd);
        
        // Extract text without place markers for this day
        const dayText = daySection.replace(placeRegex, '').trim();
        
        // Extract places for this day
        const dayPlaces = [];
        placeRegex.lastIndex = 0; // Reset regex
        let placeMatch;
        while ((placeMatch = placeRegex.exec(daySection)) !== null) {
          dayPlaces.push({
            title: placeMatch[1].trim(),
            category: placeMatch[2].trim(),
            description: placeMatch[3].trim(),
            city: resolvedCity || undefined,
            needsEnrichment: true,
            lat: undefined,
            lng: undefined,
            rating: undefined
          });
        }
        
        dayGroups.push({
          dayTitle: currentDay.title,
          dayText: dayText,
          places: dayPlaces
        });
      }
    } else {
      // No day markers found - treat as single response
      const places = [];
      let match;
      placeRegex.lastIndex = 0;
      while ((match = placeRegex.exec(aiResponse)) !== null) {
        places.push({
          title: match[1].trim(),
          category: match[2].trim(),
          description: match[3].trim(),
          city: resolvedCity || undefined,
          needsEnrichment: true,
          lat: undefined,
          lng: undefined,
          rating: undefined
        });
      }
      
      if (places.length > 0) {
        dayGroups.push({
          dayTitle: 'Recommendations',
          dayText: '', // Empty to avoid duplication with cleanIntro
          places: places
        });
      }
    }

    // Get intro text (everything before first [DAY:] marker)
    const firstDayIndex = dayMatches.length > 0 ? dayMatches[0].index : aiResponse.length;
    const introText = aiResponse.substring(0, firstDayIndex).trim();
    
    // Replace markers with just the place names to keep text readable
    const cleanIntro = introText
      .replace(placeRegex, (match, name) => name.trim())
      .replace(dayRegex, '')
      .replace(/\*/g, '')  // Remove all markdown formatting (*, **)
      .trim();

    const totalPlaces = dayGroups.reduce((sum, day) => sum + day.places.length, 0);
    console.log(`[Chat] Extracted ${totalPlaces} places across ${dayGroups.length} day(s)`);

    // Respond with the resolved city (message city takes priority over session city)
    let responseCity = resolvedCity || city;
    if (!responseCity && totalPlaces > 0) {
      // Try to extract city from the first place or the response
      const cityMatch = aiResponse.match(/\b(?:in|to|visiting)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
      responseCity = cityMatch ? cityMatch[1] : '';
    }

    res.json({
      response: cleanIntro,
      dayGroups: dayGroups,
      city: responseCity
    });

  } catch (error) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      error: 'Chat failed',
      message: error.message || 'An error occurred while processing your message'
    });
  }
}
