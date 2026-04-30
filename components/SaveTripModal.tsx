import React, { useEffect, useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { saveTripModalStyles as s } from '../styles/modals';

interface SaveTripModalProps {
  show: boolean;
  /** Default title to pre-fill (typically the current city or current trip title). */
  defaultTitle: string;
  /** True while the parent is awaiting the save request. */
  saving: boolean;
  /** Last error from a failed save, surfaced inline. Cleared on next attempt. */
  errorMessage?: string | null;
  /** Distinguishes "Save trip" (create) from "Save as new" (fork). */
  mode: 'create' | 'fork';
  onClose: () => void;
  onConfirm: (title: string) => void;
}

export const SaveTripModal: React.FC<SaveTripModalProps> = ({
  show, defaultTitle, saving, errorMessage, mode, onClose, onConfirm,
}) => {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (show) setTitle(defaultTitle);
  }, [show, defaultTitle]);

  if (!show) return null;

  const trimmed = title.trim();
  const canSave = trimmed.length > 0 && !saving;

  const submit = () => {
    if (!canSave) return;
    onConfirm(trimmed);
  };

  return (
    <div className={s.overlay} onClick={saving ? undefined : onClose}>
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        <div className={s.headerRow}>
          <h2 className={s.headerTitle}>{mode === 'fork' ? 'Save as new trip' : 'Save trip'}</h2>
          <button onClick={onClose} disabled={saving} className={s.headerCloseBtn}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <label className={s.label} htmlFor="save-trip-title">Trip name</label>
        <input
          id="save-trip-title"
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          disabled={saving}
          className={s.input}
          placeholder="e.g. Sorrento — May 2026"
          maxLength={200}
        />
        <p className={s.hint}>You can rename this later from the My Trips list.</p>

        {errorMessage && <p className={s.errorText}>{errorMessage}</p>}

        <div className={s.buttonRow}>
          <button onClick={onClose} disabled={saving} className={s.cancelBtn}>Cancel</button>
          <button onClick={submit} disabled={!canSave} className={s.saveBtn}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
