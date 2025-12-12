# TripPlanner AI Coding Instructions

## Architecture Overview

**Tech Stack**: Django backend + React (Vite) frontend, monorepo structure
- Backend: `/core` (Django project) + `/trips` (Django app)
- Frontend: `/frontend` (React + Vite)
- Database: SQLite (`db.sqlite3`)

**Service-Oriented Backend Design**:
The `trips` app uses a three-service architecture pattern:
1. `api_service.py` - External API integration (Google Places API)
2. `planner_service.py` - Business logic (Nearest Neighbor algorithm for route optimization)
3. `kml_service.py` - Output generation (KML file creation)

This separation keeps views thin and logic testable.

## Key Integration Points

**API Flow**: `POST /api/plan/` → `views.plan_trip()` → calls three services sequentially:
- `fetch_attractions(city)` - Gets attractions from Google Places API
- `plan_itinerary_nearest_neighbor(attractions)` - Optimizes route using geopy distance calculations
- `generate_trip_kml(city, itinerary)` - Generates KML file in `media/` directory

**CORS Setup**: Django configured for React dev server at `localhost:5173` (Vite default)

## Environment & Dependencies

**Required Environment Variables** (`.env` at project root):
- `GOOGLE_API_KEY` - Google Places API key (required for attraction fetching)
- `CLIENT_ID` - OAuth client ID (configured but not actively used yet)

**Key Python Dependencies** (install in venv):
- `django`, `djangorestframework`, `django-cors-headers`
- `python-dotenv` (environment variable loading)
- `requests` (Google API calls)
- `geopy` (distance calculations between coordinates)
- `simplekml` (KML file generation)

## Development Workflow

**Backend Setup**:
```bash
python manage.py runserver  # Runs on localhost:8000
python manage.py migrate    # Run after model changes
```

**Frontend Setup**:
```bash
cd frontend
npm run dev  # Runs on localhost:5173
```

**Note**: Frontend `App.jsx` is still boilerplate - actual trip planner UI not yet implemented.

## Project-Specific Conventions

**Service Module Pattern**: 
- All business logic lives in `*_service.py` files, not in views
- Services return pure data structures (lists, dicts), never Django responses
- Views handle HTTP concerns; services handle domain logic

**Data Structure Contract**:
Attractions flow through the system as:
```python
{'name': str, 'lat': float, 'lng': float}
```
This format is maintained from API fetch → planning → KML generation.

**KML Coordinate Order**: 
KML uses `(lng, lat)` order (not `(lat, lng)`), handled in `kml_service.py`.

**File Output**: 
Generated KML files saved to `media/` directory (auto-created if missing), gitignored.

## Common Pitfalls

- The frontend is not wired to the backend yet - `App.jsx` needs implementation to call `/api/plan/`
- No models defined yet in `trips/models.py` despite database being set up
- `venv/` must be activated before running Django commands
- Environment variables must be loaded via `load_dotenv()` in each module that needs them (see `views.py` and `api_service.py`)
