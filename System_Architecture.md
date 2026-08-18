# ATHLETA AI — SYSTEM ARCHITECTURE SPECIFICATION

> **Architecture Level:** Senior Full-Stack & Flutter Mobile Systems Architect  
> **Pattern:** Clean Architecture + Server-Side Proxy + Event-Driven Engine  
> **Version:** 2.0.0

---

## 1. High-Level System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|  +-----------------------------------+   +-------------------------------------+  |
|  |  React 19 + Vite (Web / PWA)      |   |  Flutter 3.x (Mobile iOS / Android) |  |
|  |  - Command Center                 |   |  - Native HealthKit / Google Fit    |  |
|  |  - Fullbody Matrix UI             |   |  - Background Rest Timers           |  |
|  |  - BioAtlas 3D Viewer             |   |  - Local SQLite / Isar Cache        |  |
|  +-----------------------------------+   +-------------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           |
                                 HTTPS / REST / WebSockets
                                           |
+------------------------------------------v----------------------------------------+
|                                  SERVER LAYER                                     |
|  +-----------------------------------------------------------------------------+  |
|  |  Node.js + Express 4.x (CommonJS Bundled via esbuild - dist/server.cjs)     |  |
|  |  - Middleware: CORS, Auth Guard, Rate Limiter, Error Boundary               |  |
|  |  - Route: GET /api/health                                                  |  |
|  |  - Route: POST /api/ai-coach (Gemini 3.6 Flash Integration)                 |  |
|  |  - Route: POST /api/export-pdf (JsPDF Biomechanical Matrix)                 |  |
|  +-----------------------------------------------------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           |
                 +-------------------------+-------------------------+
                 |                                                   |
+----------------v-----------------------+   +-----------------------v--------------+
|            EXTERNAL APIs               |   |            DATA PERSISTENCE          |
|  - Google GenAI (@google/genai)        |   |  - Firebase Auth (JWT Tokens)        |
|  - Gemini 3.6 Flash                    |   |  - Firestore Multi-tenant DB         |
|  - YouTube Data / Embed Services       |   |  - Browser LocalStorage / IndexedDB  |
+----------------------------------------+   +--------------------------------------+
```

---

## 2. Component Design & Clean Architecture Principles

### 2.1 Domain & Presentation Separation
- **Presentation Layer (`src/components/`)**: Pure UI view components (`CommandCenter`, `FullbodyMatrixView`, `NutriFluxView`, `KINETIXAICoachView`, `BioAtlas3DView`). Responsibilities limited to rendering states and handling user gestures.
- **Domain Engine Layer (`src/engine/`)**: Pure TypeScript business logic engines decoupled from React lifecycle:
  - `workoutEngine.ts`: Calculates weekly volume distribution, muscle group overlap, and RIR progression.
  - `dietEngine.ts`: Executes Mifflin-St Jeor metabolic calculations and IIFYM macronutrient splits.
  - `aiCoachEngine.ts`: Formats structured biomechanical prompts for Gemini 3.6 Flash.
  - `progressEngine.ts`: Computes RPE fatigue indexes and Deload triggers.
  - `exerciseData.ts`: Core 3D anatomical exercise dataset.

### 2.2 Server-Side Key Isolation
- All calls to `@google/genai` are encapsulated within `server.ts` behind `/api/ai-coach`.
- Client-side code **NEVER** holds or accesses `GEMINI_API_KEY`.
- API responses are sanitized and type-checked before returning to the frontend.

---

## 3. Flutter Target Architecture Plan (Phase 3)

When porting to Flutter, the application will adopt the standard **Feature-First Clean Architecture**:

```
lib/
├── core/
│   ├── network/ (Dio HTTP client + Interceptors)
│   ├── theme/ (Athleta Design System & Obsidian Colors)
│   └── utils/ (Biomechanical Calculators)
├── features/
│   ├── workout_matrix/
│   │   ├── data/ (Repositories, Local Isar DB, Remote APIs)
│   │   ├── domain/ (Entities, UseCases: GenerateMatrixUseCase)
│   │   └── presentation/ (BLoC / Cubits, Screen Widgets)
│   ├── kinetix_ai/
│   ├── bio_atlas_3d/
│   └── nutriflux/
└── main.dart
```

---

*Document created and maintained by Athleta AI Systems Engineering.*
