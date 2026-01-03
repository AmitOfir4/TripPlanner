import React from 'react';
import { X, Loader2, ChevronRight, Upload, Map as MapIcon } from 'lucide-react';
import { MyMapsFile } from '../googleDriveService';

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
  show,
  loading,
  importing,
  maps,
  onClose,
  onSelectMap,
  onFileUpload
}) => {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader onClose={onClose} />
        <ModalContent 
          loading={loading}
          importing={importing}
          maps={maps}
          onSelectMap={onSelectMap}
          onFileUpload={onFileUpload}
        />
      </div>
    </div>
  );
};

interface ModalHeaderProps {
  onClose: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ onClose }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-2xl font-black text-slate-900">Import from My Maps</h2>
    <button 
      onClick={onClose} 
      className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
    >
      <X className="w-5 h-5 text-slate-400" />
    </button>
  </div>
);

interface ModalContentProps {
  loading: boolean;
  importing: boolean;
  maps: MyMapsFile[];
  onSelectMap: (map: MyMapsFile) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ModalContent: React.FC<ModalContentProps> = ({
  loading,
  importing,
  maps,
  onSelectMap,
  onFileUpload
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (maps.length === 0) {
    return <EmptyMapsState />;
  }

  return (
    <>
      <MapsList 
        maps={maps} 
        importing={importing}
        onSelectMap={onSelectMap} 
      />
      <FileUploadSection onFileUpload={onFileUpload} />
    </>
  );
};

const EmptyMapsState: React.FC = () => (
  <div className="py-16 text-center space-y-4">
    <MapIcon className="w-16 h-16 text-slate-300 mx-auto" />
    <p className="text-slate-500 font-medium">
      No saved maps found in your Google My Maps
    </p>
    <p className="text-xs text-slate-400">
      Create maps at maps.google.com and they'll appear here
    </p>
  </div>
);

interface MapsListProps {
  maps: MyMapsFile[];
  importing: boolean;
  onSelectMap: (map: MyMapsFile) => void;
}

const MapsList: React.FC<MapsListProps> = ({ maps, importing, onSelectMap }) => (
  <div className="space-y-3">
    {maps.map((map) => (
      <button
        key={map.id}
        onClick={() => onSelectMap(map)}
        disabled={importing}
        className="w-full p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-600 rounded-2xl transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <MapIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {map.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Modified: {new Date(map.modifiedTime).toLocaleDateString()}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
        </div>
      </button>
    ))}
  </div>
);

interface FileUploadSectionProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({ onFileUpload }) => (
  <div className="mt-6 pt-6 border-t border-slate-200">
    <label className="block">
      <input
        type="file"
        accept=".kml,.kmz"
        onChange={onFileUpload}
        className="hidden"
      />
      <div className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg cursor-pointer">
        <Upload className="w-5 h-5" />
        <span>Upload KML File</span>
      </div>
    </label>
    <p className="text-xs text-slate-400 text-center mt-3">
      Download your map from Google My Maps, then upload the KML file here
    </p>
  </div>
);
