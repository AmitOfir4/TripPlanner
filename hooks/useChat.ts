import { useState } from 'react';
import { ChatMessage } from '../components/ChatInterface';
import { sendChatMessage, ChatError } from '../chatService';
import { geocodeAddress } from '../services/geocodeService';
import { TripRecommendation } from '../types';
import { readTripDraft } from '../helpers/localDraft';

interface UseChatReturn {
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  /** Titles of places currently being verified via Google Places. Set during
   * both Add and Show-in-Map flows; chips show a spinner / disable buttons. */
  verifyingTitles: ReadonlySet<string>;
  handleSendMessage: (message: string) => Promise<void>;
  handleAddPlaceFromChat: (place: TripRecommendation) => Promise<void>;
  handleAddAllPlaces: (places: TripRecommendation[]) => Promise<void>;
  handleShowInMapFromChat: (place: TripRecommendation) => Promise<void>;
}

// Resolve a place to its precise Google Places coordinates before saving.
// On success: returns the place with verified coords AND the real Google Maps
// rating (overwriting Gemini's training-data estimate). If Places returns no
// rating for the place, the rating is cleared rather than left as the estimate
// — better to show nothing than something misleading on the saved-on-map view.
// If Places can't find the place at all, returns it unchanged so the user
// still gets the (Gemini-approximate) pin.
const verifyPlace = async (
  place: TripRecommendation,
  cityHint: string
): Promise<TripRecommendation> => {
  const cityForQuery = place.city || cityHint || undefined;
  // Gemini's per-place coords key the server cache by location, keeping it
  // language-agnostic (English stored name, Hebrew title untouched below).
  const hint = typeof place.lat === 'number' && typeof place.lng === 'number'
    ? { lat: place.lat, lng: place.lng } : undefined;
  const result = await geocodeAddress(place.title, cityForQuery, undefined, place.country, hint);
  if (result) {
    return {
      ...place,
      lat: result.lat,
      lng: result.lng,
      rating: typeof result.rating === 'number' ? result.rating : undefined,
    };
  }
  return place;
};

type ErrorKind = 'api_key' | 'quota' | 'invalid_key' | 'generic';

export const useChat = (
  currentCity: string,
  setCurrentCity: (city: string) => void,
  apiKey: string,
  savePlace: (place: TripRecommendation) => void,
  setFocusedPlace: (place: TripRecommendation | null) => void,
  setErrorMessage: (msg: string, kind?: ErrorKind) => void
): UseChatReturn => {
  // Seed from the local draft so a refresh keeps the conversation that produced
  // the current trip, not just the map.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    () => readTripDraft()?.chatMessages ?? []
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [verifyingTitles, setVerifyingTitles] = useState<ReadonlySet<string>>(new Set());

  const markVerifying = (titles: string[], on: boolean) => {
    setVerifyingTitles((prev) => {
      const next = new Set(prev);
      for (const t of titles) on ? next.add(t) : next.delete(t);
      return next;
    });
  };

  const handleSendMessage = async (message: string) => {
    if (!apiKey) {
      setErrorMessage(
        'Please provide your Gemini API key. Get one free at https://aistudio.google.com/apikey',
        'api_key'
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
      const { response, dayGroups, city } = await sendChatMessage(
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

      if (city && !currentCity) setCurrentCity(city);

      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, content: response, dayGroups } : msg
        )
      );
      setChatLoading(false);
    } catch (error: any) {
      console.error('Chat error:', error);
      // Surface user-actionable errors from the server. Stay silent on unknown
      // 500s — they're noise for users.
      const code = error instanceof ChatError ? error.errorCode : undefined;
      if (code === 'quota_exceeded') {
        setErrorMessage(error.message, 'quota');
      } else if (code === 'invalid_api_key') {
        setErrorMessage(error.message, 'invalid_key');
      } else if (error.message?.includes('API key')) {
        setErrorMessage(error.message, 'api_key');
      }
      setChatMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
      setChatLoading(false);
    }
  };

  const handleAddPlaceFromChat = async (place: TripRecommendation) => {
    markVerifying([place.title], true);
    try {
      const verified = await verifyPlace(place, currentCity);
      savePlace(verified);
      setFocusedPlace(verified);
    } finally {
      markVerifying([place.title], false);
    }
  };

  // Verify before focusing so the map pans to the exact Places-confirmed
  // coordinate, not Gemini's approximate guess. Same in-session cache as Add,
  // so clicking Show-in-Map then Add (or vice-versa) only costs one API call.
  const handleShowInMapFromChat = async (place: TripRecommendation) => {
    markVerifying([place.title], true);
    try {
      const verified = await verifyPlace(place, currentCity);
      setFocusedPlace(verified);
    } finally {
      markVerifying([place.title], false);
    }
  };

  const handleAddAllPlaces = async (places: TripRecommendation[]) => {
    if (places.length === 0) return;
    const titles = places.map((p) => p.title);
    markVerifying(titles, true);
    try {
      // Verify in parallel — geocodeService dedupes concurrent identical queries
      // and caches results in-session, so the second click on the same place is free.
      const verified = await Promise.all(places.map((p) => verifyPlace(p, currentCity)));
      verified.forEach((p) => savePlace(p));
      setFocusedPlace(verified[0]);
    } finally {
      markVerifying(titles, false);
    }
  };

  return {
    chatMessages,
    chatLoading,
    verifyingTitles,
    handleSendMessage,
    handleAddPlaceFromChat,
    handleAddAllPlaces,
    handleShowInMapFromChat,
  };
};
