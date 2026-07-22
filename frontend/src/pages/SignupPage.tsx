import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldHalf, UserPlus } from "lucide-react";
import type { UserRole } from "@shared/types";
import { Button } from "@/components/Button";
import { GlassPanel } from "@/components/GlassPanel";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/services/env";
import { fadeUp } from "@/theme/motion";
import { roleOptions } from "@/constants/roles";
import { ROUTES } from "@/app/routes";

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("officer");
  const [organization, setOrganization] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedRoleOption = roleOptions.find((option) => option.role === role);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await signup({
        name,
        email,
        password,
        role,
        organization: organization.trim() || selectedRoleOption?.organizationPlaceholder || "Unaffiliated",
      });
      navigate(ROUTES.dashboard);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create your account.";
      setError(humanizeFirebaseError(message));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-text-primary">
        <ShieldHalf className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold">Signup is unavailable in demo mode</h1>
        <p className="max-w-md text-sm text-text-secondary">
          This deployment isn't connected to Firebase, so it runs on pre-seeded demo accounts. Sign in from the login
          page instead.
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.login)}>
          Go to login
        </Button>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-12">
      <div className="grid-lines-bg absolute inset-0 opacity-30" />
      <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]" />

      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="relative z-10 w-full max-w-lg">
        <GlassPanel glow className="flex flex-col p-8">
          <button type="button" onClick={() => navigate(ROUTES.landing)} className="mb-8 self-start">
            <Logo />
          </button>

          <h1 className="text-2xl font-semibold text-text-primary">Create your console account</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Real Firebase-backed authentication — pick the role that matches your intelligence function.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Full name
              <input
                required
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Priya Sharma"
                className="rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@agency.gov.in"
                className="rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Password
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 pr-10 text-sm text-text-primary outline-none transition focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Operational role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
              >
                {roleOptions.map((option) => (
                  <option key={option.role} value={option.role}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Organization
              <input
                type="text"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                placeholder={selectedRoleOption?.organizationPlaceholder}
                className="rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
              />
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={submitting} className="mt-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Create account
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-text-secondary">
            Already have an account?{" "}
            <button type="button" onClick={() => navigate(ROUTES.login)} className="font-medium text-primary hover:underline">
              Sign in
            </button>
          </p>
        </GlassPanel>
      </motion.div>
    </main>
  );
}

function humanizeFirebaseError(message: string): string {
  if (message.includes("auth/email-already-in-use")) return "An account with this email already exists.";
  if (message.includes("auth/invalid-email")) return "Enter a valid email address.";
  if (message.includes("auth/weak-password")) return "Password must be at least 6 characters.";
  if (message.includes("auth/network-request-failed")) return "Network error — check your connection and try again.";
  return message;
}
