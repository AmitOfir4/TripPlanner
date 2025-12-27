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
 * My Maps files must be publicly shared to download. This function attempts to:
 * 1. Download via public KML URL using a CORS proxy
 * 2. If that fails, throws error with instructions
 */
export async function downloadMyMapAsKML(fileId: string, accessToken: string): Promise<string> {
  try {
    // Google My Maps can be downloaded as KML if they are publicly shared
    const directKmlUrl = `https://www.google.com/maps/d/u/0/kml?forcekml=1&mid=${fileId}`;
    
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
        const response = await fetch(proxies[i]);

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
