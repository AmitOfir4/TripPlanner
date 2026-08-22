import React from 'react';
import { saveStatusStyles as s } from '../styles/saveStatus';

interface SaveStatusBannerProps {
  /** The Google session ended on its own (token expired or was rejected). */
  sessionExpired: boolean;
  /** Last server-save failure that wasn't an auth problem, or null. */
  autoSaveError: string | null;
  onSignIn: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * Tells the user when their work has stopped reaching the server. Both cases
 * used to be invisible — an expired token still rendered a signed-in header,
 * and auto-save failures went to `console.warn` — so edits kept piling up on
 * top of a save path that had already stopped working.
 */
export const SaveStatusBanner: React.FC<SaveStatusBannerProps> = ({
  sessionExpired, autoSaveError, onSignIn, onRetry, onDismiss,
}) => {
  if (!sessionExpired && !autoSaveError) return null;

  // The dead session is the root cause when both are set — lead with it.
  const auth = sessionExpired;

  return (
    <div className={`${s.banner} ${auth ? s.bannerAuth : s.bannerError}`}>
      <div className={s.inner}>
        <div className={`${s.iconWrap} ${auth ? s.iconWrapAuth : s.iconWrapError}`}>
          {auth ? '🔒' : '⚠️'}
        </div>
        <div className={s.body}>
          <h3 className={`${s.title} ${auth ? s.titleAuth : s.titleError}`}>
            {auth ? 'Google session expired' : "Couldn't save to the server"}
          </h3>
          <p className={`${s.text} ${auth ? s.textAuth : s.textError}`}>
            {auth
              ? 'Google sign-ins last about an hour. Saving to your trips and uploading to Google Maps are paused until you sign in again — your work is kept on this device, so nothing is lost.'
              : autoSaveError}
          </p>
          <div className={s.actions}>
            {auth ? (
              <button onClick={onSignIn} className={`${s.primaryBtn} ${s.primaryBtnAuth}`}>
                Sign in again
              </button>
            ) : (
              <button onClick={onRetry} className={`${s.primaryBtn} ${s.primaryBtnError}`}>
                Retry save
              </button>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`${s.close} ${auth ? s.closeAuth : s.closeError}`}
        >
          ×
        </button>
      </div>
    </div>
  );
};
