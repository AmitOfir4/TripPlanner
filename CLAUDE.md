# CLAUDE.md — Project rules for the TripPlanner repo

This file tells Claude how to work in this codebase. Read it before making changes.

## What this project is

TripPlanner ("map-layer-ai") is an AI-powered travel planner. Stack:

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS classes
- **Backend:** Express dev server (`server/index.js`) + Vercel serverless functions (`api/*.js`)
- **External APIs:** Google Gemini (`@google/genai`), Google Maps, Google Drive, Google OAuth, Neon (Postgres serverless)
- **Data formats:** KML import/export via `fast-xml-parser`

Frontend and backend are both run with `npm run dev` (concurrently). `npm run build` runs `tsc && vite build`.

## Folder layout (where things go)

```
App.tsx                  Root component, wires hooks → components
index.tsx                Vite entry
types.ts                 ALL shared TypeScript types
constants.ts             TRANSLATIONS, KML icon maps, etc. (always `as const`)
utils.ts                 Generic helpers (KML generation, file download, ...)

components/              Top-level React components (.tsx, PascalCase)
  chat/                  Sub-components for chat UI
  map/                   Sub-components for map UI
  index.ts               Barrel export

hooks/                   Custom React hooks (use*, camelCase)
  index.ts               Barrel export

services/                Business logic / external API wrappers
  index.ts               Barrel export

api/                     Vercel serverless functions (.js, ES modules)
server/                  Local Express dev server (.js)

helpers/                 Pure utility modules (kmlIconHelper, urlHelper, ...)
styles/                  Tailwind class-name strings, grouped by feature
docs/                    Architecture & setup docs (read these before refactors)
public/                  Static assets
```

Do not create new top-level folders without asking. If something doesn't fit, prefer extending `helpers/` or `services/`.

## Coding conventions — match these exactly

### TypeScript / React
- All shared types live in `types.ts`. Don't redefine `TripRecommendation`, `TripLayer`, `TripData`, `GroundingChunk` locally — import them.
- Components are `React.FC<XxxProps>` with an explicit `XxxProps` interface declared just above the component.
- Functional components only. No class components.
- Hooks return a typed interface named `Use<Name>Return` when the shape is non-trivial (see `useTripPlanner.ts`).
- Use relative imports (`./components/Header`, `../types`). The `@/*` path alias is configured but the codebase uses relative imports — stay consistent.
- Files: `.tsx` for components, `.ts` for everything else. PascalCase for components, camelCase for hooks/services/utils.
- Add a barrel export (`index.ts`) entry whenever you add a new component/hook/service.

### Styles
- Tailwind utility classes are NOT written inline in JSX. They live as string constants in `styles/*.ts`, exported as a `const ... as const` object, and imported aliased: `import { appStyles as s } from '../styles/app';` then `<div className={s.container}>`.
- When adding a new component, add a matching style object in `styles/` and re-export it from `styles/index.ts`.
- Keep class strings on one logical line per key — match the existing format in `styles/app.ts`.

### Services
- A service is either:
  1. A class with `static` methods (e.g., `TripService` in `services/tripService.ts`), or
  2. A set of named exports (e.g., `geocodeAddress`, `reverseGeocode` in `services/geocodeService.ts`).
- Pick whichever pattern the surrounding service uses. Don't mix.
- Side-effecting service methods (downloads, network) are `async` and return typed results.

### Backend (`server/` and `api/`)
- ES modules (`"type": "module"`). Use `import`, not `require`.
- The Express server in `server/index.js` and the Vercel functions in `api/*.js` often share helper logic (e.g. city extraction, geocoding). Keep them in sync — if you touch one, check the other.
- Never log API keys, OAuth tokens, or full request bodies that may contain them.

### Comments & section dividers
- Use the existing divider style for grouping logic inside a file:

  ```ts
  // ── Import handlers ──────────────────────────────────────────────
  ```

- JSDoc comments only for non-obvious fields/types (see `types.ts` `city?` field for the style). Don't doc obvious things.

### i18n & Hebrew support
- User-facing strings go in `constants.ts` under `TRANSLATIONS` (or a similar map). The app supports `'en' | 'he'` — Hebrew uses Unicode range `֐-׿`. If you add user-facing text, plan for both languages.

## Things to never do without asking

- Don't add a new dependency to `package.json`. Ask first and explain why an existing dep won't work.
- Don't add a test framework, linter, or formatter — none are configured. If you think one is needed, propose it; don't install it.
- Don't commit `.env`, `package-lock.json`, or `dist/` (already gitignored — keep it that way).
- Don't introduce a different state-management library (Redux, Zustand, etc.). State lives in hooks + `App.tsx`.
- Don't introduce CSS-in-JS, styled-components, or CSS modules. The project uses Tailwind class strings via `styles/`.
- Don't rewrite the KML parser (`kmlParser.ts`) without reading `docs/ARCHITECTURE.md` first — KML shape from Google My Maps has subtle quirks.

## When making changes

1. **Read before edit.** For non-trivial changes, scan the relevant `docs/*.md` (especially `ARCHITECTURE.md`, `BACKEND_SETUP.md`, `STREAMING_SEARCH.md`).
2. **Match the surrounding pattern.** If two files do the same thing two different ways, pick the one closer to the file you're editing.
3. **Keep diffs small.** Don't reformat code you aren't changing.
4. **Type everything.** No `any` unless interacting with an untyped external API; if forced, narrow it immediately.
5. **Verify the build.** When you finish a change that touches TypeScript, mention that `npm run build` (which runs `tsc`) should pass — and run it if the environment allows.

## Response style I want from you

- Short and direct. No long preambles, no "Great question!"
- When you finish a code change, list the files you touched in one line each. Don't re-paste the whole diff.
- Don't restate what I just said back to me before answering.
- If a request is ambiguous, ask one focused clarifying question rather than guessing.
- Don't add emojis unless I use them first.
- Don't create new markdown docs (READMEs, summaries) unless I explicitly ask. The `docs/` folder is curated — don't dump into it.

## Secrets

The repo expects these env vars in `.env` (already gitignored):

- `API_KEY` — Gemini
- `GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_CLIENT_ID` — OAuth client
- (optionally) `DATABASE_URL` for Neon

Never echo these values back, never paste them into committed files, never include them in example code beyond placeholder names.
