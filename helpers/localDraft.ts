// Local snapshot of the in-progress trip.
//
// The server is still the source of truth for saved trips, but it's only
// reachable when a trip has been saved *and* the Google session is alive. This
// keeps a copy in localStorage on every change so a page refresh, a tab crash,
// or an expired token can't take work with it.

import { TripLayer } from '../types';
import { ChatMessage } from '../components/ChatInterface';

const STORAGE_KEY = 'tripplanner_draft';
/** Bump when the draft shape changes incompatibly — old drafts are then dropped. */
const DRAFT_VERSION = 1;
/** Drafts older than this are ignored. Restoring three-week-old work unasked is
 *  more confusing than starting clean. */
const MAX_DRAFT_AGE_MS = 14 * 24 * 60 * 60 * 1000;
/** Newest N chat messages kept. Layers are the work; chat is replayable context,
 *  so it's what gets trimmed when the payload has to shrink. */
const MAX_CHAT_MESSAGES = 60;

export interface TripDraft {
  currentCity: string;
  savedLayers: TripLayer[];
  /** Mongo id if this draft belongs to an already-saved trip, else null. */
  tripId: string | null;
  tripTitle: string;
  tripDriveFileId: string | null;
  chatMessages: ChatMessage[];
  /** True when `savedLayers` had not yet been accepted by the server at write
   *  time. Survives the refresh so the restored session knows to finish the
   *  save instead of assuming it's in sync. */
  pendingServerSave: boolean;
  /** Epoch ms of the last write, used to expire stale drafts. */
  savedAt: number;
}

// ── Read ─────────────────────────────────────────────────────────────

/** `timestamp` survives JSON as an ISO string — turn it back into a Date so
 *  components that call date methods on it don't blow up after a refresh. */
function reviveMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((m): ChatMessage[] => {
    if (!m || typeof m !== 'object') return [];
    const msg = m as Record<string, unknown>;
    if (typeof msg.id !== 'string') return [];
    if (msg.role !== 'user' && msg.role !== 'assistant') return [];
    const timestamp = new Date(msg.timestamp as string);
    return [{
      id: msg.id,
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : '',
      timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
      ...(Array.isArray(msg.dayGroups) ? { dayGroups: msg.dayGroups as ChatMessage['dayGroups'] } : {}),
    }];
  });
}

function reviveLayers(raw: unknown): TripLayer[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((l): TripLayer[] => {
    if (!l || typeof l !== 'object') return [];
    const layer = l as Record<string, unknown>;
    if (typeof layer.name !== 'string') return [];
    return [{
      name: layer.name,
      places: Array.isArray(layer.places) ? (layer.places as TripLayer['places']) : [],
    }];
  });
}

/** Read the cached draft, or null if there isn't a usable one. Never throws —
 *  a corrupt draft must not stop the app from booting. */
export function readTripDraft(): TripDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { version?: number; draft?: Record<string, unknown> };
    if (parsed?.version !== DRAFT_VERSION) return null;

    const d = parsed.draft;
    if (!d || typeof d !== 'object') return null;

    const savedAt = typeof d.savedAt === 'number' ? d.savedAt : 0;
    if (!savedAt || Date.now() - savedAt > MAX_DRAFT_AGE_MS) return null;

    return {
      currentCity: typeof d.currentCity === 'string' ? d.currentCity : '',
      savedLayers: reviveLayers(d.savedLayers),
      tripId: typeof d.tripId === 'string' ? d.tripId : null,
      tripTitle: typeof d.tripTitle === 'string' ? d.tripTitle : '',
      tripDriveFileId: typeof d.tripDriveFileId === 'string' ? d.tripDriveFileId : null,
      chatMessages: reviveMessages(d.chatMessages),
      pendingServerSave: d.pendingServerSave === true,
      savedAt,
    };
  } catch (err) {
    console.warn('[localDraft] Unreadable draft, ignoring:', err);
    return null;
  }
}

// ── Write ────────────────────────────────────────────────────────────

export type DraftInput = Omit<TripDraft, 'savedAt'>;

/** Nothing worth restoring — used to decide between writing and clearing. */
export const isDraftEmpty = (draft: DraftInput): boolean =>
  draft.savedLayers.length === 0 && draft.chatMessages.length === 0 && !draft.currentCity;

function persist(draft: TripDraft): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: DRAFT_VERSION, draft }));
}

/** Write the draft, trimming chat history if the payload doesn't fit. An empty
 *  draft clears the key instead, so a fresh session doesn't restore a ghost. */
export function writeTripDraft(input: DraftInput): void {
  if (isDraftEmpty(input)) {
    clearTripDraft();
    return;
  }

  const draft: TripDraft = {
    ...input,
    chatMessages: input.chatMessages.slice(-MAX_CHAT_MESSAGES),
    savedAt: Date.now(),
  };

  try {
    persist(draft);
  } catch (err) {
    // Almost always QuotaExceededError. The layers are the part worth keeping,
    // so drop chat history and retry once before giving up.
    console.warn('[localDraft] Write failed, retrying without chat history:', err);
    try {
      persist({ ...draft, chatMessages: [] });
    } catch (retryErr) {
      console.warn('[localDraft] Draft could not be saved locally:', retryErr);
    }
  }
}

export function clearTripDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[localDraft] Failed to clear draft:', err);
  }
}
