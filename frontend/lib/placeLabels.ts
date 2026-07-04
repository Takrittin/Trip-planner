import type { TripPlace } from "../types/trip";

export function getMapStopLabel(place: Pick<TripPlace, "suggested_day" | "suggested_order">) {
  return `${place.suggested_day}.${place.suggested_order}`;
}

export function getStopDescription(place: Pick<TripPlace, "suggested_day" | "suggested_order">) {
  return `Day ${place.suggested_day} · Stop ${place.suggested_order}`;
}
