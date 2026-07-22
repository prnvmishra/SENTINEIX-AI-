<div align="center">

# 🛡️ SentinelX AI

### National Fraud Intelligence Platform (NFIP)

**From Detection to Decision Intelligence**

Real-time detection, investigation and response for "Digital Arrest" scams — built for Cyber Crime Cells, Banks, Telecom Operators and Government Agencies.

[![Node](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20RTDB-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter-8A2BE2)](https://openrouter.ai)
[![License](https://img.shields.io/badge/License-MIT-informational)](#license)

</div>

---

## Table of contents

- [What is SentinelX AI?](#what-is-sentinelx-ai)
- [What's real vs. simulated](#whats-real-vs-simulated)
- [Feature tour](#feature-tour)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Monorepo layout](#monorepo-layout)
- [Getting started](#getting-started)
- [Firebase setup](#firebase-setup-authentication--realtime-database)
- [OpenRouter AI Threat Analyst](#openrouter-ai-threat-analyst)
- [Environment variables](#environment-variables)
- [REST API reference](#rest-api-reference)
- [Real-time (Socket.IO) event reference](#real-time-socketio-event-reference)
- [Mock scam scenarios](#mock-scam-scenarios)
- [User roles](#user-roles)
- [Design language](#design-language)
- [Scripts reference](#scripts-reference)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## What is SentinelX AI?

**Digital Arrest** scams are a fast-growing fraud pattern in India: a caller impersonates a police officer, CBI/ED/RBI/Customs official, or bank compliance officer, isolates the victim (often over a video call), and pressures them into transferring money under threat of imminent arrest.

SentinelX AI is an enterprise-grade **Digital Public Safety Intelligence Platform** that ingests a live call, scores it for fraud risk in real time using an explainable rule engine *and* a genuine LLM second opinion, visualizes the fraud network and its geography, and produces an investigation-ready PDF report — all through a live, animated command-center dashboard.

## What's real vs. simulated

SentinelX is upfront about exactly what's real infrastructure vs. scripted demo data:

| Layer | Status | Details |
|---|---|---|
| Call transcripts & scam scenarios | 🎭 Scripted playback | Four hand-authored Digital Arrest scenarios, streamed over Socket.IO on a virtual clock — no real telephony or surveillance data is used or stored. |
| Threat scoring engine | 🧮 Deterministic, explainable | Weighted keyword/phrase rules with human-readable justifications for every point scored — intentionally transparent rather than a black box. |
| **Authentication** | ✅ Real | Firebase Authentication (email/password). ID tokens verified server-side against Google's public JWKS — no service account needed. |
| **Realtime sync** | ✅ Real | Firebase Realtime Database syncs notifications live across every open tab/device, independent of the Socket.IO connection. |
| **AI Threat Analyst** | ✅ Real | A genuine LLM call via [OpenRouter](https://openrouter.ai) analyzes the live transcript and returns its own independent score — shown alongside (never replacing) the rule engine, with explicit agree/diverge flagging. |
| PDF investigation report | ✅ Real | Generated client-side with `jsPDF` from the actual case data returned by the backend. |

## Feature tour

- **Landing page** — problem/solution narrative, architecture diagram, agent roster, animated hero, FAQ.
- **Auth** — real Firebase signup/login with role selection (Officer, Investigator, Bank, Telecom, Gov Admin, Citizen), session persistence, protected routes.
- **Live command-center dashboard**
  - **Transcript panel** — streaming call transcript with keyword highlighting and an audio waveform indicator.
  - **Threat Intelligence panel** — live risk gauge, explainable reason feed, decision recommendations, and the AI Threat Analyst card.
  - **Fraud Network Graph** — React Flow visualization linking victim → scammer → mule account → campaign as evidence is revealed.
  - **Geospatial Intelligence map** — dark Leaflet map of India with static hotspots and animated live-signal "radar pings".
  - **Investigation Console** — tabbed replay timeline (scrub through a resolved case), historical case browser, live+synced notifications, and system agent logs.
- **Analytics dashboard** — daily incident trend, authority-impersonation breakdown, state-wise hotspot ranking, agency performance table (Recharts).
- **Investigation report export** — one click generates a branded, multi-section PDF (summary, evidence log, timeline, recommendations, disclaimer).
- **Notifications** — toast pop-ups for live escalations + a persistent, cross-device-synced notification center.

## Architecture

```text
┌──────────────────────────┐        REST (JSON)        ┌───────────────────────────┐
│                          │ ─────────────────────────▶ │                           │
│   React 19 + Vite SPA    │                            │   Express + TypeScript    │
│   (frontend/)            │ ◀───────────────────────── │   (backend/)              │
│                          │        Socket.IO (WS)      │                           │
└─────────────┬────────────┘ ◀═══════════════════════▶  └─────────────┬─────────────┘
              │                                                        │
              │ Firebase Auth SDK           Firebase ID token verify   │
              │ (signup/login)              (public JWKS, no admin)   │
              ▼                                                        ▼
     ┌────────────────────┐                                  ┌─────────────────────┐
     │ Firebase Realtime  │◀────────── RTDB REST (?auth=) ──▶│  Simulation Engine   │
     │ Database           │                                  │  + Threat/Graph/     │
     │ (users, live       │                                  │  Decision engines    │
     │  notifications)    │                                  └──────────┬───────────┘
     └────────────────────┘                                             │
                                                                          ▼
                                                              ┌─────────────────────┐
                                                              │  OpenRouter (LLM)    │
                                                              │  AI Threat Analyst   │
                                                              └─────────────────────┘
```

The backend never holds a Firebase service account: ID tokens are verified in-process against Google's public JWKS (`jose`), and Realtime Database reads use the caller's own ID token via RTDB's REST API. The OpenRouter API key lives only in the backend `.env` and is never sent to the browser.

## Tech stack

**Frontend** — React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · React Router 7 · React Flow · React Leaflet · Recharts · Socket.IO client · Firebase JS SDK · jsPDF · Lucide icons

**Backend** — Node.js · Express · TypeScript · Socket.IO · `jose` (JWT/JWKS verification) · bcryptjs · jsonwebtoken (legacy fallback) · uuid

**Infra / Services** — Firebase Authentication · Firebase Realtime Database · OpenRouter (LLM gateway)

## Monorepo layout

```text
/frontend   React 19 + TypeScript + Vite + Tailwind v4 + Framer Motion dashboard & landing site
/backend    Node + Express + TypeScript + Socket.IO REST/real-time API and intelligence engine
/shared     Type definitions shared by both frontend and backend (socket event contracts, domain models)
```

<details>
<summary><strong>Expand: full directory tree</strong></summary>

```text
backend/src
├── controllers/        REST route handlers (auth, case, analytics, notification, geo)
├── data/                Mock users, scam scenarios, hotspots, analytics, notifications
├── middleware/          Auth guard, centralized error handling
├── routes/              Express routers
├── services/
│   ├── ai/              OpenRouter client — real LLM Threat Analyst
│   ├── engines/          Threat, graph, decision, timeline, report engines (deterministic)
│   ├── authService.ts   Unified Firebase / legacy JWT resolution
│   ├── firebaseAuthService.ts   ID-token verification via public JWKS (no service account)
│   ├── caseBuilder.ts   Converts scenario scripts into timed transcript lines
│   └── simulationEngine.ts      Orchestrates live playback over Socket.IO
├── socket/              Socket.IO gateway + auth middleware
└── utils/               Env loader, CORS origin matching

frontend/src
├── app/                 Routing, route transitions, providers, loading screen
├── components/          Design-system primitives (GlassPanel, Button, Badge, Modal, ...)
├── context/             Auth, Socket, LiveCase React contexts
├── features/
│   ├── analytics/       Recharts dashboards
│   ├── dashboard/       Header + grid layout
│   ├── graph/           Fraud network graph (React Flow)
│   ├── landing/         Marketing/landing page sections
│   ├── map/             India hotspot map (Leaflet)
│   ├── notifications/   Toasts + notification center + Firebase RTDB sync
│   ├── replay/          Investigation replay timeline, case history, system logs
│   ├── report/          PDF report generation
│   ├── threat/          Threat gauge, decision card, AI Analyst card
│   └── transcript/      Live transcript feed
├── hooks/                Thin context accessors (useAuth, useSocket, useLiveCase, ...)
├── pages/                Route-level pages (Landing, Login, Signup, Dashboard, Analytics, Settings)
├── services/             API clients, Firebase client, Socket.IO client
└── theme/                Design tokens + Framer Motion variants

shared/types             Domain models + Socket.IO event contracts shared by both apps
```

</details>

## Getting started

Requires **Node.js 20+**.

```bash
npm run install:all   # installs frontend + backend dependencies
npm run dev            # runs backend (http://localhost:4000) and frontend (http://localhost:5173) together
```

Then open the printed frontend URL and either **sign up** (if Firebase is configured, see below) or use a demo account (if it isn't).

Individual scripts are also available: `npm run dev:frontend`, `npm run dev:backend`, `npm run build`, `npm run typecheck`. See [Scripts reference](#scripts-reference) for the full list.

Copy `.env.example` to `.env` in both `frontend/` and `backend/` to configure ports and secrets (sensible local defaults are already provided). If Vite's default port (5173) is taken by another local project, it auto-shifts to 5174+ — the backend accepts any `localhost:*` origin in development, so this just works.

## Firebase setup (Authentication + Realtime Database)

The app runs against real Firebase Authentication + Realtime Database when `frontend/.env` / `backend/.env` contain Firebase config. **No service account or Admin SDK is required anywhere** — the backend verifies Firebase ID tokens directly against Google's public JWKS, and reads/writes Realtime Database using the caller's own ID token via the RTDB REST API.

One manual step is required in the [Firebase console](https://console.firebase.google.com/) for your project:

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

> If Firebase env vars are left blank, the app transparently falls back to legacy mock-JWT demo accounts (see `backend/src/data/mockUsers.ts`) so it still runs out of the box.

## OpenRouter AI Threat Analyst

Set `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`, default `openai/gpt-4o-mini`) in `backend/.env` to enable a genuine LLM-backed second opinion during live simulations. It fires at every threat-level escalation and once more at case resolution, given the live transcript so far, and returns its own score/level/summary/key-indicators — entirely independent of the rule engine.

It's entirely server-side; the key is never sent to the browser. Without a key, the simulation runs identically minus the "AI Threat Analyst" card.

## Environment variables

**`backend/.env`**

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `4000` | Backend HTTP/WebSocket port |
| `CLIENT_ORIGIN` | No | `http://localhost:5173,http://localhost:5174` | Comma-separated allowed CORS origins (any `localhost:*` is also allowed in dev) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | No | dev defaults | Legacy mock-auth fallback, used only when Firebase isn't configured |
| `FIREBASE_PROJECT_ID` | No | — | Enables real Firebase Authentication |
| `FIREBASE_DATABASE_URL` | No | — | Enables Realtime Database profile/notification reads |
| `OPENROUTER_API_KEY` | No | — | Enables the real AI Threat Analyst |
| `OPENROUTER_MODEL` | No | `openai/gpt-4o-mini` | Any [OpenRouter](https://openrouter.ai/models) chat model slug |

**`frontend/.env`**

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | No (defaults to `http://localhost:4000/api`) | Backend REST base URL |
| `VITE_SOCKET_URL` | No (defaults to `http://localhost:4000`) | Backend Socket.IO URL |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | No | Firebase web config (safe to expose client-side) — leave blank to fall back to legacy demo login |

See `backend/.env.example` and `frontend/.env.example` for ready-to-copy templates.

## REST API reference

All routes are prefixed with `/api` and (except `/health` and `/auth/login`) require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service status + `firebaseEnabled` / `aiAnalystEnabled` flags |
| `POST` | `/auth/login` | Legacy mock-JWT login (unused when Firebase is configured) |
| `GET` | `/auth/me` | Resolve the current user from a bearer token (Firebase ID token or legacy JWT) |
| `GET` | `/cases` | List historical case summaries |
| `GET` | `/cases/:id` | Full case detail (transcript, reasons, timeline) |
| `GET` | `/cases/:id/report` | Structured investigation report (source for the PDF export) |
| `GET` | `/analytics/overview` | Trend, authority breakdown, state hotspots, agency performance |
| `GET` | `/notifications` | Historical notifications |
| `GET` | `/geo/hotspots` | Static India fraud hotspot dataset |

## Real-time (Socket.IO) event reference

Handshake requires `auth: { token }` (Firebase ID token or legacy JWT). Late-joining clients are replayed any buffered events from the currently running simulation.

**Client → Server**

| Event | Payload | Description |
|---|---|---|
| `simulation:start` | `{ scenarioId? }` | Starts playback (random scenario if omitted) |
| `simulation:stop` | — | Stops playback and archives the case |
| `simulation:pause` / `simulation:resume` | — | Pause/resume the virtual clock |

**Server → Client**

| Event | Description |
|---|---|
| `case:start` / `case:end` | Case lifecycle |
| `transcript:line` | One new line of the call transcript |
| `threat:update` | New score, level, and explainable reasons |
| `graph:update` | Fraud network graph nodes/edges as evidence is revealed |
| `map:ping` | Geolocation ping for the live map |
| `timeline:event` | Investigation timeline entry |
| `decision:update` | Recommended actions for the current threat level |
| `notification:new` | Escalation/resolution notification |
| `ai:insight` | **Real** OpenRouter LLM assessment (score, level, summary, key indicators, agree/diverge flag) |
| `log:entry` | Agent/system log line for the console feed |

## Mock scam scenarios

| Scenario | Impersonated authority | Location |
|---|---|---|
| Fake CBI Digital Arrest — Parcel Narcotics Threat | CBI | Lucknow, Uttar Pradesh |
| Fake Customs Department — Illegal Export Threat | Customs | Bengaluru, Karnataka |
| Fake Income Tax / ED — Money Laundering Threat | Income Tax / ED | Jaipur, Rajasthan |
| Fake RBI Compliance — Account Freeze Threat | RBI | Pune, Maharashtra |

## User roles

`officer` (Cyber Crime Officer) · `investigator` (I4C Investigator) · `bank` (Bank Risk Team) · `telecom` (Telecom Operator) · `gov_admin` (Government Administrator) · `citizen` (Public reporting portal)

## Design language

Dark cyber-intelligence theme: background `#050816`, surface `#111827`, border `#1F2937`, primary `#06B6D4`, danger `#EF4444`, success `#10B981`, warning `#F59E0B`. Glassmorphism panels, Framer Motion micro-interactions, high information density.

## Scripts reference

Run from the repo root:

| Command | Description |
|---|---|
| `npm run install:all` | Installs both `frontend/` and `backend/` dependencies |
| `npm run dev` | Runs backend + frontend concurrently |
| `npm run dev:backend` / `npm run dev:frontend` | Run one app at a time |
| `npm run build` | Production build of both apps |
| `npm run typecheck` | Type-checks both apps (no emit) |

Inside `frontend/`: `npm run lint` (oxlint), `npm run preview` (serve production build).

## Roadmap

Development proceeded in verified phases — project setup, design system, landing page, authentication, dashboard layout, backend APIs, socket integration, transcript engine, threat engine, fraud graph, India map, replay timeline, analytics, report generator, animation polish, optimization/QA — followed by the Firebase + real-AI integration pass documented above. Each phase kept the project building and runnable before moving to the next.

## Disclaimer

This is a hackathon prototype. Call transcripts and scam scenarios are scripted mock data — no real citizen data, telephony, or surveillance feeds are processed or stored. Authentication, realtime sync, and the AI Threat Analyst insight are real integrations (Firebase, OpenRouter) layered on top of that mock dataset. Investigation reports are generated for demonstration purposes only and are not admissible as evidence.

## License

MIT — see [LICENSE](./LICENSE).
