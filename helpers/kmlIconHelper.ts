import { KML_ICON_STYLES } from '../constants';

// Direct map from the AI-assigned category to our icon category
// This is the primary classification — no keyword scanning needed
const CATEGORY_TO_ICON: Record<string, string> = {
  'landmark': 'Tourist Attractions',
  'attraction': 'Tourist Attractions',
  'monument': 'Tourist Attractions',
  'nature': 'Tourist Attractions',
  'adventure': 'Tourist Attractions',
  'entertainment': 'Tourist Attractions',
  'culture': 'Tourist Attractions',
  'museum': 'Museums & Galleries',
  'gallery': 'Museums & Galleries',
  'restaurant': 'Restaurants',
  'dining': 'Restaurants',
  'cafe': 'Coffee',
  'coffee': 'Coffee',
  'bar': 'Bar',
  'nightlife': 'Bar',
  'hotel': 'Hotels',
  'accommodation': 'Hotels',
  'shopping': 'Shopping',
  'market': 'Shopping',
  'beach': 'Beach',
  'ice cream': 'Ice Cream',
  'dessert': 'Ice Cream',
};

export const getDefaultKmlIcon = (place: {
  category: string;
  title: string;
  description: string;
}): string => {
  // 1) Direct match on the AI-assigned category (fast, no false positives)
  const categoryKey = place.category.toLowerCase().trim();
  const mapped = CATEGORY_TO_ICON[categoryKey];
  if (mapped && KML_ICON_STYLES[mapped]) {
    return KML_ICON_STYLES[mapped];
  }

  // 2) Fallback: check if category contains a known key (e.g. "Art Museum" contains "museum")
  for (const [keyword, iconCategory] of Object.entries(CATEGORY_TO_ICON)) {
    if (categoryKey.includes(keyword)) {
      return KML_ICON_STYLES[iconCategory] || 'icon-camera';
    }
  }

  return 'icon-camera';
};
