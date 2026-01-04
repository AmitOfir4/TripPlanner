import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { GoogleUser } from '../googleAuthService';

const STORAGE_KEY = 'tripplanner_google_user';

export const useGoogleAuth = () => {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
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

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoResponse.json();
        
        setGoogleUser({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: tokenResponse.access_token,
        });
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
  });

  const logout = () => setGoogleUser(null);

  return { googleUser, login, logout };
};
