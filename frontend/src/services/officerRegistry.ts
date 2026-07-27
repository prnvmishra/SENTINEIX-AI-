import { get, ref, set } from "firebase/database";
import type { OfficerVerificationResult } from "@shared/types";
import { database } from "@/services/firebaseClient";

const OFFICER_PATH = "officerRegistry";

export interface RegisteredOfficer {
  id: string;
  name: string;
  badgeNumber: string;
  department: string;
  state: string;
  designation: string;
  registeredBy: string;
  registeredAt: string;
}

/**
 * SentinelX's own Verified Officer Registry — a real, first-party Firebase
 * database of officers registered by their department. This does NOT claim
 * to be, or connect to, any government identity database (none exists
 * publicly). It is a trust layer we own: a citizen can check a caller's
 * claimed name/badge against what departments have actually registered here.
 */
export async function registerOfficer(input: Omit<RegisteredOfficer, "id" | "registeredAt">): Promise<void> {
  if (!database) throw new Error("Firebase is not configured — the officer registry is unavailable.");

  const officerId = `${input.badgeNumber.trim().toUpperCase().replace(/\s+/g, "-")}_${input.state
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  const officer: RegisteredOfficer = { ...input, id: officerId, registeredAt: new Date().toISOString() };
  await set(ref(database, `${OFFICER_PATH}/${officerId}`), officer);
}

export async function verifyOfficer(name: string, badgeNumber: string): Promise<OfficerVerificationResult> {
  if (!database) return { status: "not_found" };

  const snapshot = await get(ref(database, OFFICER_PATH));
  const value = snapshot.val() as Record<string, RegisteredOfficer> | null;
  if (!value) return { status: "not_found" };

  const normalizedBadge = badgeNumber.trim().toUpperCase();
  const match = Object.values(value).find((officer) => officer.badgeNumber.trim().toUpperCase() === normalizedBadge);
  if (!match) return { status: "not_found" };

  const nameMatches = match.name.trim().toLowerCase().includes(name.trim().toLowerCase().split(" ")[0] ?? "");
  return nameMatches ? { status: "verified", officer: match } : { status: "mismatch", officer: match };
}

export async function listRegisteredOfficers(): Promise<RegisteredOfficer[]> {
  if (!database) return [];
  const snapshot = await get(ref(database, OFFICER_PATH));
  const value = snapshot.val() as Record<string, RegisteredOfficer> | null;
  return value ? Object.values(value).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)) : [];
}
