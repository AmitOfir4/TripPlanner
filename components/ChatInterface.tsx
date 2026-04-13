import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MapPin, Globe, Loader2, ListPlus, Plus } from 'lucide-react';
import { TripRecommendation, TripLayer } from '../types';

export interface DayGroup {
  dayTitle: string;
  dayText: string;
  places: TripRecommendation[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  dayGroups?: DayGroup[];
  places?: TripRecommendation[];
}

interface ChatInterfaceProps {
  loading: boolean;
  messages: ChatMessage[];
  savedLayers: TripLayer[];
  language: 'en' | 'he';
  onSendMessage: (message: string) => void;
  onAddPlace: (place: TripRecommendation) => void;
  onAddAll?: (places: TripRecommendation[]) => void;
  onShowInMap?: (place: TripRecommendation) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  loading,
  messages,
  savedLayers,
  language,
  onSendMessage,
  onAddPlace,
  onAddAll,
  onShowInMap
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHebrew = language === 'he';

  // Helper to check if a place is already added
  const isPlaceAdded = (place: TripRecommendation): boolean => {
    return savedLayers.some(layer => 
      layer.places.some(p => 
        p.title.toLowerCase() === place.title.toLowerCase()
      )
    );
  };

  // Helper to filter out already added places
  const filterAvailablePlaces = (places: TripRecommendation[]): TripRecommendation[] => {
    return places.filter(place => !isPlaceAdded(place));
  };

  // Auto-scroll to bottom within the chat container only (not the page)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim() || loading) return;
    
    onSendMessage(inputMessage.trim());
    setInputMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div dir={isHebrew ? 'rtl' : 'ltr'} className="chat-container flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 overflow-hidden">
      {/* Chat Header */}
      <div className="chat-header bg-gradient-to-br from-teal-600 via-teal-500 to-sky-500 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 shrink-0">
            <div className="absolute inset-0 bg-white/20 rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              {isHebrew ? 'מומחה נסיעות AI' : 'AI Travel Expert'}
            </h2>
            <p className="text-xs text-teal-100 font-medium">
              {isHebrew ? 'מתכנן הטיולים האישי שלך' : 'Your personal trip planner'}
            </p>
          </div>
          <div className={`${isHebrew ? 'mr-auto' : 'ml-auto'} flex items-center gap-1.5`}>
            <span className="w-2 h-2 bg-emerald-400 rounded-full shadow-sm animate-pulse" />
            <span className="text-[11px] text-teal-100 font-medium">{isHebrew ? 'מחובר' : 'Online'}</span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-5 py-10 px-6">
            {/* Hero Icon */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-sky-400 rounded-2xl opacity-10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe className="w-12 h-12 text-teal-500" strokeWidth={1.2} />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                {isHebrew ? 'תכנן את ההרפתקה הבאה שלך' : 'Plan Your Next Adventure'}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                {isHebrew
                  ? 'ספר לי לאן תרצה לטוס — אבנה מסלול מותאם אישית עם האטרקציות הכי שוות.'
                  : "Describe where you'd like to go — I'll build a personalised itinerary with must-see spots."}
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-sm">
              {(isHebrew ? [
                '✈️ טיול של 3 ימים בפריז',
                '🍜 האוכל הכי טוב בטוקיו',
                '👨‍👩‍👧 טיול משפחתי ברומא',
                '🌊 הרפתקה בבאלי'
              ] : [
                '✈️ 3-day trip to Paris',
                '🍜 Best food in Tokyo',
                '👨‍👩‍👧 Family trip to Rome',
                '🌊 Adventure in Bali'
              ]).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputMessage(suggestion.replace(/^.+?\s/, ''))}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all text-sm font-medium text-slate-600 text-left shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 message-fade-in ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
                  message.role === 'user'
                    ? 'bg-teal-600'
                    : 'bg-gradient-to-br from-teal-500 to-sky-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex-1 max-w-[82%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-teal-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                  }`}>
                    <p dir="auto" className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Day-grouped places from AI response */}
                  {message.dayGroups && message.dayGroups.length > 0 && (() => {
                    const allAvailablePlaces = message.dayGroups
                      .flatMap(group => filterAvailablePlaces(group.places || []));

                    const isRecommendationsMode = message.dayGroups.length === 1 &&
                      message.dayGroups[0].dayTitle === 'Recommendations';

                    return (
                      <div className="mt-3 space-y-3 w-full">
                        {/* Add All button */}
                        {allAvailablePlaces.length > 0 && onAddAll && (
                          <button
                            onClick={() => onAddAll(allAvailablePlaces)}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-200"
                          >
                            <ListPlus className="w-4 h-4" />
                            {isHebrew ? `הוסף את כל ${allAvailablePlaces.length} המקומות` : `Add All ${allAvailablePlaces.length} Places`}
                          </button>
                        )}

                        {message.dayGroups.map((dayGroup, dayIdx) => {
                          const availablePlaces = filterAvailablePlaces(dayGroup.places || []);
                          if (availablePlaces.length === 0 && !dayGroup.dayText) return null;

                          if (isRecommendationsMode) {
                            return (
                              <div key={dayIdx} className="space-y-2">
                                {availablePlaces.map((place, placeIdx) => (
                                  <PlaceChip
                                    key={placeIdx}
                                    place={place}
                                    onAdd={() => onAddPlace(place)}
                                    onShowInMap={onShowInMap ? () => onShowInMap(place) : undefined}
                                    isHebrew={isHebrew}
                                  />
                                ))}
                              </div>
                            );
                          }

                          return (
                            <div key={dayIdx} className="rounded-xl overflow-hidden border border-teal-200/70 bg-white shadow-sm">
                              {/* Day Header */}
                              <div className="bg-gradient-to-r from-teal-600 to-sky-500 px-4 py-2.5 flex items-center justify-between">
                                <span className="font-bold text-white text-sm">{dayGroup.dayTitle}</span>
                                {availablePlaces.length > 0 && (
                                  <span className="text-teal-100 text-[11px] font-medium">
                                    {availablePlaces.length} places
                                  </span>
                                )}
                              </div>

                              {dayGroup.dayText && (
                                <div className="px-4 py-2.5 bg-teal-50/50 border-b border-teal-100">
                                  <p dir="auto" className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {dayGroup.dayText}
                                  </p>
                                </div>
                              )}

                              {availablePlaces.length > 0 && (
                                <div className="p-3 space-y-2">
                                  {availablePlaces.map((place, placeIdx) => (
                                    <PlaceChip
                                      key={placeIdx}
                                      place={place}
                                      onAdd={() => onAddPlace(place)}
                                      onShowInMap={onShowInMap ? () => onShowInMap(place) : undefined}
                                      isHebrew={isHebrew}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Legacy: Flat places */}
                  {!message.dayGroups && message.places && message.places.length > 0 && (() => {
                    const availablePlaces = filterAvailablePlaces(message.places);
                    if (availablePlaces.length === 0) return null;
                    return (
                      <div className="mt-3 space-y-2 w-full">
                        {availablePlaces.length > 1 && onAddAll && (
                          <button
                            onClick={() => onAddAll(availablePlaces)}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-200 mb-1"
                          >
                            <ListPlus className="w-4 h-4" />
                            {isHebrew ? `הוסף את כל ${availablePlaces.length} המקומות` : `Add All ${availablePlaces.length} Places`}
                          </button>
                        )}
                        {availablePlaces.map((place, idx) => (
                          <PlaceChip
                            key={idx}
                            place={place}
                            onAdd={() => onAddPlace(place)}
                            onShowInMap={onShowInMap ? () => onShowInMap(place) : undefined}
                            isHebrew={isHebrew}
                          />
                        ))}
                      </div>
                    );
                  })()}

                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3 message-fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-teal-500 to-sky-500 shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="typing-dot w-2 h-2 bg-teal-400 rounded-full" />
                    <span className="typing-dot w-2 h-2 bg-teal-400 rounded-full" />
                    <span className="typing-dot w-2 h-2 bg-teal-400 rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={isHebrew ? 'למשל: טיול של 3 ימים בפריז, האוכל הכי טוב במילאנו...' : 'e.g. 3-day trip to Paris, best food in Milan…'}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            dir="auto"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm text-slate-900 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed input-glow transition-all font-medium"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || loading}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:cursor-not-allowed shadow-sm shadow-teal-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Shared place chip ───────────────────────────────────────────────── */
interface PlaceChipProps {
  place: import('../types').TripRecommendation;
  onAdd: () => void;
  onShowInMap?: () => void;
  isHebrew?: boolean;
}

const PlaceChip: React.FC<PlaceChipProps> = ({ place, onAdd, onShowInMap, isHebrew }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-teal-200 hover:bg-teal-50/30 transition-all place-card-hover">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 text-sm truncate">{place.title}</h4>
        {place.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{place.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
            {place.category}
          </span>
          {place.rating && (
            <span className="text-[10px] font-semibold text-amber-600">⭐ {place.rating.toFixed(1)}</span>
          )}
          <a
            href={
              place.mapUrl ||
              (place.placeId
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${place.placeId}`
                : place.lat && place.lng
                ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}`)
            }
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-teal-600 transition-colors"
          >
            <MapPin className="w-3 h-3" />
            {isHebrew ? 'גוגל מפות' : 'Google Maps'}
          </a>
          {onShowInMap && (
            <button
              onClick={onShowInMap}
              className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-sky-600 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              {isHebrew ? 'הצג במפה' : 'Show in Map'}
            </button>
          )}
        </div>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-sm"
      >
        <Plus className="w-3 h-3" />
        {isHebrew ? 'הוסף' : 'Add'}
      </button>
    </div>
  </div>
);
