"use client";

import GoogleMapView from "../components/GoogleMapView";
import ItinerarySidebar from "../components/ItinerarySidebar";
import Navbar from "../components/Navbar";
import TripForm from "../components/TripForm";
import { generateTrip } from "../lib/api";
import { useState } from "react";
import type { TripLoadingStage, TripPlace, TripPlan, TripRequest } from "../types/trip";

function firstAvailablePlace(plan: TripPlan): TripPlace | null {
  for (const day of plan.days) {
    for (const place of day.places) {
      return place;
    }
  }

  return null;
}

export default function Home() {
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<TripPlace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<TripLoadingStage>("idle");
  const [error, setError] = useState("");

  async function handleGenerateTrip(payload: TripRequest) {
    setIsLoading(true);
    setLoadingStage("planning");
    setError("");

    const stageTimers: Array<ReturnType<typeof setTimeout>> = [
      setTimeout(() => setLoadingStage("places"), 3500),
      setTimeout(() => setLoadingStage("map"), 10000)
    ];

    try {
      const trip = await generateTrip(payload);
      setPlan(trip);
      setSelectedPlace(firstAvailablePlace(trip));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate a trip right now. Please try again.";
      setError(message);
    } finally {
      stageTimers.forEach((timer) => clearTimeout(timer));
      setIsLoading(false);
      setLoadingStage("idle");
    }
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] text-gray-900">
      <Navbar />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 px-3 py-3 sm:px-4 lg:px-6 2xl:px-8">
        <TripForm
          isLoading={isLoading}
          loadingStage={loadingStage}
          onSubmit={handleGenerateTrip}
        />

        <section className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(360px,0.34fr)_minmax(0,0.66fr)]">
          <ItinerarySidebar
            error={error}
            isLoading={isLoading}
            loadingStage={loadingStage}
            onSelectPlace={setSelectedPlace}
            plan={plan}
            selectedPlace={selectedPlace}
          />
          <GoogleMapView
            isLoading={isLoading}
            loadingStage={loadingStage}
            onSelectPlace={setSelectedPlace}
            plan={plan}
            selectedPlace={selectedPlace}
          />
        </section>
      </div>
    </main>
  );
}
