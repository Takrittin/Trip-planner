# AI Trip Map Planner

AI Trip Map Planner is a full-stack trip planning app. It generates a personalized itinerary with OpenRouter, verifies suggested places with the Google Places API, and displays verified stops as numbered markers on Google Maps.

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- APIs: OpenRouter, Google Maps JavaScript API, Google Places API
- Local run option: Docker Compose

## Project Structure

```txt
.
├── backend/
│   ├── src/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   ├── .env.local.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── compose.yaml
└── README.md
```

## Prerequisites

Install these first:

- Node.js 22 or newer
- npm
- Docker Desktop, if you want to run with Docker

You also need API keys for:

- OpenRouter
- Google Maps JavaScript API
- Google Places API

## Google Cloud Setup

Enable these APIs in Google Cloud:

- Maps JavaScript API
- Places API

Recommended key setup:

- Frontend key: restrict by HTTP referrer and allow Maps JavaScript API.
- Backend key: restrict by API usage and allow Places API.

For local development, you can use the same Google key for both, but using two keys is safer.

## OpenRouter Setup

1. Create an account at OpenRouter.
2. Create an API key.
3. Put the key in `backend/.env`.
4. Use an available model for your account, for example `openai/gpt-oss-20b:free`.

## Environment Setup

From the project root, create local env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env`:

```env
PORT=4000
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-oss-20b:free
OPENROUTER_MAX_TOKENS=2500
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=AI Trip Map Planner
GOOGLE_MAPS_API_KEY=your_backend_google_places_key_here
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_frontend_google_maps_key_here
```

Do not commit `.env` or `.env.local`. They are ignored by `.gitignore`.

## Run With Docker

This is the easiest way to start both backend and frontend.

1. Make sure Docker Desktop is running.
2. Start the app:

```bash
docker compose up --build
```

3. Open the frontend:

```txt
http://localhost:3000
```

4. Backend API runs at:

```txt
http://localhost:4000
```

5. Stop the app:

```bash
docker compose down
```

If you change dependencies, rebuild:

```bash
docker compose up --build
```

## Run Without Docker

Open two terminal tabs.

Terminal 1, start the backend:

```bash
cd backend
npm install
npm run dev
```

Terminal 2, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Build Checks

Backend:

```bash
cd backend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Troubleshooting

If Docker says it cannot connect to the Docker API, Docker Desktop is not running. Open Docker Desktop and wait until it is ready, then run:

```bash
docker info
```

If port `4000` is already in use, stop the old backend process or change the backend port. To find the process on macOS:

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

If the map does not load, check:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists in `frontend/.env.local`.
- Maps JavaScript API is enabled.
- Your frontend key allows `http://localhost:3000`.

If trip generation fails, check:

- `OPENROUTER_API_KEY` exists in `backend/.env`.
- `GOOGLE_MAPS_API_KEY` exists in `backend/.env`.
- Places API is enabled.
- The backend is running at `http://localhost:4000`.

## Notes

- The frontend never calls OpenRouter or private Places APIs directly.
- The backend enriches AI-suggested places with Google Places data.
- Google Places coordinates are used for map markers.
- Place photos are loaded through `GET /api/place-photo`, so the backend Google key is not exposed to the frontend.
- Generated places are capped by travel style: relaxed 2/day, balanced 3/day, packed 4/day.
- This MVP does not include a database, authentication, trip saving, or production deployment setup.
