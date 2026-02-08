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
    if (!city || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both city and message are required'
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

    console.log(`[Chat] ${city} - User: "${message}"${apiKey ? ' (user key)' : ' (env key)'}`);

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' + 
        conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
    }

    // Check if user is requesting a multi-day trip
    const isMultiDayRequest = /\b(\d+[\s-]*day|day[\s-]*trip|itinerary|\d+[\s-]*night|week)\b/i.test(message);
    
    // Expert travel agent prompt
    const prompt = `You are an expert travel agent helping someone plan a trip to ${city}. 
Be conversational, friendly, and provide detailed recommendations.

IMPORTANT FORMATTING RULES:
1. For EVERY place you recommend (restaurants, hotels, attractions, cafes, etc.), use this EXACT format:
   [PLACE: Name | Category | Description]
   
2. Categories must be one of: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe

${isMultiDayRequest ? `3. MULTI-DAY TRIP FORMAT:
   - Start each day with: [DAY: Day X - Title]
   - Provide a complete day-by-day schedule
   - Include breakfast, lunch, dinner venues
   - Add morning, afternoon, and evening activities
   - Suggest 8-12 places per day for a full experience
   - Include travel tips between locations

   Example:
   [DAY: Day 1 - Classic Paris]
   
   Morning:
   Start with coffee and croissants at this iconic Left Bank cafe.
   [PLACE: Café de Flore | Cafe | Historic cafe for authentic Parisian breakfast]
   
   Spend 3-4 hours exploring the masterpieces.
   [PLACE: Louvre Museum | Museum | World's largest art museum with Mona Lisa]
   
   Lunch:
   [PLACE: Angelina Paris | Cafe | Famous for hot chocolate and Mont-Blanc dessert]
   
   [DAY: Day 2 - Art & Romance]
   ...` : `3. SIMPLE RECOMMENDATIONS FORMAT:
   - DO NOT use [DAY:...] markers
   - Just provide a conversational response with place recommendations
   - List 10-15 places with [PLACE:...] format
   - Group by category if helpful (e.g., "Best Sushi Spots:", "Traditional Restaurants:", etc.)
   
   Example:
   Tokyo is a food lover's paradise! Here are the best food spots you shouldn't miss:
   
   **Traditional Japanese:**
   [PLACE: Sukiyabashi Jiro | Restaurant | World-famous sushi by master Jiro Ono]
   [PLACE: Tempura Kondo | Restaurant | Michelin-starred tempura specialist]
   
   **Ramen Excellence:**
   [PLACE: Ichiran Shibuya | Restaurant | Customizable tonkotsu ramen in private booths]
   ...`}

${conversationContext}

User's current message: ${message}

Provide a detailed itinerary with [DAY: ...] markers and [PLACE:...] format for EVERY venue.`;

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

    res.json({
      response: cleanIntro,
      dayGroups: dayGroups,
      city
    });

  } catch (error) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      error: 'Chat failed',
      message: error.message || 'An error occurred while processing your message'
    });
  }
}
