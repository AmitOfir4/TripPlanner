export const TRANSLATIONS = {
  title: "TripPlanner",
  builder: "Plan Your Escape",
  savedMap: "Trip Summary",
  cityPrompt: "Destination City",
  queryPrompt: "What are you looking for?",
  queryPlaceholder: "What you'd like to discover",
  findPlaces: "Discover Spots",
  loadMore: "Find More",
  searching: "Searching the map...",
  savePlace: "Add to Trip",
  dismiss: "Skip",
  noCity: "Where should we go first?",
  noPlaces: "Your itinerary is empty",
  saved: "Added!",
  downloadKml: "Download Map",
  howToImport: "How to use",
  sources: "Map Evidence",
  reset: "Clear",
  layersTip: "Locations are grouped by city layers for easier navigation.",
  rating: "Rating",
  topRated: "Highly Recommended",
  apiError: "Visuals Restricted"
} as const;

export const KML_ICON_STYLES: Record<string, string> = {
  'Tourist Attractions': 'icon-camera',
  'Bar': 'icon-bars',
  'Restaurants': 'icon-dining',
  'Museums & Galleries': 'icon-arts',
  'Shopping': 'icon-shopping',
  'Beach': 'icon-beach',
  'Hotels': 'icon-hotel',
  'Ice Cream': 'icon-icecream',
  'Coffee': 'icon-coffee'
};

export const AVAILABLE_KML_ICONS = [
  { id: 'icon-camera', name: 'Camera', url: 'https://i.postimg.cc/zbtLPvhZ/image.png' },
  { id: 'icon-dining', name: 'Dining', url: 'https://i.postimg.cc/WFrK5FCT/image.png' },
  { id: 'icon-arts', name: 'Museum', url: 'https://i.postimg.cc/64rkp2fL/image.png' },
  { id: 'icon-shopping', name: 'Shopping', url: 'https://i.postimg.cc/w7JvD00S/image.png' },
  { id: 'icon-beach', name: 'Beach', url: 'https://i.postimg.cc/629RmF1Q/image.png' },
  { id: 'icon-bars', name: 'Bars', url: 'https://i.postimg.cc/ygFQmq3f/image.png' },
  { id: 'icon-hotel', name: 'Hotel', url: 'https://i.postimg.cc/kBZHPyCm/image.png' },
  { id: 'icon-icecream', name: 'Ice Cream', url: 'https://i.postimg.cc/DJgQf7bq/image.png' },
  { id: 'icon-coffee', name: 'Coffee', url: 'https://i.postimg.cc/2bfT8H9r/image.png' },
] as const;
