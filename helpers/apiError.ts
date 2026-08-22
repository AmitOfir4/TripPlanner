/**
 * HTTP error that carries its status, so callers can branch on 401/403 (dead
 * Google session) instead of pattern-matching a message string.
 */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** True for the statuses that mean "this access token is no longer good". */
export const isAuthError = (err: unknown): boolean =>
  err instanceof ApiError && (err.status === 401 || err.status === 403);
