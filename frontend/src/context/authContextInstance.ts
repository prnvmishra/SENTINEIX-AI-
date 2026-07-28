import { createContext } from "react";
import type { AuthUser, UserRole } from "@shared/types";

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organization: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  status: "checking" | "authenticated" | "unauthenticated";
  login: (email: string, password: string, remember: boolean) => Promise<AuthUser>;
  signup: (input: SignupInput) => Promise<AuthUser>;
  logout: () => void;
  /**
   * Permanently deletes the signed-in user's Firebase Auth account and their
   * `/users/{uid}` profile. Firebase requires a recent login for this
   * operation — pass the account's current password so we can silently
   * re-authenticate first if Firebase asks for it, instead of failing.
   */
  deleteAccount: (currentPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
