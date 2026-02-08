import { TripRecommendation } from "./types";
import { ChatMessage, DayGroup } from "./components/ChatInterface";

// Backend API endpoints
const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT || 
                      (import.meta.env.DEV ? 'http://localhost:3001/api/chat' : '/api/chat');

interface ChatResponse {
  response: string;
  dayGroups?: DayGroup[];
  places?: TripRecommendation[];
  city: string;
}

// Send a chat message to the AI travel agent
export const sendChatMessage = async (
  city: string,
  message: string,
  apiKey: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> => {
  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        city,
        message,
        apiKey,
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.response || '',
      dayGroups: data.dayGroups,
      places: data.places || [],
      city: data.city || city
    };
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};
