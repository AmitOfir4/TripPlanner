export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

// Scopes needed for Google Drive access to My Maps
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file'
].join(' ');
