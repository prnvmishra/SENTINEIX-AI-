import { Gauge } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Badge } from "@/components/Badge";
import { useLiveCase } from "@/hooks/useLiveCase";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { ThreatGauge } from "@/features/threat/ThreatGauge";
import { ThreatReasonFeed } from "@/features/threat/ThreatReasonFeed";
import { DecisionCard } from "@/features/threat/DecisionCard";
import { AiAnalystCard } from "@/features/threat/AiAnalystCard";
import { ReportToAuthorities } from "@/features/report/ReportToAuthorities";

export function ThreatPanel() {
  const { threatScore, threatLevel, threatReasons, decision, aiInsights, isRunning, activeCase, transcript, entityIntel } =
    useLiveCase();
  const { aiAnalystEnabled } = useSystemHealth();
  const latestInsight = aiInsights.length > 0 ? aiInsights[aiInsights.length - 1] : null;

  return (
    <GlassPanel noPadding className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        icon={Gauge}
        title="Threat Intelligence"
        subtitle="Explainable AI · Decision panel"
        actions={isRunning && <Badge tone="danger" dot>SCORING</Badge>}
      />

      <div className="flex items-center justify-center border-b border-border py-4">
        <ThreatGauge score={threatScore} level={threatLevel} />
      </div>

      {decision && <DecisionCard decision={decision} />}

      {(threatLevel === "high" || threatLevel === "critical") && (
        <ReportToAuthorities
          activeCase={activeCase}
          transcript={transcript}
          entityIntel={entityIntel}
          threatLevel={threatLevel}
        />
      )}

      <AiAnalystCard insight={latestInsight} isEnabled={aiAnalystEnabled} isRunning={isRunning} />

      <div className="flex-1 overflow-y-auto">
        <ThreatReasonFeed reasons={threatReasons} />
      </div>
    </GlassPanel>
  );
}
