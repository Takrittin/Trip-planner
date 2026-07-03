"use client";

import {
  CalendarDays,
  ChevronDown,
  Loader2,
  MapPin,
  Sparkles,
  Tags,
  UserRound,
  WalletCards
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import type { TripRequest } from "../types/trip";

type TripFormProps = {
  isLoading: boolean;
  onSubmit: (payload: TripRequest) => Promise<void> | void;
};

const inputBase =
  "h-12 w-full rounded-xl border border-gray-200 bg-white px-11 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50";

export default function TripForm({ isLoading, onSubmit }: TripFormProps) {
  const [destination, setDestination] = useState("Bangkok");
  const [days, setDays] = useState("3");
  const [budget, setBudget] = useState("5000 THB");
  const [interests, setInterests] = useState("temples, cafes, shopping");
  const [travelStyle, setTravelStyle] = useState<TripRequest["travelStyle"]>("balanced");
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedDays = Number(days);

    if (!destination.trim() || !budget.trim() || !interests.trim()) {
      setValidationError("Please fill in every trip preference.");
      return;
    }

    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 7) {
      setValidationError("Days must be a whole number from 1 to 7.");
      return;
    }

    setValidationError("");

    await onSubmit({
      destination: destination.trim(),
      days: parsedDays,
      budget: budget.trim(),
      interests: interests.trim(),
      travelStyle
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.65fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(11rem,auto)]"
      >
        <Field label="Destination" icon={<MapPin className="h-5 w-5" aria-hidden="true" />}>
          <input
            aria-label="Destination"
            className={inputBase}
            disabled={isLoading}
            placeholder="Bangkok"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          />
        </Field>

        <Field label="Days" icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}>
          <input
            aria-label="Days"
            className={inputBase}
            disabled={isLoading}
            max={7}
            min={1}
            placeholder="3"
            type="number"
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </Field>

        <Field label="Budget" icon={<WalletCards className="h-5 w-5" aria-hidden="true" />}>
          <input
            aria-label="Budget"
            className={inputBase}
            disabled={isLoading}
            placeholder="5000 THB"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </Field>

        <Field label="Interests" icon={<Tags className="h-5 w-5" aria-hidden="true" />}>
          <input
            aria-label="Interests"
            className={inputBase}
            disabled={isLoading}
            placeholder="temples, cafes, shopping"
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
          />
        </Field>

        <Field label="Travel style" icon={<UserRound className="h-5 w-5" aria-hidden="true" />}>
          <div className="relative">
            <select
              aria-label="Travel style"
              className={`${inputBase} appearance-none pr-10 capitalize`}
              disabled={isLoading}
              value={travelStyle}
              onChange={(event) =>
                setTravelStyle(event.target.value as TripRequest["travelStyle"])
              }
            >
              <option value="relaxed">relaxed</option>
              <option value="balanced">balanced</option>
              <option value="packed">packed</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
            />
          </div>
        </Field>

        <div className="flex items-end">
          <button
            className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-6 text-[15px] font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            )}
            Generate Trip
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p className={validationError ? "font-medium text-red-600" : ""}>
          {validationError || "Looking good. Ready to generate your trip."}
        </p>
        <p>AI may make mistakes. Verify important info.</p>
      </div>
    </section>
  );
}

function Field({
  children,
  icon,
  label
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-900">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-500">
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}
