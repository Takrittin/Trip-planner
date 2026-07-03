type GooglePlacesTextSearchResponse = {
  places?: Array<{
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

const CACHE_MAX_ENTRIES = 250;
const PLACE_SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const PHOTO_URI_CACHE_TTL_MS = 10 * 60 * 1000;
const placePhotoNamePattern = /^places\/[^/]+\/photos\/[^/?#]+$/;
const placeSearchCache = new Map<string, CacheEntry<GooglePlaceResult | null>>();
const placePhotoUriCache = new Map<string, CacheEntry<string | null>>();

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
