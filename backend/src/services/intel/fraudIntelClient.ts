import { v4 as uuid } from "uuid";
import type { EntityIntelResult, EntityRiskLevel, EntityType } from "@shared/types";
import { env } from "../../utils/env.js";

const BASE_URL = "https://www.fraudintel.in";
const REQUEST_TIMEOUT_MS = 8000;
const VALID_RISK_LEVELS: EntityRiskLevel[] = ["HIGH", "MEDIUM", "LOW", "CLEAN"];

interface FraudIntelCheckResponse {
  risk?: string;
  score?: number;
  times_reported?: number;
  signals?: string[];
  recommendation?: string;
}

export function isFraudIntelEnabled(): boolean {
  return Boolean(env.fraudIntelApiKey);
}

function coerceRisk(value: string | undefined): EntityRiskLevel {
  return value && VALID_RISK_LEVELS.includes(value as EntityRiskLevel) ? (value as EntityRiskLevel) : "UNKNOWN";
}

/**
 * Checks a phone number / UPI ID / free-text snippet against FraudIntel
 * India's real, live, crowd-sourced Indian fraud database
 * (https://www.fraudintel.in) — genuine third-party signal, not a mock.
 *
 * It is a young, community-reported dataset (a few thousand entities as of
 * writing), so results are surfaced as ONE signal among several, never as
 * sole grounds for action. Fails gracefully (returns null) with no API key,
 * network error, or non-2xx response so a live session never breaks because
 * of a third-party outage or an exhausted free-tier daily quota.
 */
export async function checkEntityAgainstFraudIntel(
  caseId: string,
  entity: string,
  entityType: EntityType,
): Promise<EntityIntelResult | null> {
  if (!isFraudIntelEnabled()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const endpoint = entityType === "text" ? "/v1/analyze" : "/v1/check-entity";
    const url =
      entityType === "text"
        ? `${BASE_URL}${endpoint}`
        : `${BASE_URL}${endpoint}?q=${encodeURIComponent(entity)}`;

    const response = await fetch(url, {
      method: entityType === "text" ? "POST" : "GET",
      signal: controller.signal,
      headers: {
        "X-API-Key": env.fraudIntelApiKey ?? "",
        "Content-Type": "application/json",
      },
      body: entityType === "text" ? JSON.stringify({ text: entity }) : undefined,
    });

    if (!response.ok) {
      console.warn(`[fraudintel] request failed with status ${response.status}`);
      return null;
    }

    const data = (await response.json()) as FraudIntelCheckResponse;

    return {
      id: uuid(),
      caseId,
      entity,
      entityType,
      risk: coerceRisk(data.risk),
      score: typeof data.score === "number" ? data.score : 0,
      timesReported: typeof data.times_reported === "number" ? data.times_reported : 0,
      signals: Array.isArray(data.signals) ? data.signals : [],
      recommendation: data.recommendation ?? "No recommendation returned.",
      source: "FraudIntel India",
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[fraudintel] lookup failed:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
