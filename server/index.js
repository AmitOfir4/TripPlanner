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
    const { city, query, isAdditional = false, excludeTitles = [] } = req.body;

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
    const { places, city, latLng } = req.body;

    // Validation
    if (!places || !Array.isArray(places) || places.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'places array is required'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key not configured'
      });
    }

    console.log(`[Enrichment] Processing ${places.length} places for ${city}`);

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
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



// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`📍 Gemini API endpoint: http://localhost:${PORT}/api/search`);
  console.log(`⏱️  Rate limiting: disabled`);
});

export default app;
