# SentinelX AI — Backend

Node.js + Express + TypeScript + Socket.IO service powering **SentinelX AI**: REST APIs, the real-time simulation engine, the deterministic threat/graph/decision engines, Firebase ID-token verification, and the OpenRouter-backed AI Threat Analyst.

> For the full project overview, architecture, environment variables, API reference, and Firebase/OpenRouter setup, see the [root README](../README.md).

## Quick start

```bash
npm install
cp .env.example .env   # fill in Firebase / OpenRouter values if you want the real integrations
npm run dev             # http://localhost:4000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the server with `tsx watch` (auto-restart on change) |
| `npm run build` | Compile TypeScript to `dist/` (with path alias rewriting) |
| `npm run start` | Run the compiled production build |
| `npm run typecheck` | Type-check without emitting output |

## Structure

See the [directory tree in the root README](../README.md#monorepo-layout) for a full breakdown of `src/controllers`, `src/data`, `src/services/ai`, `src/services/engines`, `src/socket`, and `src/utils`.
