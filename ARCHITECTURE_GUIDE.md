# Project Architecture

This project follows a clean, modular architecture with clear separation of concerns.

## Directory Structure

```
├── components/          # React UI components
│   ├── Header.tsx
│   ├── SearchForm.tsx
│   ├── PlaceCard.tsx
│   ├── PlaceImage.tsx
│   ├── PlaceResults.tsx
│   ├── SavedPlacesSidebar.tsx
│   ├── ImportModal.tsx
│   └── index.ts
├── hooks/              # Custom React hooks
│   ├── useGoogleAuth.ts
│   ├── useTripPlanner.ts
│   ├── useMapImport.ts
│   ├── useUserLocation.ts
│   └── index.ts
├── services/           # Business logic services
│   ├── tripService.ts
│   └── index.ts
├── helpers/            # Utility functions
│   └── imageHelper.ts
├── constants.ts        # App constants and translations
├── types.ts           # TypeScript type definitions
├── utils.ts           # General utilities
├── geminiService.ts   # Gemini AI integration
├── googleDriveService.ts
├── kmlParser.ts
└── App.tsx            # Main application component
```

## Architecture Patterns

### 1. Component-Based Architecture
- **Presentational Components**: Pure UI components that receive props and render
- **Container Logic**: Business logic handled by custom hooks
- **Single Responsibility**: Each component has one clear purpose

### 2. Custom Hooks for State Management
- `useGoogleAuth`: Authentication state and operations
- `useTripPlanner`: Core trip planning functionality
- `useMapImport`: Import/export operations
- `useUserLocation`: Geolocation handling

### 3. Service Layer
- `TripService`: Encapsulates trip-related business logic
  - KML generation
  - File downloads
  - Google Drive uploads

### 4. Constants and Configuration
- Centralized translations for easy i18n
- API limits and configuration
- Category image mappings

## Key Design Principles

### Separation of Concerns
- **UI Components**: Only concerned with rendering
- **Hooks**: Manage state and side effects
- **Services**: Business logic and external integrations
- **Helpers**: Pure utility functions

### Reusability
- Components are reusable and composable
- Hooks can be shared across components
- Services provide clean APIs

### Type Safety
- Full TypeScript coverage
- Explicit interfaces for all props
- Type-safe state management

### Maintainability
- Small, focused files (< 300 lines)
- Clear naming conventions
- Consistent code structure
- Easy to test and extend

## Component Hierarchy

```
App
├── Header
├── Main
│   ├── SearchForm
│   └── PlaceResults
│       └── PlaceCard
│           └── PlaceImage
├── SavedPlacesSidebar
│   └── LayerSection
│       └── SavedPlaceCard
│           └── PlaceImage
└── ImportModal
```

## Data Flow

1. **User Input** → SearchForm → useTripPlanner hook
2. **API Call** → geminiService → Backend
3. **State Update** → useTripPlanner → Re-render
4. **User Action** → Component handler → Service/Hook
5. **Side Effect** → Service → External API

## Best Practices Implemented

1. **Single Source of Truth**: State managed in hooks
2. **Immutable Updates**: Using functional state updates
3. **Error Handling**: Try-catch in async operations
4. **Loading States**: Managed for better UX
5. **Memoization**: Using React.memo for performance
6. **Clean Code**: ESLint/Prettier compliant
7. **Accessibility**: Semantic HTML and ARIA labels

## Adding New Features

### To add a new component:
1. Create component in `components/`
2. Export from `components/index.ts`
3. Import in parent component

### To add new business logic:
1. Create service in `services/`
2. Export from `services/index.ts`
3. Use in hooks or components

### To add state management:
1. Create custom hook in `hooks/`
2. Export from `hooks/index.ts`
3. Use in components

## Testing Strategy

- **Unit Tests**: For services and helpers
- **Integration Tests**: For hooks
- **E2E Tests**: For critical user flows
- **Component Tests**: For UI components

## Performance Optimizations

1. **React.memo**: Prevents unnecessary re-renders
2. **useCallback**: Memoizes event handlers
3. **Lazy Loading**: Components loaded on demand
4. **Code Splitting**: Reduces initial bundle size
5. **Debouncing**: For search inputs (if needed)
