

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

/**
 * Downloads a My Maps file as KML
 * My Maps files must be publicly shared to download. This function attempts to:
 * 1. Download via public KML URL using a CORS proxy
 * 2. If that fails, throws error with instructions
 */
export async function downloadMyMapAsKML(fileId: string, accessToken: string): Promise<string> {
  try {
    // Add timestamp to bust cache
    const timestamp = Date.now();
    const directKmlUrl = `https://www.google.com/maps/d/u/0/kml?forcekml=1&mid=${fileId}&_=${timestamp}`;
    
    console.log('Attempting to download My Map KML via CORS proxy...');
    
    // Try multiple CORS proxies in sequence
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(directKmlUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directKmlUrl)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(directKmlUrl)}`
    ];
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < proxies.length; i++) {
      try {
        console.log(`Trying proxy ${i + 1}/${proxies.length}...`);
        const response = await fetch(proxies[i], {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        if (!response.ok) {
          throw new Error(`Proxy ${i + 1} failed: ${response.statusText}`);
        }

        let kmlText = await response.text();
        
        // For allorigins, extract the content from JSON response
        if (proxies[i].includes('allorigins')) {
          const data = JSON.parse(kmlText);
          kmlText = data.contents;
        }
        
        // Verify we got valid KML content
        if (kmlText.includes('<kml') || kmlText.includes('<?xml')) {
          console.log('Successfully downloaded KML via proxy', i + 1);
          return kmlText;
        }
        
        throw new Error('Response is not valid KML format');
      } catch (error) {
        console.warn(`Proxy ${i + 1} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }
    
    // All proxies failed
    throw new Error('Map is not publicly accessible or all CORS proxies failed. Please make your map public: Share > Change to "Anyone with the link"');
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
