import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Gauge,
  Info,
  MapPinned,
  Radio,
  ShieldAlert,
  Siren,
  Target,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { StatCard } from "@/components/StatCard";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/Skeleton";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { ROUTES } from "@/app/routes";
import { useAnalytics } from "@/features/analytics/useAnalytics";
import { useCaseRegistry, computeCaseRegistryStats } from "@/hooks/useCaseRegistry";
import { TrendChart } from "@/features/analytics/TrendChart";
import { AuthorityBreakdownChart } from "@/features/analytics/AuthorityBreakdownChart";
import { StateHotspotChart } from "@/features/analytics/StateHotspotChart";
import { AgencyPerformanceTable } from "@/features/analytics/AgencyPerformanceTable";

const levelTone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  low: "success",
  elevated: "warning",
  high: "warning",
  critical: "danger",
};

const sourceLabel: Record<string, string> = {
  "live-mic": "Live mic call",
  "recorded-upload": "Recorded call upload",
  "screenshot-upload": "Chat screenshot",
};

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { overview, isLoading } = useAnalytics();
  const { cases: registryCases, isLoading: registryLoading } = useCaseRegistry();
  const registryStats = computeCaseRegistryStats(registryCases);

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface/60 px-4">
        <div className="flex items-center gap-4">
          <Logo showWordmark />
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span className="hidden text-xs font-medium uppercase tracking-wider text-text-muted sm:inline">
            Fraud Intelligence Analytics
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.dashboard)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Command Center
        </Button>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {isLoading || !overview ? (
          <div className="flex h-[70vh] items-center justify-center">
            <LoadingState label="Compiling national fraud intelligence analytics..." />
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
            <motion.div variants={fadeUp}>
              <GlassPanel noPadding glow>
                <PanelHeader
                  icon={Radio}
                  title="Your real cases"
                  subtitle="Live from this device's own sessions — Live Mic calls, recorded-call uploads, and chat-screenshot analyses. Not sample data."
                />
                <div className="p-3.5">
                  {registryLoading ? (
                    <LoadingState label="Loading your real case history..." />
                  ) : registryStats.total === 0 ? (
                    <EmptyState
                      icon={Radio}
                      title="No real cases yet"
                      description="Run a Live Mic Session, upload a recorded call, or analyze a chat screenshot from the dashboard — it will show up here in real time, registered, ongoing, then completed."
                    />
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatCard label="Total registered" value={registryStats.total.toString()} icon={Target} />
                        <StatCard
                          label="Ongoing"
                          value={registryStats.ongoing.toString()}
                          icon={Clock}
                          trend={registryStats.ongoing > 0 ? "In progress" : undefined}
                          trendTone="danger"
                        />
                        <StatCard label="Completed" value={registryStats.completed.toString()} icon={CheckCircle2} trendTone="success" />
                        <StatCard
                          label="High / Critical"
                          value={registryStats.highOrCritical.toString()}
                          icon={ShieldAlert}
                          trendTone="danger"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {registryCases.slice(0, 8).map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-border-strong bg-surface-raised/40 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-xs font-medium text-text-primary">{c.title}</p>
                                <Badge tone={c.status === "live" ? "danger" : "success"} className="shrink-0 text-[10px]">
                                  {c.status === "live" ? "ONGOING" : "COMPLETED"}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-[10px] text-text-muted">
                                {sourceLabel[c.source ?? "live-mic"]} · {c.victimAlias} ·{" "}
                                {new Date(c.startedAt).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <Badge tone={levelTone[c.threatLevel]} className="shrink-0 text-[10px]">
                              {c.threatLevel} · {c.finalScore}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Everything below is simulated national-scale reference data.</strong> Total cases, amount
                saved, state hotspot rankings, and agency performance are illustrative sample data showing what a
                national rollout's dashboard would look like — it does not reflect real cases run on this device. For
                your actual cases, see "Your real cases" above.
              </span>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total cases" value={overview.totalCases.toLocaleString("en-IN")} icon={Target} />
              <StatCard label="Active cases" value={overview.activeCases.toString()} icon={Siren} trend="Live" trendTone="danger" />
              <StatCard
                label="Critical cases"
                value={overview.criticalCases.toString()}
                icon={ShieldAlert}
                trend="Escalated"
                trendTone="danger"
              />
              <StatCard
                label="Amount saved"
                value={`₹${overview.totalAmountSavedLakhs.toFixed(1)}L`}
                icon={Banknote}
                trend="This quarter"
                trendTone="success"
              />
              <StatCard
                label="Detection accuracy"
                value={`${overview.detectionAccuracyPct.toFixed(1)}%`}
                icon={Gauge}
                trend="Mock engine benchmark"
                trendTone="neutral"
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <GlassPanel noPadding glow>
                <PanelHeader icon={Gauge} title="Daily incident trend" subtitle="Reported incidents vs. average threat score" />
                <div className="h-72 p-3">
                  <TrendChart data={overview.trend} />
                </div>
              </GlassPanel>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GlassPanel noPadding>
                <PanelHeader icon={ShieldAlert} title="Impersonated authorities" subtitle="Share of detected impersonation categories" />
                <div className="h-72 p-3">
                  <AuthorityBreakdownChart data={overview.byAuthority} />
                </div>
              </GlassPanel>

              <GlassPanel noPadding>
                <PanelHeader icon={MapPinned} title="State-wise hotspot ranking" subtitle="Reported incidents by state" />
                <div className="h-72 p-3">
                  <StateHotspotChart data={overview.byState} />
                </div>
              </GlassPanel>
            </motion.div>

            <motion.div variants={fadeUp}>
              <GlassPanel noPadding>
                <PanelHeader icon={Building2} title="Agency performance" subtitle="Cyber Crime Cell and I4C case handling metrics" />
                <div className="p-4">
                  <AgencyPerformanceTable data={overview.agencyPerformance} />
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
