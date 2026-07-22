# SentinelX AI — National Fraud Intelligence Platform (NFIP)

**From Detection to Decision Intelligence**

SentinelX AI is an enterprise-grade Digital Public Safety Intelligence Platform prototype. It helps Cyber Crime Cells, Banks, Telecom Operators and Government Agencies detect, investigate and respond to Digital Arrest scams — converting incoming scam signals into threat intelligence, fraud intelligence, and investigation-ready decision intelligence.

> The scam scenarios are scripted mock playback (no real telephony/surveillance data). Authentication, the realtime data layer, and the AI Threat Analyst insight are real, backed by Firebase and OpenRouter — see [Intelligence Engine](#intelligence-engine) below for exactly what's real vs. simulated.

## Monorepo layout

```text
/frontend   React 19 + TypeScript + Vite + Tailwind v4 + Framer Motion dashboard & landing site
/backend    Node + Express + TypeScript + Socket.IO REST/real-time API and intelligence engine
/shared     Type definitions shared by both frontend and backend (socket event contracts, domain models)
```

## Getting started

Requires Node.js 20+.

```bash
npm run install:all   # installs frontend + backend dependencies
npm run dev            # runs backend (http://localhost:4000) and frontend (http://localhost:5173) together
```

Individual scripts are also available: `npm run dev:frontend`, `npm run dev:backend`, `npm run build`, `npm run typecheck`.

Copy `.env.example` to `.env` in both `frontend/` and `backend/` to configure ports and secrets (sensible local defaults are already provided). If Vite's default port (5173) is taken by another local project, it auto-shifts to 5174+ — the backend accepts any `localhost:*` origin in development, so this just works.

### Firebase setup (Authentication + Realtime Database)

The app runs against real Firebase Authentication + Realtime Database when `frontend/.env` / `backend/.env` contain Firebase config (already populated for this project's `sentinelx-ea7aa` Firebase project). No service account or Admin SDK is required anywhere — the backend verifies Firebase ID tokens directly against Google's public JWKS, and reads/writes Realtime Database using the caller's own ID token via the RTDB REST API.

One manual step is required in the [Firebase console](https://console.firebase.google.com/) for the project (`sentinelx-ea7aa`):

1. **Authentication → Sign-in method** → ensure **Email/Password** is enabled.
2. **Realtime Database → Rules** → publish:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "liveActivity": {
      "notifications": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

This lets any signed-in user manage their own profile (`/users/{uid}` — name, role, organization) and lets all signed-in clients read/write the shared live notification feed (`/liveActivity/notifications`), which is what makes notifications sync in real time across every open browser tab/device, independent of the Socket.IO connection.

If Firebase env vars are left blank, the app transparently falls back to the legacy mock-JWT demo accounts (see `backend/src/data/mockUsers.ts`) so it still runs out of the box.

### OpenRouter AI Threat Analyst (optional)

Set `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`, default `openai/gpt-4o-mini`) in `backend/.env` to enable a genuine LLM-backed second opinion during live simulations. It's entirely server-side — the key is never sent to the browser. Without a key, the simulation runs identically minus the "AI Threat Analyst" card.

## Intelligence Engine

SentinelX runs a **hybrid** intelligence stack, deliberately kept transparent about what's deterministic vs. generative:

- **Rule engine (deterministic, always on)** — a set of modular, single-responsibility services ("agents": Transcript, Threat Detection, Explainability, Graph Intelligence, Timeline, Decision, Report Generator) that score hand-authored mock scam scenarios via keyword/phrase matching and weighted, fully explainable rules.
- **AI Threat Analyst (real, optional)** — a genuine call to an LLM via [OpenRouter](https://openrouter.ai) at each threat-level escalation and at case resolution, given the live transcript so far. It returns its own score/level/summary/key-indicators independently of the rule engine, and the UI explicitly flags whether it agrees or diverges — a real generative-AI second opinion, not a mock.
- **Authentication & realtime sync (real)** — Firebase Authentication for signup/login, and Firebase Realtime Database for cross-device/cross-tab live notification sync, alongside the existing Socket.IO simulation stream.

## Design language

Dark cyber-intelligence theme: background `#050816`, surface `#111827`, border `#1F2937`, primary `#06B6D4`, danger `#EF4444`, success `#10B981`, warning `#F59E0B`. Glassmorphism panels, Framer Motion micro-interactions, high information density.

## Roadmap

Development proceeded in verified phases — project setup, design system, landing page, authentication, dashboard layout, backend APIs, socket integration, transcript engine, threat engine, fraud graph, India map, replay timeline, analytics, report generator, animation polish, optimization/QA — followed by the Firebase + real-AI integration pass documented above. Each phase kept the project building and runnable before moving to the next.
