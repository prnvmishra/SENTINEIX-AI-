<div align="center">

# SentinelX AI

### National Fraud Intelligence Platform (NFIP)

**From Detection to Decision Intelligence**

Real-time detection, investigation, and response for Digital Arrest and related cyber-fraud — built for Cyber Crime Cells, banks, telecom operators, government agencies, and citizens.

[![Node](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20RTDB%20%2B%20Storage-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Groq](https://img.shields.io/badge/STT-Groq%20Whisper-F55036)](https://console.groq.com)
[![License](https://img.shields.io/badge/License-MIT-informational)](#license)

**Repo:** [github.com/prnvmishra/SENTINEIX-AI-](https://github.com/prnvmishra/SENTINEIX-AI-)  
**Live app:** [sentinelx-ai-xi.vercel.app](https://sentinelx-ai-xi.vercel.app)  
**API health:** [sentinelx-backend-hdj5.onrender.com/api/health](https://sentinelx-backend-hdj5.onrender.com/api/health)

**Built by [Pranav Mishra](https://github.com/prnvmishra)** · Contact: [saharaaindiaaa@gmail.com](mailto:saharaaindiaaa@gmail.com)

> **Note for judges / recruiters:** the backend runs on Render’s free tier and may take **~30–60 seconds** to wake on the first request after idle. Refresh once if the dashboard shows a feed connection error.

</div>

---

## Table of contents

- [What is SentinelX AI?](#what-is-sentinelx-ai)
- [Live demo](#live-demo)
- [What's real vs simulated](#whats-real-vs-simulated)
- [Quick start](#quick-start)
- [Deployment](#deployment)
- [Core capabilities](#core-capabilities)
- [Recorded-call analysis pipeline](#recorded-call-analysis-pipeline)
- [Access control](#access-control)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Monorepo layout](#monorepo-layout)
- [Firebase setup](#firebase-setup)
- [Environment variables](#environment-variables)
- [API & Socket.IO](#api--socketio)
- [Demo scenarios](#demo-scenarios)
- [Scripts](#scripts)
- [Disclaimer](#disclaimer)
- [Author](#author)
- [License](#license)

---

## What is SentinelX AI?

**Digital Arrest** scams are a fast-growing fraud pattern in India: a caller impersonates police, CBI/ED/RBI/Customs, or bank staff, isolates the victim (often on video), and pressures them into transferring money under threat of arrest.

SentinelX AI is a hackathon-built **command-center platform** that:

1. Ingests a **live mic session**, an **uploaded recording**, or a **chat screenshot**
2. Scores fraud risk in real time (explainable rules + LLM second opinion)
3. Labels **scammer vs victim** lines with a real model (not a canned script)
4. Maps geography, fraud graph, and recommended actions
5. Lets officers **register / complete cases**, export a PDF report, and escalate via real authority deep-links

---

## Live demo

| Surface | URL |
|---|---|
| Frontend (Vercel) | https://sentinelx-ai-xi.vercel.app |
| Backend health (Render) | https://sentinelx-backend-hdj5.onrender.com/api/health |
| Source | https://github.com/prnvmishra/SENTINEIX-AI- |

**Stack in production**

- **Frontend** → Vercel (`frontend/` Vite app)
- **Backend** → Render Web Service (`backend/` Express + Socket.IO)
- **Data / auth** → Firebase Auth, Realtime Database, Storage

**Cold start:** after ~15 minutes idle, Render free instances sleep. The next hit wakes the API (typically 30–60s). Sleeping does **not** delete the service; free instance hours reset each calendar month. Optional uptime pings can reduce sleep but consume free hours faster — leave them off unless you need an always-warm demo window.

---

## What's real vs simulated

| Layer | Status | Notes |
|---|---|---|
| **Play Demo** scenarios | Simulated | 4 scripted Digital Arrest calls streamed over Socket.IO — for pipeline demos only; **not** written to the real case registry |
| Threat rule engine | Real (deterministic) | Weighted English + Hindi/Hinglish keywords with explainable reasons |
| **Live Mic Session** | Real | Browser Web Speech API → same engines as demo |
| **Recorded-call upload** | Real | Groq Whisper STT + chunking + Roman Hinglish normalize + AI speaker labels |
| **Chat screenshot** | Real | On-device Tesseract.js OCR → same analysis pipeline |
| Auth / RTDB / Storage | Real | Firebase (when configured) |
| AI Threat Analyst | Real | OpenRouter (free models) with **Groq fallback** when OpenRouter quota is exhausted |
| Speaker (scammer/victim) labels | Real | OpenRouter → Groq; if both fail → `UNKNOWN` (no fake heuristic labels) |
| Investigation Advisor chat | Real | OpenRouter → Groq; if both fail → honest “unavailable” (no canned advice) |
| Phone / UPI / domain intel | Real | CallTracer, FraudIntel (optional key), FreeIPAPI |
| Deepfake scan | Real | Reality Defender (optional key) |
| Contact form | Real | EmailJS (optional keys in frontend `.env`) |
| Case registry + Analytics | Real | Firebase `caseRegistry` for live/recorded/screenshot sessions |
| PDF report | Real | Client-side jsPDF from actual case data |

---

## Quick start

Requires **Node.js 20+**.

```bash
git clone https://github.com/prnvmishra/SENTINEIX-AI-.git
cd SENTINEIX-AI-

npm run install:all

# Backend
cp backend/.env.example backend/.env
# Set at least GROQ_API_KEY for recorded-call analysis (free: https://console.groq.com/keys)

# Frontend
cp frontend/.env.example frontend/.env
# Add Firebase web config for real auth; leave blank for demo JWT login

npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173) (auto-shifts port if busy)
- Backend: [http://localhost:4000](http://localhost:4000)

---

## Deployment

### Render (backend)

1. New **Web Service** → this repo → **Root Directory** `backend`
2. **Build:** `npm install --include=dev && npm run build`
3. **Start:** `npm start`
4. Set env from `backend/.env.example` (see table below)
5. Set `CLIENT_ORIGIN` to your Vercel URL (e.g. `https://sentinelx-ai-xi.vercel.app`) — required for CORS / Socket.IO
6. Do **not** set `PORT` manually (Render injects it)

Blueprint helper: [`render.yaml`](./render.yaml)

### Vercel (frontend)

1. Import this repo → **Root Directory** `frontend`
2. Framework: Vite
3. Env: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `VITE_FIREBASE_*`, optional `VITE_EMAILJS_*`
4. For this deployment:
   - `VITE_API_BASE_URL=https://sentinelx-backend-hdj5.onrender.com/api`
   - `VITE_SOCKET_URL=https://sentinelx-backend-hdj5.onrender.com`

SPA rewrite: [`frontend/vercel.json`](./frontend/vercel.json)

### After deploy

1. Firebase **Authentication → Authorized domains** → add your Vercel host
2. Publish RTDB / Storage rules from `firebase/`
3. Confirm `GET /api/health` returns `"status":"ok"`

---

## Core capabilities

### Investigation console

- **Live Mic** — English + Hinglish (Roman) or Hindi (Devanagari) via Web Speech API
- **Upload recording** — full-call Whisper transcription (chunked), Latin English/Hinglish transcript, per-line scammer/victim labels
- **Upload chat screenshot** — on-device OCR for WhatsApp/Instagram-style blackmail threads
- **Play Demo** — scripted scenario playback (demo only)

### Dashboard panels

- Live transcript with speaker badges (`SCAMMER` / `VICTIM` / `UNKNOWN`)
- Threat gauge + explainable signals + decision checklist
- India geospatial map + fraud network graph
- Historical cases with audio/screenshot evidence playback
- Investigation Advisor chat (live case context)

### Ops & access

- **Cases** — register ongoing / mark complete (owner-only complete; admin-only delete)
- **Admin** — gov admin roster, role grants, single admin-claim lock
- **Verify** — first-party officer registry
- **Analytics** — real case stats from Firebase + reference charts
- **Settings** — profile / account
- Landing **Contact** form via EmailJS

---

## Recorded-call analysis pipeline

```text
Audio upload
  → ffmpeg-static normalize (16 kHz mono WAV)
  → split long calls into ~40s overlapping chunks
  → Groq whisper-large-v3 (no instructional prompt — avoids fake echo lines)
  → keep Whisper timed segments (not one merged blob)
  → romanize Urdu/Devanagari → Latin Hinglish (English stays English)
  → Groq speaker labeling (full-call pass; examples for “I have to pay” = victim)
  → threat / decision / AI analyst over Socket.IO
  → optional Firebase Storage evidence + case registry
```

**Language modes (upload UI):** Auto (EN + Hinglish) · Hinglish (Roman) · English only  

**Honesty:** if speaker AI is down, lines show `UNKNOWN` — the app does **not** invent scammer/victim labels.

---

## Access control

| Action | Who |
|---|---|
| Register / update own case | Signed-in user who registered it (`registeredByUid`) |
| Mark Complete | Case owner only |
| Delete case | `gov_admin` only |
| Claim first gov admin | First claimant writes `system/govAdminUid` (lock) |
| Grant further admins | Existing `gov_admin` via Admin page |

Publish the rules in [`firebase/database.rules.json`](./firebase/database.rules.json) and [`firebase/storage.rules`](./firebase/storage.rules) from the Firebase Console.

---

## Architecture

```text
┌──────────────────────────┐     REST + Socket.IO      ┌───────────────────────────┐
│  React 19 + Vite SPA     │ ◀───────────────────────▶ │  Express + TypeScript     │
│  frontend/               │                           │  backend/                 │
└────────────┬─────────────┘                           └─────────────┬─────────────┘
             │ Firebase Auth / RTDB / Storage                         │
             ▼                                                        ▼
     Firebase project                                      Groq Whisper + Groq LLM
                                                           OpenRouter (optional)
                                                           FraudIntel / Reality Defender
                                                           CallTracer / FreeIPAPI (keyless)
```

Shared TypeScript contracts live in `shared/types`.

---

## Tech stack

| Area | Stack |
|---|---|
| Frontend | React 19 · Vite · Tailwind CSS v4 · Framer Motion · React Router 7 · React Flow · Leaflet · Recharts · Socket.IO client · Firebase · jsPDF · Tesseract.js · EmailJS |
| Backend | Node · Express · TypeScript · Socket.IO · jose · ffmpeg-static · Groq · OpenRouter |
| Shared | Domain + Socket.IO event types |

---

## Monorepo layout

```text
/
├── frontend/     Dashboard, landing, auth, cases, admin (+ vercel.json)
├── backend/      REST, Socket.IO, engines, STT, AI, intel clients
├── shared/       Shared TypeScript types
├── firebase/     database.rules.json + storage.rules (publish in Console)
├── render.yaml   Render backend blueprint
├── README.md
└── package.json  Root scripts (concurrently)
```

<details>
<summary><strong>Backend services (high level)</strong></summary>

```text
backend/src/services/
├── ai/                 OpenRouter + Groq advisor / threat / speaker labeling
├── intel/              Whisper STT, audio chunker, transcript normalizer,
│                       conversation turns, FraudIntel, CallTracer, Reality Defender, IP geo
├── engines/            Threat, graph, decision, speaker heuristic (legacy unused for uploads)
├── liveSessionEngine.ts
└── simulationEngine.ts
```

</details>

---

## Firebase setup

1. Enable **Email/Password** in Authentication.
2. **Realtime Database → Rules** → paste and Publish [`firebase/database.rules.json`](./firebase/database.rules.json).
3. **Storage → Rules** → paste and Publish [`firebase/storage.rules`](./firebase/storage.rules) (needed for playable recordings / screenshots in Historical Cases).

Without Firebase env vars, the app falls back to legacy demo JWT accounts in `backend/src/data/mockUsers.ts`.

---

## Environment variables

### `backend/.env`

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No (`4000`) | HTTP + Socket.IO |
| `CLIENT_ORIGIN` | **Yes in prod** | CORS allowlist — production Vercel origin (comma-separated OK). Any `localhost:*` allowed in non-production |
| `JWT_SECRET` | No | Legacy demo auth only |
| `FIREBASE_PROJECT_ID` / `FIREBASE_DATABASE_URL` | No | Real Firebase auth + RTDB |
| `OPENROUTER_API_KEY` | No | AI Threat Analyst + vision (free `:free` models) |
| `OPENROUTER_MODEL` / `OPENROUTER_VISION_MODEL` | No | Override defaults |
| `GROQ_API_KEY` | **Recommended** | Recorded-call Whisper STT, romanization, speaker labels, AI fallback |
| `FRAUDINTEL_API_KEY` | No | Indian fraud entity lookups |
| `REALITYDEFENDER_API_KEY` | No | Deepfake / voice-clone scans |

Get a free Groq key: [console.groq.com/keys](https://console.groq.com/keys)  
Get a free OpenRouter key: [openrouter.ai/keys](https://openrouter.ai/keys)

### `frontend/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` / `VITE_SOCKET_URL` | Backend URLs |
| `VITE_FIREBASE_*` | Firebase web config |
| `VITE_EMAILJS_SERVICE_ID` / `TEMPLATE_ID` / `PUBLIC_KEY` | Landing contact form |
| `VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID` | Optional auto-reply template |

Templates: `backend/.env.example`, `frontend/.env.example`.

---

## API & Socket.IO

### REST (`/api`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Status + Firebase / AI flags |
| `POST` | `/auth/login` | Legacy demo login |
| `GET` | `/auth/me` | Current user |
| `GET` | `/cases` · `/cases/:id` · `/cases/:id/report` | Mock historical cases / report payload |
| `GET` | `/analytics/overview` | Reference analytics |
| `GET` | `/notifications` | Seed notifications |
| `GET` | `/geo/hotspots` | India hotspots |
| `POST` | `/analysis/recording` | Upload audio (base64) → STT + analysis |
| `POST` | `/analysis/text` | Screenshot OCR lines → analysis |
| `POST` | `/analysis/advisor-chat` | Investigation advisor |
| `GET` | `/analysis/ai-status` | OpenRouter quota / enabled flags |

Authenticated routes expect `Authorization: Bearer <token>`.

### Socket.IO (selected)

**Client → server:** `simulation:start|stop|pause|resume`, `live:start`, `live:line`, `live:location`, `live:mediaCheck`, `live:end`  

**Server → client:** `case:start|end`, `transcript:line`, `threat:update`, `graph:update`, `map:ping`, `decision:update`, `ai:insight`, `intel:entityResult`, `intel:deepfakeResult`, `notification:new`, `log:entry`

---

## Demo scenarios

| Scenario | Authority | Location |
|---|---|---|
| Fake CBI Digital Arrest — Parcel Narcotics | CBI | Lucknow, UP |
| Fake Customs — Illegal Export | Customs | Bengaluru, KA |
| Fake Income Tax / ED — Money Laundering | IT / ED | Jaipur, RJ |
| Fake RBI Compliance — Account Freeze | RBI | Pune, MH |

---

## Scripts

From repo root:

| Command | Description |
|---|---|
| `npm run install:all` | Install frontend + backend deps |
| `npm run dev` | Backend + frontend together |
| `npm run dev:backend` / `dev:frontend` | One side only |
| `npm run build` | Production build both |
| `npm run typecheck` | Type-check both |

---

## Disclaimer

Hackathon prototype. Scripted demos use mock dialogue only. Live Mic / upload / screenshot modes process data **you** provide on **your** deployment. This project does **not** access government identity, telecom CDR, or law-enforcement databases — no such public APIs exist, and the UI does not claim otherwise. PDF reports are for demonstration and human review, not courtroom evidence.

Demo stack: Firebase Auth/RTDB/Storage, Socket.IO live analysis, OpenRouter/Groq AI, and EmailJS contact delivery. **Not a production government system.**

---

## Author

**Pranav Mishra** — [GitHub](https://github.com/prnvmishra) · [saharaaindiaaa@gmail.com](mailto:saharaaindiaaa@gmail.com)

---

## License

MIT — see [LICENSE](./LICENSE).
