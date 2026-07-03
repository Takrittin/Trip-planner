import { Router } from "express";
import { searchGooglePlace } from "../services/googlePlaces.js";
import { generateItineraryWithOpenRouter } from "../services/openrouter.js";
import type { TripPlan, TripPlace, TripRequest } from "../types/trip.js";
import { parseAIJsonResponse } from "../utils/parseJson.js";

const router = Router();

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
- Group places by day.
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

    return res.json({
      ...normalizedPlan,
      days: enrichedDays
    });
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
