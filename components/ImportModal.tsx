import React from 'react';
import { X, Loader2, ChevronRight, Upload, Map as MapIcon } from 'lucide-react';
import { MyMapsFile } from '../googleDriveService';
import { importModalStyles as s } from '../styles/modals';

interface ImportModalProps {
  show: boolean;
  loading: boolean;
  importing: boolean;
  maps: MyMapsFile[];
  onClose: () => void;
  onSelectMap: (map: MyMapsFile) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  show, loading, importing, maps, onClose, onSelectMap, onFileUpload,
}) => {
  if (!show) return null;

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        <div className={s.headerRow}>
          <h2 className={s.headerTitle}>Import from My Maps</h2>
          <button onClick={onClose} className={s.headerCloseBtn}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className={s.loadingWrap}>
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : maps.length === 0 ? (
          <div className={s.emptyWrap}>
            <MapIcon className="w-16 h-16 text-slate-300 mx-auto" />
            <p className={s.emptyText}>No saved maps found in your Google My Maps</p>
            <p className={s.emptySubtext}>Create maps at maps.google.com and they'll appear here</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {maps.map((map) => (
                <button key={map.id} onClick={() => onSelectMap(map)} disabled={importing} className={s.mapItem}>
                  <div className="flex items-start gap-4">
                    <div className={s.mapItemIconWrap}>
                      <MapIcon className="w-6 h-6 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={s.mapItemTitle}>{map.name}</h3>
                      <p className={s.mapItemDate}>Modified: {new Date(map.modifiedTime).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0" />
                  </div>
                </button>
              ))}
            </div>

            <div className={s.fileUploadWrap}>
              <label className="block">
                <input type="file" accept=".kml,.kmz" onChange={onFileUpload} className="hidden" />
                <div className={s.fileUploadBtn}>
                  <Upload className="w-5 h-5" />
                  <span>Upload KML File</span>
                </div>
              </label>
              <p className={s.fileUploadHint}>Download your map from Google My Maps, then upload the KML file here</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
