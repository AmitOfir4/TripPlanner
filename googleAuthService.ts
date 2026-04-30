export interface GoogleUser {
  /** Stable Google account id (`sub` claim). Used as the primary key in our DB. */
  sub: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
