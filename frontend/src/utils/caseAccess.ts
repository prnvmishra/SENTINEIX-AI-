import type { AuthUser } from "@shared/types";

/**
 * Case access rules for SentinelX:
 * - Delete: only the Government Administrator
 * - Mark complete: only the account that registered the case
 * - Admin role: first claimer wins; further admins only if granted by an existing admin
 */

export function isGovAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === "gov_admin";
}

/** Only the platform admin may permanently delete cases. */
export function canDeleteRegisteredCase(user: AuthUser | null | undefined): boolean {
  return isGovAdmin(user);
}

/**
 * Only the registering account may mark a case complete.
 * Legacy cases without `registeredByUid` are admin-only (no orphan claim).
 */
export function canMarkRegisteredCaseSolved(
  user: AuthUser | null | undefined,
  caseOwner: { registeredByUid?: string } | null | undefined,
): boolean {
  if (!user || !caseOwner) return false;
  if (!caseOwner.registeredByUid) return isGovAdmin(user);
  return user.id === caseOwner.registeredByUid;
}
