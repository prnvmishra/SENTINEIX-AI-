# SentinelX AI — Frontend

React 19 + Vite + Tailwind v4 dashboard and landing site for **SentinelX AI** (NFIP).

> Full setup, env vars, Firebase rules, and architecture: **[root README](../README.md)**.

## Quick start

```bash
npm install
cp .env.example .env   # Firebase + optional EmailJS
npm run dev            # http://localhost:5173 (port auto-shifts if busy)
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve production build |
| `npm run lint` | oxlint |
| `npm run typecheck` | Type-check only |

## Notable areas

| Path | Role |
|---|---|
| `src/features/live/LiveSessionControls.tsx` | Live mic, recording upload, screenshot OCR |
| `src/features/dashboard/` | Header (ported user menu), grid |
| `src/pages/CasesPage.tsx` / `AdminPage.tsx` | Case registry + admin roster |
| `src/services/emailjs.ts` | Landing contact form |
| `src/utils/caseAccess.ts` | Owner / admin permissions |
| `src/features/landing/HeroCanvas.tsx` | Interactive landing hero |
