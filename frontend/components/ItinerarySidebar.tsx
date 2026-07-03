"use client";

/* eslint-disable @next/next/no-img-element */

import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  MapPin,
  Navigation,
  Route,
  Star
} from "lucide-react";
import type { TripPlace, TripPlan } from "../types/trip";

type ItinerarySidebarProps = {
  error: string;
  isLoading: boolean;
  onSelectPlace: (place: TripPlace) => void;
  plan: TripPlan | null;
  selectedPlace: TripPlace | null;
};

function placeKey(place: TripPlace) {
  return `${place.suggested_day}-${place.suggested_order}-${place.name}`;
}

function hasCoordinates(place: TripPlace) {
  return typeof place.lat === "number" && typeof place.lng === "number";
}

function categoryClass(category: string) {
  const value = category.toLowerCase();

  if (value.includes("food") || value.includes("cafe")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (value.includes("shopping") || value.includes("market")) {
    return "bg-violet-50 text-violet-700 ring-violet-100";
  }

  if (value.includes("nature") || value.includes("park")) {
    return "bg-green-50 text-green-700 ring-green-100";
  }

  if (value.includes("night")) {
    return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  }

  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function getBackendUrl() {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");
}

function getPlacePhotoUrl(photoName: string) {
  const params = new URLSearchParams({
    name: photoName,
    maxWidthPx: "360"
  });

  return `${getBackendUrl()}/api/place-photo?${params.toString()}`;
}

function getPhotoAttribution(place: TripPlace) {
  return place.photo_attributions
    ?.map((attribution) => attribution.displayName)
    .filter(Boolean)
    .join(", ");
}

export default function ItinerarySidebar({
  error,
  isLoading,
  onSelectPlace,
  plan,
  selectedPlace
}: ItinerarySidebarProps) {
  return (
    <aside className="min-h-[520px] rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-950">Your Itinerary</h2>
          <p className="mt-1 text-sm text-gray-500">
            {plan ? `${plan.days.length} days · Customized` : "Generate a trip to fill this plan."}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Route aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>

      <div className="max-h-[690px] overflow-y-auto p-4">
        {error ? <ErrorState message={error} /> : null}
        {!error && isLoading ? <LoadingState /> : null}
        {!error && !isLoading && !plan ? <EmptyState /> : null}
        {!error && !isLoading && plan
          ? plan.days.map((day) => (
              <section key={day.day} className="mb-5 last:mb-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-950">
                    <CalendarDays aria-hidden="true" className="h-5 w-5 text-blue-600" />
                    Day {day.day}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {day.places.reduce(
                      (total, place) => total + place.estimated_time_minutes,
                      0
                    )}{" "}
                    min
                  </span>
                </div>

                <div className="space-y-3">
                  {day.places.map((place) => {
                    const isSelected =
                      selectedPlace !== null && placeKey(selectedPlace) === placeKey(place);
                    const photoAttribution = getPhotoAttribution(place);

                    return (
                      <button
                        key={placeKey(place)}
                        className={`w-full rounded-2xl border p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/60 focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white"
                        }`}
                        type="button"
                        onClick={() => onSelectPlace(place)}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <PlaceThumbnail place={place} />

                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-950">{place.name}</span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${categoryClass(
                                  place.category
                                )}`}
                              >
                                {place.category}
                              </span>
                            </span>

                            <span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                                {Math.round(place.estimated_time_minutes / 60) >= 1
                                  ? `${Math.round(place.estimated_time_minutes / 60)}h`
                                  : `${place.estimated_time_minutes}m`}
                              </span>
                              {typeof place.rating === "number" ? (
                                <span className="flex items-center gap-1">
                                  <Star
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                  />
                                  {place.rating.toFixed(1)}
                                </span>
                              ) : null}
                            </span>

                            <span className="mt-2 block text-sm leading-6 text-gray-600">
                              {place.reason}
                            </span>

                            {place.formatted_address ? (
                              <span className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-gray-500">
                                <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                {place.formatted_address}
                              </span>
                            ) : null}

                            {photoAttribution ? (
                              <span className="mt-2 block text-[11px] leading-4 text-gray-400">
                                Photo: {photoAttribution}
                              </span>
                            ) : null}

                            {!hasCoordinates(place) ? (
                              <span className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                                Location not found on Google Maps.
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          : null}
      </div>
    </aside>
  );
}

function PlaceThumbnail({ place }: { place: TripPlace }) {
  if (!place.photo_name) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
        {place.suggested_order}
      </span>
    );
  }

  return (
    <span className="relative block h-32 w-full shrink-0 overflow-hidden rounded-2xl bg-blue-50 ring-1 ring-gray-200 sm:h-24 sm:w-28">
      <img
        alt={place.name}
        className="h-full w-full object-cover"
        decoding="async"
        loading="lazy"
        src={getPlacePhotoUrl(place.photo_name)}
      />
      <span className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-blue-600 px-2 text-sm font-semibold text-white shadow-sm ring-2 ring-white">
        {place.suggested_order}
      </span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Navigation aria-hidden="true" className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-950">Your trip will appear here</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500">
        Add your preferences and generate a mapped itinerary grouped by day.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{message}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-full loading-shimmer" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-2/3 rounded-full loading-shimmer" />
              <div className="h-3 w-1/3 rounded-full loading-shimmer" />
              <div className="h-3 w-full rounded-full loading-shimmer" />
              <div className="h-3 w-5/6 rounded-full loading-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
