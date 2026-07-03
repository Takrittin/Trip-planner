import { Router } from "express";
import { getGooglePlacePhotoUri } from "../services/googlePlaces.js";

const router = Router();

router.get("/", async (req, res) => {
  const photoName = typeof req.query.name === "string" ? req.query.name : "";
  const maxWidthPx =
    typeof req.query.maxWidthPx === "string" ? Number(req.query.maxWidthPx) : 320;

  if (!photoName) {
    return res.status(400).json({ error: "Photo name is required." });
  }

  try {
    const photoUri = await getGooglePlacePhotoUri(photoName, maxWidthPx);

    if (!photoUri) {
      return res.status(404).json({ error: "Photo not found." });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, photoUri);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the place photo.";

    return res.status(500).json({ error: message });
  }
});

export default router;
