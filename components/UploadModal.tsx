import React, { useState, useEffect } from 'react';
import { X, Upload, RefreshCw, ExternalLink, CheckCircle, Loader2, FileUp, AlertCircle } from 'lucide-react';
import { MyMapsFile } from '../googleDriveService';

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
  show,
  cityName,
  existingFiles,
  loadingFiles,
  uploading,
  uploadResult,
  onClose,
  onUpload,
  onRefreshFiles
}) => {
  const defaultName = `Trip_${cityName || 'Planner'}_${new Date().toISOString().split('T')[0]}`;
  const [mapName, setMapName] = useState(defaultName);
  const [mode, setMode] = useState<'new' | 'overwrite'>('new');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Reset state when modal opens
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
      const file = existingFiles.find(f => f.id === selectedFileId);
      onUpload(file?.name || mapName, selectedFileId);
    } else {
      onUpload(mapName.trim() || defaultName);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Upload to Google Maps</h2>
              <p className="text-xs text-slate-500">Export your trip as a KML file to Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Success state */}
        {uploadResult?.success ? (
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <div>
                <p className="font-bold text-emerald-800">Uploaded Successfully!</p>
                <p className="text-sm text-emerald-600 mt-1">
                  <span className="font-semibold">{uploadResult.fileName}</span> is now in your Google Drive
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-bold text-slate-700">To see it on Google Maps:</p>
              <ol className="text-sm text-slate-600 space-y-2">
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>Open Google My Maps and click <strong>"Create a New Map"</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Click <strong>"Import"</strong> in the left panel</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Select <strong>"Google Drive"</strong> tab, find <strong>"{uploadResult.fileName}"</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <span>Click <strong>"Select"</strong> to import. Done!</span>
                </li>
              </ol>
            </div>

            <div className="flex gap-3">
              <a
                href="https://www.google.com/maps/d/u/0/"
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open Google My Maps
              </a>
              <button
                onClick={onClose}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Upload form */
          <div className="space-y-5">
            {/* Mode selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('new')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === 'new'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                New File
              </button>
              <button
                onClick={() => { setMode('overwrite'); onRefreshFiles(); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === 'overwrite'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <RefreshCw className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Update Existing
              </button>
            </div>

            {mode === 'new' ? (
              /* New file form */
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  File Name
                </label>
                <input
                  type="text"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  placeholder="Enter a name for your map file..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <p className="text-xs text-slate-400">
                  File will be saved as <strong>{(mapName.trim() || defaultName)}.kml</strong> on Google Drive
                </p>
              </div>
            ) : (
              /* Overwrite existing files list */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select file to update
                  </label>
                  <button
                    onClick={onRefreshFiles}
                    disabled={loadingFiles}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                  >
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
                      <button
                        key={file.id}
                        onClick={() => setSelectedFileId(file.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          selectedFileId === file.id
                            ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                            : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                        }`}
                      >
                        <FileUp className={`w-4 h-4 flex-shrink-0 ${selectedFileId === file.id ? 'text-teal-600' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Last edited {new Date(file.modifiedTime).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedFileId === file.id && (
                          <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={handleSubmit}
              disabled={uploading || (mode === 'overwrite' && !selectedFileId)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-200/60 active:scale-[0.98] text-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {mode === 'overwrite' ? 'Update File on Drive' : 'Upload to Google Drive'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
