export type TripRequest = {
  destination: string;
  days: number;
  budget: string;
  interests: string;
  travelStyle: "relaxed" | "balanced" | "packed";
};

export type TripPlace = {
  name: string;
  category: string;
  reason: string;
  estimated_time_minutes: number;
  suggested_day: number;
  suggested_order: number;
  google_place_id?: string;
  formatted_address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  photo_name?: string;
  photo_attributions?: PlacePhotoAttribution[];
};

export type PlacePhotoAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

export type TripDay = {
  day: number;
  places: TripPlace[];
};

export type TripPlan = {
  destination: string;
  days: TripDay[];
};
