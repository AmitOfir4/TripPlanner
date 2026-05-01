import React from 'react';
import { X, Loader2, Library, MapPin, Trash2, Upload } from 'lucide-react';
import { SavedTripSummary } from '../types';
import { myTripsModalStyles as s } from '../styles/modals';

interface MyTripsModalProps {
  show: boolean;
  loading: boolean;
  trips: SavedTripSummary[];
  /** Trip currently being hydrated, so we can show a spinner on that row. */
  loadingTripId: string | null;
  errorMessage?: string | null;
  importingFile: boolean;
  /** When non-null there are more pages to fetch via onLoadMore. */
  hasMore: boolean;
  /** True while a "load more" page request is in flight. */
  loadingMore: boolean;
  onClose: () => void;
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (id: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadMore: () => void;
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

export const MyTripsModal: React.FC<MyTripsModalProps> = ({
  show, loading, trips, loadingTripId, errorMessage, importingFile,
  hasMore, loadingMore,
  onClose, onSelectTrip, onDeleteTrip, onFileUpload, onLoadMore,
}) => {
  if (!show) return null;

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        <div className={s.headerRow}>
          <h2 className={s.headerTitle}>My Trips</h2>
          <button onClick={onClose} className={s.headerCloseBtn}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {errorMessage && <div className={s.errorBox}>{errorMessage}</div>}

        {loading ? (
          <div className={s.loadingWrap}>
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : trips.length === 0 ? (
          <div className={s.emptyWrap}>
            <Library className="w-16 h-16 text-slate-300 mx-auto" />
            <p className={s.emptyText}>No saved trips yet</p>
            <p className={s.emptySubtext}>Build a trip in the chat, then click <span className="font-semibold">Save Trip</span> to find it here.</p>
          </div>
        ) : (
          <div className={s.list}>
            {trips.map((trip) => {
              const isLoadingThis = loadingTripId === trip.id;
              return (
                <div key={trip.id} className={s.tripItem}>
                  <button
                    onClick={() => onSelectTrip(trip.id)}
                    disabled={loadingTripId !== null}
                    className="flex items-center gap-4 flex-1 min-w-0 text-left"
                  >
                    <div className={s.tripIconWrap}>
                      {isLoadingThis
                        ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        : <MapPin className="w-6 h-6 text-indigo-600" />}
                    </div>
                    <div className={s.tripBody}>
                      <h3 className={s.tripTitle}>{trip.title}</h3>
                      <p className={s.tripMeta}>
                        {trip.city}
                        {trip.updatedAt ? ` · Updated ${formatUpdatedAt(trip.updatedAt)}` : ''}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => onDeleteTrip(trip.id)}
                    disabled={loadingTripId !== null}
                    className={s.tripDeleteBtn}
                    title="Delete trip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {hasMore && (
              <div className={s.loadMoreWrap}>
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore || loadingTripId !== null}
                  className={s.loadMoreBtn}
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className={s.fileUploadWrap}>
          <label className={s.fileUploadBtn}>
            {importingFile
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Upload className="w-4 h-4" />}
            {importingFile ? 'Importing…' : 'Import from KML file'}
            <input
              type="file"
              accept=".kml,application/vnd.google-earth.kml+xml"
              onChange={onFileUpload}
              disabled={importingFile}
              className="hidden"
            />
          </label>
          <p className={s.fileUploadHint}>Imported KML files are added to the current trip.</p>
        </div>
      </div>
    </div>
  );
};
