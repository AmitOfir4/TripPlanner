// Vercel Serverless Function - Quick Search (Phase 1)
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
    const { city, query, apiKey } = req.body;

    // Validation
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
    
    // Simple, fast prompt - just get place names and categories
    const prompt = `List 60 places in ${city} for: "${query}"
    
Format each place as:
Name | Category

Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe

Example:
Burj Khalifa | Landmark
The Dubai Mall | Shopping`;

    // Fast generation without Google Maps grounding
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.9,
        topK: 20,
        topP: 0.85,
        maxOutputTokens: 2048
      },
    });

    const text = response.text || "";
    console.log(`[Quick Search] Gemini response received`);

    // Parse response
    const suggestions = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 3) continue;

      // Parse "Name | Category" format
      const parts = trimmedLine.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        const title = parts[0].replace(/^[-*\d.)\s]+/, '').trim();
        const category = parts[1].trim();
        
        if (title && category) {
          suggestions.push({
            title,
            category,
            description: `Explore ${title} in ${city}.`,
            needsEnrichment: true, // Flag for Phase 2
            lat: undefined,
            lng: undefined,
            rating: undefined,
            placeId: undefined,
            mapUrl: undefined
          });
        }
      }
    }

    console.log(`[Quick Search] Found ${suggestions.length} places`);

    res.json({ 
      suggestions: suggestions.slice(0, 60),
      quickSearch: true // Indicates this is quick search without full details
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message || 'An error occurred while processing your request'
    });
  }
}
