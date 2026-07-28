import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, Crown, Loader2, ShieldCheck, Users } from "lucide-react";
import type { UserRole } from "@shared/types";
import { Logo } from "@/components/Logo";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { fadeUp, staggerContainer } from "@/theme/motion";
import { ROUTES } from "@/app/routes";
import { roleLabels, roleOptions } from "@/constants/roles";
import { useAuth } from "@/hooks/useAuth";
import { database } from "@/services/firebaseClient";
import { claimGovernmentAdmin, repairAccountDirectoryFromUsers, subscribeToAllUsers, updateUserRole } from "@/services/userAdmin";
import type { ManagedUserProfile } from "@/services/userAdmin";

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUserProfile[]>([]);
  const [adminLockUid, setAdminLockUid] = useState<string | null | undefined>(undefined);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);

  const isAdmin = user?.role === "gov_admin";
  const lockLoading = adminLockUid === undefined;
  const hasAdminLock = Boolean(adminLockUid);
  const canClaim = !lockLoading && !hasAdminLock && !isAdmin && !!user;

  useEffect(() => {
    if (!database) {
      setAdminLockUid(null);
      return;
    }
    return onValue(
      ref(database, "system/govAdminUid"),
      (snap) => {
        const value = snap.val();
        setAdminLockUid(typeof value === "string" && value.length > 0 ? value : null);
      },
      () => setAdminLockUid(null),
    );
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      setError(null);
      return;
    }
    return subscribeToAllUsers(setUsers, (message) => {
      if (message) setError(message);
    });
  }, [isAdmin]);

  async function handleClaimAdmin() {
    if (!user) return;
    setClaiming(true);
    setError(null);
    const err = await claimGovernmentAdmin(user.id);
    setClaiming(false);
    if (err) {
      setError(err);
    } else {
      window.location.reload();
    }
  }

  async function handleRoleChange(uid: string, role: UserRole) {
    setSavingUid(uid);
    setError(null);
    const err = await updateUserRole(uid, role);
    setSavingUid(null);
    if (err) setError(err);
  }

  async function handleRepairRoster() {
    setRepairing(true);
    setError(null);
    const result = await repairAccountDirectoryFromUsers();
    setRepairing(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface/60 px-4">
        <div className="flex items-center gap-4">
          <Logo showWordmark />
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span className="hidden text-xs font-medium uppercase tracking-wider text-text-muted sm:inline">
            Admin — Account &amp; Access Control
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.dashboard)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Command Center
        </Button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
          {lockLoading ? (
            <LoadingState label="Checking administrator lock..." />
          ) : isAdmin ? (
            <>
              <motion.div
                variants={fadeUp}
                className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary"
              >
                <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  You are the <strong>Government Administrator</strong>. Only this role can{" "}
                  <strong>delete cases</strong>. Grant admin to someone else only via the role dropdown below — other
                  accounts cannot self-claim. <strong>Mark Complete</strong> stays with whoever registered each case.
                </span>
              </motion.div>

              {error && (
                <motion.div
                  variants={fadeUp}
                  className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                </motion.div>
              )}

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" disabled={repairing} onClick={() => void handleRepairRoster()}>
                  {repairing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                  Repair names from profiles
                </Button>
                <span className="text-[10px] text-text-muted">
                  Use if someone shows as &quot;Unnamed user&quot; — rebuilds the roster from `/users`.
                </span>
              </motion.div>

              <motion.div variants={fadeUp}>
                <GlassPanel noPadding glow>
                  <PanelHeader icon={Users} title="All registered accounts" subtitle={`${users.length} accounts`} />
                  <div className="flex flex-col divide-y divide-border p-2">
                    {users.map((profile) => (
                      <div key={profile.uid} className="flex flex-col gap-2 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-bg"
                              style={{ backgroundColor: profile.avatarColor ?? "#06b6d4" }}
                            >
                              {profile.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-text-primary">
                                {profile.name}{" "}
                                {profile.uid === user.id && <span className="text-text-muted">(you)</span>}
                              </p>
                              <p className="text-[11px] text-text-muted">
                                {profile.email ? `${profile.email} · ` : ""}
                                {profile.organization}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {savingUid === profile.uid && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
                            )}
                            <select
                              value={profile.role}
                              onChange={(event) => handleRoleChange(profile.uid, event.target.value as UserRole)}
                              className="rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-text-primary outline-none transition focus:border-primary"
                            >
                              {roleOptions.map((option) => (
                                <option key={option.role} value={option.role}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {profile.role === "gov_admin" && (
                          <p className="text-[10px] text-primary">Can delete cases · can manage other accounts</p>
                        )}
                      </div>
                    ))}
                    {users.length === 0 && (
                      <EmptyState
                        icon={Users}
                        title="No accounts in the roster yet"
                        description="Ask each registered user to open the app once while signed in (that syncs them here). Also publish firebase/database.rules.json in Firebase Console → Realtime Database → Rules, then refresh this page."
                      />
                    )}
                  </div>
                </GlassPanel>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Delete = admin only. Mark Complete = case owner only.
              </motion.div>
            </>
          ) : canClaim ? (
            <motion.div variants={fadeUp}>
              <GlassPanel noPadding glow>
                <PanelHeader
                  icon={ShieldCheck}
                  title="No administrator has been set up yet"
                  subtitle="First-time setup — claim once. After that, only you can grant admin to others."
                />
                <div className="flex flex-col gap-3 p-4">
                  <p className="text-xs leading-relaxed text-text-secondary">
                    Claiming admin locks this deployment so no other account can self-promote. You will be the only one
                    who can delete cases, and you can promote another account later from this page if needed.
                  </p>
                  {error && (
                    <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                    </div>
                  )}
                  <Button onClick={handleClaimAdmin} disabled={claiming} className="self-start">
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />} Claim admin
                    access
                  </Button>
                </div>
              </GlassPanel>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp}>
              <EmptyState
                icon={ShieldCheck}
                title="Access restricted"
                description={`An administrator already exists. Your account is "${
                  user ? roleLabels[user.role] : "unknown"
                }" — ask them to grant Government Administrator from the Admin panel if you need delete/admin access.`}
              />
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
