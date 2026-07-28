import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  EmailAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  onIdTokenChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { get, ref, remove, set } from "firebase/database";
import type { AuthUser, UserPermissions, UserRole } from "@shared/types";
import { auth, database } from "@/services/firebaseClient";
import { isFirebaseConfigured } from "@/services/env";
import { authApi } from "@/services/authApi";
import { syncAccountDirectoryEntry } from "@/services/userAdmin";
import { clearStoredToken, persistToken, readStoredToken } from "@/utils/storage";
import { AuthContext } from "@/context/authContextInstance";
import type { AuthContextValue, SignupInput } from "@/context/authContextInstance";

const AVATAR_PALETTE = ["#06b6d4", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#f472b6"];

interface RtdbUserProfile {
  name?: string;
  email?: string;
  role?: UserRole;
  organization?: string;
  avatarColor?: string;
  permissions?: Partial<UserPermissions>;
}

function pickAvatarColor(seed: string): string {
  const index = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

/**
 * A plain citizen filing a complaint should never be able to close or delete
 * a case themselves — that's the officer's job, mirroring how a real
 * cybercrime complaint works. Every other operational role gets full
 * case-management access by default; a Government Administrator can still
 * revoke any of these per-officer from the Admin panel.
 */
function defaultPermissionsForRole(role: UserRole): UserPermissions {
  // Delete is admin-only. Mark-complete is ownership-based in the UI
  // (registeredByUid) — this flag stays true for operational roles for
  // legacy/admin display only.
  const isAdmin = role === "gov_admin";
  const isCitizen = role === "citizen";
  return {
    canMarkCasesSolved: !isCitizen,
    canDeleteCases: isAdmin,
    canManageOfficers: isAdmin,
  };
}

function resolvePermissions(role: UserRole, stored: Partial<UserPermissions> | undefined): UserPermissions {
  const defaults = defaultPermissionsForRole(role);
  if (!stored) return defaults;
  return {
    canMarkCasesSolved: stored.canMarkCasesSolved ?? defaults.canMarkCasesSolved,
    canDeleteCases: stored.canDeleteCases ?? defaults.canDeleteCases,
    canManageOfficers: stored.canManageOfficers ?? defaults.canManageOfficers,
  };
}

async function resolveFirebaseUser(firebaseUser: FirebaseUser): Promise<AuthUser> {
  let profile: RtdbUserProfile | null = null;

  if (database) {
    try {
      const snapshot = await get(ref(database, `users/${firebaseUser.uid}`));
      profile = (snapshot.val() as RtdbUserProfile | null) ?? null;
    } catch {
      profile = null;
    }
  }

  const role = profile?.role ?? "citizen";
  const resolved: AuthUser = {
    id: firebaseUser.uid,
    name: profile?.name ?? firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "SentinelX User",
    email: firebaseUser.email ?? profile?.email ?? "",
    role,
    organization: profile?.organization ?? "Unaffiliated",
    avatarColor: profile?.avatarColor ?? pickAvatarColor(firebaseUser.uid),
    permissions: resolvePermissions(role, profile?.permissions),
  };

  // Keep admin roster in sync so the Admin panel always lists signed-in accounts
  void syncAccountDirectoryEntry({
    uid: resolved.id,
    name: resolved.name,
    email: resolved.email,
    role: resolved.role,
    organization: resolved.organization,
    avatarColor: resolved.avatarColor,
    permissions: resolved.permissions,
  });

  return resolved;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("checking");

  // --- Firebase Authentication (real signup/login/session persistence) ---
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setToken(null);
        setStatus("unauthenticated");
        return;
      }

      try {
        const [idToken, resolvedUser] = await Promise.all([
          firebaseUser.getIdToken(),
          resolveFirebaseUser(firebaseUser),
        ]);
        setToken(idToken);
        setUser(resolvedUser);
        setStatus("authenticated");
      } catch {
        setUser(null);
        setToken(null);
        setStatus("unauthenticated");
      }
    });

    return unsubscribe;
  }, []);

  // --- Legacy mock-JWT fallback (only used when Firebase isn't configured) ---
  useEffect(() => {
    if (isFirebaseConfigured) return;

    const storedToken = readStoredToken();

    if (!storedToken) {
      setStatus("unauthenticated");
      return;
    }

    authApi
      .me(storedToken)
      .then((response) => {
        setUser(response.user);
        setToken(storedToken);
        setStatus("authenticated");
      })
      .catch(() => {
        clearStoredToken();
        setStatus("unauthenticated");
      });
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    if (isFirebaseConfigured && auth) {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const [idToken, resolvedUser] = await Promise.all([
        credential.user.getIdToken(),
        resolveFirebaseUser(credential.user),
      ]);
      setToken(idToken);
      setUser(resolvedUser);
      setStatus("authenticated");
      return resolvedUser;
    }

    const response = await authApi.login({ email, password });
    persistToken(response.token, remember);
    setToken(response.token);
    setUser(response.user);
    setStatus("authenticated");
    return response.user;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    if (!isFirebaseConfigured || !auth || !database) {
      throw new Error("Firebase authentication is not configured on this deployment.");
    }

    if (input.role === "gov_admin") {
      throw new Error("Government Administrator access must be claimed from the Admin panel after signup — it cannot be self-assigned.");
    }

    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
    await updateProfile(credential.user, { displayName: input.name });

    const avatarColor = pickAvatarColor(credential.user.uid);
    const permissions = defaultPermissionsForRole(input.role);
    const profile: RtdbUserProfile = {
      name: input.name,
      email: input.email,
      role: input.role,
      organization: input.organization,
      avatarColor,
      permissions,
    };
    await set(ref(database, `users/${credential.user.uid}`), profile);

    const resolvedUser: AuthUser = {
      id: credential.user.uid,
      name: input.name,
      email: input.email,
      role: input.role,
      organization: input.organization,
      avatarColor,
      permissions,
    };

    await syncAccountDirectoryEntry({
      uid: resolvedUser.id,
      name: resolvedUser.name,
      email: resolvedUser.email,
      role: resolvedUser.role,
      organization: resolvedUser.organization,
      avatarColor: resolvedUser.avatarColor,
      permissions: resolvedUser.permissions,
    });

    const idToken = await credential.user.getIdToken();
    setToken(idToken);
    setUser(resolvedUser);
    setStatus("authenticated");
    return resolvedUser;
  }, []);

  const logout = useCallback(() => {
    if (isFirebaseConfigured && auth) {
      void signOut(auth);
    } else {
      clearStoredToken();
    }
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const deleteAccount = useCallback(async (currentPassword: string) => {
    if (!isFirebaseConfigured || !auth?.currentUser) {
      throw new Error("Firebase authentication is not configured on this deployment.");
    }
    const firebaseUser = auth.currentUser;
    const uid = firebaseUser.uid;

    try {
      if (database) {
        await remove(ref(database, `users/${uid}`));
      }
      await deleteUser(firebaseUser);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/requires-recent-login") {
        if (!firebaseUser.email) throw new Error("Re-authentication is required, but this account has no email on file.");
        const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
        if (database) {
          await remove(ref(database, `users/${uid}`));
        }
        await deleteUser(firebaseUser);
      } else {
        throw error;
      }
    }

    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, status, login, signup, logout, deleteAccount }),
    [user, token, status, login, signup, logout, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
