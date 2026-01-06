
import { TripRecommendation, GroundingChunk } from "./types";

// Backend API endpoint - change this based on your deployment
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 
                     (import.meta.env.DEV ? 'http://localhost:3001/api/search' : '/api/search');

export const fetchSuggestions = async (
  city: string,
  query: string,
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
        excludeTitles,
        latLng
      })
    });

    if (!response.ok) 
    {
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

// Streaming version for large result sets
export const fetchSuggestionsStream = async (
  city: string,
  query: string,
  onBatch: (batch: TripRecommendation[], batchNumber: number) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
  excludeTitles: string[] = [],
  latLng?: { latitude: number, longitude: number }
): Promise<void> => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        city,
        query,
        excludeTitles,
        latLng
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Streaming not supported');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            
            if (parsed.done) {
              onComplete?.();
              return;
            }
            
            if (parsed.results && Array.isArray(parsed.results)) {
              onBatch(parsed.results, parsed.batchNumber || 0);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }

    onComplete?.();
  } catch (error) {
    console.error('Error fetching streaming suggestions:', error);
    onError?.(error as Error);
    throw error;
  }
};
