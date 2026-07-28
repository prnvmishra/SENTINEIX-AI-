# SentinelX AI — Backend

Express + TypeScript + Socket.IO service for **SentinelX AI** (NFIP): REST APIs, live/recorded session engines, Groq Whisper STT, OpenRouter/Groq AI, and intel clients.

> Full setup, env vars, Firebase rules, and architecture: **[root README](../README.md)**.

## Quick start

```bash
npm install
cp .env.example .env   # set GROQ_API_KEY for recorded-call analysis
npm run dev            # http://localhost:4000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | `tsx watch` (auto-reload) |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run production build |
| `npm run typecheck` | Type-check only |

## Notable modules

| Path | Role |
|---|---|
| `src/services/liveSessionEngine.ts` | Live mic + recorded + screenshot analysis orchestration |
| `src/services/intel/groqTranscriptionClient.ts` | Whisper STT |
| `src/services/intel/audioChunker.ts` | ffmpeg-static chunking for long audio |
| `src/services/intel/transcriptNormalizer.ts` | Latin / Roman Hinglish normalization |
| `src/services/intel/conversationTurns.ts` | Scammer/victim labeling via Groq |
| `src/services/ai/openRouterClient.ts` | Threat analyst, advisor, diarization entry |
| `src/services/simulationEngine.ts` | Scripted Play Demo scenarios |
