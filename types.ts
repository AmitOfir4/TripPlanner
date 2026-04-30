
export interface GroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
    placeId?: string;
  };
}

export interface TripRecommendation {
  title: string;
  description: string;
  category: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  placeId?: string;
  customKmlIcon?: string;
  /** The city this place belongs to. Set when a place comes from a chat query
   * about a different city than the current session city. Used to geocode
   * correctly and create the right layer in the trip summary. */
  city?: string;
}

export interface TripLayer {
  name: string;
  places: TripRecommendation[];
}

export interface TripData {
  city: string;
  summary: string;
  layers: TripLayer[];
  sources: GroundingChunk[];
}

/** Lightweight projection used by the "My Trips" list. */
export interface SavedTripSummary {
  id: string;
  title: string;
  city: string;
  /** ISO-8601 string from the backend. */
  createdAt: string;
  /** ISO-8601 string from the backend. */
  updatedAt: string;
}

/** Full trip document returned by GET /api/trips/:id. */
export interface SavedTripDoc extends SavedTripSummary {
  ownerSub: string;
  summary: string;
  layers: TripLayer[];
  sources: GroundingChunk[];
  /** Set after a successful "Upload to Google Maps", so subsequent uploads
   *  update the same Drive file in place. */
  driveFileId?: string;
}
