import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Bot, User, Globe, ListPlus } from 'lucide-react';
import { TripRecommendation, TripLayer } from '../types';
import { PlaceChip } from './chat/PlaceChip';
import { chatStyles as s } from '../styles/chat';

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
  /** Titles of places currently being verified via Google Places before save. */
  verifyingTitles?: ReadonlySet<string>;
  messages: ChatMessage[];
  savedLayers: TripLayer[];
  language: 'en' | 'he';
  onSendMessage: (message: string) => void;
  onAddPlace: (place: TripRecommendation) => void;
  onAddAll?: (places: TripRecommendation[]) => void;
  onShowInMap?: (place: TripRecommendation) => void;
}

const EMPTY_TITLES: ReadonlySet<string> = new Set();

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  loading, verifyingTitles = EMPTY_TITLES, messages, savedLayers, language, onSendMessage, onAddPlace, onAddAll, onShowInMap,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHebrew = language === 'he';

  // O(layers × places) Set built once per render — replaces the original
  // O(messages × places × layers × places) nested-loop check on every render.
  const addedTitles = useMemo(() => {
    const set = new Set<string>();
    for (const layer of savedLayers) {
      for (const p of layer.places) set.add(p.title.toLowerCase());
    }
    return set;
  }, [savedLayers]);

  const filterAvailablePlaces = useCallback(
    (places: TripRecommendation[]): TripRecommendation[] =>
      places.filter((place) => !addedTitles.has(place.title.toLowerCase())),
    [addedTitles]
  );

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
    <div dir={isHebrew ? 'rtl' : 'ltr'} className={s.container}>
      {/* Chat Header */}
      <div className={s.header}>
        <div className={s.headerInner}>
          <div className={s.headerIconWrap}>
            <div className={s.headerIconBg} />
            <div className={s.headerIconInner}>
              <Globe className="w-6 h-6 text-white" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <h2 className={s.headerTitle}>{isHebrew ? 'מומחה נסיעות AI' : 'AI Travel Expert'}</h2>
            <p className={s.headerSubtitle}>{isHebrew ? 'מתכנן הטיולים האישי שלך' : 'Your personal trip planner'}</p>
          </div>
          <div className={`${isHebrew ? 'mr-auto' : 'ml-auto'} ${s.headerStatus}`}>
            <span className={s.headerStatusDot} />
            <span className={s.headerStatusText}>{isHebrew ? 'מחובר' : 'Online'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className={s.messagesArea}>
        {messages.length === 0 ? (
          <EmptyChat isHebrew={isHebrew} onSuggestionClick={setInputMessage} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isHebrew={isHebrew}
                savedLayers={savedLayers}
                verifyingTitles={verifyingTitles}
                filterAvailablePlaces={filterAvailablePlaces}
                onAddPlace={onAddPlace}
                onAddAll={onAddAll}
                onShowInMap={onShowInMap}
              />
            ))}

            {loading && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={s.inputArea}>
        <div className={s.inputRow}>
          <input
            ref={inputRef}
            type="text"
            placeholder={isHebrew ? 'למשל: טיול של 3 ימים בפריז, האוכל הכי טוב במילאנו...' : 'e.g. 3-day trip to Paris, best food in Milan…'}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            dir="auto"
            className={s.input}
          />
          <button onClick={handleSend} disabled={!inputMessage.trim() || loading} className={s.sendBtn}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────────── */

const EmptyChat: React.FC<{ isHebrew: boolean; onSuggestionClick: (text: string) => void }> = ({
  isHebrew, onSuggestionClick,
}) => {
  const suggestions = isHebrew
    ? ['✈️ טיול של 4 ימים בפריז', '🍜 האוכל הכי טוב בטוקיו', '👨‍👩‍👧 טיול משפחתי ברומא', '🌊 הרפתקה בבאלי']
    : ['✈️ 4-day trip to Paris', '🍜 Best food in Tokyo', '👨‍👩‍👧 Family trip to Rome', '🌊 Adventure in Bali'];

  return (
    <div className={s.emptyState}>
      <div className={s.emptyIcon}>
        <div className={s.emptyIconBg} />
        <div className={s.emptyIconInner}>
          <Globe className="w-12 h-12 text-teal-500" strokeWidth={1.2} />
        </div>
      </div>
      <div>
        <h3 className={s.emptyTitle}>{isHebrew ? 'תכנן את ההרפתקה הבאה שלך' : 'Plan Your Next Adventure'}</h3>
        <p className={s.emptySubtitle}>
          {isHebrew
            ? 'ספר לי לאן תרצה לטוס — אבנה מסלול מותאם אישית עם האטרקציות הכי שוות.'
            : "Describe where you'd like to go — I'll build a personalised itinerary with must-see spots."}
        </p>
      </div>
      <div className={s.suggestionGrid}>
        {suggestions.map((suggestion, idx) => (
          <button key={idx} onClick={() => onSuggestionClick(suggestion.replace(/^.+?\s/, ''))} className={s.suggestionBtn}>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
  isHebrew: boolean;
  savedLayers: TripLayer[];
  verifyingTitles: ReadonlySet<string>;
  filterAvailablePlaces: (places: TripRecommendation[]) => TripRecommendation[];
  onAddPlace: (place: TripRecommendation) => void;
  onAddAll?: (places: TripRecommendation[]) => void;
  onShowInMap?: (place: TripRecommendation) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message, isHebrew, verifyingTitles, filterAvailablePlaces, onAddPlace, onAddAll, onShowInMap,
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={s.messageRow(isUser)}>
      <div className={s.avatar(isUser)}>
        {isUser ? <User className={s.avatarIcon} /> : <Bot className={s.avatarIcon} />}
      </div>
      <div className={s.bubbleWrap(isUser)}>
        <div className={s.bubble(isUser)}>
          <p dir="auto" className={s.bubbleText}>{message.content}</p>
        </div>

        {/* Day-grouped places */}
        {message.dayGroups && message.dayGroups.length > 0 && (
          <DayGroupsSection
            dayGroups={message.dayGroups}
            isHebrew={isHebrew}
            verifyingTitles={verifyingTitles}
            filterAvailablePlaces={filterAvailablePlaces}
            onAddPlace={onAddPlace}
            onAddAll={onAddAll}
            onShowInMap={onShowInMap}
          />
        )}

        {/* Legacy flat places */}
        {!message.dayGroups && message.places && message.places.length > 0 && (() => {
          const availablePlaces = filterAvailablePlaces(message.places);
          if (availablePlaces.length === 0) return null;
          return (
            <div className="mt-3 space-y-2 w-full">
              {availablePlaces.length > 1 && onAddAll && (
                <button onClick={() => onAddAll(availablePlaces)} className={s.addAllBtnLegacy}>
                  <ListPlus className="w-4 h-4" />
                  {isHebrew ? `הוסף את כל ${availablePlaces.length} המקומות` : `Add All ${availablePlaces.length} Places`}
                </button>
              )}
              {availablePlaces.map((place, idx) => (
                <PlaceChip
                  key={idx}
                  place={place}
                  isVerifying={verifyingTitles.has(place.title)}
                  onAdd={() => onAddPlace(place)}
                  onShowInMap={onShowInMap ? () => onShowInMap(place) : undefined}
                  isHebrew={isHebrew}
                />
              ))}
            </div>
          );
        })()}

        <span className={s.timestamp}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

interface DayGroupsSectionProps {
  dayGroups: DayGroup[];
  isHebrew: boolean;
  verifyingTitles: ReadonlySet<string>;
  filterAvailablePlaces: (places: TripRecommendation[]) => TripRecommendation[];
  onAddPlace: (place: TripRecommendation) => void;
  onAddAll?: (places: TripRecommendation[]) => void;
  onShowInMap?: (place: TripRecommendation) => void;
}

const DayGroupsSection: React.FC<DayGroupsSectionProps> = ({
  dayGroups, isHebrew, verifyingTitles, filterAvailablePlaces, onAddPlace, onAddAll, onShowInMap,
}) => {
  const allAvailablePlaces = dayGroups.flatMap((g) => filterAvailablePlaces(g.places || []));
  const isRecommendationsMode = dayGroups.length === 1 && dayGroups[0].dayTitle === 'Recommendations';

  return (
    <div className="mt-3 space-y-3 w-full">
      {allAvailablePlaces.length > 0 && onAddAll && (
        <button onClick={() => onAddAll(allAvailablePlaces)} className={s.addAllBtn}>
          <ListPlus className="w-4 h-4" />
          {isHebrew ? `הוסף את כל ${allAvailablePlaces.length} המקומות` : `Add All ${allAvailablePlaces.length} Places`}
        </button>
      )}

      {dayGroups.map((dayGroup, dayIdx) => {
        const availablePlaces = filterAvailablePlaces(dayGroup.places || []);
        if (availablePlaces.length === 0 && !dayGroup.dayText) return null;

        if (isRecommendationsMode) {
          return (
            <div key={dayIdx} className="space-y-2">
              {availablePlaces.map((place, placeIdx) => (
                <PlaceChip
                  key={placeIdx}
                  place={place}
                  isVerifying={verifyingTitles.has(place.title)}
                  onAdd={() => onAddPlace(place)}
                  onShowInMap={onShowInMap ? () => onShowInMap(place) : undefined}
                  isHebrew={isHebrew}
                />
              ))}
            </div>
          );
        }

        return (
          <div key={dayIdx} className={s.dayCard}>
            <div className={s.dayHeader}>
              <span className={s.dayHeaderTitle}>{dayGroup.dayTitle}</span>
              {availablePlaces.length > 0 && (
                <span className={s.dayHeaderCount}>{availablePlaces.length} places</span>
              )}
            </div>
            {dayGroup.dayText && (
              <div className={s.dayText}>
                <p dir="auto" className={s.dayTextP}>{dayGroup.dayText}</p>
              </div>
            )}
            {availablePlaces.length > 0 && (
              <div className={s.dayPlaces}>
                {availablePlaces.map((place, placeIdx) => (
                  <PlaceChip
                    key={placeIdx}
                    place={place}
                    isVerifying={verifyingTitles.has(place.title)}
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
};

const TypingIndicator: React.FC = () => (
  <div className={s.loadingRow}>
    <div className={s.loadingAvatar}>
      <Bot className="w-4 h-4 text-white" />
    </div>
    <div className={s.loadingBubble}>
      <div className={s.loadingDots}>
        <span className={s.loadingDot} />
        <span className={s.loadingDot} />
        <span className={s.loadingDot} />
      </div>
    </div>
  </div>
);

