import { onValue, ref, remove, set, update } from "firebase/database";
import type { CaseDetail } from "@shared/types";
import { database } from "@/services/firebaseClient";

/**
 * The real case lifecycle store — every genuine session a citizen runs on
 * this app (Live Mic Session, an uploaded recorded call, or an uploaded
 * chat screenshot) is written here, live, via Firebase Realtime Database.
 * Scripted "Play Demo Scenario" runs are intentionally NEVER written here —
 * this collection is real cases only, which is what Analytics and
 * Historical Cases now read from instead of hardcoded mock numbers.
 */
const REGISTRY_PATH = "caseRegistry";

export function registerCase(caseDetail: CaseDetail): void {
  if (!database) return;
  void set(ref(database, `${REGISTRY_PATH}/${caseDetail.id}`), caseDetail).catch((error) => {
    console.warn("[case-registry] failed to register case:", error);
  });
}

export function updateRegisteredCase(caseId: string, updates: Partial<CaseDetail>): void {
  if (!database) return;
  void update(ref(database, `${REGISTRY_PATH}/${caseId}`), updates).catch((error) => {
    console.warn("[case-registry] failed to update case:", error);
  });
}

export function deleteRegisteredCase(caseId: string): void {
  if (!database) return;
  void remove(ref(database, `${REGISTRY_PATH}/${caseId}`)).catch(() => {});
}

export function subscribeToCaseRegistry(callback: (cases: CaseDetail[]) => void): () => void {
  if (!database) {
    callback([]);
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
    () => callback([]),
  );
}
