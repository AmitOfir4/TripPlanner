export const TRANSLATIONS = {
  title: "TripPlanner",
  builder: "Plan Your Escape",
  savedMap: "Trip Summary",
  cityPrompt: "Destination City",
  queryPrompt: "What are you looking for?",
  queryPlaceholder: "e.g. Hidden gems, best pizza, local art...",
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

export const API_LIMITS = {
  MAX_REQUESTS_PER_SESSION: Infinity,
  MIN_REQUEST_INTERVAL: 2000, // milliseconds
} as const;

export const CATEGORY_RULES: Record<string, string[]> = {
  'Tourist Attractions': ['landmark', 'attraction', 'historical', 'nature', 'monument', 'sight'],
  'Bar': ['nightlife', 'bar', 'club', 'pub', 'cocktail'],
  'Restaurants': ['food', 'restaurant', 'dining', 'cafe'],
  'Museums & Galleries': ['museum', 'gallery', 'art'],
  'Shopping': ['shop', 'market', 'mall'],
  'Beach': ['beach', 'sea', 'ocean'],
  'Hotels': ['hotel', 'accommodation', 'resort']
};

export const CATEGORY_IMAGES = {
  FOOD: "https://media.istockphoto.com/id/1417838650/vector/knife-fork-silhouette-icon-vector-icon.jpg?s=612x612&w=0&k=20&c=aEC7Gqh8Fr7KC3bzhBqijGm_rgavKos6ifO1Hsh5U-U=",
  MUSEUM: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0VGDAlOY5W6bHDYDvuLzusoTiDWzEdNQWOg&s",
  SHOPPING: "https://www.creativefabrica.com/wp-content/uploads/2021/03/02/Shopping-bag-Hand-holding-a-shopping-Graphics-9096002-1.png",
  BEACH: "https://us.123rf.com/450wm/rensetiawan/rensetiawan2510/rensetiawan251053561/254806929-beach-chair-and-sun-lounger-icon-vector-illustration.jpg?ver=6",
  HOTEL: "https://as2.ftcdn.net/jpg/00/82/58/01/1000_F_82580196_bfodUsOwMwOaMF3O6qkUsB7HctfpqtHI.jpg",
  BAR: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRBc0wtsaWwMNhfFWueJV194pvyzSl-GvzbA&s",
  DEFAULT: "https://m.media-amazon.com/images/I/714Uj0TkppL.jpg"
} as const;

export const KML_ICON_STYLES: Record<string, string> = {
  'Tourist Attractions': 'icon-camera',
  'Bar': 'icon-bars',
  'Restaurants': 'icon-dining',
  'Museums & Galleries': 'icon-arts',
  'Shopping': 'icon-shopping',
  'Beach': 'icon-beach',
  'Hotels': 'icon-hotel'
};

export const AVAILABLE_KML_ICONS = [
  { id: 'icon-camera', name: 'Camera', url: 'http://maps.google.com/mapfiles/kml/shapes/camera.png' },
  { id: 'icon-dining', name: 'Dining', url: 'http://maps.google.com/mapfiles/kml/shapes/dining.png' },
  { id: 'icon-arts', name: 'Arts', url: 'http://maps.google.com/mapfiles/kml/shapes/arts.png' },
  { id: 'icon-shopping', name: 'Shopping', url: 'http://maps.google.com/mapfiles/kml/shapes/shopping.png' },
  { id: 'icon-parks', name: 'Parks', url: 'http://maps.google.com/mapfiles/kml/shapes/parks.png' },
  { id: 'icon-beach', name: 'Beach', url: 'http://maps.google.com/mapfiles/kml/shapes/swimming.png' },
  { id: 'icon-bars', name: 'Bars', url: 'http://maps.google.com/mapfiles/kml/shapes/bars.png' },
  { id: 'icon-hotel', name: 'Hotel', url: 'http://maps.google.com/mapfiles/kml/shapes/lodging.png' },
] as const;
