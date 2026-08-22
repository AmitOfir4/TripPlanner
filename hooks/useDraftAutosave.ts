import { useEffect, useRef } from 'react';
import { TripLayer } from '../types';
import { ChatMessage } from '../components/ChatInterface';
import { writeTripDraft, isDraftEmpty, type DraftInput } from '../helpers/localDraft';

/** Quiet period after the last change before the draft is written. Short —
 *  this is a synchronous localStorage write, not a network call. */
const DRAFT_WRITE_DELAY_MS = 400;

interface UseDraftAutosaveDeps {
  currentCity: string;
  savedLayers: TripLayer[];
  tripId: string | null;
  tripTitle: string;
  tripDriveFileId: string | null;
  chatMessages: ChatMessage[];
  /** From useSaveTrip: the server hasn't accepted the current layers yet. */
  pendingServerSave: boolean;
}

/**
 * Mirrors the working trip into localStorage so a refresh doesn't lose it.
 * Unlike the server auto-save this needs no auth and no saved trip — it runs
 * for signed-out users and never-saved trips too.
 */
export const useDraftAutosave = (deps: UseDraftAutosaveDeps): void => {
  const { currentCity, savedLayers, tripId, tripTitle, tripDriveFileId, chatMessages, pendingServerSave } = deps;

  // Latest state, reachable from the unload handler without re-registering it
  // on every keystroke.
  const latestRef = useRef<DraftInput>(deps);
  latestRef.current = {
    currentCity, savedLayers, tripId, tripTitle, tripDriveFileId, chatMessages, pendingServerSave,
  };

  // Whether this session has ever held work. An empty draft means two very
  // different things: "the user cleared their trip" (overwrite the stored one)
  // and "this tab just opened" (leave the stored one alone). Without the
  // distinction, opening a second tab — or reloading before the restore lands —
  // would wipe the draft the user is relying on.
  const hasHeldContentRef = useRef(false);
  if (!isDraftEmpty(latestRef.current)) hasHeldContentRef.current = true;

  const save = () => {
    if (isDraftEmpty(latestRef.current) && !hasHeldContentRef.current) return;
    writeTripDraft(latestRef.current);
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const timer = setTimeout(() => saveRef.current(), DRAFT_WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [currentCity, savedLayers, tripId, tripTitle, tripDriveFileId, chatMessages, pendingServerSave]);

  // A refresh inside the debounce window would otherwise drop the last change.
  // `pagehide` fires on reload, navigation, and mobile tab eviction, where
  // `beforeunload` is unreliable.
  useEffect(() => {
    const flush = () => saveRef.current();
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);
};
