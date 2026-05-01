
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
  /** ISO-3166 alpha-2 country code (e.g. "IT", "FR"). Set per-place by the
   * chat parser so geocoding can constrain Google Places to the right country
   * — prevents collisions like Naples Italy vs Naples Florida. */
  country?: string;
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

/** Response shape for GET /api/trips. Keyset paginated by `updatedAt`. */
export interface SavedTripsPage {
  trips: SavedTripSummary[];
  /** ISO-8601 `updatedAt` of the last trip in this page. Pass back as `before`
   *  to fetch the next page. `null` when there are no more pages. */
  nextCursor: string | null;
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
