import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import {
  autocompletePlaces,
  getPlaceDetails,
  newSessionToken,
  PlacePrediction,
  PlaceDetails,
} from '../../services/placesService';
import { mapSearchStyles as ss } from '../../styles/map';

interface MapSearchBarProps {
  language?: 'en' | 'he';
  /** Result of picking a suggestion — the parent drops the pin and opens the add-to-trip window. */
  onSelectPlace: (place: PlaceDetails) => void;
}

const DEBOUNCE_MS = 300;

export const MapSearchBar: React.FC<MapSearchBarProps> = ({ language = 'en', onSelectPlace }) => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // One token spans a whole type-then-pick sequence so Google bills it once.
  const sessionTokenRef = useRef<string>(newSessionToken());
  // Picking a suggestion writes its name into the input; without this the
  // debounced effect would fire again and reopen the dropdown. Cleared as soon
  // as the user edits the field, so retyping the same text still searches.
  const selectedTextRef = useRef<string | null>(null);

  // ── Debounced autocomplete ────────────────────────────────────────
  useEffect(() => {
    if (query === selectedTextRef.current) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      abortRef.current?.abort();
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const center = map?.getCenter();
      const results = await autocompletePlaces(trimmed, {
        center: center ? { lat: center.lat(), lng: center.lng() } : null,
        language,
        sessionToken: sessionTokenRef.current,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setPredictions(results);
      setActiveIndex(-1);
      setIsOpen(true);
      setIsLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, language, map]);

  // Close the dropdown when clicking anywhere else on the map
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSelect = useCallback(async (prediction: PlacePrediction) => {
    abortRef.current?.abort();
    setIsOpen(false);
    setIsLoading(true);
    selectedTextRef.current = prediction.main_text;
    setQuery(prediction.main_text);
    setPredictions([]);

    const details = await getPlaceDetails(prediction.place_id, {
      language,
      sessionToken: sessionTokenRef.current,
    });
    // The details call closes the billing session — start a fresh one.
    sessionTokenRef.current = newSessionToken();
    setIsLoading(false);
    if (!details) return;

    map?.panTo({ lat: details.lat, lng: details.lng });
    map?.setZoom(16);
    onSelectPlace(details);
  }, [language, map, onSelectPlace]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % predictions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? predictions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(predictions[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clear = () => {
    selectedTextRef.current = null;
    setQuery('');
    setPredictions([]);
    setIsOpen(false);
  };

  return (
    // Stop map drag/zoom from stealing pointer and wheel events over the bar.
    <div
      ref={wrapperRef}
      className={ss.wrapper}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className={ss.inputRow}>
        <Search className={ss.inputIcon} />
        <input
          type="text"
          value={query}
          onChange={(e) => { selectedTextRef.current = null; setQuery(e.target.value); }}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={language === 'he' ? 'חיפוש מקום במפה…' : 'Search for a place…'}
          dir={language === 'he' ? 'rtl' : 'ltr'}
          className={ss.input}
        />
        {isLoading ? (
          <Loader2 className={ss.spinner} />
        ) : query ? (
          <button onClick={clear} className={ss.clearBtn} title="Clear search">
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div className={ss.dropdown}>
          {predictions.length === 0 ? (
            <div className={ss.empty}>{language === 'he' ? 'לא נמצאו תוצאות' : 'No results'}</div>
          ) : (
            predictions.map((p, index) => (
              <button
                key={p.place_id}
                onClick={() => handleSelect(p)}
                onMouseEnter={() => setActiveIndex(index)}
                className={ss.option(index === activeIndex)}
              >
                <MapPin className={ss.optionIcon} />
                <span className="min-w-0">
                  <span className={`block ${ss.optionMain}`}>{p.main_text}</span>
                  {p.secondary_text && <span className={`block ${ss.optionSecondary}`}>{p.secondary_text}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
