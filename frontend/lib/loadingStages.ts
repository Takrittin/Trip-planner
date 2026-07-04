import type { TripLoadingStage } from "../types/trip";

export type ActiveTripLoadingStage = Exclude<TripLoadingStage, "idle">;

export const tripLoadingStages: Array<{
  stage: ActiveTripLoadingStage;
  label: string;
  shortLabel: string;
  formMessage: string;
  sidebarMessage: string;
  mapMessage: string;
}> = [
  {
    stage: "planning",
    label: "AI plan",
    shortLabel: "Plan",
    formMessage: "Generating itinerary with AI...",
    sidebarMessage: "Drafting your day-by-day route...",
    mapMessage: "Creating your trip outline..."
  },
  {
    stage: "places",
    label: "Place lookup",
    shortLabel: "Places",
    formMessage: "Finding places on Google Maps...",
    sidebarMessage: "Matching suggested stops to real places...",
    mapMessage: "Finding map locations..."
  },
  {
    stage: "map",
    label: "Map ready",
    shortLabel: "Map",
    formMessage: "Preparing your map...",
    sidebarMessage: "Preparing markers and route details...",
    mapMessage: "Preparing your map..."
  }
];

export function getTripLoadingStageInfo(stage: TripLoadingStage) {
  return tripLoadingStages.find((item) => item.stage === stage) ?? tripLoadingStages[0];
}

export function getTripLoadingStageIndex(stage: TripLoadingStage) {
  return Math.max(
    0,
    tripLoadingStages.findIndex((item) => item.stage === stage)
  );
}
