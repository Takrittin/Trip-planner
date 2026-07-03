import { MapPinned } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-10 2xl:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <MapPinned aria-hidden="true" className="h-6 w-6" strokeWidth={2.3} />
          </div>
          <span className="text-lg font-semibold tracking-normal text-gray-950 sm:text-xl">
            AI Trip Map Planner
          </span>
        </div>
      </nav>
    </header>
  );
}
