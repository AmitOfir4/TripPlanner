import { useState } from 'react';

export type ErrorKind = 'api_key' | 'quota' | 'invalid_key' | 'generic';

interface UseErrorBannerReturn {
  errorMessage: string;
  errorKind: ErrorKind;
  /** Set the banner message. An empty message clears it; a non-empty message
   *  updates the kind so the banner picks the right icon/title/CTA. */
  setErrorMessage: (msg: string, kind?: ErrorKind) => void;
  clearError: () => void;
}

export const useErrorBanner = (): UseErrorBannerReturn => {
  const [errorMessage, setErrorMessageRaw] = useState<string>('');
  const [errorKind, setErrorKind] = useState<ErrorKind>('api_key');

  const setErrorMessage = (msg: string, kind: ErrorKind = 'api_key') => {
    setErrorMessageRaw(msg);
    if (msg) setErrorKind(kind);
  };

  const clearError = () => setErrorMessageRaw('');

  return { errorMessage, errorKind, setErrorMessage, clearError };
};
