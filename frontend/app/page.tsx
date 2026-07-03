"use client";

import GoogleMapView from "../components/GoogleMapView";
import ItinerarySidebar from "../components/ItinerarySidebar";
import Navbar from "../components/Navbar";
import TripForm from "../components/TripForm";
import { generateTrip } from "../lib/api";
import { useState } from "react";
import type { TripPlace, TripPlan, TripRequest } from "../types/trip";

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
  const [error, setError] = useState("");

  async function handleGenerateTrip(payload: TripRequest) {
    setIsLoading(true);
    setError("");

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
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-gray-900">
      <Navbar />

      <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-10 2xl:px-12">
        <section className="mb-6 sm:mb-7">
          <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-normal text-gray-950 sm:text-5xl">
            Plan your perfect trip with AI
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-gray-500">
            Generate a personalized itinerary and see every stop on the map.
          </p>
        </section>

        <TripForm isLoading={isLoading} onSubmit={handleGenerateTrip} />

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(360px,0.34fr)_minmax(0,0.66fr)]">
          <ItinerarySidebar
            error={error}
            isLoading={isLoading}
            onSelectPlace={setSelectedPlace}
            plan={plan}
            selectedPlace={selectedPlace}
          />
          <GoogleMapView
            isLoading={isLoading}
            onSelectPlace={setSelectedPlace}
            plan={plan}
            selectedPlace={selectedPlace}
          />
        </section>
      </div>
    </main>
  );
}
