import { ChatMessage, DayGroup } from "./components/ChatInterface";

// Backend API endpoints
const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT ||
                      (import.meta.env.DEV ? 'http://localhost:3001/api/chat' : '/api/chat');

interface ChatResponse {
  response: string;
  dayGroups?: DayGroup[];
  city: string;
}

// Send a chat message and stream the response via SSE.
// `onChunk` fires for each text token from Gemini.
export const sendChatMessage = async (
  city: string,
  message: string,
  apiKey: string,
  conversationHistory: ChatMessage[] = [],
  onChunk?: (text: string) => void
): Promise<ChatResponse> => {
  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city,
      message,
      apiKey,
      conversationHistory: conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    })
  });

  if (!response.ok) {
    // Non-streaming error (headers not yet switched to SSE)
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result: ChatResponse = { response: '', dayGroups: [], city };
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || ''; // keep incomplete event in buffer

    for (const event of events) {
      const trimmed = event.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(trimmed.slice(6));
        if (data.type === 'chunk' && onChunk) {
          onChunk(data.text);
        } else if (data.type === 'done') {
          result = {
            response: data.response || '',
            dayGroups: data.dayGroups || [],
            city: data.city || city
          };
        } else if (data.type === 'error') {
          throw new Error(data.message);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // skip malformed JSON chunk
        throw e;
      }
    }
  }

  return result;
};
