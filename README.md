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
- [Live Real-Data Mode](#live-real-data-mode)
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
| **Live Mic Session** | ✅ Real | A genuine alternative to the scripted demo: your browser's own microphone + Web Speech API transcribes a real conversation live, and it's fed through the exact same threat/decision/AI engines. See [Live Real-Data Mode](#live-real-data-mode). |
| **Analyze a recorded call** | ✅ Real (needs free `GROQ_API_KEY`) | Already recorded a suspicious call? Upload the audio file and it's transcribed with Groq's free-tier Whisper Large v3 Turbo, then run through the exact same threat/decision/AI pipeline as a live session — a real fraud verdict on a call that already ended, not just a live-only feature. |
| **Hindi/Hinglish threat detection** | ✅ Real | The deterministic threat engine's keyword rules include real Hindi/Hinglish/Devanagari phrasing (e.g. "paisa transfer karo", "girftar", "bacha lo") alongside English, since real Indian digital-arrest calls mostly happen in Hindi — not just the English dialogue of the scripted demo scenarios. |
| **Phone number intelligence** | ✅ Real (honest limits below) | Every phone number mentioned in a live session is checked against [CallTracer](https://calltracer.io) (line type + crowd-sourced spam score, zero setup, no key — carrier/name only populate when that exact number is already in its community DB, which is sparse for Indian numbers today) and, if configured, [FraudIntel India](https://www.fraudintel.in)'s crowd-sourced Indian fraud database. **Not** a Truecaller replacement — no free API has Truecaller's ~100M-user proprietary contact graph. |
| **Scam infrastructure tracking** | ✅ Real | Domains/links and raw IPs mentioned in a live session are resolved via real DNS and geolocated via [FreeIPAPI](https://freeipapi.com) — surfaces where the phishing/KYC page is actually hosted. |
| **Deepfake / voice-clone scan** | ✅ Real | Audio/image samples can be scanned via [Reality Defender](https://realitydefender.com)'s public detection API. |
| **Citizen's real location** | ✅ Real | Captured via the browser's native Geolocation API — real GPS coordinates always shown; reverse-geocoded to a city/state name via [BigDataCloud](https://www.bigdatacloud.com) (primary) or OpenStreetMap Nominatim (secondary), both free and keyless. |
| **Verified Officer Registry** | ✅ Real (first-party) | Our own Firebase-backed directory for checking a caller's claimed name/badge — see the honest caveat in that section below. |
| **Chat screenshot analysis** | ✅ Real | Instagram/WhatsApp blackmail and sextortion scams usually leave a chat trail, not a call. Upload a screenshot and the text is extracted entirely on-device via [Tesseract.js](https://github.com/naptha/tesseract.js) OCR (free, no API key, image never leaves the browser for OCR), then the extracted messages run through the exact same threat/decision/AI pipeline as a call. |
| **Real case registry (register → ongoing → completed)** | ✅ Real | Every genuine session (Live Mic Session, recorded-call upload, chat-screenshot analysis) is written to Firebase the instant it starts (`ongoing`) and refreshed the instant it ends (`completed`) — see [Real case lifecycle](#real-case-lifecycle--analytics) below. The scripted demo is intentionally excluded from this registry. |
| **Real audio playback in Historical Cases** | ✅ Real (needs Storage rules, see below) | The actual microphone audio (captured via `MediaRecorder` in parallel with transcription) or the actual uploaded recording file is stored in Firebase Storage and playable from a case's replay view — not just its transcript. |
| PDF investigation report | ✅ Real | Generated client-side with `jsPDF` from the actual case data returned by the backend. |

## Live Real-Data Mode

The scripted scenarios above are a demo of the intelligence pipeline. Alongside them, SentinelX has a **Live Mic Session** mode (Dashboard → Investigation Console → "Live Mic Session" tab) that runs on real data end-to-end:

1. **Real transcription** — the browser's native Web Speech API (Chrome/Edge, zero API key, zero cost) transcribes real speech from your microphone in English or Hindi, live.
2. **Real analysis** — every transcribed line is scored by the exact same deterministic threat engine and OpenRouter AI analyst used in the scripted demo — nothing is duplicated or faked for this mode.
3. **Real phone number intelligence** — every phone number mentioned in the conversation is automatically checked against [CallTracer](https://calltracer.io) (real line-type + spam data, completely free, no signup or key at all — carrier/name fields only return a value when that number is already in CallTracer's own community database, which is thin for Indian numbers right now, so don't expect Truecaller-level name coverage) and, when `FRAUDINTEL_API_KEY` is set, additionally cross-checked against [FraudIntel India](https://www.fraudintel.in)'s live Indian fraud database. Both are shown as independent signals on the fraud graph with real risk scores — VOIP/spoofed lines are flagged explicitly, since caller-ID spoofing is a hallmark of digital-arrest scams.
4. **Real scam-infrastructure tracking (not call tracing)** — any domain/link or raw IP address the caller *mentions* (e.g. a fake "KYC verification" page) is resolved via real DNS and geolocated via [FreeIPAPI](https://freeipapi.com) (free, keyless, HTTPS) to show where that infrastructure is actually hosted. This is deliberately scoped to links/domains only: a normal PSTN/mobile phone call itself carries **no IP address whatsoever** to the receiving handset — that's a telecom-network fact, not a limitation of this app, and no consumer software (including Truecaller) can extract one. The real mechanism for tracing a call's actual origin is the telecom's Call Detail Records (CDR), obtainable only by police/court order — which is exactly what the in-app "Report to Authorities" action is for.
5. **Real location** — the browser's Geolocation API captures your actual device coordinates (with your permission) and drops a real pin on the map. The backend reverse-geocodes those coordinates to a city/state, trying [BigDataCloud](https://www.bigdatacloud.com)'s free, keyless reverse-geocode endpoint first (works fine from cloud/server IPs) and OpenStreetMap Nominatim second; if both are ever unreachable, it falls back to showing the raw lat/lng instead of a place name — the location itself is always real either way, never mocked.
6. **Real deepfake/voice-clone scanning** — you can upload a short audio clip or a screenshot from a video call and have it scanned by [Reality Defender](https://realitydefender.com)'s public API.
7. **Analyze a call you already recorded** — didn't have this open during the call? Upload the recording afterwards (button next to "Start Live Mic Session") and it's transcribed by [Groq](https://console.groq.com)'s free-tier Whisper Large v3 Turbo (needs a free `GROQ_API_KEY`, no card), then replayed line-by-line through the same threat/decision/AI pipeline — you get a real verdict, and the dashboard visibly "replays" the analysis over Socket.IO exactly like a live call.
7. **Analyze a chat/DM screenshot** — Instagram/WhatsApp blackmail scams often leave a chat trail instead of a call. Upload a screenshot and its text is extracted entirely on-device via Tesseract.js OCR (free, no key), then run through the same pipeline.
8. **Verified Officer Registry** — a first-party Firebase directory (Dashboard → "Verify Officer") where departments can register real officers, and anyone can check a caller's claimed name/badge against it.
9. **Report to authorities** — once threat level reaches High/Critical, the Threat Intelligence panel surfaces a prefilled incident summary plus real deep-links to the National Cyber Crime Reporting Portal, DoT's Chakshu, and the 1930 helpline.

**Being honest about limits:** there is no public government API to verify a caller's real identity, confirm a badge number, or detect deepfakes in a live video feed — none of that infrastructure is publicly exposed by anyone, anywhere. The Officer Registry is *our own* data (only as complete as who registers into it), the deepfake scan is a point-in-time audio/image check (not continuous video), and the AI's opinion on a video-call frame's visual consistency is explicitly labeled a heuristic, never an identity check. All of this is deliberately designed to never overstate what it can prove.

All of the above are genuinely free to run — see [Environment variables](#environment-variables) for where to get free-tier keys.

## Real case lifecycle & Analytics

Every genuine session — Live Mic Session, a recorded-call upload, or a chat-screenshot analysis — is a real, persisted **case**, not just a transient socket stream:

1. **Register (ongoing)** — the instant you start a real session, it's written to Firebase (`/caseRegistry/{caseId}`) with `status: "live"` ("ONGOING" in the UI), tagged with its real source (`live-mic` / `recorded-upload` / `screenshot-upload`).
2. **Update (completed)** — the instant the session ends, that same record is refreshed with the final transcript, threat reasons, fraud graph, timeline, and score, and flipped to `status: "resolved"` ("COMPLETED" in the UI).
3. **Real audio/image evidence** — the actual mic recording (captured via `MediaRecorder` alongside transcription) or uploaded audio file, and the actual uploaded chat screenshot, are stored in Firebase Storage and attached to the case as `recordingUrl` / `evidenceImageUrl` — playable/viewable from the case's replay view in Historical Cases.
4. **Real Analytics** — the Analytics page's "Your real cases" section (top of the page) reads this same registry live: total registered, ongoing, completed, high/critical count, and a list of your actual cases — separate from the clearly-labeled simulated national-scale reference charts below it.

The scripted "Play Demo Scenario" is intentionally never written to this registry, so these numbers are never inflated by demo runs.

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
│   ├── ai/              OpenRouter client — real LLM Threat Analyst + visual consistency check
│   ├── intel/            FraudIntel India, CallTracer, IP/domain geolocation, Reality Defender clients
│   ├── engines/          Threat, graph, decision, timeline, report engines (deterministic)
│   ├── authService.ts   Unified Firebase / legacy JWT resolution
│   ├── firebaseAuthService.ts   ID-token verification via public JWKS (no service account)
│   ├── caseBuilder.ts   Converts scenario scripts into timed transcript lines
│   ├── simulationEngine.ts      Orchestrates scripted playback over Socket.IO
│   └── liveSessionEngine.ts     Orchestrates a real live mic session over Socket.IO
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
│   ├── live/             Live Mic Session controls (real Web Speech API + geolocation)
│   ├── map/             India hotspot map (Leaflet)
│   ├── notifications/   Toasts + notification center + Firebase RTDB sync
│   ├── replay/          Investigation replay timeline, case history, system logs
│   ├── report/          PDF report generation + real Report-to-Authorities deep links
│   ├── threat/          Threat gauge, decision card, AI Analyst card
│   └── transcript/      Live transcript feed
├── hooks/                Thin context accessors (useAuth, useSocket, useLiveCase, useWebSpeechRecognition, ...)
├── pages/                Route-level pages (Landing, Login, Signup, Dashboard, Analytics, Settings, OfficerRegistry)
├── services/             API clients, Firebase client, Socket.IO client, officer registry
├── utils/                geolocation.ts (real browser GPS) + other helpers
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

A few manual steps are required in the [Firebase console](https://console.firebase.google.com/) for your project:

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
    },
    "officerRegistry": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "caseRegistry": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

This lets any signed-in user manage their own profile (`/users/{uid}` — name, role, organization), lets all signed-in clients read/write the shared live notification feed (`/liveActivity/notifications`) so notifications sync in real time across every open browser tab/device independent of the Socket.IO connection, lets signed-in users read/register into the Verified Officer Registry (`/officerRegistry`), and lets signed-in users read/write the **real case registry** (`/caseRegistry`) — every genuine Live Mic Session, recorded-call upload, and chat-screenshot analysis this device runs, tracked as "ongoing" then "completed" and feeding the real numbers on the Analytics and Historical Cases pages. In production, writes to `officerRegistry`/`caseRegistry` would be scoped per-organization — this open rule is a hackathon simplification.

3. **Storage → Rules** → publish (only needed for real audio recording / chat-screenshot playback in Historical Cases — everything else works without this):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recordings/{fileName} {
      allow read, write: if request.auth != null;
    }
    match /evidence/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

This lets any signed-in user upload/play back the actual audio file behind a Live Mic Session or recorded-call analysis (`/recordings/{caseId}.webm`), and the actual chat screenshot behind a screenshot analysis (`/evidence/{caseId}.jpg`). Without this rule, cases still register and score correctly — you just won't get real audio/image playback in Historical Cases.

> If Firebase env vars are left blank, the app transparently falls back to legacy mock-JWT demo accounts (see `backend/src/data/mockUsers.ts`) so it still runs out of the box.

## OpenRouter AI Threat Analyst

Set `OPENROUTER_API_KEY` in `backend/.env` to enable a genuine LLM-backed second opinion during live simulations and live mic sessions. It fires at every threat-level escalation and once more at case resolution, given the transcript so far, and returns its own score/level/summary/key-indicators — entirely independent of the rule engine. It also powers the heuristic visual-consistency check on video-call frames.

`OPENROUTER_MODEL` and `OPENROUTER_VISION_MODEL` default to genuinely free (`:free`) OpenRouter models, so running the AI analyst costs **$0**. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).

It's entirely server-side; the key is never sent to the browser. Without a key, everything runs identically minus the AI-generated cards.

**Free-tier honesty:** OpenRouter's `:free` models are rate-limited (shared capacity, roughly ~20 requests/min and a small daily cap per key). Verified end-to-end against a live backend: on a fast escalation (multiple threat-level jumps within seconds), you may occasionally see a request get rate-limited (`429`) and that one AI card simply doesn't appear — logged plainly in the backend console, never surfaced as a fake result. The rule-engine score/level/decision is never affected, since it doesn't depend on the AI call at all.

## Environment variables

All of the third-party services below have genuinely free tiers — no payment info required to run this project.

**`backend/.env`**

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `4000` | Backend HTTP/WebSocket port |
| `CLIENT_ORIGIN` | No | `http://localhost:5173,http://localhost:5174` | Comma-separated allowed CORS origins (any `localhost:*` is also allowed in dev) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | No | dev defaults | Legacy mock-auth fallback, used only when Firebase isn't configured |
| `FIREBASE_PROJECT_ID` | No | — | Enables real Firebase Authentication |
| `FIREBASE_DATABASE_URL` | No | — | Enables Realtime Database profile/notification/officer-registry reads |
| `OPENROUTER_API_KEY` | No | — | Enables the real AI Threat Analyst + visual consistency check. Get one free at [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | No | `google/gemma-4-31b-it:free` | Any [OpenRouter](https://openrouter.ai/models) chat model slug — defaults to a free one (verified live against OpenRouter's `/models` endpoint) |
| `OPENROUTER_VISION_MODEL` | No | `nvidia/nemotron-nano-12b-v2-vl:free` | Vision-capable model for the frame consistency check — defaults to a free one |
| `FRAUDINTEL_API_KEY` | No | — | Real Indian fraud-entity lookups during live sessions. Free "Developer" tier: 100 API calls/day, forever free, no card. Sign up at [fraudintel.in](https://www.fraudintel.in) → "Get Free Access" |
| `REALITYDEFENDER_API_KEY` | No | — | Real deepfake/voice-clone detection. Free tier: 50 scans/month, no card. Sign up at [realitydefender.com/api](https://realitydefender.com/api) → generate a key at [app.realitydefender.ai](https://app.realitydefender.ai) under Settings → API Keys |

The Live Mic Session's speech-to-text, the citizen's real GPS location, phone-number carrier/spam checks (CallTracer), scam-infrastructure IP/domain lookups (FreeIPAPI), and reverse geocoding (BigDataCloud) all need **no API key at all** — `FRAUDINTEL_API_KEY` and `REALITYDEFENDER_API_KEY` are the only two optional keys that unlock additional signals on top of what already runs for free.

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
| `live:start` | — | Starts a **real** live mic session (new case, real transcript source) |
| `live:line` | `{ text, speaker }` | Submits one real transcribed line from the browser's Web Speech API |
| `live:location` | `{ lat, lng }` | Submits the citizen's real device GPS coordinates |
| `live:mediaCheck` | `{ mediaBase64, mediaType, fileName }` | Submits an audio/image sample for a real Reality Defender deepfake scan |
| `live:end` | — | Ends the live session and archives the case |

**Server → Client**

| Event | Description |
|---|---|
| `case:start` / `case:end` | Case lifecycle (scripted or live) |
| `transcript:line` | One new line of the call transcript |
| `threat:update` | New score, level, and explainable reasons |
| `graph:update` | Fraud network graph nodes/edges as evidence is revealed |
| `map:ping` | Geolocation ping for the live map (scripted city, or real GPS in a live session) |
| `timeline:event` | Investigation timeline entry |
| `decision:update` | Recommended actions for the current threat level |
| `notification:new` | Escalation/resolution notification |
| `ai:insight` | **Real** OpenRouter LLM assessment (score, level, summary, key indicators, agree/diverge flag) |
| `intel:entityResult` | **Real** FraudIntel India lookup result for a phone number/UPI ID mentioned live |
| `intel:deepfakeResult` | **Real** Reality Defender deepfake/voice-clone scan result |
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

This is a hackathon prototype. The scripted scenarios are mock data — no real citizen data, telephony, or surveillance feeds are processed or stored by them. The **Live Mic Session** mode processes real audio you choose to capture through your own browser/microphone, transcribed locally by the browser and sent only to your own backend instance — nothing is sent to us or stored beyond your own deployment. Authentication, realtime sync, the AI Threat Analyst, FraudIntel India lookups, Reality Defender scans, and the Verified Officer Registry are real integrations layered on top. None of them constitute access to any government identity, telecom, or law-enforcement database — no such public API exists, and this project does not claim otherwise anywhere in its UI. Investigation reports are generated for demonstration purposes only and are not admissible as evidence.

## License

MIT — see [LICENSE](./LICENSE).
