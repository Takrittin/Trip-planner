import { Router } from "express";
import { searchGooglePlace } from "../services/googlePlaces.js";
import { generateItineraryWithOpenRouter } from "../services/openrouter.js";
import type { TripPlan, TripPlace, TripRequest } from "../types/trip.js";
import { parseAIJsonResponse } from "../utils/parseJson.js";

const router = Router();

type LocatedTripPlace = TripPlace & {
  lat: number;
  lng: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTravelStyle(value: unknown): value is TripRequest["travelStyle"] {
  return value === "relaxed" || value === "balanced" || value === "packed";
}

function placesPerDayForStyle(style: TripRequest["travelStyle"]) {
  if (style === "relaxed") {
    return 2;
  }

  if (style === "packed") {
    return 4;
  }

  return 3;
}

function hasCoordinates(place: TripPlace): place is LocatedTripPlace {
  return typeof place.lat === "number" && typeof place.lng === "number";
}

function validateRequest(body: unknown): { ok: true; value: TripRequest } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Please provide trip preferences." };
  }

  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  const budget = typeof body.budget === "string" ? body.budget.trim() : "";
  const interests = typeof body.interests === "string" ? body.interests.trim() : "";
  const days = typeof body.days === "number" ? body.days : Number(body.days);

  if (!destination) {
    return { ok: false, error: "Destination is required." };
  }

  if (!Number.isInteger(days) || days < 1 || days > 7) {
    return { ok: false, error: "Days must be a whole number from 1 to 7." };
  }

  if (!budget) {
    return { ok: false, error: "Budget is required." };
  }

  if (!interests) {
    return { ok: false, error: "Interests are required." };
  }

  if (!isTravelStyle(body.travelStyle)) {
    return { ok: false, error: "Travel style must be relaxed, balanced, or packed." };
  }

  return {
    ok: true,
    value: {
      destination,
      days,
      budget,
      interests,
      travelStyle: body.travelStyle
    }
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(
  from: Pick<LocatedTripPlace, "lat" | "lng">,
  to: Pick<LocatedTripPlace, "lat" | "lng">
) {
  const earthRadiusKm = 6371;
  const latDistance = toRadians(to.lat - from.lat);
  const lngDistance = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const haversine =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDistance / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function distanceToGroup(place: LocatedTripPlace, group: LocatedTripPlace[]) {
  if (group.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...group.map((groupPlace) => distanceKm(place, groupPlace)));
}

function groupCentroid(group: LocatedTripPlace[]) {
  if (group.length === 0) {
    return null;
  }

  const totals = group.reduce(
    (sum, place) => ({
      lat: sum.lat + place.lat,
      lng: sum.lng + place.lng
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: totals.lat / group.length,
    lng: totals.lng / group.length
  };
}

function pickSpreadOutSeeds(places: LocatedTripPlace[], seedCount: number) {
  if (seedCount <= 0) {
    return [];
  }

  const seeds = [places[0]];
  const remaining = places.slice(1);

  while (seeds.length < seedCount && remaining.length > 0) {
    let farthestIndex = 0;
    let farthestDistance = -1;

    remaining.forEach((candidate, index) => {
      const nearestSeedDistance = Math.min(...seeds.map((seed) => distanceKm(candidate, seed)));

      if (nearestSeedDistance > farthestDistance) {
        farthestDistance = nearestSeedDistance;
        farthestIndex = index;
      }
    });

    const [nextSeed] = remaining.splice(farthestIndex, 1);

    if (nextSeed) {
      seeds.push(nextSeed);
    }
  }

  return seeds;
}

function createCoordinateGroups(
  places: LocatedTripPlace[],
  dayCount: number,
  placesPerDay: number
) {
  // Seed each day with spread-out places, then attach each remaining stop to its nearest day.
  const groups: LocatedTripPlace[][] = Array.from({ length: dayCount }, () => []);
  const activeDayIndexes = groups.map((_, index) => index);
  const seeds = pickSpreadOutSeeds(places, Math.min(places.length, activeDayIndexes.length));
  const remaining = places.filter((place) => !seeds.includes(place));

  seeds.forEach((seed, index) => {
    const dayIndex = activeDayIndexes[index];

    if (dayIndex !== undefined) {
      groups[dayIndex].push(seed);
    }
  });

  while (remaining.length > 0) {
    let bestPlaceIndex = 0;
    let bestDayIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((place, placeIndex) => {
      groups.forEach((group, dayIndex) => {
        if (group.length >= placesPerDay) {
          return;
        }

        const distance = group.length === 0 ? 0 : distanceToGroup(place, group);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestPlaceIndex = placeIndex;
          bestDayIndex = dayIndex;
        }
      });
    });

    if (!Number.isFinite(bestDistance)) {
      bestDayIndex = groups.reduce(
        (shortestIndex, group, index) =>
          group.length < groups[shortestIndex].length ? index : shortestIndex,
        0
      );
    }

    const [nextPlace] = remaining.splice(bestPlaceIndex, 1);

    if (nextPlace) {
      groups[bestDayIndex].push(nextPlace);
    }
  }

  return groups;
}

function orderGroupsByProximity(groups: LocatedTripPlace[][], firstPlace: LocatedTripPlace) {
  const remainingGroups = groups.map((places) => ({ places }));
  const firstGroupIndex = remainingGroups.findIndex((group) => group.places.includes(firstPlace));
  const orderedGroups: LocatedTripPlace[][] = [];
  let currentGroup =
    firstGroupIndex >= 0
      ? remainingGroups.splice(firstGroupIndex, 1)[0]
      : remainingGroups.shift();

  while (currentGroup) {
    orderedGroups.push(currentGroup.places);

    const currentCentroid = groupCentroid(currentGroup.places);

    if (!currentCentroid || remainingGroups.length === 0) {
      currentGroup = remainingGroups.shift();
      continue;
    }

    let nearestGroupIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    remainingGroups.forEach((group, index) => {
      const centroid = groupCentroid(group.places);

      if (!centroid) {
        return;
      }

      const distance = distanceKm(currentCentroid, centroid);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestGroupIndex = index;
      }
    });

    currentGroup = remainingGroups.splice(nearestGroupIndex, 1)[0];
  }

  return orderedGroups;
}

function orderPlacesByNearestNeighbor(places: TripPlace[]) {
  const locatedPlaces = places.filter(hasCoordinates);

  if (locatedPlaces.length < 2) {
    return places;
  }

  const ordered: TripPlace[] = [locatedPlaces[0]];
  const remaining = locatedPlaces.slice(1);

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];

    if (!hasCoordinates(current)) {
      break;
    }

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const distance = distanceKm(current, candidate);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const [nextPlace] = remaining.splice(nearestIndex, 1);

    if (nextPlace) {
      ordered.push(nextPlace);
    }
  }

  return [...ordered, ...places.filter((place) => !hasCoordinates(place))];
}

function addUnlocatedPlacesToGroups(
  groups: TripPlace[][],
  unlocatedPlaces: TripPlace[],
  placesPerDay: number
) {
  const result = groups.map((group) => [...group]);

  unlocatedPlaces.forEach((place) => {
    let targetDayIndex = result.findIndex((group) => group.length < placesPerDay);

    if (targetDayIndex === -1) {
      targetDayIndex = result.reduce(
        (shortestIndex, group, index) =>
          group.length < result[shortestIndex].length ? index : shortestIndex,
        0
      );
    }

    result[targetDayIndex].push(place);
  });

  return result;
}

function renumberDays(days: TripPlan["days"], dayCount: number): TripPlan["days"] {
  return Array.from({ length: dayCount }, (_, dayIndex) => {
    const day = days[dayIndex];

    return {
      day: dayIndex + 1,
      places:
        day?.places.map((place, placeIndex) => ({
          ...place,
          suggested_day: dayIndex + 1,
          suggested_order: placeIndex + 1
        })) ?? []
    };
  });
}

function groupTripByProximity(plan: TripPlan, request: TripRequest): TripPlan {
  const placesPerDay = placesPerDayForStyle(request.travelStyle);
  const allPlaces = plan.days.flatMap((day) => day.places);
  const locatedPlaces = allPlaces.filter(hasCoordinates);
  const unlocatedPlaces = allPlaces.filter((place) => !hasCoordinates(place));

  if (locatedPlaces.length < 2) {
    return {
      ...plan,
      days: renumberDays(plan.days, request.days)
    };
  }

  const coordinateGroups = createCoordinateGroups(locatedPlaces, request.days, placesPerDay);
  const orderedCoordinateGroups = orderGroupsByProximity(coordinateGroups, locatedPlaces[0]);
  const groupedPlaces = addUnlocatedPlacesToGroups(
    orderedCoordinateGroups,
    unlocatedPlaces,
    placesPerDay
  );

  return {
    ...plan,
    days: groupedPlaces.map((places, dayIndex) => ({
      day: dayIndex + 1,
      places: orderPlacesByNearestNeighbor(places).map((place, placeIndex) => ({
        ...place,
        suggested_day: dayIndex + 1,
        suggested_order: placeIndex + 1
      }))
    }))
  };
}

function normalizeAITripPlan(plan: unknown, request: TripRequest): TripPlan {
  if (!isRecord(plan) || !Array.isArray(plan.days)) {
    throw new Error("AI itinerary is missing the expected days array.");
  }

  const placesPerDay = placesPerDayForStyle(request.travelStyle);
  const days = plan.days.slice(0, request.days).map((dayValue, dayIndex) => {
    if (!isRecord(dayValue)) {
      return { day: dayIndex + 1, places: [] };
    }

    const dayNumber = Number.isInteger(dayValue.day) ? Number(dayValue.day) : dayIndex + 1;
    const rawPlaces = Array.isArray(dayValue.places) ? dayValue.places : [];
    const places = rawPlaces
      .slice(0, placesPerDay)
      .map((placeValue, placeIndex): TripPlace | null => {
        if (!isRecord(placeValue) || typeof placeValue.name !== "string" || !placeValue.name.trim()) {
          return null;
        }

        return {
          name: placeValue.name.trim(),
          category: asString(placeValue.category, "Place"),
          reason: asString(placeValue.reason, "Recommended for your trip preferences."),
          estimated_time_minutes: asNumber(placeValue.estimated_time_minutes, 90),
          suggested_day: Number.isInteger(placeValue.suggested_day)
            ? Number(placeValue.suggested_day)
            : dayNumber,
          suggested_order: Number.isInteger(placeValue.suggested_order)
            ? Number(placeValue.suggested_order)
            : placeIndex + 1
        };
      })
      .filter((place): place is TripPlace => place !== null);

    return {
      day: dayNumber,
      places
    };
  });

  return {
    destination: asString(plan.destination, request.destination),
    days
  };
}

function buildPrompt({ destination, days, budget, interests, travelStyle }: TripRequest): string {
  const placesPerDay = placesPerDayForStyle(travelStyle);

  return `
Create a travel itinerary.

User preferences:
- Destination: ${destination}
- Number of days: ${days}
- Budget: ${budget}
- Interests: ${interests}
- Travel style: ${travelStyle}

Return only valid JSON in this exact shape:
{
  "destination": "string",
  "days": [
    {
      "day": 1,
      "places": [
        {
          "name": "string",
          "category": "string",
          "reason": "string",
          "estimated_time_minutes": 90,
          "suggested_day": 1,
          "suggested_order": 1
        }
      ]
    }
  ]
}

Rules:
- Do not include latitude or longitude.
- Suggest real places that are likely to exist in the destination.
- Group each day around one compact neighborhood or area.
- Places on the same day should be geographically close to each other.
- Avoid putting places from opposite sides of the city on the same day unless necessary.
- Keep each day realistic based on the travel style.
- Include exactly ${placesPerDay} places per day.
- Keep each reason under 18 words.
- Keep categories short, such as temple, cafe, museum, park, shopping, food, market, nightlife.
- Return JSON only.
`;
}

router.post("/", async (req, res) => {
  const validation = validateRequest(req.body);

  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const tripRequest = validation.value;
    const aiContent = await generateItineraryWithOpenRouter(buildPrompt(tripRequest));
    const parsedPlan = parseAIJsonResponse<TripPlan>(aiContent);
    const normalizedPlan = normalizeAITripPlan(parsedPlan, tripRequest);

    const enrichedDays = await Promise.all(
      normalizedPlan.days.map(async (day) => {
        const places = await Promise.all(
          day.places.map(async (place) => {
            const googlePlace = await searchGooglePlace(place.name, normalizedPlan.destination);

            if (!googlePlace) {
              return place;
            }

            return {
              ...place,
              ...googlePlace
            };
          })
        );

        return {
          ...day,
          places
        };
      })
    );
    const geographicallyGroupedPlan = groupTripByProximity(
      {
        ...normalizedPlan,
        days: enrichedDays
      },
      tripRequest
    );

    return res.json(geographicallyGroupedPlan);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate the trip right now. Please try again.";

    console.error("Trip generation failed:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
