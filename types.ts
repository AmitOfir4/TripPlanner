
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
  needsEnrichment?: boolean;
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
