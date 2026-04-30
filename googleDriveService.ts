export interface MyMapsFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink: string;
}

/**
 * Fetches KML files from the user's Google Drive (uploaded trip files).
 * Under the `drive.file` scope this returns only files this app created or
 * opened — which is exactly what we want for the "update existing trip" flow.
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
