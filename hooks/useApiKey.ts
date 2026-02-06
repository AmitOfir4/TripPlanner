import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tripplanner_gemini_api_key';

export const useApiKey = () => {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || '';
  });

  // Save to localStorage whenever apiKey changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [apiKey]);

  const setApiKey = (key: string) => {
    setApiKeyState(key.trim());
  };

  const clearApiKey = () => {
    setApiKeyState('');
  };

  const hasApiKey = !!apiKey;

  return { apiKey, setApiKey, clearApiKey, hasApiKey };
};
