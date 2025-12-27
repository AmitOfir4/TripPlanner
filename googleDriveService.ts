import { GOOGLE_API_KEY } from './googleAuthService';

export interface MyMapsFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink: string;
}

/**
 * Fetches all Google My Maps files from the user's Google Drive
 * My Maps are stored as KML files with a specific MIME type
 */
export async function fetchMyMaps(accessToken: string): Promise<MyMapsFile[]> {
  try {
    // Google My Maps are stored with application/vnd.google-apps.map MIME type
    const query = "mimeType='application/vnd.google-apps.map' and trashed=false";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime,thumbnailLink,webViewLink)&orderBy=modifiedTime desc`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Drive API error:', errorData);
      throw new Error(`Failed to fetch My Maps: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching My Maps:', error);
    throw error;
  }
}

/**
 * Downloads a My Maps file as KML
 * Google My Maps files have a special export URL that we need to use
 */
export async function downloadMyMapAsKML(fileId: string, accessToken: string): Promise<string> {
  try {
    // Google My Maps export endpoint - this should work with proper authentication
    // Using the export API endpoint specifically for My Maps
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application%2Fvnd.google-earth.kml%2Bxml`;
    
    console.log('Attempting to download My Map KML...');
    
    const response = await fetch(exportUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Export failed:', response.status, errorText);
      throw new Error(`Export failed: ${response.statusText}`);
    }

    const kmlText = await response.text();
    
    // Verify we got valid KML content
    if (!kmlText.includes('<kml') && !kmlText.includes('<?xml')) {
      throw new Error('Response is not valid KML format');
    }

    console.log('Successfully downloaded KML');
    return kmlText;
  } catch (error) {
    console.error('Error downloading KML:', error);
    throw error;
  }
}
