import { v4 as uuid } from "uuid";
import type { DeepfakeCheckResult, DeepfakeStatus } from "@shared/types";
import { env } from "../../utils/env.js";

const API_BASE = "https://api.prd.realitydefender.xyz/api";
const POLL_INTERVAL_MS = 1200;
const MAX_POLL_ATTEMPTS = 8;
const REQUEST_TIMEOUT_MS = 10000;

const FINAL_STATUSES = new Set(["AUTHENTIC", "FAKE", "SUSPICIOUS", "NOT_APPLICABLE", "UNABLE_TO_EVALUATE"]);

interface PresignedResponse {
  response?: { signedUrl?: string; requestId?: string };
  requestId?: string;
}

interface MediaDetailResponse {
  resultsSummary?: {
    status?: string;
    metadata?: { finalScore?: number };
  };
}

export function isDeepfakeDetectionEnabled(): boolean {
  return Boolean(env.realityDefenderApiKey);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Runs a real deepfake / voice-clone authenticity check via Reality
 * Defender's public API (https://docs.realitydefender.com) — free tier: 50
 * scans/month, audio + image (video is enterprise-only as of writing, so
 * live sessions submit periodic audio snippets or video-frame snapshots
 * rather than a continuous video stream).
 *
 * Flow: request a presigned upload URL -> PUT the raw bytes -> poll the
 * result endpoint until Reality Defender's ensemble finishes scoring.
 * Fails gracefully (returns null) on any error, missing key, or timeout so
 * a live session is never blocked by a third-party outage or exhausted
 * free-tier quota.
 */
export async function checkMediaForDeepfake(
  caseId: string,
  mediaBase64: string,
  mediaType: "audio" | "image",
  fileName: string,
): Promise<DeepfakeCheckResult | null> {
  if (!isDeepfakeDetectionEnabled()) return null;

  try {
    const presignedRes = await fetchWithTimeout(`${API_BASE}/files/aws-presigned`, {
      method: "POST",
      headers: { "X-API-KEY": env.realityDefenderApiKey ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({ fileName }),
    });
    if (!presignedRes.ok) {
      console.warn(`[reality-defender] presign failed with status ${presignedRes.status}`);
      return null;
    }
    const presigned = (await presignedRes.json()) as PresignedResponse;
    const signedUrl = presigned.response?.signedUrl;
    const requestId = presigned.response?.requestId ?? presigned.requestId;
    if (!signedUrl || !requestId) {
      console.warn("[reality-defender] presign response missing signedUrl/requestId");
      return null;
    }

    const buffer = Buffer.from(mediaBase64.replace(/^data:[^,]+,/, ""), "base64");
    const uploadRes = await fetchWithTimeout(signedUrl, { method: "PUT", body: buffer });
    if (!uploadRes.ok) {
      console.warn(`[reality-defender] upload failed with status ${uploadRes.status}`);
      return null;
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const resultRes = await fetchWithTimeout(`${API_BASE}/media/users/${requestId}`, {
        method: "GET",
        headers: { "X-API-KEY": env.realityDefenderApiKey ?? "", "Content-Type": "application/json" },
      });
      if (!resultRes.ok) continue;

      const detail = (await resultRes.json()) as MediaDetailResponse;
      const status = detail.resultsSummary?.status;
      if (status && FINAL_STATUSES.has(status)) {
        return {
          id: uuid(),
          caseId,
          mediaType,
          status: status as DeepfakeStatus,
          finalScore: detail.resultsSummary?.metadata?.finalScore ?? 0,
          source: "Reality Defender",
          checkedAt: new Date().toISOString(),
        };
      }
    }

    console.warn("[reality-defender] result not ready within poll budget");
    return null;
  } catch (error) {
    console.warn("[reality-defender] deepfake check failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
