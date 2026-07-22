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
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
