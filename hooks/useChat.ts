import { useState } from 'react';
import { ChatMessage } from '../components/ChatInterface';
import { sendChatMessage } from '../chatService';
import { TripRecommendation } from '../types';

interface UseChatReturn {
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  handleSendMessage: (message: string) => Promise<void>;
  handleAddPlaceFromChat: (place: TripRecommendation) => void;
  handleAddAllPlaces: (places: TripRecommendation[]) => void;
}

export const useChat = (
  currentCity: string,
  setCurrentCity: (city: string) => void,
  apiKey: string,
  savePlace: (place: TripRecommendation) => void,
  setFocusedPlace: (place: TripRecommendation | null) => void,
  setErrorMessage: (msg: string) => void
): UseChatReturn => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    if (!apiKey) {
      setErrorMessage(
        'Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey'
      );
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    const aiMessageId = (Date.now() + 1).toString();
    const aiPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage, aiPlaceholder]);
    setErrorMessage('');
    setChatLoading(true);

    try {
      const { response, dayGroups, places, city } = await sendChatMessage(
        currentCity || '',
        message,
        apiKey,
        chatMessages,
        (chunk) => {
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
            )
          );
        }
      );

      if (city && !currentCity) {
        setCurrentCity(city);
      }

      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, content: response, dayGroups, places } : msg
        )
      );
      setChatLoading(false);
    } catch (error: any) {
      console.error('Chat error:', error);
      if (error.message?.includes('API key')) {
        setErrorMessage(error.message);
      }
      setChatMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
      setChatLoading(false);
    }
  };

  const handleAddPlaceFromChat = (place: TripRecommendation) => {
    savePlace(place);
    setFocusedPlace(place);
  };

  const handleAddAllPlaces = (places: TripRecommendation[]) => {
    places.forEach((place) => savePlace(place));
    if (places.length > 0) {
      setFocusedPlace(places[0]);
    }
  };

  return {
    chatMessages,
    chatLoading,
    handleSendMessage,
    handleAddPlaceFromChat,
    handleAddAllPlaces,
  };
};
