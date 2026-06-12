import React from 'react';
import { ErrorKind } from '../hooks/useErrorBanner';
import { appStyles as s } from '../styles/app';

interface ErrorBannerProps {
  message: string;
  kind: ErrorKind;
  onDismiss: () => void;
  /** Invoked by the "Add API Key" CTA (shown only for key-related errors). */
  onAddKey: () => void;
}

const BANNERS: Record<ErrorKind, { icon: string; title: string; cta: string | null }> = {
  api_key:     { icon: '🔑', title: 'API Key Required',   cta: 'Add API Key' },
  invalid_key: { icon: '❌', title: 'Invalid API Key',     cta: 'Update Key' },
  quota:       { icon: '⏱️', title: 'Daily Limit Reached', cta: null },
  generic:     { icon: '⚠️', title: 'Something went wrong', cta: null },
};

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, kind, onDismiss, onAddKey }) => {
  const banner = BANNERS[kind];
  return (
    <div className={s.errorBanner}>
      <div className={s.errorInner}>
        <div className={s.errorIconWrap}>{banner.icon}</div>
        <div className="flex-1">
          <h3 className={s.errorTitle}>{banner.title}</h3>
          <p className={s.errorText}>{message}</p>
          {banner.cta && (
            <button onClick={onAddKey} className={s.errorBtn}>
              {banner.cta}
            </button>
          )}
        </div>
        <button onClick={onDismiss} className={s.errorClose}>×</button>
      </div>
    </div>
  );
};
