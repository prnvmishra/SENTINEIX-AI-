import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthUser, UserRole } from "@shared/types";
import { env } from "../utils/env.js";
import { ApiError } from "../middleware/error.middleware.js";

/**
 * Firebase ID tokens are verified without the Admin SDK (no service account
 * required) by validating the RS256 signature against Google's public JWKS —
 * this is Firebase's officially documented approach for backends that can't
 * hold a service account key. See:
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const jwks = env.firebaseProjectId ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

export function isFirebaseConfigured(): boolean {
  return Boolean(env.firebaseProjectId);
}

interface DecodedFirebaseToken {
  uid: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedFirebaseToken> {
  if (!jwks || !env.firebaseProjectId) {
    throw new ApiError(500, "Firebase authentication is not configured on the server");
  }

  let payload;

  try {
    const result = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${env.firebaseProjectId}`,
      audience: env.firebaseProjectId,
      algorithms: ["RS256"],
    });
    payload = result.payload;
  } catch {
    throw new ApiError(401, "Invalid or expired Firebase session token");
  }

  if (!payload.sub) {
    throw new ApiError(401, "Malformed Firebase session token");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    name: typeof payload.name === "string" ? payload.name : null,
    emailVerified: payload.email_verified === true,
  };
}

interface RtdbUserProfile {
  name?: string;
  role?: UserRole;
  organization?: string;
  avatarColor?: string;
}

export async function fetchFirebaseUserProfile(uid: string, idToken: string): Promise<RtdbUserProfile | null> {
  if (!env.firebaseDatabaseUrl) return null;

  const url = `${env.firebaseDatabaseUrl}/users/${encodeURIComponent(uid)}.json?auth=${encodeURIComponent(idToken)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as RtdbUserProfile | null;
    return data ?? null;
  } catch {
    return null;
  }
}

export async function resolveFirebaseAuthUser(idToken: string): Promise<AuthUser> {
  const decoded = await verifyFirebaseIdToken(idToken);
  const profile = await fetchFirebaseUserProfile(decoded.uid, idToken);

  return {
    id: decoded.uid,
    name: profile?.name ?? decoded.name ?? decoded.email?.split("@")[0] ?? "SentinelX User",
    email: decoded.email ?? "",
    role: profile?.role ?? "citizen",
    organization: profile?.organization ?? "Unaffiliated",
    avatarColor: profile?.avatarColor ?? "#06b6d4",
  };
}
