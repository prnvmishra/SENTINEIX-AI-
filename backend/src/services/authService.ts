import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthUser, LoginResponse } from "@shared/types";
import { ApiError } from "../middleware/error.middleware.js";
import { env } from "../utils/env.js";
import { findUserByEmail, findUserById, toPublicUser } from "../data/mockUsers.js";
import { isFirebaseConfigured, resolveFirebaseAuthUser } from "./firebaseAuthService.js";

interface AccessTokenPayload {
  sub: string;
}

export function authenticate(email: string, password: string): LoginResponse {
  const user = findUserByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken(user.id);
  return { token, user: toPublicUser(user) };
}

export function signToken(userId: string): string {
  const payload: AccessTokenPayload = { sub: userId };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

function resolveLegacyUserFromToken(token: string): AuthUser {
  let payload: AccessTokenPayload;

  try {
    payload = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
  } catch {
    throw new ApiError(401, "Invalid or expired session token");
  }

  const user = findUserById(payload.sub);
  if (!user) {
    throw new ApiError(401, "Session no longer valid");
  }

  return toPublicUser(user);
}

/**
 * SentinelX authenticates real users through Firebase Authentication when the
 * server is configured with a Firebase project (`FIREBASE_PROJECT_ID`). When
 * Firebase is not configured — e.g. running the repo fresh without setting up
 * a Firebase project — the server transparently falls back to the legacy
 * mock-JWT demo accounts so the app keeps working out of the box.
 */
export async function resolveUser(token: string): Promise<AuthUser> {
  if (isFirebaseConfigured()) {
    return resolveFirebaseAuthUser(token);
  }
  return resolveLegacyUserFromToken(token);
}
