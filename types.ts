
export type Language = 'en' | 'he';

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
  photoUrl?: string;
  placeId?: string;
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
  language: Language;
}
