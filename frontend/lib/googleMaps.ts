import type { TripPlace } from "../types/trip";

function hasCoordinates(place: TripPlace) {
  return typeof place.lat === "number" && typeof place.lng === "number";
}

export function getGoogleMapsDirectionsUrl(place: TripPlace) {
  const destination = hasCoordinates(place)
    ? `${place.lat},${place.lng}`
    : [place.name, place.formatted_address].filter(Boolean).join(", ");
  const params = new URLSearchParams({
    api: "1",
    destination
  });

  if (place.google_place_id) {
    params.set("destination_place_id", place.google_place_id);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
