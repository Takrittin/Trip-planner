import type { TripPlan, TripRequest } from "../types/trip";

type ApiErrorResponse = {
  error?: string;
};

export type DestinationSuggestion = {
  id: string;
  name: string;
  formatted_address: string;
  lat: number;
  lng: number;
  rating?: number;
};

export type DestinationSuggestionsResponse = {
  country?: string;
  locality?: string;
  suggestions: DestinationSuggestion[];
};

function getBackendUrl() {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");
}

export async function generateTrip(payload: TripRequest): Promise<TripPlan> {
  const endpoint = `${getBackendUrl()}/api/generate-trip`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }).catch(() => {
    throw new Error("The backend is unavailable. Please check that it is running on port 4000.");
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(
      errorBody.error || "The trip planner could not generate an itinerary. Please try again."
    );
  }

  return (await response.json()) as TripPlan;
}

export async function getDestinationSuggestions(
  lat: number,
  lng: number
): Promise<DestinationSuggestionsResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng)
  });
  const endpoint = `${getBackendUrl()}/api/destination-suggestions?${params.toString()}`;

  const response = await fetch(endpoint).catch(() => {
    throw new Error("Destination suggestions are unavailable. Please check the backend.");
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(errorBody.error || "Unable to load destination suggestions.");
  }

  return (await response.json()) as DestinationSuggestionsResponse;
}
