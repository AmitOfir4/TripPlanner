
import { GoogleGenAI } from "@google/genai";
import { TripRecommendation, Language, GroundingChunk } from "./types";

export const fetchSuggestions = async (
  city: string,
  query: string,
  language: Language,
  excludeTitles: string[] = [],
  latLng?: { latitude: number, longitude: number }
): Promise<{ suggestions: TripRecommendation[], sources: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const languageName = language === 'he' ? 'Hebrew' : 'English';
  const excludeText = excludeTitles.length > 0 
    ? `\nDO NOT suggest: [${excludeTitles.join(', ')}].` 
    : '';
  
  const prompt = `You are a travel expert. Suggest 8-10 specific places in ${city} for: "${query}".
  ${excludeText}
  Respond in ${languageName}.
  
  RULES:
  1. USE GOOGLE MAPS GROUNDING: Find exact coordinates and ratings.
  2. PROVIDE GEOLOCATION: You MUST include (latitude, longitude) for every place.
  3. BE SPECIFIC: Use full official names for landmarks.
  
  RESPONSE FORMAT (Strictly one line per place):
  * [Category] | Place Name | [Rating/5.0] | (latitude, longitude) - Short Description
  
  Example:
  * [Landmark] | Eiffel Tower | [4.8/5.0] | (48.8584, 2.2945) - The iconic iron lattice tower.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }], 
      toolConfig: {
        retrievalConfig: {
          latLng: latLng
        }
      }
    },
  });

  const text = response.text || "";
  const sdkChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const suggestions: TripRecommendation[] = [];
  const lines = text.split('\n');
  const coordRegex = /\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
  const ratingRegex = /\[(\d+\.?\d*)\/5\.0\]/;
  const categoryRegex = /^[*-\s]*\[(.*?)\]/;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      let category = "Other";
      const catMatch = trimmedLine.match(categoryRegex);
      if (catMatch) category = catMatch[1];

      let lat: number | undefined;
      let lng: number | undefined;
      const coordMatch = trimmedLine.match(coordRegex);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }

      let rating: number | undefined;
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

      // Extract Place ID - prioritize direct placeId field, then parse from URI
      let placeId = matchingChunk?.maps?.placeId;
      if (!placeId) {
        const uri = matchingChunk?.maps?.uri || "";
        const placeIdMatch = uri.match(/place_id:([^&/]+)/) || uri.match(/query_place_id=([^&/]+)/);
        placeId = placeIdMatch ? placeIdMatch[1] : undefined;
      }

      if (placeName && placeName !== "Unknown Place" && lat !== undefined && lng !== undefined) {
        // Use Places Photo API - will be fetched client-side with place_id
        // Don't pre-generate photo URL, let client fetch via Places API
        const photoUrl = undefined;

        suggestions.push({
          title: placeName,
          description: description,
          category: category,
          mapUrl: matchingChunk?.maps?.uri,
          lat,
          lng,
          rating,
          photoUrl: photoUrl,
          placeId: placeId
        });
      }
    }
  });

  const uniqueSuggestions = suggestions.filter((v, i, a) => a.findIndex(t => (t.title === v.title)) === i);

  return { 
    suggestions: uniqueSuggestions.sort((a, b) => (b.rating || 0) - (a.rating || 0)), 
    sources: sdkChunks.filter(c => !!c.maps) as GroundingChunk[] 
  };
};
