import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { panelMount, staggerContainer } from "@/theme/motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface DashboardGridProps {
  transcript: ReactNode;
  threat: ReactNode;
  map: ReactNode;
  graph: ReactNode;
  bottom: ReactNode;
}

export function DashboardGrid({ transcript, threat, map, graph, bottom }: DashboardGridProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5"
    >
      <div className="grid min-h-0 flex-[1.15] grid-cols-1 gap-2.5 overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
        {[transcript, threat, map, graph].map((panel, index) => (
          <motion.div key={index} variants={panelMount} className="min-h-0 h-full overflow-hidden">
            <ErrorBoundary fallbackTitle="This intelligence module failed to render">{panel}</ErrorBoundary>
          </motion.div>
        ))}
      </div>
      <motion.div variants={panelMount} className="flex min-h-[280px] flex-1 flex-col overflow-hidden">
        <ErrorBoundary fallbackTitle="Investigation console failed to render">
          <div className="h-full min-h-0">{bottom}</div>
        </ErrorBoundary>
      </motion.div>
    </motion.div>
  );
}
