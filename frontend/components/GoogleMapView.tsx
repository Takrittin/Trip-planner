"use client";

import { GoogleMap, InfoWindowF, LoadScript, MarkerF } from "@react-google-maps/api";
import { AlertTriangle, Loader2, MapPinned, Star } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TripPlace, TripPlan } from "../types/trip";

type GoogleMapViewProps = {
  isLoading: boolean;
  onSelectPlace: (place: TripPlace) => void;
  plan: TripPlan | null;
  selectedPlace: TripPlace | null;
};

type MappedPlace = TripPlace & {
  lat: number;
  lng: number;
};

const bangkokCenter = {
  lat: 13.7563,
  lng: 100.5018
};

function hasUsableApiKey(apiKey: string | undefined): apiKey is string {
  return Boolean(apiKey && apiKey !== "your_google_maps_api_key_here");
}

function hasCoordinates(place: TripPlace): place is MappedPlace {
  return typeof place.lat === "number" && typeof place.lng === "number";
}

function placeKey(place: TripPlace) {
  return `${place.suggested_day}-${place.suggested_order}-${place.name}`;
}

export default function GoogleMapView({
  isLoading,
  onSelectPlace,
  plan,
  selectedPlace
}: GoogleMapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activePlace, setActivePlace] = useState<MappedPlace | null>(null);
  const [isMapScriptLoaded, setIsMapScriptLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState("");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mappedPlaces = useMemo(
    () => plan?.days.flatMap((day) => day.places).filter(hasCoordinates) ?? [],
    [plan]
  );

  const center = mappedPlaces[0]
    ? { lat: mappedPlaces[0].lat, lng: mappedPlaces[0].lng }
    : bangkokCenter;

  useEffect(() => {
    if (!selectedPlace || !hasCoordinates(selectedPlace) || !mapRef.current) {
      return;
    }

    const position = { lat: selectedPlace.lat, lng: selectedPlace.lng };
    mapRef.current.panTo(position);
    mapRef.current.setZoom(14);
    setActivePlace(selectedPlace);
  }, [selectedPlace]);

  if (!plan) {
    return (
      <MapShell>
        <div className="flex min-h-[520px] flex-col items-center justify-center bg-blue-50 px-6 text-center lg:min-h-[760px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
            {isLoading ? (
              <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin" />
            ) : (
              <MapPinned aria-hidden="true" className="h-7 w-7" />
            )}
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-950">
            {isLoading ? "Generating mapped trip" : "Map preview"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">
            {isLoading
              ? "The map will load after Google verifies the suggested places."
              : "Generate a trip to load Google Maps and show verified stops."}
          </p>
        </div>
      </MapShell>
    );
  }

  if (!hasUsableApiKey(apiKey)) {
    return (
      <MapShell>
        <div className="flex min-h-[520px] flex-col items-center justify-center bg-blue-50 px-6 text-center lg:min-h-[760px]">
          <AlertTriangle aria-hidden="true" className="h-10 w-10 text-blue-600" />
          <h2 className="mt-4 text-xl font-semibold text-gray-950">Google Maps key required</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to frontend/.env.local to load the map.
          </p>
        </div>
      </MapShell>
    );
  }

  if (mapLoadError) {
    return (
      <MapShell>
        <div className="flex min-h-[520px] flex-col items-center justify-center bg-blue-50 px-6 text-center lg:min-h-[760px]">
          <AlertTriangle aria-hidden="true" className="h-10 w-10 text-blue-600" />
          <h2 className="mt-4 text-xl font-semibold text-gray-950">Map could not load</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">{mapLoadError}</p>
        </div>
      </MapShell>
    );
  }

  return (
    <MapShell>
      <LoadScript
        googleMapsApiKey={apiKey}
        onError={() => {
          setMapLoadError("Please check the Google Maps JavaScript API key and enabled APIs.");
        }}
        onLoad={() => setIsMapScriptLoaded(true)}
      >
        {isMapScriptLoaded ? (
          <GoogleMap
            center={center}
            mapContainerClassName="h-[520px] w-full lg:h-[760px]"
            onLoad={(map) => {
              mapRef.current = map;
            }}
            options={{
              clickableIcons: true,
              fullscreenControl: false,
              mapTypeControl: false,
              streetViewControl: false,
              zoomControl: true
            }}
            zoom={mappedPlaces.length ? 13 : 11}
          >
            {mappedPlaces.map((place) => {
              const isSelected =
                activePlace !== null && placeKey(activePlace) === placeKey(place);

              return (
                <MarkerF
                  key={placeKey(place)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: isSelected ? "#1D4ED8" : "#2563EB",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeOpacity: 1,
                    strokeWeight: 3,
                    scale: isSelected ? 16 : 14
                  }}
                  label={{
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: "700",
                    text: String(place.suggested_order)
                  }}
                  position={{ lat: place.lat, lng: place.lng }}
                  onClick={() => {
                    setActivePlace(place);
                    onSelectPlace(place);
                  }}
                />
              );
            })}

            {activePlace ? (
              <InfoWindowF
                position={{ lat: activePlace.lat, lng: activePlace.lng }}
                onCloseClick={() => setActivePlace(null)}
              >
                <div className="max-w-[260px] p-1 text-gray-900">
                  <h3 className="text-base font-semibold">{activePlace.name}</h3>
                  <p className="mt-1 text-xs font-medium text-blue-700">{activePlace.category}</p>
                  {activePlace.formatted_address ? (
                    <p className="mt-2 text-xs leading-5 text-gray-600">
                      {activePlace.formatted_address}
                    </p>
                  ) : null}
                  {typeof activePlace.rating === "number" ? (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-700">
                      <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {activePlace.rating.toFixed(1)}
                    </p>
                  ) : null}
                  <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-600">
                    {activePlace.reason}
                  </p>
                </div>
              </InfoWindowF>
            ) : null}
          </GoogleMap>
        ) : (
          <div className="flex min-h-[520px] items-center justify-center bg-blue-50 text-sm font-medium text-gray-600 lg:min-h-[760px]">
            <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Loading map
          </div>
        )}
      </LoadScript>

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-700 shadow-sm">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-blue-600" />
            Generating and verifying places
          </div>
        </div>
      ) : null}
    </MapShell>
  );
}

function MapShell({ children }: { children: ReactNode }) {
  return (
    <section className="relative min-h-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:min-h-[760px]">
      {children}
    </section>
  );
}
