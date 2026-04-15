import { useState } from 'react';
import { MyMapsFile, fetchKmlFiles } from '../googleDriveService';
import { TripService } from '../services/tripService';
import { TripLayer } from '../types';

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
  ) => Promise<void>;
  handleDownload: (savedLayers: TripLayer[], currentCity: string) => Promise<void>;
}

export const useUpload = (): UseUploadReturn => {
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
  ) => {
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
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      alert('Failed to upload to Google Drive. Please try again.');
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
