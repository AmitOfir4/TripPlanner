import { TripRecommendation } from '../types';

export const buildGoogleMapsUrl = (place: TripRecommendation): string => {
  if (place.mapUrl) return place.mapUrl;
  if (place.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${place.placeId}`;
  }
  if (place.lat && place.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&center=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}`;
};
