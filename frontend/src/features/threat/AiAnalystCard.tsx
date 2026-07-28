import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import type { AiInsight } from "@shared/types";
import { threatLevelColor } from "@/theme/tokens";

function InsightBody({ insight }: { insight: AiInsight }) {
  const color = threatLevelColor[insight.level];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-bold" style={{ color }}>
          {insight.score}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
          {insight.level}
        </span>
        <span
          className={`ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
            insight.agreesWithEngine ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}
        >
          {insight.agreesWithEngine ? (
            <>
              <CheckCircle2 className="h-2.5 w-2.5" /> Concurs with engine
            </>
          ) : (
            <>
              <TriangleAlert className="h-2.5 w-2.5" /> Diverges from engine
            </>
          )}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-text-secondary">{insight.summary}</p>

      {insight.keyIndicators.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {insight.keyIndicators.map((indicator) => (
            <li
              key={indicator}
              className="rounded-full border border-border-strong bg-bg/60 px-2 py-0.5 text-[10px] text-text-secondary"
            >
              {indicator}
            </li>
          ))}
        </ul>
      )}

      <p className="font-mono text-[9px] text-text-muted">
        {insight.model} · {new Date(insight.generatedAt).toLocaleTimeString("en-IN", { hour12: false })}
      </p>
    </div>
  );
}

/** Compact auto-assessment card — lives inside the Threat panel scroll area. */
export function AiAnalystCard({
  insights,
  isEnabled,
  isRunning,
  quotaExhausted = false,
}: {
  insights: AiInsight[];
  isEnabled: boolean;
  isRunning: boolean;
  quotaExhausted?: boolean;
}) {
  if (!isEnabled) return null;

  const latestInsight = insights.length > 0 ? insights[insights.length - 1] : null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised/60 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">AI Threat Analyst</span>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
          Auto assessment
        </span>
        {insights.length > 1 && (
          <span className="ml-auto text-[9px] text-text-muted">{insights.length} updates</span>
        )}
      </div>

      {quotaExhausted && (
        <div className="mb-2 flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/10 p-2 text-[10px] leading-relaxed text-warning">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" /> OpenRouter free quota paused — auto-assessment
          continues via Groq when configured. Rule engine + Ask AI still work.
        </div>
      )}

      <AnimatePresence mode="wait">
        {!latestInsight ? (
          <motion.div
            key="standby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 py-1 text-[11px] text-text-muted"
          >
            {quotaExhausted ? (
              "OpenRouter paused — Groq / rule-engine scoring continues. Ask AI still works."
            ) : isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Awaiting first LLM assessment...
              </>
            ) : (
              "Standby — auto review runs when a case starts. Or ask the advisor below anytime."
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...insights].reverse().map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={index === 0 ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                className={index > 0 ? "border-t border-border/60 pt-3" : undefined}
              >
                <InsightBody insight={insight} />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
