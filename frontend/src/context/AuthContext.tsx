import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { get, ref, set } from "firebase/database";
import type { AuthUser, UserRole } from "@shared/types";
import { auth, database } from "@/services/firebaseClient";
import { isFirebaseConfigured } from "@/services/env";
import { authApi } from "@/services/authApi";
import { clearStoredToken, persistToken, readStoredToken } from "@/utils/storage";
import { AuthContext } from "@/context/authContextInstance";
import type { AuthContextValue, SignupInput } from "@/context/authContextInstance";

const AVATAR_PALETTE = ["#06b6d4", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#f472b6"];

interface RtdbUserProfile {
  name?: string;
  role?: UserRole;
  organization?: string;
  avatarColor?: string;
}

function pickAvatarColor(seed: string): string {
  const index = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
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

  return {
    id: firebaseUser.uid,
    name: profile?.name ?? firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "SentinelX User",
    email: firebaseUser.email ?? "",
    role: profile?.role ?? "citizen",
    organization: profile?.organization ?? "Unaffiliated",
    avatarColor: profile?.avatarColor ?? pickAvatarColor(firebaseUser.uid),
  };
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

    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
    await updateProfile(credential.user, { displayName: input.name });

    const avatarColor = pickAvatarColor(credential.user.uid);
    const profile: RtdbUserProfile = {
      name: input.name,
      role: input.role,
      organization: input.organization,
      avatarColor,
    };
    await set(ref(database, `users/${credential.user.uid}`), profile);

    const resolvedUser: AuthUser = {
      id: credential.user.uid,
      name: input.name,
      email: input.email,
      role: input.role,
      organization: input.organization,
      avatarColor,
    };

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

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, status, login, signup, logout }),
    [user, token, status, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
