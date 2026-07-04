import { Router } from "express";
import { getDestinationSuggestionsForLocation } from "../services/googlePlaces.js";

const router = Router();

function parseCoordinate(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

router.get("/", async (req, res) => {
  const lat = parseCoordinate(req.query.lat);
  const lng = parseCoordinate(req.query.lng);

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({
      error: "Please provide valid lat and lng query parameters."
    });
  }

  try {
    const result = await getDestinationSuggestionsForLocation(lat, lng);
    return res.json(result);
  } catch (error) {
    console.error("Destination suggestions failed:", error);
    return res.status(500).json({
      error: "Unable to load destination suggestions right now."
    });
  }
});

export default router;
