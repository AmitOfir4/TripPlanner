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

// Gemini streaming search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { city, query, excludeTitles = [], latLng } = req.body;

    // Validation
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

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const excludeText = excludeTitles.length > 0 
      ? `\nDO NOT suggest: [${excludeTitles.join(', ')}].` 
      : '';
    
    const prompt = `You are a travel expert. Find 150-200 specific, diverse places in ${city} for: "${query}".
  ${excludeText}
  Respond in English.
  
  RULES:
  1. USE GOOGLE MAPS GROUNDING: Find exact coordinates and ratings.
  2. PROVIDE GEOLOCATION: You MUST include (latitude, longitude) for every place.
  3. BE SPECIFIC: Use full official names for landmarks.
  4. PRIORITIZE: Mix popular spots with hidden local gems.
  5. DIVERSIFY: Cover different neighborhoods and areas.
  6. AVOID: Chain restaurants/stores unless highly relevant.
  
  RESPONSE FORMAT (Strictly one line per place):
  * [Category] | Place Name | [Rating/5.0] | (latitude, longitude) - Short Description (max 20 words)
  
  Example:
  * [Landmark] | Eiffel Tower | [4.8/5.0] | (48.8584, 2.2945) - The iconic iron lattice tower and symbol of Paris.`;

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }], 
        toolConfig: {
          retrievalConfig: {
            latLng: latLng
          }
        },
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 16384
      },
    });

    let accumulatedText = "";
    let processedLines = new Set();
    let batchNumber = 0;
    let pendingPlaces = [];
    let allGroundingChunks = [];
    
    const coordRegex = /\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
    const ratingRegex = /\[(\d+\.?\d*)\/5\.0\]/;
    const categoryRegex = /^[*-\s]*\[(.*?)\]/;

    const parseLine = (line, sdkChunks) => {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) return null;

      let category = "Other";
      const catMatch = trimmedLine.match(categoryRegex);
      if (catMatch) category = catMatch[1];

      let lat = undefined;
      let lng = undefined;
      const coordMatch = trimmedLine.match(coordRegex);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }

      let rating = undefined;
      const ratingMatch = trimmedLine.match(ratingRegex);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);

      const parts = trimmedLine.split('|').map(p => p.trim());
      let placeName = "Unknown Place";
      if (parts.length > 1) {
        placeName = parts[1].replace(/\[.*?\]/, '').trim();
      }

      let description = "";
      const descPart = trimmedLine.split(' - ');
      description = descPart.length > 1 ? descPart[descPart.length - 1].trim() : `Explore ${placeName} in ${city}.`;

      const matchingChunk = sdkChunks.find(c => 
        c.maps?.title?.toLowerCase().includes(placeName.toLowerCase()) || 
        placeName.toLowerCase().includes(c.maps?.title?.toLowerCase() || "")
      );

      let placeId = matchingChunk?.maps?.placeId;
      if (!placeId && matchingChunk) {
        const uri = matchingChunk?.maps?.uri || "";
        const placeIdMatch = uri.match(/place_id:([^&/]+)/) || uri.match(/query_place_id=([^&/]+)/);
        placeId = placeIdMatch ? placeIdMatch[1] : undefined;
      }

      if (placeName && placeName !== "Unknown Place" && lat !== undefined && lng !== undefined) {
        return {
          title: placeName,
          description: description,
          category: category,
          mapUrl: matchingChunk?.maps?.uri,
          lat,
          lng,
          rating,
          placeId: placeId
        };
      }
      return null;
    };

    const sendBatch = (places) => {
      if (places.length === 0) return;
      batchNumber++;
      const data = JSON.stringify({
        batchNumber,
        results: places,
        total: places.length
      });
      res.write(`data: ${data}\n\n`);
    };

    // Process stream chunks
    for await (const chunk of stream) {
      const chunkText = chunk.text || "";
      accumulatedText += chunkText;
      
      // Collect grounding chunks
      const chunkGroundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      allGroundingChunks.push(...chunkGroundingChunks);

      // Process complete lines
      const lines = accumulatedText.split('\n');
      
      // Keep the last incomplete line in buffer
      const lastLine = lines.pop();
      
      for (const line of lines) {
        const lineHash = line.trim();
        if (lineHash && !processedLines.has(lineHash)) {
          processedLines.add(lineHash);
          const place = parseLine(line, allGroundingChunks);
          if (place) {
            pendingPlaces.push(place);
            
            // Send batch of 10
            if (pendingPlaces.length >= 10) {
              sendBatch(pendingPlaces);
              pendingPlaces = [];
            }
          }
        }
      }
      
      accumulatedText = lastLine || "";
    }

    // Process any remaining text
    if (accumulatedText.trim()) {
      const place = parseLine(accumulatedText, allGroundingChunks);
      if (place) pendingPlaces.push(place);
    }

    // Send final batch
    if (pendingPlaces.length > 0) {
      sendBatch(pendingPlaces);
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`📍 Gemini API endpoint: http://localhost:${PORT}/api/search`);
  console.log(`⏱️  Rate limiting: disabled`);
});

export default app;
