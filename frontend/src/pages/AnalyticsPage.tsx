import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, Gauge, MapPinned, Radio, ShieldAlert, Target } from "lucide-react";
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
import { useCaseRegistry, computeCaseRegistryStats, computeRealAnalyticsBreakdowns } from "@/hooks/useCaseRegistry";
import { TrendChart } from "@/features/analytics/TrendChart";
import { AuthorityBreakdownChart } from "@/features/analytics/AuthorityBreakdownChart";
import { StateHotspotChart } from "@/features/analytics/StateHotspotChart";

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
  manual: "Manual registration",
};

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { cases: registryCases, isLoading: registryLoading, error: registryError } = useCaseRegistry();
  const registryStats = computeCaseRegistryStats(registryCases);
  const { byCity, byAuthority, trend } = computeRealAnalyticsBreakdowns(registryCases);

  const stateChartData = byCity.map((c) => ({ state: `${c.city}, ${c.state}`, incidents: c.incidents, amountAtRiskLakhs: 0 }));

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
        {registryLoading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <LoadingState label="Compiling your real case analytics..." />
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
            {registryError && (
              <motion.div
                variants={fadeUp}
                className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Cannot load real cases from Firebase:</strong> {registryError}
                </span>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <GlassPanel noPadding glow>
                <PanelHeader
                  icon={Radio}
                  title="Real case analytics"
                  subtitle="Only cases you explicitly registered after analysis — Ongoing until you Mark as Solved from Historical Cases."
                />
                <div className="p-3.5">
                  {registryStats.total === 0 ? (
                    <EmptyState
                      icon={Radio}
                      title="No registered cases yet"
                      description="Analyze a call or screenshot on the dashboard, then click Register case as ONGOING. After that it appears here. Mark it Solved from Historical Cases to move it to Completed."
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
                                <Badge
                                  tone={c.status === "resolved" && c.resolution ? "success" : "warning"}
                                  className="shrink-0 text-[10px]"
                                >
                                  {c.status === "resolved" && c.resolution ? "COMPLETED" : "ONGOING"}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-[10px] text-text-muted">
                                {sourceLabel[c.source ?? "live-mic"]} · {c.victimAlias} · {c.city}, {c.state} ·{" "}
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

            {registryStats.total > 0 && (
              <>
                <motion.div variants={fadeUp}>
                  <GlassPanel noPadding glow>
                    <PanelHeader icon={Gauge} title="Daily incident trend" subtitle="Real cases per day vs. average threat score" />
                    <div className="h-72 p-3">
                      <TrendChart data={trend} />
                    </div>
                  </GlassPanel>
                </motion.div>

                <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <GlassPanel noPadding>
                    <PanelHeader icon={ShieldAlert} title="Impersonated authorities" subtitle="Share of authorities impersonated across your real cases" />
                    <div className="h-72 p-3">
                      <AuthorityBreakdownChart data={byAuthority} />
                    </div>
                  </GlassPanel>

                  <GlassPanel noPadding>
                    <PanelHeader icon={MapPinned} title="City-wise hotspot ranking" subtitle="Your real cases by city" />
                    <div className="h-72 p-3">
                      <StateHotspotChart data={stateChartData} />
                    </div>
                  </GlassPanel>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
