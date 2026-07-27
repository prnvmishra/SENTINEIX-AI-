import { promises as dns } from "node:dns";
import { v4 as uuid } from "uuid";
import type { EntityIntelResult, EntityRiskLevel } from "@shared/types";

const REQUEST_TIMEOUT_MS = 6000;

interface FreeIpApiResponse {
  ipAddress?: string;
  countryName?: string;
  cityName?: string;
  regionName?: string;
  asnOrganization?: string;
  isProxy?: boolean;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// FreeIPAPI occasionally returns a transient Cloudflare edge error (5xx) with
// no SLA guarantee on the free tier — one retry clears the vast majority of
// these without meaningfully slowing down a live session.
async function fetchWithRetry(url: string, attempts = 2): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetchWithTimeout(url);
    if (response.ok) return response;
    lastResponse = response;
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return lastResponse as Response;
}

function riskFromGeo(isProxy: boolean, country: string): EntityRiskLevel {
  if (isProxy) return "MEDIUM";
  if (country && country !== "India") return "MEDIUM";
  return "LOW";
}

/**
 * Resolves a domain/link mentioned in a live call to a real IP address (via
 * DNS) and geolocates that IP via FreeIPAPI (https://freeipapi.com) — a
 * genuinely free, no-API-key, HTTPS-capable geolocation service (60 req/min).
 *
 * This is "IP tracking" for the scam's *digital infrastructure* (phishing
 * links, fake bank/KYC portals) — not phone-call tracing, since PSTN/mobile
 * calls carry no IP address at all. Fails gracefully (returns null) on any
 * DNS failure, network error, or non-2xx response.
 */
export async function checkDomainOrIpLocation(
  caseId: string,
  value: string,
  entityType: "ip" | "domain",
): Promise<EntityIntelResult | null> {
  try {
    let ip = value;
    if (entityType === "domain") {
      const hostname = value.replace(/^https?:\/\//i, "").split("/")[0];
      const resolved = await dns.lookup(hostname, { family: 4 }).catch(() => null);
      if (!resolved) {
        console.warn(`[ip-geo] DNS lookup failed for domain: ${value}`);
        return null;
      }
      ip = resolved.address;
    }

    const response = await fetchWithRetry(`https://free.freeipapi.com/api/json/${ip}`);
    if (!response.ok) {
      console.warn(`[ip-geo] request failed with status ${response.status}`);
      return null;
    }

    const data = (await response.json()) as FreeIpApiResponse;
    const country = data.countryName ?? "Unknown";
    const city = data.cityName ?? "Unknown city";
    const isProxy = Boolean(data.isProxy);

    const signals: string[] = [`Hosted in: ${city}, ${country}`];
    if (data.asnOrganization) signals.push(`Network: ${data.asnOrganization}`);
    if (isProxy) signals.push("Traffic routed through a known proxy/VPN/hosting network");
    if (entityType === "domain") signals.push(`Resolved ${value} -> ${ip}`);

    const risk = riskFromGeo(isProxy, country);

    return {
      id: uuid(),
      caseId,
      entity: value,
      entityType,
      risk,
      score: isProxy ? 0.6 : 0.2,
      timesReported: 0,
      signals,
      recommendation:
        risk === "MEDIUM"
          ? "Infrastructure is hosted outside India or behind a proxy/VPN — a common pattern for scam phishing pages. Do not enter any details on this link."
          : "No strong infrastructure red flag from hosting location alone — still verify the link independently.",
      source: "IP Geolocation",
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[ip-geo] lookup failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
