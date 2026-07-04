"use client";

import {
  CalendarDays,
  ChevronDown,
  LocateFixed,
  Loader2,
  MapPin,
  Sparkles,
  Tags,
  UserRound,
  WalletCards
} from "lucide-react";
import type { FocusEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import {
  getDestinationSuggestions,
  type DestinationSuggestion
} from "../lib/api";
import {
  getTripLoadingStageIndex,
  getTripLoadingStageInfo,
  tripLoadingStages
} from "../lib/loadingStages";
import type { TripLoadingStage, TripRequest } from "../types/trip";

type TripFormProps = {
  isLoading: boolean;
  loadingStage: TripLoadingStage;
  onSubmit: (payload: TripRequest) => Promise<void> | void;
};

const inputBase =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50";

const defaultDestinationSuggestions: DestinationSuggestion[] = [
  {
    id: "default-bangkok",
    name: "Bangkok",
    formatted_address: "Thailand",
    lat: 13.7563,
    lng: 100.5018
  },
  {
    id: "default-chiang-mai",
    name: "Chiang Mai",
    formatted_address: "Thailand",
    lat: 18.7883,
    lng: 98.9853
  },
  {
    id: "default-phuket",
    name: "Phuket",
    formatted_address: "Thailand",
    lat: 7.8804,
    lng: 98.3923
  },
  {
    id: "default-tokyo",
    name: "Tokyo",
    formatted_address: "Japan",
    lat: 35.6762,
    lng: 139.6503
  }
];

function isNode(value: EventTarget | null): value is Node {
  return value instanceof Node;
}

function isGeolocationPositionError(value: unknown): value is GeolocationPositionError {
  return typeof value === "object" && value !== null && "code" in value;
}

export default function TripForm({ isLoading, loadingStage, onSubmit }: TripFormProps) {
  const [destination, setDestination] = useState("Bangkok");
  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);
  const [destinationSuggestionLabel, setDestinationSuggestionLabel] =
    useState("Popular destinations");
  const [destinationSuggestionError, setDestinationSuggestionError] = useState("");
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [isLoadingDestinationSuggestions, setIsLoadingDestinationSuggestions] = useState(false);
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

  function handleDestinationBlur(event: FocusEvent<HTMLDivElement>) {
    if (!isNode(event.relatedTarget) || !event.currentTarget.contains(event.relatedTarget)) {
      setIsDestinationOpen(false);
    }
  }

  function applyDestinationSuggestion(suggestion: DestinationSuggestion) {
    setDestination(suggestion.name);
    setDestinationSuggestionError("");
    setIsDestinationOpen(false);
  }

  function getCurrentPosition() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 10000
      });
    });
  }

  async function handleUseCurrentLocation() {
    setIsDestinationOpen(true);
    setDestinationSuggestionError("");

    if (!("geolocation" in navigator)) {
      setDestinationSuggestionError("Location is not available in this browser.");
      return;
    }

    setIsLoadingDestinationSuggestions(true);

    try {
      const position = await getCurrentPosition();
      const result = await getDestinationSuggestions(
        position.coords.latitude,
        position.coords.longitude
      );

      setDestinationSuggestions(result.suggestions);
      setDestinationSuggestionLabel(
        result.country ? `Popular in ${result.country}` : "Popular near you"
      );

      if (result.suggestions.length === 0) {
        setDestinationSuggestionError("No location-based suggestions found.");
      }
    } catch (error) {
      const message =
        isGeolocationPositionError(error) && error.code === 1
          ? "Location permission was denied."
          : error instanceof Error
            ? error.message
            : "Unable to load location suggestions.";
      setDestinationSuggestionError(message);
    } finally {
      setIsLoadingDestinationSuggestions(false);
    }
  }

  const visibleDestinationSuggestions = destinationSuggestions.length
    ? destinationSuggestions
    : defaultDestinationSuggestions;
  const activeLoadingStage = getTripLoadingStageInfo(loadingStage);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.65fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(10rem,auto)]"
      >
        <div className="relative col-span-2 min-w-0 lg:col-span-1" onBlur={handleDestinationBlur}>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-900">Destination</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-500">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <input
                aria-label="Destination"
                aria-autocomplete="list"
                aria-controls="destination-suggestions"
                aria-expanded={isDestinationOpen}
                aria-haspopup="listbox"
                className={inputBase}
                disabled={isLoading}
                placeholder="Bangkok"
                role="combobox"
                value={destination}
                onChange={(event) => {
                  setDestination(event.target.value);
                  setIsDestinationOpen(true);
                }}
                onFocus={() => setIsDestinationOpen(true)}
              />
            </span>
          </label>

          {isDestinationOpen ? (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
              id="destination-suggestions"
              role="listbox"
            >
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-blue-300"
                disabled={isLoadingDestinationSuggestions}
                type="button"
                onClick={handleUseCurrentLocation}
                onMouseDown={(event) => event.preventDefault()}
              >
                {isLoadingDestinationSuggestions ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed aria-hidden="true" className="h-4 w-4" />
                )}
                Use my current location
              </button>

              <div className="mt-2 border-t border-gray-100 pt-2">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase text-gray-400">
                  {destinationSuggestionLabel}
                </p>
                <div className="space-y-1">
                  {visibleDestinationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      aria-selected={destination === suggestion.name}
                      className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      role="option"
                      type="button"
                      onClick={() => applyDestinationSuggestion(suggestion)}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-950">
                          {suggestion.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {suggestion.formatted_address}
                        </span>
                      </span>
                      {typeof suggestion.rating === "number" ? (
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {suggestion.rating.toFixed(1)}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {destinationSuggestionError ? (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {destinationSuggestionError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

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

        <Field
          className="col-span-2 lg:col-span-1"
          label="Interests"
          icon={<Tags className="h-5 w-5" aria-hidden="true" />}
        >
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
            className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            )}
            {isLoading ? "Generating..." : "Generate Trip"}
          </button>
        </div>
      </form>

      <div className="mt-2 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p className={validationError ? "font-medium text-red-600" : ""}>
          {validationError ||
            (isLoading
              ? activeLoadingStage.formMessage
              : "Looking good. Ready to generate your trip.")}
        </p>
        {isLoading ? (
          <LoadingStageTracker loadingStage={loadingStage} />
        ) : (
          <p>AI may make mistakes. Verify important info.</p>
        )}
      </div>
    </section>
  );
}

function LoadingStageTracker({ loadingStage }: { loadingStage: TripLoadingStage }) {
  const activeIndex = getTripLoadingStageIndex(loadingStage);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:justify-end sm:pb-0">
      {tripLoadingStages.map((step, index) => {
        const isActive = index === activeIndex;
        const isComplete = index < activeIndex;

        return (
          <span key={step.stage} className="flex shrink-0 items-center gap-2">
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                isActive || isComplete
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`whitespace-nowrap font-medium ${
                isActive ? "text-blue-700" : isComplete ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {step.shortLabel}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Field({
  children,
  className = "",
  icon,
  label
}: {
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-900">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-500">
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}
