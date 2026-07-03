import type { TripPlan, TripRequest } from "../types/trip";

type ApiErrorResponse = {
  error?: string;
};

export async function generateTrip(payload: TripRequest): Promise<TripPlan> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  const endpoint = `${backendUrl.replace(/\/$/, "")}/api/generate-trip`;

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
