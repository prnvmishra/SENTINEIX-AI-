import { get, onValue, ref, update } from "firebase/database";
import type { UserPermissions, UserRole } from "@shared/types";
import { database } from "@/services/firebaseClient";

/**
 * Every signed-up account's profile, as stored at `/users/{uid}` in Firebase
 * Realtime Database. Government Administrator is first-claimer-wins via
 * `/system/govAdminUid`; further admins only when an existing admin grants
 * the `gov_admin` role.
 *
 * Admin roster merges `/accountDirectory` + `/users`, preferring real names
 * over placeholder directory stubs.
 */
export interface ManagedUserProfile {
  uid: string;
  name: string;
  email?: string;
  role: UserRole;
  organization: string;
  avatarColor?: string;
  permissions: UserPermissions;
}

const USERS_PATH = "users";
const DIRECTORY_PATH = "accountDirectory";
const GOV_ADMIN_LOCK_PATH = "system/govAdminUid";

const PLACEHOLDER_NAMES = new Set(["Unnamed user", "SentinelX User", "Administrator", ""]);

function permissionsForRole(role: UserRole, stored?: Partial<UserPermissions>): UserPermissions {
  const isAdmin = role === "gov_admin";
  const isCitizen = role === "citizen";
  const defaults: UserPermissions = {
    canMarkCasesSolved: !isCitizen,
    canDeleteCases: isAdmin,
    canManageOfficers: isAdmin,
  };
  if (!stored) return defaults;
  return {
    canMarkCasesSolved: stored.canMarkCasesSolved ?? defaults.canMarkCasesSolved,
    canDeleteCases: isAdmin,
    canManageOfficers: isAdmin ? (stored.canManageOfficers ?? true) : false,
  };
}

function isPlaceholderName(name: string | undefined): boolean {
  return !name || PLACEHOLDER_NAMES.has(name.trim());
}

function isPlaceholderOrg(org: string | undefined): boolean {
  return !org || org === "Unaffiliated";
}

function withDefaults(uid: string, raw: Record<string, unknown>): ManagedUserProfile {
  const role = (raw.role as UserRole) ?? "citizen";
  const storedPermissions = (raw.permissions as Partial<UserPermissions> | undefined) ?? {};
  const email = typeof raw.email === "string" ? raw.email : undefined;
  const rawName = typeof raw.name === "string" ? raw.name.trim() : "";
  const fallbackFromEmail = email?.split("@")[0]?.replace(/[._]/g, " ").trim();

  return {
    uid,
    name: rawName || fallbackFromEmail || "Unnamed user",
    email,
    role,
    organization: (raw.organization as string) ?? "Unaffiliated",
    avatarColor: raw.avatarColor as string | undefined,
    permissions: permissionsForRole(role, storedPermissions),
  };
}

/** Prefer real profile fields when merging /users + /accountDirectory. */
function mergeProfiles(a: ManagedUserProfile, b: ManagedUserProfile): ManagedUserProfile {
  const name = !isPlaceholderName(a.name) ? a.name : !isPlaceholderName(b.name) ? b.name : a.name || b.name;
  const organization = !isPlaceholderOrg(a.organization)
    ? a.organization
    : !isPlaceholderOrg(b.organization)
      ? b.organization
      : a.organization || b.organization;
  // Prefer gov_admin if either side has it; otherwise prefer non-citizen; else b
  const role =
    a.role === "gov_admin" || b.role === "gov_admin"
      ? "gov_admin"
      : a.role !== "citizen"
        ? a.role
        : b.role;

  return {
    uid: a.uid,
    name,
    email: a.email || b.email,
    role,
    organization,
    avatarColor: a.avatarColor || b.avatarColor,
    permissions: permissionsForRole(role, {
      ...b.permissions,
      ...a.permissions,
      canDeleteCases: role === "gov_admin",
      canManageOfficers: role === "gov_admin",
    }),
  };
}

/** Upsert the admin-visible roster entry (called on login + signup + role change). */
export async function syncAccountDirectoryEntry(input: {
  uid: string;
  name: string;
  email?: string;
  role: UserRole;
  organization: string;
  avatarColor?: string;
  permissions?: UserPermissions;
}): Promise<void> {
  if (!database) return;
  const name = input.name.trim() || input.email?.split("@")[0] || "User";
  try {
    await update(ref(database, `${DIRECTORY_PATH}/${input.uid}`), {
      name,
      email: input.email ?? null,
      role: input.role,
      organization: input.organization || "Unaffiliated",
      avatarColor: input.avatarColor ?? null,
      permissions: input.permissions ?? permissionsForRole(input.role),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("[user-admin] accountDirectory sync failed:", error);
  }
}

async function readProfileSources(uid: string): Promise<ManagedUserProfile> {
  let fromUsers: ManagedUserProfile | null = null;
  let fromDirectory: ManagedUserProfile | null = null;
  if (!database) {
    return withDefaults(uid, {});
  }
  try {
    const snap = await get(ref(database, `${USERS_PATH}/${uid}`));
    if (snap.exists()) fromUsers = withDefaults(uid, snap.val() as Record<string, unknown>);
  } catch {
    // ignore
  }
  try {
    const snap = await get(ref(database, `${DIRECTORY_PATH}/${uid}`));
    if (snap.exists()) fromDirectory = withDefaults(uid, snap.val() as Record<string, unknown>);
  } catch {
    // ignore
  }
  if (fromUsers && fromDirectory) return mergeProfiles(fromUsers, fromDirectory);
  return fromUsers ?? fromDirectory ?? withDefaults(uid, {});
}

/**
 * Live subscription for the Admin panel roster.
 * Merges `/accountDirectory` + `/users` and keeps the best name/org/email.
 */
export function subscribeToAllUsers(
  callback: (users: ManagedUserProfile[]) => void,
  onError?: (message: string | null) => void,
): () => void {
  if (!database) {
    callback([]);
    onError?.("Firebase isn't configured on this device.");
    return () => {};
  }

  let directoryUsers: ManagedUserProfile[] | null = null;
  let usersNode: ManagedUserProfile[] | null = null;
  let lastError: string | null = null;

  function emit() {
    const merged = new Map<string, ManagedUserProfile>();
    for (const list of [directoryUsers, usersNode]) {
      if (!list) continue;
      for (const profile of list) {
        const existing = merged.get(profile.uid);
        merged.set(profile.uid, existing ? mergeProfiles(existing, profile) : profile);
      }
    }
    const all = Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
    callback(all);
    if (all.length === 0 && lastError) onError?.(lastError);
    else onError?.(null);
  }

  const unsubDirectory = onValue(
    ref(database, DIRECTORY_PATH),
    (snapshot) => {
      lastError = null;
      const value = snapshot.val() as Record<string, Record<string, unknown>> | null;
      directoryUsers = value ? Object.entries(value).map(([uid, raw]) => withDefaults(uid, raw)) : [];
      emit();
    },
    (error) => {
      directoryUsers = [];
      lastError =
        /permission/i.test(error.message)
          ? "Cannot read accountDirectory (permission_denied). Publish updated rules from firebase/database.rules.json, then refresh."
          : error.message;
      emit();
    },
  );

  const unsubUsers = onValue(
    ref(database, USERS_PATH),
    (snapshot) => {
      lastError = null;
      const value = snapshot.val() as Record<string, Record<string, unknown>> | null;
      usersNode = value ? Object.entries(value).map(([uid, raw]) => withDefaults(uid, raw)) : [];
      emit();
    },
    (error) => {
      usersNode = [];
      if (!directoryUsers || directoryUsers.length === 0) {
        lastError =
          /permission/i.test(error.message)
            ? "Cannot list /users (permission_denied). Publish updated firebase/database.rules.json in Firebase Console → Realtime Database → Rules."
            : error.message;
      }
      emit();
    },
  );

  return () => {
    unsubDirectory();
    unsubUsers();
  };
}

export async function getGovAdminLockUid(): Promise<string | null> {
  if (!database) return null;
  try {
    const snap = await get(ref(database, GOV_ADMIN_LOCK_PATH));
    const value = snap.val();
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * First-time admin claim. Locks `/system/govAdminUid` so no other account can
 * self-promote afterward — further admins must be granted by this admin.
 */
export async function claimGovernmentAdmin(uid: string): Promise<string | null> {
  if (!database) return "Firebase isn't configured on this device.";
  try {
    const existing = await getGovAdminLockUid();
    if (existing && existing !== uid) {
      return "An administrator already exists. Only they can grant admin access to another account.";
    }

    if (!existing) {
      await update(ref(database, "system"), { govAdminUid: uid });
    }

    const permissions = permissionsForRole("gov_admin");
    await update(ref(database, `${USERS_PATH}/${uid}`), { role: "gov_admin", permissions });

    try {
      const existingProfile = await readProfileSources(uid);
      await syncAccountDirectoryEntry({
        uid,
        name: existingProfile.name,
        email: existingProfile.email,
        role: "gov_admin",
        organization: existingProfile.organization,
        avatarColor: existingProfile.avatarColor,
        permissions,
      });
    } catch {
      // non-fatal
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Failed to claim administrator access.";
  }
}

export async function updateUserRole(uid: string, role: UserRole): Promise<string | null> {
  if (!database) return "Firebase isn't configured on this device.";
  try {
    const permissions = permissionsForRole(role);
    const existing = await readProfileSources(uid);
    await update(ref(database, `${USERS_PATH}/${uid}`), { role, permissions });
    // Full directory rewrite so we never leave a nameless stub that hides /users data
    await syncAccountDirectoryEntry({
      uid,
      name: existing.name,
      email: existing.email,
      role,
      organization: existing.organization,
      avatarColor: existing.avatarColor,
      permissions,
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Failed to update role.";
  }
}

export async function updateUserPermissions(uid: string, permissions: UserPermissions): Promise<string | null> {
  if (!database) return "Firebase isn't configured on this device.";
  try {
    const existing = await readProfileSources(uid);
    await update(ref(database, `${USERS_PATH}/${uid}`), { permissions });
    await syncAccountDirectoryEntry({
      uid,
      name: existing.name,
      email: existing.email,
      role: existing.role,
      organization: existing.organization,
      avatarColor: existing.avatarColor,
      permissions,
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Failed to update permissions.";
  }
}

/** Rebuild incomplete directory stubs from /users (admin repair). */
export async function repairAccountDirectoryFromUsers(): Promise<{ fixed: number; error: string | null }> {
  if (!database) return { fixed: 0, error: "Firebase isn't configured." };
  try {
    const snap = await get(ref(database, USERS_PATH));
    const value = snap.val() as Record<string, Record<string, unknown>> | null;
    if (!value) return { fixed: 0, error: null };

    let fixed = 0;
    for (const [uid, raw] of Object.entries(value)) {
      const profile = withDefaults(uid, raw);
      await syncAccountDirectoryEntry({
        uid,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        organization: profile.organization,
        avatarColor: profile.avatarColor,
        permissions: profile.permissions,
      });
      fixed += 1;
    }
    return { fixed, error: null };
  } catch (error) {
    return {
      fixed: 0,
      error: error instanceof Error ? error.message : "Failed to repair account directory.",
    };
  }
}
