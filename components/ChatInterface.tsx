import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MapPin, Sparkles, Loader2, ListPlus } from 'lucide-react';
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
  onSendMessage: (message: string) => void;
  onAddPlace: (place: TripRecommendation) => void;
  onAddAll?: (places: TripRecommendation[]) => void;
  onShowInMap?: (place: TripRecommendation) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  loading,
  messages,
  savedLayers,
  onSendMessage,
  onAddPlace,
  onAddAll,
  onShowInMap
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="chat-container flex flex-col h-full bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="chat-header bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
            <Bot className="w-7 h-7 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white">AI Travel Expert</h2>
            <p className="text-sm text-indigo-100 font-medium">Your personal trip planner</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Start Planning Your Trip</h3>
              <p className="text-slate-500 max-w-md">
                Tell me where you're going and what kind of experience you're looking for. 
                I'll create a personalized itinerary just for you!
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {[
                '3-day trip to Paris',
                'Best food spots in Tokyo',
                'Family vacation in Rome',
                'Adventure activities in Bali'
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputMessage(suggestion)}
                  className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm font-semibold text-slate-700 text-left"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-indigo-600' 
                    : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-2xl px-5 py-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border-2 border-slate-200 text-slate-900'
                  }`}>
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Day-grouped places from AI response */}
                  {message.dayGroups && message.dayGroups.length > 0 && (() => {
                    // Calculate available places across all days
                    const allAvailablePlaces = message.dayGroups
                      .flatMap(group => filterAvailablePlaces(group.places || []));
                    
                    return (
                      <div className="mt-3 space-y-4 w-full">
                        {/* Add All button */}
                        {allAvailablePlaces.length > 0 && onAddAll && (
                          <button
                            onClick={() => onAddAll(allAvailablePlaces)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                          >
                            <ListPlus className="w-5 h-5" />
                            Add All {allAvailablePlaces.length} Places to Trip
                          </button>
                        )}
                        
                        {message.dayGroups.map((dayGroup, dayIdx) => {
                          const availablePlaces = filterAvailablePlaces(dayGroup.places || []);
                          
                          // Skip rendering this day if no places available
                          if (availablePlaces.length === 0 && !dayGroup.dayText) return null;
                          
                          return (
                            <div key={dayIdx} className="border-2 border-indigo-200 rounded-2xl overflow-hidden">
                              {/* Day Header */}
                              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                                <h3 className="font-black text-white text-sm">
                                  {dayGroup.dayTitle}
                                  {availablePlaces.length > 0 && (
                                    <span className="ml-2 text-indigo-200 font-normal text-xs">
                                      ({availablePlaces.length} available)
                                    </span>
                                  )}
                                </h3>
                              </div>
                              
                              {/* Day Description */}
                              {dayGroup.dayText && (
                                <div className="bg-indigo-50 px-4 py-3 border-b-2 border-indigo-200">
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {dayGroup.dayText}
                                  </p>
                                </div>
                              )}
                              
                              {/* Places for this day */}
                              {availablePlaces.length > 0 && (
                                <div className="p-3 space-y-2 bg-white">
                                  {availablePlaces.map((place, placeIdx) => (
                                    <div
                                      key={placeIdx}
                                      className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-3 hover:shadow-md transition-shadow"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <h4 className="font-bold text-slate-900 mb-1 text-sm">{place.title}</h4>
                                          {place.description && (
                                            <p className="text-xs text-slate-600 line-clamp-2">{place.description}</p>
                                          )}
                                          <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">
                                              {place.category}
                                            </span>
                                            {place.rating && (
                                              <span className="text-xs font-semibold text-amber-600">
                                                ⭐ {place.rating.toFixed(1)}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1.5">
                                            <a
                                              href={
                                                place.mapUrl ||
                                                (place.placeId 
                                                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${place.placeId}`
                                                  : place.lat && place.lng
                                                  ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
                                                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}`
                                                )
                                              }
                                              target="_blank"
                                              rel="noreferrer"
                                              className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors w-fit"
                                            >
                                              <MapPin className="w-3 h-3" />
                                              Google Maps
                                            </a>
                                            {onShowInMap && (
                                              <button
                                                onClick={() => onShowInMap(place)}
                                                className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-purple-600 transition-colors"
                                              >
                                                <MapPin className="w-3 h-3" />
                                                Show In Map
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => onAddPlace(place)}
                                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex-shrink-0"
                                        >
                                          Add
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Legacy: Flat places from AI response (for backward compatibility) */}
                  {!message.dayGroups && message.places && message.places.length > 0 && (() => {
                    const availablePlaces = filterAvailablePlaces(message.places);
                    
                    if (availablePlaces.length === 0) return null;
                    
                    return (
                      <div className="mt-3 space-y-2 w-full">
                        {/* Add All button */}
                        {availablePlaces.length > 0 && onAddAll && (
                          <button
                            onClick={() => onAddAll(availablePlaces)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl mb-2"
                          >
                            <ListPlus className="w-5 h-5" />
                            Add All {availablePlaces.length} Places to Trip
                          </button>
                        )}
                        
                        {availablePlaces.map((place, idx) => (
                          <div
                            key={idx}
                            className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-900 mb-1">{place.title}</h4>
                                {place.description && (
                                  <p className="text-xs text-slate-600 line-clamp-2">{place.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">
                                    {place.category}
                                  </span>
                                  {place.rating && (
                                    <span className="text-xs font-semibold text-amber-600">
                                      ⭐ {place.rating.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <a
                                    href={
                                      place.mapUrl ||
                                      (place.placeId 
                                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${place.placeId}`
                                        : place.lat && place.lng
                                        ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}`
                                      )
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors w-fit"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    Google Maps
                                  </a>
                                  {onShowInMap && (
                                    <button
                                      onClick={() => onShowInMap(place)}
                                      className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-purple-600 transition-colors"
                                    >
                                      <MapPin className="w-3 h-3" />
                                      Show In Map
                                    </button>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => onAddPlace(place)}
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex-shrink-0"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <span className="text-xs text-slate-400 mt-1 px-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white border-2 border-slate-200 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-sm text-slate-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t-2 border-slate-200 p-4 bg-white">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask me anything about your trip..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-900"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
