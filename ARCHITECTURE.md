# Architecture Overview: Google My Maps Import

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TripPlanner App                         │
│                                                              │
│  ┌────────────┐    ┌──────────────┐    ┌────────────┐      │
│  │   App.tsx  │───▶│ Google OAuth │───▶│ User State │      │
│  │            │    │   Provider   │    │            │      │
│  └────────────┘    └──────────────┘    └────────────┘      │
│         │                                      │             │
│         ▼                                      ▼             │
│  ┌────────────┐                     ┌────────────────┐      │
│  │  Import    │                     │ Access Token   │      │
│  │  Button    │                     │  (Session)     │      │
│  └────────────┘                     └────────────────┘      │
│         │                                      │             │
└─────────┼──────────────────────────────────────┼─────────────┘
          │                                      │
          │                                      │
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Services                           │
│                                                              │
│  ┌──────────────────────┐       ┌──────────────────────┐   │
│  │  Google Drive API    │       │  Google My Maps      │   │
│  │                      │       │                      │   │
│  │  1. List My Maps    │◀──────│  Stored as KML       │   │
│  │  2. Export as KML   │       │  (vnd.google-apps.   │   │
│  │                      │       │       map)           │   │
│  └──────────────────────┘       └──────────────────────┘   │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            │ KML XML
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Processing                           │
│                                                              │
│  ┌──────────────────┐       ┌──────────────────────┐       │
│  │   kmlParser.ts   │       │  fast-xml-parser     │       │
│  │                  │  uses │                      │       │
│  │ parseKMLToTrip   │───────│  XML ─▶ JSON        │       │
│  │     Data()       │       │                      │       │
│  └──────────────────┘       └──────────────────────┘       │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            │ TripLayer[]
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    App State Update                          │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  setSavedLayers(prev => [...prev, ...layers])│           │
│  └──────────────────────────────────────────────┘           │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  UI Updates  │
                    │  - Sidebar   │
                    │  - Map pins  │
                    └──────────────┘
```

## Data Flow: Import Process

```
User Action                API Call                  Data Transform
───────────                ────────                  ──────────────

Click "Import"
     │
     ▼
Sign In ─────────────▶ OAuth 2.0 ──────────────▶ Access Token
     │                 (useGoogleLogin)              │
     ▼                                               │
Authenticated                                        │
     │                                               │
     ▼                                               │
Click Map  ───────────▶ Drive API ─────────────▶ My Maps List
to Import              fetchMyMaps()             [{id, name, ...}]
     │                      │                         │
     │                      │                         │
     ▼                      ▼                         ▼
Select Map ───────────▶ Export API ─────────────▶ KML String
     │                 downloadMyMapAsKML()      <?xml version...>
     │                      │                         │
     │                      │                         │
     ▼                      ▼                         ▼
Parse KML  ───────────▶ XML Parser ─────────────▶ JSON Object
     │                 (fast-xml-parser)         {Document:{...}}
     │                      │                         │
     │                      │                         │
     ▼                      ▼                         ▼
Transform  ───────────▶ Custom Logic ──────────▶ TripLayer[]
     │                 parseKMLToTripData()      [{name, places}]
     │                      │                         │
     │                      │                         │
     ▼                      ▼                         ▼
Merge      ───────────▶ State Update ──────────▶ UI Refresh
                       setSavedLayers()          Sidebar shows
                                                 imported places
```

## Component Interaction

```
┌─────────────────────────────────────────────────┐
│              App Component (App.tsx)            │
│                                                 │
│  State:                                         │
│  ├─ googleUser: GoogleUser | null              │
│  ├─ showImportModal: boolean                   │
│  ├─ myMaps: MyMapsFile[]                       │
│  └─ savedLayers: TripLayer[]                   │
│                                                 │
│  Functions:                                     │
│  ├─ login() ───────────────┐                   │
│  ├─ handleImportFromMyMaps()│                  │
│  └─ handleSelectMap() ──────┼──────┐           │
│                              │      │           │
└──────────────────────────────┼──────┼───────────┘
                               │      │
                ┌──────────────┘      └──────────────┐
                ▼                                     ▼
┌───────────────────────────┐      ┌──────────────────────────┐
│  googleDriveService.ts    │      │     kmlParser.ts         │
│                           │      │                          │
│  fetchMyMaps()            │      │  parseKMLToTripData()   │
│  ├─ Query Drive API       │      │  ├─ Parse XML           │
│  └─ Return MyMapsFile[]   │      │  ├─ Extract Folders     │
│                           │      │  ├─ Extract Placemarks  │
│  downloadMyMapAsKML()     │      │  └─ Return TripLayer[]  │
│  ├─ Export to KML         │      │                          │
│  └─ Return KML string     │      │                          │
└───────────────────────────┘      └──────────────────────────┘
```

## File Structure

```
TripPlanner/
├── App.tsx                    # Main component with import UI
├── index.tsx                  # OAuth provider wrapper
│
├── googleAuthService.ts       # OAuth config & types
├── googleDriveService.ts      # Drive API calls
├── kmlParser.ts              # KML → TripLayer converter
│
├── types.ts                   # TypeScript interfaces
├── vite-env.d.ts             # Vite env types
│
├── .env.example              # Template for secrets
├── .env                      # Your actual secrets (gitignored)
│
└── Documentation/
    ├── README.md             # Updated with import feature
    ├── QUICK_START.md        # Fast setup guide
    ├── SETUP_GOOGLE_IMPORT.md # Detailed setup
    └── IMPLEMENTATION_SUMMARY.md # Technical details
```

## OAuth Scopes & Permissions

```
Requested Scope                     Purpose
──────────────────                  ───────

drive.readonly                      Read My Maps files from Drive
                                    (minimum required access)

Optional Future Scopes:
drive.file                          Create new My Maps
drive.appdata                       Store app-specific data
```

## Security Considerations

```
✅ OAuth 2.0 for authentication
✅ Token stored in React state (session-only)
✅ No token sent to backend
✅ HTTPS required in production
✅ Authorized origins whitelist

⚠️  Token not persisted (refresh on reload)
⚠️  Client-side only (no backend verification)
```

## Export Flow (Existing Feature, Enhanced)

```
User Action              Processing              Output
───────────              ──────────              ──────

Edit imported
places in app
     │
     ▼
Click "Export" ────▶ generateKml() ──────▶ KML File
                    (utils.ts)           MyTrip.kml
     │
     ▼
Download File
     │
     ▼
Upload to          Manual step          New My Map
Google My Maps ────────────────────▶    created in
(manually)                              Google account
```

## Key Technologies

- **@react-oauth/google** - React hooks for Google OAuth 2.0
- **fast-xml-parser** - Bidirectional XML ↔ JSON conversion
- **Google Drive API v3** - Access My Maps files
- **Google Maps API** - Display and geocoding (existing)
- **Google Gemini AI** - Place suggestions (existing)
