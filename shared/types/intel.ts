export type EntityRiskLevel = "HIGH" | "MEDIUM" | "LOW" | "CLEAN" | "UNKNOWN";

export type EntityType = "phone" | "upi" | "text" | "ip" | "domain";

export type EntityIntelSource = "FraudIntel India" | "CallTracer" | "IP Geolocation";

/**
 * Result of a real lookup against a live third-party intelligence source for
 * a phone number / UPI ID / IP / domain mentioned in a live call:
 *  - "FraudIntel India" — crowd-sourced Indian fraud DB (optional API key)
 *  - "CallTracer" — free, zero-signup phone carrier/line-type/spam lookup
 *  - "IP Geolocation" — free DNS + IP geolocation for scam links/domains
 * These are genuine third-party signals, not mocks — but young/community
 * datasets and hosting-location heuristics, so each is surfaced as ONE signal
 * among several, never as sole grounds for action.
 */
export interface EntityIntelResult {
  id: string;
  caseId: string;
  entity: string;
  entityType: EntityType;
  risk: EntityRiskLevel;
  score: number;
  timesReported: number;
  signals: string[];
  recommendation: string;
  source: EntityIntelSource;
  checkedAt: string;
}

export type DeepfakeStatus = "AUTHENTIC" | "FAKE" | "SUSPICIOUS" | "NOT_APPLICABLE" | "UNABLE_TO_EVALUATE" | "ERROR";

/**
 * Result of a real Reality Defender deepfake/voice-clone scan on an audio or
 * image sample captured during a live session. Reality Defender's free API
 * currently supports audio + image (not continuous video), so this is a
 * point-in-time authenticity check, not a live video feed verdict.
 */
export interface DeepfakeCheckResult {
  id: string;
  caseId: string;
  mediaType: "audio" | "image";
  status: DeepfakeStatus;
  finalScore: number;
  source: "Reality Defender";
  checkedAt: string;
}

export type OfficerVerificationStatus = "verified" | "not_found" | "mismatch";

/**
 * Result of checking a claimed officer's name/badge number against
 * SentinelX's own Verified Officer Registry (Firebase-backed). This is real,
 * first-party data we own — not a claim of access to any government identity
 * database, which does not publicly exist.
 */
export interface OfficerVerificationResult {
  status: OfficerVerificationStatus;
  officer?: {
    id: string;
    name: string;
    badgeNumber: string;
    department: string;
    state: string;
    designation: string;
    registeredAt: string;
  };
}
