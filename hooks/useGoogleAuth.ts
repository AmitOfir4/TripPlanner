import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { GoogleUser } from '../googleAuthService';

const STORAGE_KEY = 'tripplanner_google_user';

const ME_ENDPOINT = import.meta.env.VITE_ME_ENDPOINT ||
                    (import.meta.env.DEV ? 'http://localhost:3001/api/me' : '/api/me');

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

export const useGoogleAuth = () => {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GoogleUser;
        // Pre-`sub` cached users from older builds: drop them so we capture
        // a stable id on the next login.
        if (!parsed.sub) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
        return parsed;
      } catch (error) {
        console.error('Error parsing stored user:', error);
        return null;
      }
    }
    return null;
  });

  // Save to localStorage whenever googleUser changes
  useEffect(() => {
    if (googleUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [googleUser]);

  // Validate token on mount if user is cached
  useEffect(() => {
    const validateToken = async () => {
      if (!googleUser) return;

      try {
        // Test the token by making a simple API call
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${googleUser.accessToken}` },
        });

        if (!response.ok) {
          console.warn('Cached token is invalid, logging out...');
          setGoogleUser(null);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setGoogleUser(null);
      }
    };

    validateToken();
  }, []); // Only run on mount

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoResponse.json();

        setGoogleUser({
          sub: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: tokenResponse.access_token,
        });

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

  const logout = () => setGoogleUser(null);

  return { googleUser, login, logout };
};
