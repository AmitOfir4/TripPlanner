

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
    const timestamp = Date.now();
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime,thumbnailLink,webViewLink)&orderBy=modifiedTime desc&_=${timestamp}`;
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
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
 * Fetches KML files from the user's Google Drive (uploaded trip files)
 */
export async function fetchKmlFiles(accessToken: string): Promise<MyMapsFile[]> {
  try {
    const query = "mimeType='application/vnd.google-earth.kml+xml' and trashed=false";
    const timestamp = Date.now();
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime,webViewLink)&orderBy=modifiedTime desc&_=${timestamp}`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch KML files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching KML files:', error);
    return [];
  }
}

// Backend endpoint that fetches the publicly-shared Google My Map KML for us.
// In dev, point at the local Express server; in prod, the Vercel function.
const IMPORT_MYMAP_ENDPOINT = import.meta.env.DEV
  ? 'http://localhost:3001/api/import-mymap'
  : '/api/import-mymap';

/**
 * Downloads a My Maps file as KML via our backend proxy. The map must be
 * publicly shared ("Anyone with the link") for Google to return its KML.
 * The unused accessToken arg is kept for backward compat with callers.
 */
export async function downloadMyMapAsKML(fileId: string, _accessToken: string): Promise<string> {
  try {
    const response = await fetch(`${IMPORT_MYMAP_ENDPOINT}?mid=${encodeURIComponent(fileId)}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message ||
        'Failed to import map. Make sure it is shared as "Anyone with the link".'
      );
    }
    return await response.text();
  } catch (error) {
    console.error('Error downloading KML:', error);
    throw error;
  }
}

/**
 * Uploads a KML file to Google Drive
 * Creates a new file or updates an existing one
 */
export async function uploadKMLToDrive(
  kmlContent: string,
  fileName: string,
  accessToken: string,
  fileIdToUpdate?: string
): Promise<{ id: string; webViewLink: string }> {
  try {
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const metadata = {
      name: fileName,
      mimeType: 'application/vnd.google-earth.kml+xml'
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/vnd.google-earth.kml+xml\r\n\r\n' +
      kmlContent +
      closeDelimiter;

    const method = fileIdToUpdate ? 'PATCH' : 'POST';
    const url = fileIdToUpdate
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileIdToUpdate}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Upload error:', errorData);
      throw new Error(`Failed to upload KML: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Successfully uploaded KML to Drive:', result);
    
    return {
      id: result.id,
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`
    };
  } catch (error) {
    console.error('Error uploading KML to Drive:', error);
    throw error;
  }
}
