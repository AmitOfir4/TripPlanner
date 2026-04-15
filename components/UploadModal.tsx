import React, { useState, useEffect } from 'react';
import { X, Upload, RefreshCw, ExternalLink, CheckCircle, Loader2, FileUp, AlertCircle } from 'lucide-react';
import { MyMapsFile } from '../googleDriveService';
import { uploadModalStyles as s } from '../styles/modals';

interface UploadModalProps {
  show: boolean;
  cityName: string;
  existingFiles: MyMapsFile[];
  loadingFiles: boolean;
  uploading: boolean;
  uploadResult: { success: boolean; fileName: string } | null;
  onClose: () => void;
  onUpload: (fileName: string, fileIdToUpdate?: string) => void;
  onRefreshFiles: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  show, cityName, existingFiles, loadingFiles, uploading, uploadResult,
  onClose, onUpload, onRefreshFiles,
}) => {
  const defaultName = `Trip_${cityName || 'Planner'}_${new Date().toISOString().split('T')[0]}`;
  const [mapName, setMapName] = useState(defaultName);
  const [mode, setMode] = useState<'new' | 'overwrite'>('new');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setMapName(defaultName);
      setMode('new');
      setSelectedFileId(null);
    }
  }, [show, defaultName]);

  if (!show) return null;

  const handleSubmit = () => {
    if (mode === 'overwrite' && selectedFileId) {
      const file = existingFiles.find((f) => f.id === selectedFileId);
      onUpload(file?.name || mapName, selectedFileId);
    } else {
      onUpload(mapName.trim() || defaultName);
    }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={s.headerIcon}>
              <Upload className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className={s.headerTitle}>Upload to Google Maps</h2>
              <p className={s.headerSubtitle}>Export your trip as a KML file to Google Drive</p>
            </div>
          </div>
          <button onClick={onClose} className={s.headerCloseBtn}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {uploadResult?.success ? (
          <div className="space-y-5">
            <div className={s.successBox}>
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <div>
                <p className={s.successTitle}>Uploaded Successfully!</p>
                <p className={s.successSubtitle}>
                  <span className="font-semibold">{uploadResult.fileName}</span> is now in your Google Drive
                </p>
              </div>
            </div>

            <div className={s.instructionBox}>
              <p className={s.instructionTitle}>To see it on Google Maps:</p>
              <ol className="text-sm text-slate-600 space-y-2">
                {[
                  ['Open Google My Maps and click', '"Create a New Map"'],
                  ['Click', '"Import"', 'in the left panel'],
                  ['Select', '"Google Drive"', `tab, find "${uploadResult.fileName}"`],
                  ['Click', '"Select"', 'to import. Done!'],
                ].map((parts, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={s.instructionStep}>{i + 1}</span>
                    <span>
                      {parts.map((p, j) =>
                        p.startsWith('"') ? <strong key={j}>{p}</strong> : <span key={j}>{p} </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex gap-3">
              <a href="https://www.google.com/maps/d/u/0/" target="_blank" rel="noreferrer" className={s.openMapsBtn}>
                <ExternalLink className="w-4 h-4" />
                Open Google My Maps
              </a>
              <button onClick={onClose} className={s.doneBtn}>Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mode selector */}
            <div className="flex gap-2">
              <button onClick={() => setMode('new')} className={s.modeBtn(mode === 'new')}>
                <FileUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                New File
              </button>
              <button onClick={() => { setMode('overwrite'); onRefreshFiles(); }} className={s.modeBtn(mode === 'overwrite')}>
                <RefreshCw className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Update Existing
              </button>
            </div>

            {mode === 'new' ? (
              <div className="space-y-3">
                <label className={s.fileNameLabel}>File Name</label>
                <input
                  type="text"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  placeholder="Enter a name for your map file..."
                  className={s.fileNameInput}
                />
                <p className={s.fileNameHint}>
                  File will be saved as <strong>{(mapName.trim() || defaultName)}.kml</strong> on Google Drive
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={s.fileNameLabel}>Select file to update</label>
                  <button onClick={onRefreshFiles} disabled={loadingFiles} className={s.refreshBtn}>
                    <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {loadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                    <span className="text-sm text-slate-500 ml-2">Loading Drive files...</span>
                  </div>
                ) : existingFiles.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No KML files found on your Google Drive</p>
                    <p className="text-xs text-slate-300 mt-1">Upload a new file first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {existingFiles.map((file) => (
                      <button key={file.id} onClick={() => setSelectedFileId(file.id)} className={s.fileItem(selectedFileId === file.id)}>
                        <FileUp className={`w-4 h-4 flex-shrink-0 ${selectedFileId === file.id ? 'text-teal-600' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">Last edited {new Date(file.modifiedTime).toLocaleDateString()}</p>
                        </div>
                        {selectedFileId === file.id && <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={uploading || (mode === 'overwrite' && !selectedFileId)}
              className={s.uploadBtn}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> {mode === 'overwrite' ? 'Update File on Drive' : 'Upload to Google Drive'}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
