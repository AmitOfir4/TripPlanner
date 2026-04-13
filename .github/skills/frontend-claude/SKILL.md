---
name: frontend-claude
description: 'Frontend development skill for the TripPlanner React/TypeScript project. Use when: creating or editing React components, writing custom hooks, adding Tailwind CSS styles, working with TypeScript types, integrating Google Maps, building UI features, fixing component bugs, or following project conventions.'
argument-hint: 'Describe the frontend task or component to work on'
---

# Frontend Development — TripPlanner

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, TypeScript 5.7 |
| Build | Vite 6 |
| Styling | Tailwind CSS (CDN), custom global CSS in `index.html` |
| State | React `useState` / `useRef` / `useEffect` + `localStorage` |
| Maps | `@vis.gl/react-google-maps` |
| AI | `@google/genai` (Gemini) |
| Icons | `lucide-react` |

## Project Conventions

### Components
- All components are **functional** with `React.FC<Props>` typing
- Props interfaces are defined **inline** in each component file
- Components live in `components/` and are re-exported via `components/index.ts`
- Components are **thin** — delegate all business logic to hooks
- **Named exports only** — no default exports

```tsx
// ✅ Correct pattern
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className="flex items-center gap-2">
      <span>{title}</span>
      <button onClick={onAction}>Go</button>
    </div>
  );
};
```

### Custom Hooks
- All hooks live in `hooks/` and are re-exported via `hooks/index.ts`
- Hooks own business logic; components only render
- Naming: `use<PascalCase>` (e.g. `useMapImport`, `useUserLocation`)

### Types
- Shared interfaces and types are defined in `types.ts`
- Local props interfaces stay in the component file

### Services
- Integration logic lives in `services/` or root-level `*Service.ts` files
- Each service owns one external system (Gemini, Google Drive, etc.)

### File Naming
- Components: `PascalCase.tsx` (e.g. `SearchForm.tsx`)
- Hooks / services / utils: `camelCase.ts` (e.g. `useTripPlanner.ts`)
- Constants: `constants.ts`

## Styling

This project uses **Tailwind CSS utility classes** exclusively in components. No CSS modules, no styled-components.

Custom global classes (defined in `index.html` `<style>` block):
- `.glass` — glassmorphism card style
- Font: `Inter` via Google Fonts

```tsx
// ✅ Use Tailwind utility classes
<div className="flex flex-col gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">

// ✅ Use global .glass class for card surfaces
<div className="glass p-4 rounded-2xl">
```

## Component Checklist

When creating or editing a component:
1. Define props interface inline in the file
2. Use `React.FC<Props>` typing
3. Use named export
4. Apply Tailwind for all styling
5. Delegate logic to a hook if it's more than 2-3 state variables
6. Add to `components/index.ts` barrel if it's a new file
7. Use `lucide-react` icons (not other icon libraries)

## Adding a New Hook

1. Create `hooks/use<Name>.ts`
2. Return typed object (not array unless it's a 2-tuple like `useState`)
3. Export it from `hooks/index.ts`

## Key Files

| File | Purpose |
|------|---------|
| `types.ts` | Shared TypeScript types |
| `constants.ts` | App-wide constants (API limits, etc.) |
| `App.tsx` | Root component, wires hooks to layout |
| `hooks/useTripPlanner.ts` | Core trip state (places, search, saved) |
| `hooks/useGoogleAuth.ts` | Google OAuth state |
| `components/MapView.tsx` | Google Maps integration |
| `components/ChatInterface.tsx` | Gemini AI chat UI |
