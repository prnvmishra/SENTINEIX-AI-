import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import type { AiInsight } from "@shared/types";
import { threatLevelColor } from "@/theme/tokens";

export function AiAnalystCard({ insight, isEnabled, isRunning }: { insight: AiInsight | null; isEnabled: boolean; isRunning: boolean }) {
  if (!isEnabled) return null;

  const color = insight ? threatLevelColor[insight.level] : "#64748b";

  return (
    <div className="mx-3 mb-3 rounded-lg border border-border bg-surface-raised/60 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">AI Threat Analyst</span>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
          Real LLM · OpenRouter
        </span>
      </div>

      <AnimatePresence mode="wait">
        {!insight ? (
          <motion.div
            key="standby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 py-1 text-[11px] text-text-muted"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Awaiting first LLM assessment...
              </>
            ) : (
              "Standby — will run its own review when a case starts."
            )}
          </motion.div>
        ) : (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
