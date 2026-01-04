import { CATEGORY_IMAGES } from '../Constants';

const IMAGE_MAPPING: Record<string, string[]> = {
  FOOD: ['food', 'restaurant', 'cafe', 'dining'],
  MUSEUM: ['museum', 'art', 'gallery'],
  SHOPPING: ['shop', 'market', 'mall'],
  BEACH: ['beach', 'sea'],
  HOTEL: ['hotel', 'accommodation']
};

export const getCategoryImage = (category: string): string => {
  const normalized = (category || '').toLowerCase();
  
  for (const [imageKey, keywords] of Object.entries(IMAGE_MAPPING)) 
  {
    if (keywords.some(keyword => normalized.includes(keyword))) 
    {
      return CATEGORY_IMAGES[imageKey as keyof typeof CATEGORY_IMAGES];
    }
  }
  
  return CATEGORY_IMAGES.DEFAULT;
};
