import { config } from "dotenv";

config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

const rawClientOrigins = required("CLIENT_ORIGIN", "http://localhost:5173");
const clientOrigins = rawClientOrigins.split(",").map((origin) => origin.trim());
const isLocalDevPort = /^http:\/\/localhost:\d+$/;

export const env = {
  port: Number(required("PORT", "4000")),
  clientOrigins,
  /**
   * Vite falls back to another port (5174, 5175, ...) whenever the configured
   * dev port is already taken by another local project, so in development we
   * accept any localhost port instead of hard-failing CORS on a mismatch.
   */
  isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    if (clientOrigins.includes(origin)) return true;
    if (process.env.NODE_ENV !== "production" && isLocalDevPort.test(origin)) return true;
    return false;
  },
  jwtSecret: required("JWT_SECRET", "sentinelx-dev-secret-change-me"),
  jwtExpiresIn: required("JWT_EXPIRES_IN", "8h"),
  firebaseProjectId: optional("FIREBASE_PROJECT_ID"),
  firebaseDatabaseUrl: optional("FIREBASE_DATABASE_URL"),
  openRouterApiKey: optional("OPENROUTER_API_KEY"),
  // Defaults to a genuinely free (:free) OpenRouter model so the AI analyst
  // costs $0 to run out of the box. Verified live against
  // https://openrouter.ai/api/v1/models — override with a paid model if desired.
  openRouterModel: optional("OPENROUTER_MODEL") ?? "google/gemma-4-31b-it:free",
  openRouterVisionModel: optional("OPENROUTER_VISION_MODEL") ?? "nvidia/nemotron-nano-12b-v2-vl:free",
  // FraudIntel India — real crowd-sourced Indian fraud intelligence DB
  // (phone/UPI/text lookups). Free "Developer" tier: 100 API calls/day,
  // forever free, no card required. https://www.fraudintel.in
  fraudIntelApiKey: optional("FRAUDINTEL_API_KEY"),
  // Reality Defender — real deepfake/voice-clone detection API. Free tier:
  // 50 scans/month, audio + image. https://realitydefender.com/api
  realityDefenderApiKey: optional("REALITYDEFENDER_API_KEY"),
  // Groq — free, keyless-signup Whisper speech-to-text for transcribing a
  // previously RECORDED call (as opposed to the Live Mic Session, which
  // transcribes a live browser mic feed via the Web Speech API). Free tier:
  // no card, 20 req/min, 2,000 req/day, 8 hours of audio/day, 25MB/file.
  // https://console.groq.com/keys
  groqApiKey: optional("GROQ_API_KEY"),
} as const;
