import { useMemo, useState } from "react";
import { Gauge, MessageCircle, Radio } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Badge } from "@/components/Badge";
import { Tabs } from "@/components/Tabs";
import { useLiveCase } from "@/hooks/useLiveCase";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { useAiStatus } from "@/hooks/useAiStatus";
import { ThreatGauge } from "@/features/threat/ThreatGauge";
import { ThreatReasonFeed } from "@/features/threat/ThreatReasonFeed";
import { DecisionCard } from "@/features/threat/DecisionCard";
import { AiAnalystCard } from "@/features/threat/AiAnalystCard";
import { ThreatAdvisorChat } from "@/features/threat/ThreatAdvisorChat";
import { ReportToAuthorities } from "@/features/report/ReportToAuthorities";
import type { AdvisorChatContext } from "@/services/analysisApi";
import { threatLevelColor } from "@/theme/tokens";

export function ThreatPanel() {
  const [panelTab, setPanelTab] = useState<"signals" | "advisor">("signals");
  const {
    threatScore,
    threatLevel,
    threatReasons,
    decision,
    aiInsights,
    isRunning,
    activeCase,
    transcript,
    entityIntel,
  } = useLiveCase();
  const { aiAnalystEnabled } = useSystemHealth();
  const { quotaExhausted } = useAiStatus();

  const advisorContext = useMemo<AdvisorChatContext>(() => {
    const latest = aiInsights.length > 0 ? aiInsights[aiInsights.length - 1] : null;
    return {
      threatScore,
      threatLevel,
      city: activeCase?.city,
      state: activeCase?.state,
      impersonatedAuthority: activeCase?.impersonatedAuthority,
      decisionHeadline: decision?.headline,
      decisionActions: decision?.actions,
      transcriptLines: transcript.slice(-20).map((line) => ({ speaker: line.speaker, text: line.text })),
      entities: entityIntel.map((item) => item.entity),
      latestAiSummary: latest?.summary,
    };
  }, [threatScore, threatLevel, activeCase, decision, transcript, entityIntel, aiInsights]);

  const levelColor = threatLevelColor[threatLevel];

  return (
    <GlassPanel noPadding className="flex h-full min-h-0 flex-col overflow-hidden">
      <PanelHeader
        icon={Gauge}
        title="Threat Intelligence"
        subtitle={panelTab === "signals" ? "Score · signals · decisions" : "Ask what to do next"}
        actions={
          <div className="flex items-center gap-2">
            {isRunning && <Badge tone="danger" dot>SCORING</Badge>}
            <Tabs
              items={[
                { id: "signals", label: "Signals", icon: <Radio className="h-3 w-3" /> },
                { id: "advisor", label: "Ask AI", icon: <MessageCircle className="h-3 w-3" /> },
              ]}
              activeTabId={panelTab}
              onChange={(id) => setPanelTab(id as "signals" | "advisor")}
              className="scale-90 border-none bg-transparent p-0"
            />
          </div>
        }
      />

      {panelTab === "signals" ? (
        <>
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
            <div className="scale-75 origin-left">
              <ThreatGauge score={threatScore} level={threatLevel} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Threat score</p>
              <p className="text-lg font-bold text-text-primary">
                {threatScore}
                <span className="text-sm font-semibold" style={{ color: levelColor }}>
                  {" "}
                  / 100 · {threatLevel.toUpperCase()}
                </span>
              </p>
              {decision && <p className="mt-0.5 truncate text-[10px] text-text-secondary">{decision.headline}</p>}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex flex-col gap-3 p-3">
              {decision && <DecisionCard decision={decision} />}

              {(threatLevel === "high" || threatLevel === "critical") && (
                <ReportToAuthorities
                  activeCase={activeCase}
                  transcript={transcript}
                  entityIntel={entityIntel}
                  threatLevel={threatLevel}
                />
              )}

              <AiAnalystCard
                insights={aiInsights}
                isEnabled={aiAnalystEnabled}
                isRunning={isRunning}
                quotaExhausted={quotaExhausted}
              />

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  Threat reasons
                </p>
                <ThreatReasonFeed reasons={threatReasons} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ThreatAdvisorChat context={advisorContext} quotaExhausted={quotaExhausted} />
        </div>
      )}
    </GlassPanel>
  );
}
