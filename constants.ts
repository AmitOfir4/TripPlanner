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
  downloadKml: "Export to My Maps",
  howToImport: "How to use",
  sources: "Map Evidence",
  reset: "Clear",
  layersTip: "Locations are grouped by city layers for easier navigation.",
  rating: "Rating",
  topRated: "Highly Recommended",
  apiError: "Visuals Restricted"
} as const;

export const API_LIMITS = {
  MAX_REQUESTS_PER_SESSION: 20,
  MIN_REQUEST_INTERVAL: 2000, // milliseconds
} as const;

export const CATEGORY_IMAGES = {
  FOOD: "https://media.istockphoto.com/id/1417838650/vector/knife-fork-silhouette-icon-vector-icon.jpg?s=612x612&w=0&k=20&c=aEC7Gqh8Fr7KC3bzhBqijGm_rgavKos6ifO1Hsh5U-U=",
  MUSEUM: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0VGDAlOY5W6bHDYDvuLzusoTiDWzEdNQWOg&s",
  SHOPPING: "https://www.creativefabrica.com/wp-content/uploads/2021/03/02/Shopping-bag-Hand-holding-a-shopping-Graphics-9096002-1.png",
  BEACH: "https://us.123rf.com/450wm/rensetiawan/rensetiawan2510/rensetiawan251053561/254806929-beach-chair-and-sun-lounger-icon-vector-illustration.jpg?ver=6",
  DEFAULT: "https://m.media-amazon.com/images/I/714Uj0TkppL.jpg"
} as const;
