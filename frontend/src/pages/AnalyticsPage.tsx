import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Gauge,
  MapPinned,
  ShieldAlert,
  Siren,
  Target,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { StatCard } from "@/components/StatCard";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/Skeleton";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { ROUTES } from "@/app/routes";
import { useAnalytics } from "@/features/analytics/useAnalytics";
import { TrendChart } from "@/features/analytics/TrendChart";
import { AuthorityBreakdownChart } from "@/features/analytics/AuthorityBreakdownChart";
import { StateHotspotChart } from "@/features/analytics/StateHotspotChart";
import { AgencyPerformanceTable } from "@/features/analytics/AgencyPerformanceTable";

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { overview, isLoading } = useAnalytics();

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
