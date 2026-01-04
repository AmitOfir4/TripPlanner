import { CATEGORY_IMAGES } from '../Constants';

export const getCategoryImage = (category: string): string => {
  const normalized = (category || '').toLowerCase();
  
  if (normalized.includes('food') || normalized.includes('restaurant') || 
      normalized.includes('cafe') || normalized.includes('dining')) {
    return CATEGORY_IMAGES.FOOD;
  }
  
  if (normalized.includes('museum') || normalized.includes('art') || 
      normalized.includes('gallery')) {
    return CATEGORY_IMAGES.MUSEUM;
  }
  
  if (normalized.includes('shop') || normalized.includes('market') || 
      normalized.includes('mall')) {
    return CATEGORY_IMAGES.SHOPPING;
  }
  
  if (normalized.includes('beach') || normalized.includes('sea')) {
    return CATEGORY_IMAGES.BEACH;
  }
  
  return CATEGORY_IMAGES.DEFAULT;
};
