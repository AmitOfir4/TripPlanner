import { useState } from 'react';
import { MyMapsFile, fetchKmlFiles } from '../googleDriveService';
import { TripService } from '../services/tripService';
import { TripLayer } from '../types';
import { isAuthError } from '../helpers/apiError';

interface UseUploadReturn {
  showUploadModal: boolean;
  uploadDriveFiles: MyMapsFile[];
  loadingDriveFiles: boolean;
  uploading: boolean;
  uploadResult: { success: boolean; fileName: string } | null;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  refreshDriveFiles: (accessToken: string) => Promise<void>;
  doUpload: (
    savedLayers: TripLayer[],
    currentCity: string,
    accessToken: string,
    fileName: string,
    fileIdToUpdate?: string
  ) => Promise<{ id: string; fileName: string } | null>;
  handleDownload: (savedLayers: TripLayer[], currentCity: string) => Promise<void>;
}

interface UseUploadDeps {
  /** Called when Drive rejects our token, so the session ends and the user is
   *  prompted to sign in again. */
  onAuthFailure: () => void;
}

export const useUpload = ({ onAuthFailure }: UseUploadDeps): UseUploadReturn => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDriveFiles, setUploadDriveFiles] = useState<MyMapsFile[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    fileName: string;
  } | null>(null);

  const openUploadModal = () => {
    setShowUploadModal(true);
    setUploadResult(null);
  };

  const closeUploadModal = () => setShowUploadModal(false);

  const refreshDriveFiles = async (accessToken: string) => {
    setLoadingDriveFiles(true);
    try {
      const files = await fetchKmlFiles(accessToken);
      setUploadDriveFiles(files);
    } catch (error) {
      console.error('Error fetching Drive files:', error);
      if (isAuthError(error)) onAuthFailure();
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  const doUpload = async (
    savedLayers: TripLayer[],
    currentCity: string,
    accessToken: string,
    fileName: string,
    fileIdToUpdate?: string
  ): Promise<{ id: string; fileName: string } | null> => {
    setUploading(true);
    try {
      const result = await TripService.uploadToGoogleDrive(
        savedLayers,
        currentCity,
        accessToken,
        fileName,
        fileIdToUpdate
      );
      setUploadResult({ success: true, fileName: result.fileName });
      return result;
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      if (isAuthError(error)) {
        // The banner takes over from here — an alert saying "try again" would
        // just send the user back into the same dead session.
        onAuthFailure();
      } else {
        alert('Failed to upload to Google Drive. Please try again.');
      }
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (savedLayers: TripLayer[], currentCity: string) => {
    try {
      await TripService.downloadTrip(savedLayers, currentCity);
    } catch (error) {
      console.error('Error downloading trip:', error);
      alert('Failed to download KML file. Please try again.');
    }
  };

  return {
    showUploadModal,
    uploadDriveFiles,
    loadingDriveFiles,
    uploading,
    uploadResult,
    openUploadModal,
    closeUploadModal,
    refreshDriveFiles,
    doUpload,
    handleDownload,
  };
};
