import { onValue, ref, remove, set, update } from "firebase/database";
import type { CaseDetail, CaseResolution } from "@shared/types";
import { database } from "@/services/firebaseClient";

/**
 * Real cases only — written when the user explicitly clicks "Register this
 * case" AFTER analyzing evidence. Analysis alone never writes here.
 */
const REGISTRY_PATH = "caseRegistry";

/**
 * Firebase Realtime Database rejects `undefined` anywhere in a `set()` /
 * `update()` payload. CaseDetail has many optional fields — strip them
 * (and nested undefined) before every write so registration never fails
 * silently with a cryptic Firebase error after a successful analysis.
 */
export function sanitizeForFirebase<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function describeFirebaseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/permission[_ ]denied/i.test(message)) {
    return 'Firebase denied this write (permission_denied). Open Firebase Console → Realtime Database → Rules and publish rules that allow auth != null to read/write "caseRegistry". See README.';
  }
  return `Database error: ${message}`;
}

/** Returns null on success, or a human-readable error string on failure. */
export async function registerCase(caseDetail: CaseDetail): Promise<string | null> {
  if (!database) return "Firebase isn't configured on this device — case wasn't saved.";
  try {
    // Strip any accidental resolution / completed status — registration is
    // always ONGOING until Mark Complete is used explicitly.
    const { resolution: _ignored, ...rest } = caseDetail;
    const payload = sanitizeForFirebase({ ...rest, status: "live" as const });
    await set(ref(database, `${REGISTRY_PATH}/${caseDetail.id}`), payload);
    return null;
  } catch (error) {
    console.warn("[case-registry] failed to register case:", error);
    return describeFirebaseError(error);
  }
}

export async function updateRegisteredCase(caseId: string, updates: Partial<CaseDetail>): Promise<string | null> {
  if (!database) return "Firebase isn't configured on this device — case wasn't saved.";
  try {
    await update(ref(database, `${REGISTRY_PATH}/${caseId}`), sanitizeForFirebase(updates));
    return null;
  } catch (error) {
    console.warn("[case-registry] failed to update case:", error);
    return describeFirebaseError(error);
  }
}

/**
 * The ONLY way a real case becomes "resolved" — from Historical Cases via
 * "Mark Case as Solved". Ending analysis never closes a case.
 */
export async function markCaseSolved(caseId: string, resolution: CaseResolution): Promise<string | null> {
  if (!database) return "Firebase isn't configured on this device — case wasn't saved.";
  try {
    await update(ref(database, `${REGISTRY_PATH}/${caseId}`), sanitizeForFirebase({ status: "resolved", resolution }));
    return null;
  } catch (error) {
    console.warn("[case-registry] failed to mark case solved:", error);
    return describeFirebaseError(error);
  }
}

export async function reopenCase(caseId: string): Promise<string | null> {
  if (!database) return "Firebase isn't configured on this device.";
  try {
    await update(ref(database, `${REGISTRY_PATH}/${caseId}`), { status: "live", resolution: null });
    return null;
  } catch (error) {
    console.warn("[case-registry] failed to reopen case:", error);
    return describeFirebaseError(error);
  }
}

/**
 * Older builds auto-marked cases COMPLETED on analysis end. Those records
 * have status "resolved" but no officer resolution notes. Reopen them all
 * back to ONGOING so officers can complete them properly.
 */
export async function reopenWronglyAutoCompletedCases(cases: CaseDetail[]): Promise<{ fixed: number; error: string | null }> {
  const wronglyCompleted = cases.filter((c) => c.status === "resolved" && !c.resolution);
  if (wronglyCompleted.length === 0) return { fixed: 0, error: null };

  let fixed = 0;
  let lastError: string | null = null;
  for (const c of wronglyCompleted) {
    const err = await reopenCase(c.id);
    if (err) lastError = err;
    else fixed += 1;
  }
  return { fixed, error: lastError };
}

export async function deleteRegisteredCase(caseId: string): Promise<string | null> {
  if (!database) return "Firebase isn't configured on this device — nothing to delete.";
  try {
    await remove(ref(database, `${REGISTRY_PATH}/${caseId}`));
    return null;
  } catch (error) {
    console.warn("[case-registry] failed to delete case:", error);
    return describeFirebaseError(error);
  }
}

export function subscribeToCaseRegistry(
  callback: (cases: CaseDetail[]) => void,
  onError?: (message: string) => void,
): () => void {
  if (!database) {
    callback([]);
    onError?.("Firebase isn't configured — Historical Cases and Analytics stay empty until it is.");
    return () => {};
  }

  return onValue(
    ref(database, REGISTRY_PATH),
    (snapshot) => {
      const value = snapshot.val() as Record<string, CaseDetail> | null;
      const cases = value ? Object.values(value) : [];
      cases.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      callback(cases);
    },
    (error) => {
      console.warn("[case-registry] subscribe failed:", error);
      callback([]);
      onError?.(describeFirebaseError(error));
    },
  );
}
