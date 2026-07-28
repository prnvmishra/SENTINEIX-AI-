import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Crown, Loader2, LogOut, ShieldHalf, Trash2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { fadeUp, staggerContainer } from "@/theme/motion";
import { ROUTES } from "@/app/routes";
import { roleLabels } from "@/constants/roles";
import { useAuth } from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/services/env";

const inputClass =
  "rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary";

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface/60 px-4">
        <div className="flex items-center gap-4">
          <Logo showWordmark />
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span className="hidden text-xs font-medium uppercase tracking-wider text-text-muted sm:inline">Settings</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.dashboard)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Command Center
        </Button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
          <motion.div variants={fadeUp}>
            <GlassPanel noPadding glow>
              <PanelHeader icon={ShieldHalf} title="Your account" subtitle="Profile details linked to this Firebase account" />
              <div className="flex flex-col gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-bg"
                    style={{ backgroundColor: user?.avatarColor ?? "#06b6d4" }}
                  >
                    {user?.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
                    <p className="text-xs text-text-muted">{user?.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{user ? roleLabels[user.role] : ""}</Badge>
                  <span className="text-xs text-text-secondary">{user?.organization}</span>
                  {user?.role === "gov_admin" && (
                    <Badge tone="warning" className="gap-1">
                      <Crown className="h-3 w-3" /> Administrator
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-text-muted">
                  To change your role or fine-grained case permissions (mark solved / delete cases), ask a Government
                  Administrator to update it from the{" "}
                  <button type="button" onClick={() => navigate(ROUTES.admin)} className="text-primary hover:underline">
                    Admin panel
                  </button>
                  .
                </p>
                <Button variant="outline" size="sm" className="self-start" onClick={() => { logout(); navigate(ROUTES.landing); }}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </Button>
              </div>
            </GlassPanel>
          </motion.div>

          {user?.role === "gov_admin" && (
            <motion.div variants={fadeUp}>
              <GlassPanel noPadding>
                <PanelHeader icon={Crown} title="Administrator tools" subtitle="Manage every account's role and permissions" />
                <div className="p-4">
                  <Button onClick={() => navigate(ROUTES.admin)}>
                    <Crown className="h-4 w-4" /> Open Admin panel
                  </Button>
                </div>
              </GlassPanel>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <DangerZone />
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

function DangerZone() {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError('Type "DELETE" to confirm.');
      return;
    }

    setSubmitting(true);
    try {
      await deleteAccount(password);
      navigate(ROUTES.landing);
    } catch (err) {
      setError(humanizeDeleteError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <GlassPanel noPadding>
        <PanelHeader icon={AlertTriangle} title="Delete account" subtitle="Unavailable in demo mode" />
        <div className="p-4 text-xs text-text-muted">
          This deployment isn't connected to Firebase, so accounts are demo-only and can't be deleted here.
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel noPadding className="border-danger/30">
      <PanelHeader icon={AlertTriangle} title="Danger zone" subtitle="Irreversible account actions" />
      <div className="p-4">
        {!confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs leading-relaxed text-text-secondary">
              Permanently delete your account and profile. Cases you registered will remain in the shared case
              registry for record-keeping (ask an administrator to remove them from Historical Cases if needed), but
              you'll lose access to sign back in.
            </p>
            <Button variant="danger" size="sm" className="self-start" onClick={() => setConfirming(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete my account
            </Button>
          </div>
        ) : (
          <form onSubmit={handleDelete} className="flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-danger">
              This cannot be undone. Enter your current password and type <strong>DELETE</strong> to confirm.
            </p>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Current password
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Type DELETE to confirm
              <input
                required
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="DELETE"
                className={inputClass}
              />
            </label>
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="danger" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Permanently
                delete
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </GlassPanel>
  );
}

function humanizeDeleteError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("auth/wrong-password") || message.includes("auth/invalid-credential")) {
    return "Incorrect password.";
  }
  if (message.includes("auth/too-many-requests")) return "Too many attempts — try again in a few minutes.";
  return message;
}
