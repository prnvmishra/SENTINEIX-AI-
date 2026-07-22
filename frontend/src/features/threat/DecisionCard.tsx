import { motion } from "framer-motion";
import { CheckCircle2, Gavel } from "lucide-react";
import type { DecisionRecommendation } from "@shared/types";
import { threatLevelColor } from "@/theme/tokens";

export function DecisionCard({ decision }: { decision: DecisionRecommendation }) {
  const color = threatLevelColor[decision.level];

  return (
    <motion.div
      key={decision.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mb-3 flex flex-col gap-2 rounded-lg border p-3"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}12` }}
    >
      <div className="flex items-center gap-2">
        <Gavel className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-xs font-semibold text-text-primary">{decision.headline}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {decision.actions.map((action) => (
          <li key={action} className="flex items-start gap-1.5 text-[11px] text-text-secondary">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" />
            {action}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
