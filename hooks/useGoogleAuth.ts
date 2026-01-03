import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { GoogleUser } from '../googleAuthService';

export const useGoogleAuth = () => {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);

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
