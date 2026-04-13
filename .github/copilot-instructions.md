# TripPlanner — Copilot Instructions

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, TypeScript 5.7 |
| Build | Vite 6 |
| Styling | Tailwind CSS (CDN) + global classes in `index.html` |
| State | React `useState` / `useRef` / `useEffect` + `localStorage` |
| Maps | `@vis.gl/react-google-maps` |
| AI | `@google/genai` (Gemini) |
| Icons | `lucide-react` |
| Backend | Express (Node.js) in `server/`, Vercel serverless functions in `api/` |

## Architecture

```
App.tsx                   # Root — wires hooks into layout
components/               # UI-only, thin React components
hooks/                    # All business logic as custom hooks
services/                 # External integrations (Gemini, Google Drive, etc.)
*Service.ts               # Root-level service files (geminiService, googleAuthService…)
types.ts                  # Shared TypeScript interfaces
constants.ts              # App-wide constants (translations, API limits)
api/                      # Vercel serverless functions
server/                   # Local Express dev server
```

Key data flow: `App.tsx` → `hooks/useTripPlanner.ts` (core state) → components render only.

## Code Conventions

### Components
- **Functional only**, typed `React.FC<Props>`
- Props interfaces defined **inline** in the same file
- **Named exports only** — no default exports
- Components must be **thin**: delegate all logic beyond simple rendering to a hook
- New components must be added to `components/index.ts` barrel

```tsx
// ✅ Correct
interface MyComponentProps {
  title: string;
  onAction: () => void;
}
export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => { … };
```

### Custom Hooks
- Live in `hooks/`, re-exported from `hooks/index.ts`
- Named `use<PascalCase>` — e.g. `useMapImport`, `useUserLocation`
- Return a typed **object** (not array) unless it's a 2-tuple like `useState`

### Types
- Shared types → `types.ts`
- Local props interfaces → stay in the component file

### Services
- Each service owns one external system (Gemini, Google Drive, Google Auth, KML)
- Services are plain TypeScript modules (no classes required)

### File Naming
- Components: `PascalCase.tsx`
- Hooks / services / utils: `camelCase.ts`
- Constants / types: `constants.ts`, `types.ts`

## Styling

Use **Tailwind utility classes** exclusively — no CSS modules, no styled-components.

Global classes (defined in the `<style>` block in `index.html`):
- `.glass` — glassmorphism card surface (use for cards and panels)
- Font: `Inter` via Google Fonts

```tsx
// ✅ Card surface
<div className="glass p-4 rounded-2xl">

// ✅ Layout
<div className="flex flex-col gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
```

## Key Files

| File | Purpose |
|------|---------|
| `types.ts` | `TripRecommendation`, `TripLayer`, `TripData`, `GoogleUser` |
| `constants.ts` | `TRANSLATIONS`, `API_LIMITS` |
| `App.tsx` | Root component |
| `hooks/useTripPlanner.ts` | Core trip state: places, search, saved |
| `hooks/useGoogleAuth.ts` | Google OAuth state |
| `hooks/useMapImport.ts` | KML / Google Maps import |
| `hooks/useUserLocation.ts` | Browser geolocation |
| `components/MapView.tsx` | Google Maps integration |
| `components/ChatInterface.tsx` | Gemini AI chat UI |
| `geminiService.ts` | Gemini API calls |
| `googleDriveService.ts` | Google Drive export |
| `kmlParser.ts` | KML file parsing |

## Build & Dev

```bash
npm run dev          # Start frontend (Vite) + backend (Express) concurrently
npm run dev:frontend # Vite only
npm run dev:backend  # Express only (nodemon)
npm run build        # tsc + vite build
```

## Important Rules

1. Never add default exports to components or hooks.
2. Never use CSS modules or styled-components — Tailwind only.
3. Never add business logic directly in components — put it in a hook.
4. Always use `lucide-react` for icons, not other icon libraries.
5. Always export new components from `components/index.ts` and new hooks from `hooks/index.ts`.
6. API keys must never be committed — they are loaded from environment variables (`.env`).

See `docs/` for detailed architecture, API security, and setup guides.
