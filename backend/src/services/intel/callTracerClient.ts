import { v4 as uuid } from "uuid";
import type { EntityIntelResult, EntityRiskLevel } from "@shared/types";

const REQUEST_TIMEOUT_MS = 6000;

interface CallTracerResponse {
  number_type?: string;
  carrier?: string | null;
  location?: string | null;
  is_valid?: boolean;
  reports?: {
    total?: number;
    spam_score?: number;
    last_reported_at?: string | null;
  };
}

function scoreToRisk(spamScore: number, reportCount: number): EntityRiskLevel {
  if (spamScore >= 60 || reportCount >= 5) return "HIGH";
  if (spamScore >= 25 || reportCount >= 1) return "MEDIUM";
  return "LOW";
}

/**
 * CallTracer requires the full E.164-style number (country code included) —
 * a bare 10-digit Indian mobile number gets rejected with a 422 "Invalid or
 * unrecognized phone number" error, which previously looked identical to "no
 * data found" from the caller's point of view. Normalize common Indian input
 * shapes (10-digit, leading-0, leading-91, leading-+91) to a single
 * "91XXXXXXXXXX" form before calling the API.
 */
function normalizeIndianNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/[^\d]/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

/**
 * Checks a phone number against CallTracer (https://calltracer.io) — a
 * genuinely free, zero-signup, no-API-key REST lookup that returns carrier,
 * line type (mobile/landline/VOIP/toll-free), and a crowd-sourced spam score.
 *
 * This runs for EVERY phone number mentioned in a live session, with no
 * setup required, and complements FraudIntel India's fraud-specific database
 * when that optional key is configured. VOIP/spoofed lines are a strong
 * signal in digital-arrest scams, where callers frequently spoof caller ID.
 *
 * Rate-limited to 10 requests/minute per IP by CallTracer — fine for the
 * handful of entities mentioned per live call. Fails gracefully (returns
 * null) on any error so a live session is never blocked.
 */
export async function checkPhoneAgainstCallTracer(
  caseId: string,
  phoneNumber: string,
): Promise<EntityIntelResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const digits = normalizeIndianNumber(phoneNumber);
    const response = await fetch(`https://calltracer.io/api/lookup/${digits}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(`[calltracer] request failed with status ${response.status} for "${digits}": ${body}`);
      return null;
    }

    const data = (await response.json()) as CallTracerResponse;
    const spamScore = data.reports?.spam_score ?? 0;
    const reportCount = data.reports?.total ?? 0;
    const lineType = data.number_type ?? "Unknown";
    const isVoip = lineType.toLowerCase().includes("voip");

    const signals: string[] = [`Line type: ${lineType}`];
    if (isVoip) signals.push("VOIP line — commonly used to spoof caller ID in digital-arrest scams");
    if (data.carrier) signals.push(`Carrier: ${data.carrier}`);
    if (data.location) signals.push(`Registered location: ${data.location}`);
    if (reportCount > 0) signals.push(`${reportCount} community spam report(s)`);
    if (data.is_valid === false) signals.push("Number failed basic validity check");

    const risk = scoreToRisk(spamScore, reportCount);

    return {
      id: uuid(),
      caseId,
      entity: phoneNumber,
      entityType: "phone",
      risk,
      score: spamScore / 100,
      timesReported: reportCount,
      signals,
      recommendation:
        risk === "HIGH"
          ? "Multiple spam reports and/or high spam score — treat as a known scam number."
          : isVoip
            ? "VOIP line — verify identity through an independent, official channel before trusting this call."
            : "No strong spam signal yet — corroborate with other evidence before acting.",
      source: "CallTracer",
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[calltracer] lookup failed:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
