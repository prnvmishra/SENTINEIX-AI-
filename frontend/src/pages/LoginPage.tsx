import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldHalf } from "lucide-react";
import { Button } from "@/components/Button";
import { GlassPanel } from "@/components/GlassPanel";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/services/apiClient";
import { isFirebaseConfigured } from "@/services/env";
import { fadeUp } from "@/theme/motion";
import { demoAccounts, DEMO_PASSWORD } from "@/mock/demoAccounts";
import { ROUTES } from "@/app/routes";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password, remember);
      navigate(ROUTES.dashboard);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? humanizeFirebaseError(err.message)
            : "Unable to reach SentinelX servers.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-12">
      <div className="grid-lines-bg absolute inset-0 opacity-30" />
      <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]"
      >
        <GlassPanel glow className="flex flex-col p-8">
          <button type="button" onClick={() => navigate(ROUTES.landing)} className="mb-8 self-start">
            <Logo />
          </button>

          <h1 className="text-2xl font-semibold text-text-primary">Sign in to the console</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Prototype authentication — access is scoped to your operational role.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="officer@sentinelx.ai"
                className="rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Password
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••"
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

            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-strong bg-surface accent-primary"
              />
              Remember this session on this device
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying credentials...
                </>
              ) : (
                <>
                  <ShieldHalf className="h-4 w-4" /> Access Console
                </>
              )}
            </Button>
          </form>

          {isFirebaseConfigured && (
            <p className="mt-6 text-center text-xs text-text-secondary">
              New to SentinelX?{" "}
              <button type="button" onClick={() => navigate(ROUTES.signup)} className="font-medium text-primary hover:underline">
                Create an account
              </button>
            </p>
          )}

          <p className="mt-3 text-[11px] text-text-muted">
            This is a hackathon prototype. No real citizen data is processed — see the platform disclaimer for
            details.
          </p>
        </GlassPanel>

        {isFirebaseConfigured ? (
          <GlassPanel className="flex flex-col gap-4 p-6">
            <div>
              <p className="text-sm font-semibold text-text-primary">Real-time & AI-verified</p>
              <p className="mt-1 text-xs text-text-muted">
                This console runs on Firebase Authentication + Realtime Database, with an OpenRouter-powered AI
                Threat Analyst validating the deterministic detection engine live.
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-xs text-text-secondary">
              <li className="flex items-start gap-2">
                <ShieldHalf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Firebase-authenticated sessions, scoped by role
              </li>
              <li className="flex items-start gap-2">
                <ShieldHalf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Cross-device realtime notification sync
              </li>
              <li className="flex items-start gap-2">
                <ShieldHalf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Genuine LLM threat analysis, not just mock heuristics
              </li>
            </ul>
            <div className="mt-auto rounded-md border border-border bg-bg/60 px-3 py-2 text-[10px] text-text-muted">
              Don't have an account yet? Use <span className="font-medium text-primary">Create an account</span> — any
              role works, no invite required for this demo.
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel className="flex flex-col gap-4 p-6">
            <div>
              <p className="text-sm font-semibold text-text-primary">Demo access</p>
              <p className="mt-1 text-xs text-text-muted">
                Select any role to autofill credentials — password is shared across all demo accounts.
              </p>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemoAccount(account.email)}
                  className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface/70 px-3 py-2.5 text-left transition hover:border-primary/50 hover:bg-surface-raised"
                >
                  <span className="text-xs font-semibold text-text-primary">{account.label}</span>
                  <span className="text-[11px] text-text-muted">{account.organization}</span>
                  <span className="mt-1 font-mono text-[10px] text-primary">{account.email}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto rounded-md border border-border bg-bg/60 px-3 py-2 text-[10px] text-text-muted">
              Demo password for all roles: <span className="font-mono text-primary">{DEMO_PASSWORD}</span>
            </div>
          </GlassPanel>
        )}
      </motion.div>
    </main>
  );
}

function humanizeFirebaseError(message: string): string {
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password") || message.includes("auth/user-not-found")) {
    return "Invalid email or password.";
  }
  if (message.includes("auth/too-many-requests")) return "Too many attempts — please wait a moment and try again.";
  if (message.includes("auth/network-request-failed")) return "Network error — check your connection and try again.";
  return message;
}
