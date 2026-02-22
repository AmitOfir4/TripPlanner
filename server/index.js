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
      model: "gemini-2.5-flash",
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
      model: "gemini-2.5-flash",
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

// Chat endpoint - conversational AI travel agent
app.post('/api/chat', async (req, res) => {
  try {
    const { city, message, apiKey, conversationHistory = [] } = req.body;

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

    // ── Intent Detection ──────────────────────────────────────────────────
    const isMultiDayRequest = /\b(\d+[\s-]*days?|day[\s-]*trip|itinerary|\d+[\s-]*nights?|full[\s-]*week)\b/i.test(message);
    const isSpecificRecommendation = !isMultiDayRequest && (
      /\b(recommend|suggest|best|top|good|great|where to|where can|affordable|cheap|budget|luxury|hidden gem|local|authentic|must[\s-]?try|must[\s-]?see|must[\s-]?visit)\b/i.test(message) ||
      /\b(restaurant|cafe|coffee|food|eat|dining|hotel|stay|hostel|bar|nightlife|club|museum|gallery|attraction|shopping|market|beach|park|activities|things to do|sights)\b/i.test(message)
    );

    // Extract optional qualifiers for richer, more tailored prompts
    const isBudgetFriendly = /\b(affordable|cheap|budget|inexpensive|low[\s-]cost|free)\b/i.test(message);
    const isLuxuryReq     = /\b(luxury|upscale|high[\s-]end|fine dining|michelin|premium|fancy)\b/i.test(message);
    const isRomantic      = /\b(romantic|couple[s]?|date night|honeymoon)\b/i.test(message);
    const isFamilyReq     = /\b(family|kid[s]?|children|child-friendly)\b/i.test(message);

    const budgetNote = isBudgetFriendly
      ? ' Prioritize budget-friendly and affordable options with good value for money. Include an approximate price range (e.g. "€10-20/person") in the description where possible.'
      : isLuxuryReq
      ? ' Focus on luxury, high-end or Michelin-recognized options. Mention awards, accolades or price level in descriptions where relevant.'
      : '';
    const vibeNote = isRomantic
      ? ' Note which places are especially suitable for couples or romantic occasions.'
      : isFamilyReq
      ? ' Note which places are particularly family-friendly or suitable for children.'
      : '';

    // Resolve city: the message city always wins, session city is a fallback only
    // Use a case-insensitive regex so "milan" and "Milan" both match
    const messageCityMatch = message.match(
      /\b(?:in|to|at|for|visit(?:ing)?)\s+([a-zA-Z][a-zA-Z\s]{1,20}?)\b(?=\s*[,.]|\s*$|\s*[-–]|\s+(?:for|with|and|please|i|we|to))/i
    ) || message.match(/\b(?:restaurants|hotels|cafes?|bars?|clubs?|museums?|attractions?|places?|spots?|things?)\s+in\s+([a-zA-Z][a-zA-Z\s]{1,20}?)(?=[,.]|\s*$|\s+[-–]|\s+(?:for|with|and|please|i|we))/i);
    const cityFromMessage = messageCityMatch ? messageCityMatch[1].trim() : null;
    // Give explicit city in the message priority over the session/map city
    let resolvedCity = cityFromMessage || city;

    // ── Build Prompt Based on Intent ──────────────────────────────────────
    let prompt;

    if (isMultiDayRequest) {
      // ── MODE 1: Multi-day trip itinerary ──
      const dayCount = (message.match(/\b(\d+)[\s-]*days?\b/i) || [])[1] || 'several';
      prompt = `You are an expert travel agent creating a complete trip itinerary${
        resolvedCity ? ` for ${resolvedCity}` : ''
      }.
The user asked: "${message}"

RULES:
1. Create a detailed day-by-day itinerary for ${dayCount} days.
2. Start EACH day with: [DAY: Day X - Theme Title]
3. For EVERY place (breakfast spots, attractions, restaurants, bars, hotels) use EXACTLY:
   [PLACE: Name | Category | Description]
4. Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe
5. Include 8-12 places per day: morning activity, lunch, afternoon activity/sights, dinner, optional evening spot.
6. Add 1-2 narrative sentences before each place for context and travel tips.
7. Plain text only — no markdown bold (**).${budgetNote}${vibeNote}

${conversationContext}
Now create the full ${dayCount}-day itinerary:`;

    } else if (isSpecificRecommendation) {
      // ── MODE 2: Specific category/question recommendations ──
      prompt = `You are a knowledgeable local travel guide${
        resolvedCity ? ` for ${resolvedCity}` : ''
      }.
The user asked: "${message}"${budgetNote}${vibeNote}

RULES:
1. Start with 2-3 conversational intro sentences explaining your approach.
2. Then list 12-20 highly relevant places.
3. For EVERY place use EXACTLY: [PLACE: Name | Category | Description]
4. Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe
5. Group places under short plain-text subheadings (e.g. "Traditional & Local:" or "Best Value Picks:").
6. Each description: 1-2 sentences explaining why this place matches the request.
7. DO NOT use [DAY:...] markers. Plain text only — no markdown bold (**).
8. Only recommend places in${resolvedCity ? ` ${resolvedCity}` : ' the city the user asked about'}.

${conversationContext}
Your recommendations:`;

    } else {
      // ── MODE 3: General travel question / conversation ──
      prompt = `You are a friendly and knowledgeable travel expert${
        resolvedCity ? ` specializing in ${resolvedCity}` : ''
      }.
The user asked: "${message}"

Answer helpfully and conversationally. If you naturally mention specific places worth visiting, format each as:
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

    // Extract city from response if not provided (look for city name in places or message)
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
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`📍 Gemini API endpoint: http://localhost:${PORT}/api/search`);
  console.log(`⏱️  Rate limiting: disabled`);
});

export default app;
