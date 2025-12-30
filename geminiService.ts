
import { TripRecommendation, Language, GroundingChunk } from "./types";

// Backend API endpoint - change this based on your deployment
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 
                     (import.meta.env.DEV ? 'http://localhost:3001/api/search' : '/api/search');

export const fetchSuggestions = async (
  city: string,
  query: string,
  language: Language,
  excludeTitles: string[] = [],
  latLng?: { latitude: number, longitude: number }
): Promise<{ suggestions: TripRecommendation[], sources: GroundingChunk[] }> => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        city,
        query,
        language,
        excludeTitles,
        latLng
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      suggestions: data.suggestions || [],
      sources: data.sources || []
    };
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    throw error;
  }
};
