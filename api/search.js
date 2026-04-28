// Vercel Serverless Function - Quick Search (Phase 1)
import { GoogleGenAI } from '@google/genai';
import { applyCors, enforceRateLimit, safeError, truncate } from './_security.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (enforceRateLimit(req, res, 'search')) return;

  try {
    const { city, query, apiKey } = req.body;

    // Validation
    if (!city || !query) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both city and query are required'
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'API key required',
        message: 'Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey'
      });
    }
    const geminiApiKey = apiKey;

    console.log(`[Quick Search] ${truncate(city, 40)} - "${truncate(query)}"`);

    // Initialize Gemini AI with provided key
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    // Simple, fast prompt - just get place names and categories
    const prompt = `List 60 places in ${city} for: "${query}"
    
Format each place as:
Name | Category

Categories: Landmark, Restaurant, Shopping, Hotel, Nature, Entertainment, Museum, Beach, Nightlife, Adventure, Culture, Cafe, Ice Cream, Dessert

Example:
Burj Khalifa | Landmark
The Dubai Mall | Shopping`;

    // Fast generation without Google Maps grounding
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
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
    safeError(res, error, 'Search');
  }
}
