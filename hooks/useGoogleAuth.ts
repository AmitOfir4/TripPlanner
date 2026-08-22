import { useCallback, useEffect, useRef, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { GoogleUser, isTokenExpired, msUntilExpiry } from '../googleAuthService';

const STORAGE_KEY = 'tripplanner_google_user';

/** How often a live session re-checks its token against Google. Catches tokens
 *  revoked early (password change, session revocation) and legacy cached
 *  sessions that carry no `expiresAt`. */
const REVALIDATE_INTERVAL_MS = 5 * 60_000;

const ME_ENDPOINT = import.meta.env.VITE_ME_ENDPOINT ||
                    (import.meta.env.DEV ? 'http://localhost:3001/api/me' : '/api/me');

export interface UseGoogleAuthReturn {
  googleUser: GoogleUser | null;
  login: () => void;
  logout: () => void;
  /** True when the session ended on its own (token expired or was rejected)
   *  rather than by the user clicking Log out. Drives the "sign in again"
   *  prompt so a dead session can't masquerade as a live one. */
  sessionExpired: boolean;
  /** Called by API callers that got a 401/403 — ends the session and raises
   *  the sign-in-again prompt. Pass the token the failed request actually used
   *  so a late failure can't tear down a session the user has since renewed. */
  notifyAuthFailure: (token?: string) => void;
  dismissSessionExpired: () => void;
}

// Fire-and-forget upsert of the user profile in our DB after login.
// Failures are logged but don't block the session — the user can still use
// the app even if our backend is temporarily unreachable.
async function upsertProfile(accessToken: string) {
  try {
    const res = await fetch(ME_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.warn('[useGoogleAuth] /api/me returned', res.status);
    }
  } catch (err) {
    console.warn('[useGoogleAuth] /api/me failed:', err);
  }
}

/** Read the cached session, dropping anything unusable. Returns the user plus
 *  whether it was dropped *because it expired* — that distinction is what the
 *  UI needs to say "your session expired" instead of silently showing a
 *  logged-out header. */
function loadCachedUser(): { user: GoogleUser | null; expired: boolean } {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { user: null, expired: false };
  try {
    const parsed = JSON.parse(stored) as GoogleUser;
    // Pre-`sub` cached users from older builds: drop them so we capture
    // a stable id on the next login.
    if (!parsed.sub) {
      localStorage.removeItem(STORAGE_KEY);
      return { user: null, expired: false };
    }
    // Known-expired token: don't hand it to callers at all. Saves a doomed
    // round-trip and, more importantly, stops auto-save from firing requests
    // that are guaranteed to 401.
    if (isTokenExpired(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return { user: null, expired: true };
    }
    return { user: parsed, expired: false };
  } catch (error) {
    console.error('Error parsing stored user:', error);
    return { user: null, expired: false };
  }
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  // Lazy initializer: a bare `useRef(loadCachedUser())` would re-run the
  // function on every render — re-reading localStorage, and re-running its
  // removeItem side effect — even though only the first result is used.
  const [initial] = useState(loadCachedUser);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(initial.user);
  const [sessionExpired, setSessionExpired] = useState(initial.expired);

  // Save to localStorage whenever googleUser changes
  useEffect(() => {
    if (googleUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [googleUser]);

  // Latest session, readable from callbacks without making them depend on it.
  const userRef = useRef(googleUser);
  userRef.current = googleUser;

  /** End the session because Google no longer accepts the token. Passing the
   *  token this decision was made about guards against a late failure for an
   *  older token wiping out a fresh login. */
  const endExpiredSession = useCallback((token?: string) => {
    const curr = userRef.current;
    if (!curr) return;
    if (token && curr.accessToken !== token) return;
    setGoogleUser(null);
    setSessionExpired(true);
  }, []);

  const notifyAuthFailure = useCallback(
    (token?: string) => endExpiredSession(token),
    [endExpiredSession]
  );

  // ── Token validation ─────────────────────────────────────────────
  // Runs on mount, on an interval, and whenever the tab is refocused. The
  // previous mount-only check meant a tab left open past the ~1h token
  // lifetime kept showing a signed-in header while every save 401'd.
  useEffect(() => {
    const token = googleUser?.accessToken;
    if (!token) return;

    let cancelled = false;

    const validateToken = async () => {
      if (cancelled) return;
      // Cheap local check first — no point asking Google about a token we
      // already know is past its expiry.
      if (isTokenExpired(googleUser)) {
        endExpiredSession(token);
        return;
      }
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!response.ok) {
          console.warn('Cached token is invalid, ending session...');
          endExpiredSession(token);
        }
      } catch (error) {
        // Network blips shouldn't log the user out — only an explicit
        // rejection from Google does. A genuinely dead token gets caught by
        // the next tick, the expiry timer, or the first 401 from a save.
        if (cancelled) return;
        console.warn('Token validation request failed (keeping session):', error);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void validateToken();
    };

    void validateToken();
    const interval = setInterval(() => void validateToken(), REVALIDATE_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);

    // Fire exactly at expiry so the UI flips the moment the token dies,
    // instead of up to one interval later.
    const untilExpiry = msUntilExpiry(googleUser);
    const expiryTimer = Number.isFinite(untilExpiry)
      ? setTimeout(() => endExpiredSession(token), untilExpiry)
      : undefined;

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (expiryTimer !== undefined) clearTimeout(expiryTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [googleUser, endExpiredSession]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoResponse.json();

        // `expires_in` is seconds from now (~3600). Recording the absolute
        // deadline is what lets every later check know the token is dead
        // without a network call.
        const expiresIn = Number(tokenResponse.expires_in);
        setGoogleUser({
          sub: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: tokenResponse.access_token,
          ...(Number.isFinite(expiresIn) ? { expiresAt: Date.now() + expiresIn * 1000 } : {}),
        });
        setSessionExpired(false);

        // Upsert the user profile in our DB. Fire-and-forget — login succeeds
        // regardless of backend reachability.
        upsertProfile(tokenResponse.access_token);
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    },
    // `drive.file` lets the app create files and update files it has previously
    // created — the only Drive interaction we still need ("Upload to Google
    // Maps"). We dropped `drive.readonly` once Mongo became the source for
    // saved trips, so the consent screen asks for less.
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  const logout = () => {
    setGoogleUser(null);
    setSessionExpired(false);
  };

  const dismissSessionExpired = () => setSessionExpired(false);

  return { googleUser, login, logout, sessionExpired, notifyAuthFailure, dismissSessionExpired };
};
