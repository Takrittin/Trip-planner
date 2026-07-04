type GooglePlacesTextSearchResponse = {
  places?: Array<{
    displayName?: {
      text?: string;
    };
    id?: string;
    formattedAddress?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
    rating?: number;
    photos?: Array<{
      name?: string;
      authorAttributions?: Array<{
        displayName?: string;
        uri?: string;
        photoUri?: string;
      }>;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type GoogleGeocodeResponse = {
  results?: Array<{
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
  }>;
  status?: string;
  error_message?: string;
};

type PlacePhotoMediaResponse = {
  photoUri?: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

export type GooglePlaceResult = {
  google_place_id: string;
  formatted_address: string;
  lat: number;
  lng: number;
  rating?: number;
  photo_name?: string;
  photo_attributions?: Array<{
    displayName?: string;
    uri?: string;
    photoUri?: string;
  }>;
};

export type DestinationSuggestion = {
  id: string;
  name: string;
  formatted_address: string;
  lat: number;
  lng: number;
  rating?: number;
};

export type DestinationSuggestionsResult = {
  country?: string;
  locality?: string;
  suggestions: DestinationSuggestion[];
};

const CACHE_MAX_ENTRIES = 250;
const PLACE_SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const PHOTO_URI_CACHE_TTL_MS = 10 * 60 * 1000;
const DESTINATION_SUGGESTIONS_CACHE_TTL_MS = 30 * 60 * 1000;
const placePhotoNamePattern = /^places\/[^/]+\/photos\/[^/?#]+$/;
const placeSearchCache = new Map<string, CacheEntry<GooglePlaceResult | null>>();
const placePhotoUriCache = new Map<string, CacheEntry<string | null>>();
const destinationSuggestionsCache = new Map<string, CacheEntry<DestinationSuggestionsResult>>();

function getGoogleMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    throw new Error("Missing GOOGLE_MAPS_API_KEY in backend environment.");
  }

  return apiKey;
}

function normalizeCacheKey(...parts: string[]) {
  return parts.map((part) => part.trim().toLowerCase().replace(/\s+/g, " ")).join("|");
}

function roundCoordinate(value: number) {
  return value.toFixed(2);
}

function findAddressComponent(
  results: GoogleGeocodeResponse["results"],
  type: string
): string | undefined {
  for (const result of results ?? []) {
    for (const component of result.address_components ?? []) {
      if (component.types?.includes(type) && component.long_name) {
        return component.long_name;
      }
    }
  }

  return undefined;
}

function remember<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
) {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  if (cached) {
    cache.delete(key);
  }

  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  const promise = loader();
  cache.set(key, {
    expiresAt: now + ttlMs,
    promise
  });

  return promise;
}

export async function searchGooglePlace(
  placeName: string,
  destination: string
): Promise<GooglePlaceResult | null> {
  const apiKey = getGoogleMapsApiKey();
  const cacheKey = normalizeCacheKey(placeName, destination);

  return remember(placeSearchCache, cacheKey, PLACE_SEARCH_CACHE_TTL_MS, async () => {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.formattedAddress,places.location,places.rating,places.photos"
        },
        body: JSON.stringify({
          textQuery: `${placeName} ${destination}`,
          maxResultCount: 1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          `Google Places request failed for "${placeName}" with status ${response.status}. ${
            errorText || response.statusText
          }`
        );
        return null;
      }

      const data = (await response.json()) as GooglePlacesTextSearchResponse;
      const result = data.places?.[0];

      if (
        !result?.id ||
        typeof result.location?.latitude !== "number" ||
        typeof result.location?.longitude !== "number"
      ) {
        return null;
      }

      const photo = result.photos?.[0];

      return {
        google_place_id: result.id,
        formatted_address: result.formattedAddress || "",
        lat: result.location.latitude,
        lng: result.location.longitude,
        rating: result.rating,
        photo_name: photo?.name,
        photo_attributions: photo?.authorAttributions ?? []
      };
    } catch (error) {
      console.warn(`Google Places lookup failed for "${placeName}".`, error);
      return null;
    }
  });
}

async function reverseGeocodeLocation(apiKey: string, lat: number, lng: number) {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        `Google reverse geocode failed with status ${response.status}. ${
          errorText || response.statusText
        }`
      );
      return {};
    }

    const data = (await response.json()) as GoogleGeocodeResponse;

    if (data.status && data.status !== "OK") {
      console.warn(`Google reverse geocode returned ${data.status}. ${data.error_message || ""}`);
      return {};
    }

    const country = findAddressComponent(data.results, "country");
    const locality =
      findAddressComponent(data.results, "locality") ||
      findAddressComponent(data.results, "administrative_area_level_1");

    return { country, locality };
  } catch (error) {
    console.warn("Google reverse geocode lookup failed.", error);
    return {};
  }
}

export async function getDestinationSuggestionsForLocation(
  lat: number,
  lng: number
): Promise<DestinationSuggestionsResult> {
  const apiKey = getGoogleMapsApiKey();
  const cacheKey = normalizeCacheKey(roundCoordinate(lat), roundCoordinate(lng));

  return remember(
    destinationSuggestionsCache,
    cacheKey,
    DESTINATION_SUGGESTIONS_CACHE_TTL_MS,
    async () => {
      const { country, locality } = await reverseGeocodeLocation(apiKey, lat, lng);
      const destinationScope = country || "near this location";
      const textQuery = country
        ? `popular travel destinations in ${country}`
        : "popular tourist attractions";

      try {
        const requestBody: Record<string, unknown> = {
          textQuery,
          maxResultCount: 8
        };

        if (!country) {
          requestBody.locationBias = {
            circle: {
              center: {
                latitude: lat,
                longitude: lng
              },
              radius: 50000
            }
          };
        }

        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.rating"
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(
            `Google destination suggestions failed for "${destinationScope}" with status ${
              response.status
            }. ${errorText || response.statusText}`
          );
          return { country, locality, suggestions: [] };
        }

        const data = (await response.json()) as GooglePlacesTextSearchResponse;
        const seenNames = new Set<string>();
        const suggestions =
          data.places
            ?.map((place): DestinationSuggestion | null => {
              const name = place.displayName?.text?.trim();

              if (
                !place.id ||
                !name ||
                typeof place.location?.latitude !== "number" ||
                typeof place.location?.longitude !== "number"
              ) {
                return null;
              }

              const normalizedName = name.toLowerCase();

              if (seenNames.has(normalizedName)) {
                return null;
              }

              seenNames.add(normalizedName);

              return {
                id: place.id,
                name,
                formatted_address: place.formattedAddress || country || "",
                lat: place.location.latitude,
                lng: place.location.longitude,
                rating: place.rating
              };
            })
            .filter((place): place is DestinationSuggestion => place !== null) ?? [];

        return {
          country,
          locality,
          suggestions
        };
      } catch (error) {
        console.warn(`Google destination suggestions lookup failed for "${destinationScope}".`, error);
        return { country, locality, suggestions: [] };
      }
    }
  );
}

export async function getGooglePlacePhotoUri(
  photoName: string,
  maxWidthPx: number
): Promise<string | null> {
  const apiKey = getGoogleMapsApiKey();
  const safeWidth = Math.min(Math.max(Math.round(maxWidthPx) || 320, 1), 4800);

  if (!placePhotoNamePattern.test(photoName)) {
    return null;
  }

  const cacheKey = `${photoName}|${safeWidth}`;

  return remember(placePhotoUriCache, cacheKey, PHOTO_URI_CACHE_TTL_MS, async () => {
    try {
      const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("maxWidthPx", String(safeWidth));
      url.searchParams.set("skipHttpRedirect", "true");

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          `Google Place Photo request failed with status ${response.status}. ${
            errorText || response.statusText
          }`
        );
        return null;
      }

      const data = (await response.json()) as PlacePhotoMediaResponse;
      return data.photoUri || null;
    } catch (error) {
      console.warn(`Google Place Photo lookup failed for "${photoName}".`, error);
      return null;
    }
  });
}
