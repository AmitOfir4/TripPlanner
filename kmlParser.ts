import { XMLParser } from 'fast-xml-parser';
import { TripRecommendation, TripLayer } from './types';
import { AVAILABLE_KML_ICONS } from './constants';

/**
 * Parses KML data from Google My Maps and converts it to our app's format
 * KML structure typically includes:
 * - Folders (which become our layers)
 * - Placemarks (which become our recommendations)
 * - Styles / StyleMaps (used to resolve each placemark's icon back to one of
 *   our local icon IDs so a round-trip through Google My Maps preserves the
 *   originally-chosen icon instead of falling back to the camera default)
 */
export function parseKMLToTripData(kmlText: string): { layers: TripLayer[], cityName: string } {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(kmlText);
  const kml = parsed.kml || parsed.KML;

  if (!kml || !kml.Document) {
    throw new Error('Invalid KML format');
  }

  const doc = kml.Document;
  const cityName = doc.name || 'Imported Map';
  const layers: TripLayer[] = [];

  // Build styleId -> our internal icon ID map up-front so every Placemark
  // can resolve its <styleUrl> to a known icon without re-walking the doc.
  const styleResolver = buildStyleResolver(doc);

  // KML can have Folders (layers) or direct Placemarks
  const folders = Array.isArray(doc.Folder) ? doc.Folder : (doc.Folder ? [doc.Folder] : []);
  const rootPlacemarks = Array.isArray(doc.Placemark) ? doc.Placemark : (doc.Placemark ? [doc.Placemark] : []);

  // Process folders as layers
  folders.forEach(folder => {
    const layerName = folder.name || 'Unnamed Layer';
    const placemarks = Array.isArray(folder.Placemark) ? folder.Placemark : (folder.Placemark ? [folder.Placemark] : []);

    const places = placemarks.map(placemark => parseKMLPlacemark(placemark, styleResolver)).filter(Boolean) as TripRecommendation[];

    if (places.length > 0) {
      layers.push({
        name: layerName,
        places,
      });
    }
  });

  // If there are root-level placemarks, create a default layer
  if (rootPlacemarks.length > 0) {
    const places = rootPlacemarks.map(placemark => parseKMLPlacemark(placemark, styleResolver)).filter(Boolean) as TripRecommendation[];
    if (places.length > 0) {
      layers.push({
        name: cityName,
        places,
      });
    }
  }

  return { layers, cityName };
}

// ── Style resolution ────────────────────────────────────────────────────

// Reverse-lookup: icon URL (as written in the KML <Icon><href>) -> our internal icon id.
// Built once at module load from the same catalog the exporter uses.
const URL_TO_ICON_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const icon of AVAILABLE_KML_ICONS) map[icon.url] = icon.id;
  return map;
})();

// Set of every icon id the app knows about. Used to validate the IconId we
// stash in <ExtendedData> on export, so a stale or tampered KML can't inject
// an unknown id into a place.
const KNOWN_ICON_IDS: ReadonlySet<string> = new Set(AVAILABLE_KML_ICONS.map(i => i.id));

/** Extracts a <Data name="..."> value from a placemark's <ExtendedData>, or null. */
function getExtendedDataValue(placemark: any, name: string): string | null {
  const dataEntries = toArray(placemark?.ExtendedData?.Data);
  const match = dataEntries.find(d => d?.['@_name'] === name);
  const value = match?.value;
  return typeof value === 'string' ? value : null;
}

/** Resolves a styleUrl (e.g. "#icon-dining" or "icon-1234") to one of our icon IDs, or null. */
type StyleResolver = (styleUrl: string | undefined) => string | null;

/**
 * Walks the document's <Style> and <StyleMap> blocks once and returns a
 * resolver that maps any styleUrl reference to one of our local icon IDs.
 *
 * Google My Maps quirks this handles:
 *  - Renames our "icon-dining" style ids to its own (e.g. "icon-1234-normal")
 *    while preserving the underlying <Icon><href>.
 *  - Wraps each style in a <StyleMap> (normal/highlight pair); placemark
 *    <styleUrl> points at the StyleMap, not the Style itself.
 */
function buildStyleResolver(doc: any): StyleResolver {
  const styles = toArray(doc.Style);
  const styleMaps = toArray(doc.StyleMap);

  // Pass 1: styleId -> iconHref (from each <Style>).
  const idToHref: Record<string, string> = {};
  for (const style of styles) {
    const id = style?.['@_id'];
    const href = style?.IconStyle?.Icon?.href;
    if (id && typeof href === 'string') idToHref[id] = href;
  }

  // Pass 2: StyleMap id -> the styleId of its 'normal' pair (fall back to first pair).
  const styleMapToStyleId: Record<string, string> = {};
  for (const sm of styleMaps) {
    const id = sm?.['@_id'];
    if (!id) continue;
    const pairs = toArray(sm.Pair);
    const normal = pairs.find(p => (p?.key || '').toLowerCase() === 'normal') || pairs[0];
    const target = stripHash(normal?.styleUrl);
    if (target) styleMapToStyleId[id] = target;
  }

  return (styleUrl) => {
    const ref = stripHash(styleUrl);
    if (!ref) return null;
    // styleUrl might point at a StyleMap; follow it once to the real style.
    const styleId = styleMapToStyleId[ref] || ref;
    const href = idToHref[styleId];
    return href ? URL_TO_ICON_ID[href] || null : null;
  };
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function stripHash(s: string | undefined | null): string | null {
  if (!s || typeof s !== 'string') return null;
  return s.startsWith('#') ? s.slice(1) : s;
}

/**
 * Converts a KML Placemark to our TripRecommendation format
 */
function parseKMLPlacemark(placemark: any, resolveStyle: StyleResolver): TripRecommendation | null {
  try {
    const name = placemark.name || 'Unnamed Place';
    const description = placemark.description || '';

    // Extract coordinates from Point geometry
    let lat: number | undefined;
    let lng: number | undefined;

    if (placemark.Point && placemark.Point.coordinates) {
      const coords = placemark.Point.coordinates.toString().trim().split(',');
      if (coords.length >= 2) {
        lng = parseFloat(coords[0]);
        lat = parseFloat(coords[1]);
      }
    }

    // Resolve the icon. Priority:
    //   1) <ExtendedData><Data name="IconId"> — survives Google My Maps round-trip
    //   2) inline <Style><IconStyle><Icon><href> on the placemark
    //   3) document-level <styleUrl> reference (Style or StyleMap)
    const extendedIconId = getExtendedDataValue(placemark, 'IconId');
    const inlineHref = placemark?.Style?.IconStyle?.Icon?.href;
    const customKmlIcon =
      (extendedIconId && KNOWN_ICON_IDS.has(extendedIconId) ? extendedIconId : null)
      || (typeof inlineHref === 'string' ? URL_TO_ICON_ID[inlineHref] : null)
      || resolveStyle(placemark.styleUrl)
      || undefined;

    // Try to extract category from description or style
    let category = 'Place';
    const descLower = description.toLowerCase();
    if (descLower.includes('restaurant') || descLower.includes('food')) category = 'Restaurant';
    else if (descLower.includes('museum') || descLower.includes('art')) category = 'Museum';
    else if (descLower.includes('park') || descLower.includes('garden')) category = 'Park';
    else if (descLower.includes('landmark') || descLower.includes('monument')) category = 'Landmark';
    else if (descLower.includes('hotel') || descLower.includes('accommodation')) category = 'Hotel';
    else if (descLower.includes('shop') || descLower.includes('market')) category = 'Shopping';

    // Generate Google Maps URL if we have coordinates
    const mapUrl = (lat && lng)
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : undefined;

    return {
      title: name,
      description: stripHTML(description),
      category,
      lat,
      lng,
      mapUrl,
      customKmlIcon,
    };
  } catch (error) {
    console.error('Error parsing placemark:', error);
    return null;
  }
}

/**
 * Removes HTML tags from KML description (My Maps often includes HTML)
 */
function stripHTML(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
