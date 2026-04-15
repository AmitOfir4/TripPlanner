import { CATEGORY_RULES, KML_ICON_STYLES } from '../constants';

const ICON_PRIORITY = [
  'Ice Cream',
  'Coffee',
  'Tourist Attractions',
  'Hotels',
  'Restaurants',
  'Bar',
  'Museums & Galleries',
  'Shopping',
  'Beach',
];

export const getDefaultKmlIcon = (place: {
  category: string;
  title: string;
  description: string;
}): string => {
  const text = `${place.category} ${place.title} ${place.description}`.toLowerCase();

  for (const categoryName of ICON_PRIORITY) {
    const keywords = CATEGORY_RULES[categoryName];
    if (keywords && keywords.some((keyword) => text.includes(keyword))) {
      return KML_ICON_STYLES[categoryName] || 'icon-camera';
    }
  }

  return 'icon-camera';
};
