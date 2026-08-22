import React, { useState } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { mapInfoWindowStyles as iw } from '../../styles/map';

interface PlaceDescriptionProps {
  description?: string;
  /** Omitted when the place can't be edited at all — it renders read-only. */
  onSave?: (description: string) => void;
  /** Shown under the editor, e.g. to explain that the edit isn't saved yet. */
  hint?: string;
}

/**
 * Description line for a place in the map InfoWindow, editable in place.
 *
 * Both the edit toggle and the draft text are local state on purpose: any state
 * change in MapView makes the Maps API close and reopen the InfoWindow, which
 * pulls focus out of the field. Keeping it here means typing never re-renders
 * the parent. Mount with a `key` tied to the place so switching places resets
 * back to read mode.
 */
export const PlaceDescription: React.FC<PlaceDescriptionProps> = ({ description, onSave, hint }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description || '');

  if (!onSave) return <p className={iw.description}>{description}</p>;

  const commit = () => {
    onSave(draft.trim());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsEditing(false);
            // Enter saves, Shift+Enter keeps a line break.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="Add a note about this place…"
          className={iw.descriptionTextarea}
          autoFocus
        />
        <div className={iw.descriptionActions}>
          <button onClick={commit} className={iw.descriptionSaveBtn}>
            <Check className="w-3 h-3" /> Save
          </button>
          <button onClick={() => { setDraft(description || ''); setIsEditing(false); }} className={iw.descriptionCancelBtn}>
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
        {hint && <p className={iw.descriptionHint}>{hint}</p>}
      </>
    );
  }

  return (
    <div className={iw.descriptionRow}>
      <p className={iw.descriptionText(!description)}>{description || 'No description yet'}</p>
      <button
        onClick={() => { setDraft(description || ''); setIsEditing(true); }}
        className={iw.descriptionEditBtn}
        title="Edit description"
      >
        <Edit2 className="w-3 h-3" />
      </button>
    </div>
  );
};
