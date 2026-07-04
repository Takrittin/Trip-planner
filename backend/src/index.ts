import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import destinationSuggestionsRouter from "./routes/destinationSuggestions.js";
import generateTripRouter from "./routes/generateTrip.js";
import placePhotoRouter from "./routes/placePhoto.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    message: "AI Trip Map Planner backend is running"
  });
});

app.use("/api/destination-suggestions", destinationSuggestionsRouter);
app.use("/api/generate-trip", generateTripRouter);
app.use("/api/place-photo", placePhotoRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled backend error:", err);
    res.status(500).json({
      error: "Something went wrong on the server. Please try again."
    });
  }
);

app.listen(port, () => {
  console.log(`AI Trip Map Planner backend is running on http://localhost:${port}`);
});
