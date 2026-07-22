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
  openRouterModel: optional("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini",
} as const;
