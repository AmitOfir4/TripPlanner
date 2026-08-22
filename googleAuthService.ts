export interface GoogleUser {
  /** Stable Google account id (`sub` claim). Used as the primary key in our DB. */
  sub: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  /** Epoch ms at which Google stops accepting `accessToken`, derived from the
   *  `expires_in` returned by the token endpoint (~1h). Absent on sessions
   *  cached by builds that predate expiry tracking. */
  expiresAt?: number;
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

/** Treat a token as dead a minute early so a request started just before the
 *  deadline doesn't land after it. */
export const TOKEN_EXPIRY_SKEW_MS = 60_000;

/** True when the session's token is past (or about to pass) its expiry.
 *  A session with no recorded `expiresAt` is assumed live — the periodic
 *  userinfo check is what catches those. */
export const isTokenExpired = (user: GoogleUser | null): boolean => {
  if (!user) return true;
  if (typeof user.expiresAt !== 'number') return false;
  return Date.now() >= user.expiresAt - TOKEN_EXPIRY_SKEW_MS;
};

/** Ms until the token should be considered dead, floored at 0. */
export const msUntilExpiry = (user: GoogleUser | null): number => {
  if (!user || typeof user.expiresAt !== 'number') return Infinity;
  return Math.max(0, user.expiresAt - TOKEN_EXPIRY_SKEW_MS - Date.now());
};
